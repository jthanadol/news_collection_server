const express = require('express');
const router = express.Router();
const url = require('url');
const connectdb = require('../config/db-config');
const NewsResponse = require('../config/news-response');
const factCheck = require('../service/fact-check-tools');
const translate = require('../service/translate-text');
const searchNews = require('../service/search-news');
const separate = require('../service/separate-word');
let searchTextENGToday = require('../config/array-field').searchTextENGToday;

//parameter มี country เช่น 'th' , category เช่น food , date เช่น old(เรียงเก่าไปใหม่) , offset ข้ามข่าว เช่น 10 คือ ข้ามไปทำเอาอันที่ 11 เป็นต้นไป
router.get('/news', async (req, res) => {
  let sql =
    'SELECT n.news_id , n.title ,n.description,n.img_url,n.news_url,n.pub_date,s.source_name,s.source_icon,n.title_th,n.description_th, n.content,n.content_th FROM country_news AS ct INNER JOIN news AS n ON ct.news_id = n.news_id INNER JOIN news_category AS nc ON n.news_id = nc.news_id INNER JOIN news_source AS ns ON nc.news_id = ns.news_id INNER JOIN sources AS s ON ns.source_name = s.source_name WHERE ';
  const { query } = url.parse(req.url, true);
  let values = [];
  if (query.country != undefined) {
    sql += `ct.country_code = ?`;
    values.push(query.country);
  }
  if (query.category != undefined) {
    const [[category]] = await connectdb
      .promise()
      .query('select category_id from category where category_name = ?', [
        query.category,
      ]);
    sql += ' AND nc.category_id = ?';
    values.push(category.category_id);
  }
  if (query.date != undefined) {
    if (query.date == 'old') {
      sql += ' ORDER BY n.pub_date ASC';
    } else if (query.date == 'last') {
      sql += ' ORDER BY n.pub_date DESC';
    }
  } else {
    sql += ' ORDER BY n.pub_date DESC';
  }
  sql += ' LIMIT 25';
  if (query.offset != undefined) {
    sql += ` OFFSET ${query.offset}`;
  }
  connectdb.query(sql, values, async (err, result) => {
    if (err) {
      console.log('ส่งข้อมูลข่าวผิดพลาด');
      res.status(400).json({ msg: err });
    }
    let data = [];
    let fact_check = await Promise.all(
      result.map((i) => factCheck.checkNews(i.title, i.pub_date))
    ); //Promise.all เป็นการรอให้คำสั่ง async funtion ที่ใส่เป็น parameter เสร็จ
    let element;
    let fact_th;
    for (let index = 0; index < result.length; index++) {
      element = result[index];
      if (
        fact_check[index] === null ||
        fact_check[index].claims === undefined
      ) {
        fact_check[index] = null;
        fact_th = null;
      } else {
        fact_th = JSON.parse(JSON.stringify(fact_check[index]));
        for (let i = 0; i < fact_th.claims.length; i++) {
          fact_th.claims[i].text = await translate.translateText(
            fact_th.claims[i].text,
            false
          );
          for (let j = 0; j < fact_th.claims[i].claimReview.length; j++) {
            if (fact_th.claims[i].claimReview[j].languageCode != 'th') {
              fact_th.claims[i].claimReview[j].title =
                await translate.translateText(
                  fact_th.claims[i].claimReview[j].title,
                  false
                );
              fact_th.claims[i].claimReview[j].textualRating =
                await translate.translateText(
                  fact_th.claims[i].claimReview[j].textualRating,
                  false
                );
            }
          }
        }
      }
      if (element.title != null) {
        if (element.title_th == null) {
          element.title_th = await translate.translateText(
            element.title,
            false
          );
          if (element.title_th.length != 0) {
            connectdb.query('UPDATE news SET title_th = ? WHERE news_id = ?', [
              element.title_th,
              element.news_id,
            ]);
          }
        }
      }
      if (element.description != null) {
        if (element.description_th == null) {
          element.description_th = await translate.translateText(
            element.description,
            false
          );
          if (element.description_th.length != 0) {
            connectdb.query(
              'UPDATE news SET description_th= ? WHERE news_id =?',
              [element.description_th, element.news_id]
            );
          }
        }
      }
      data.push(
        new NewsResponse(
          element.news_id,
          element.title,
          element.description,
          element.img_url,
          element.news_url,
          element.pub_date,
          element.source_name,
          element.source_icon,
          element.title_th,
          element.description_th,
          fact_check[index],
          fact_th,
          element.content_th,
          element.content,
          null,
          null
        )
      );
    }
    res.status(200).json({ results: data });
    console.log('ส่งข้อมูลข่าวสำเร็จ');
  });
});



//parameter text ใน body คือ คำค้น || since เวลาของข่าวเช่น ตั้งแต่ 2024-1-1 จน ปัจจุบัน, offset ข้ามข่าว เช่น 10 คือ ข้ามไปทำเอาอันที่ 11 เป็นต้นไป
//parameter accountId คือ id ผู้ใช้ , waitBingSearch คือ boolean true คือ รอ , keepHistory เก็บประวัติการค้นหาถ้าเป็น true
router.post('/search', async (req, res) => {
  const { query } = url.parse(req.url, true);
  const { text, waitBingSearch, keepHistory } = req.body;

  //เช็ค undefined,null,''
  // console.log(waitBingSearch);
  if (text != undefined && text != '') {
    let querySQL =
      'SELECT n.news_id, n.title, n.description, n.img_url, n.news_url, n.pub_date, s.source_name, s.source_icon, n.title_th, n.description_th, n.content, n.content_th FROM country_news AS ct INNER JOIN news AS n ON ct.news_id = n.news_id INNER JOIN news_category AS nc ON n.news_id = nc.news_id INNER JOIN news_source AS ns ON nc.news_id = ns.news_id INNER JOIN sources AS s ON ns.source_name = s.source_name';
    let countSQL = ` ORDER BY COALESCE((length(n.title)-length(REPLACE (n.title , '${text}','')))/LENGTH('${text}'),0) + COALESCE((length(n.description)-length(REPLACE (n.description , '${text}','')))/LENGTH('${text}'),0) DESC`;
    const word = await separate.separateWord(text, true);
    let value = [];

    if (query.accountId != undefined) {
      //เพิ่มประวัติการค้น
      if (keepHistory != undefined) {
        if (keepHistory == true) {
          connectdb.query(
            'INSERT INTO search_history (account_id,search_text) VALUES (?,?)',
            [query.accountId, text],
            (err, result) => {
              if (err) {
                console.error('เพิ่มประวัติค้นหา ERROR ', err);
              }
              // console.log('เพิ่มประวัติค้นหาสำเร็จ ', query.accountId, '  ', text);
            }
          );
        }
      }
    }

    let searchText = text;
    if (word.length != 0) {
      searchText += '|' + word.join('|');
      querySQL += ' WHERE (n.title REGEXP ? OR n.description REGEXP ?)';
    } else {
      searchText = `%${text}%`;
      querySQL += ' WHERE (n.title LIKE ? OR n.description LIKE ?)';
    }

    value.push(searchText);
    value.push(searchText);
    let response;
    if (query.since != undefined && query.since != '') {
      querySQL += ' AND n.pub_date >= ?';
      value.push(query.since);
      if (query.offset == 0) {
        const date = new Date(query.since);
        const unixTimestamp = Math.floor(date.getTime() / 1000); //.getTime จะได้เป็น มิลิวินาที หาร 1000 จะได้ วินาที
        if (waitBingSearch == true) {
          response = await searchNews.bingSearch(text, word, unixTimestamp);
          await searchNews.addNews(response, text);
        }
      }
    } else {
      if (query.offset == 0) {
        if (waitBingSearch == true) {
          response = await searchNews.bingSearch(text, word);
          await searchNews.addNews(response, text);
        }
      }
    }
    let limitSQL = ' LIMIT 25';
    if (query.offset != undefined) {
      limitSQL += ` OFFSET ${query.offset}`;
    } else {
      limitSQL += ` OFFSET 0`;
    }

    try {
      let result = await connectdb
        .promise()
        .query(querySQL + countSQL + limitSQL, value);
      result = result[0];
      // console.log("ค้นคำที่รับมาก่อนใน Database ได้ : ", result.length)
      if (result.length === 0) {
        if (query.offset == 0 || searchTextENGToday.indexOf(text) != -1) {
          let searchEng = await translate.translateText(searchText, false, 'en');
          if (searchEng != searchText) {
            if (searchTextENGToday.indexOf(text) == -1) {
              searchTextENGToday.push(text)
            }
            value[0] = searchEng;
            value[1] = searchEng;
            result = await connectdb.promise().query(querySQL + limitSQL, value);
            result = result[0];
            for (let index = 0; index < result.length; index++) {
              element = result[index];
              if (element.title != null) {
                if (element.title_th == null) {
                  element.title_th = await translate.translateText(
                    element.title,
                    false
                  );
                  if (element.title_th.length != 0) {
                    connectdb.query(
                      'UPDATE news SET title_th = ? WHERE news_id = ?',
                      [element.title_th, element.news_id]
                    );
                  }
                }
              }
              if (element.description != null) {
                if (element.description_th == null) {
                  element.description_th = await translate.translateText(
                    element.description,
                    false
                  );
                  if (element.description_th.length != 0) {
                    connectdb.query(
                      'UPDATE news SET description_th= ? WHERE news_id =?',
                      [element.description_th, element.news_id]
                    );
                  }
                }
              }
            }
            countSQL = ` ORDER BY COALESCE((length(n.title_th)-length(REPLACE (n.title_th , '${text}','')))/LENGTH('${text}'),0) + COALESCE((length(n.description_th)-length(REPLACE (n.description_th , '${text}','')))/LENGTH('${text}'),0) DESC`;
            result = await connectdb
              .promise()
              .query(querySQL + countSQL + limitSQL, value);
            result = result[0];
            // console.log("แปล ENG คำที่รับมาก่อนค่อยค้นต่อใน Database ได้ : ", result.length)
          }
        }
      }

      let data = [];
      let fact_check = await Promise.all(
        result.map((i) => factCheck.checkNews(i.title, i.pub_date))
      ); //Promise.all เป็นการรอให้คำสั่ง async funtion ที่ใส่เป็น parameter เสร็จ
      let element;
      let fact_th;
      for (let index = 0; index < result.length; index++) {
        element = result[index];
        if (fact_check[index].claims === undefined) {
          fact_check[index] = null;
          fact_th = null;
        } else {
          fact_th = JSON.parse(JSON.stringify(fact_check[index]));
          for (let i = 0; i < fact_th.claims.length; i++) {
            fact_th.claims[i].text = await translate.translateText(
              fact_th.claims[i].text,
              false
            );
            for (let j = 0; j < fact_th.claims[i].claimReview.length; j++) {
              if (fact_th.claims[i].claimReview[j].languageCode != 'th') {
                fact_th.claims[i].claimReview[j].title =
                  await translate.translateText(
                    fact_th.claims[i].claimReview[j].title,
                    false
                  );
                fact_th.claims[i].claimReview[j].textualRating =
                  await translate.translateText(
                    fact_th.claims[i].claimReview[j].textualRating,
                    false
                  );
              }
            }
          }
        }
        if (element.title != null) {
          if (element.title_th == null) {
            element.title_th = await translate.translateText(
              element.title,
              false
            );
            if (element.title_th.length != 0) {
              connectdb.query('UPDATE news SET title_th = ? WHERE news_id = ?', [
                element.title_th,
                element.news_id,
              ]);
            }
          }
        }
        if (element.description != null) {
          if (element.description_th == null) {
            element.description_th = await translate.translateText(
              element.description,
              false
            );
            if (element.description_th.length != 0) {
              connectdb.query(
                'UPDATE news SET description_th= ? WHERE news_id =?',
                [element.description_th, element.news_id]
              );
            }
          }
        }
        data.push(
          new NewsResponse(
            element.news_id,
            element.title,
            element.description,
            element.img_url,
            element.news_url,
            element.pub_date,
            element.source_name,
            element.source_icon,
            element.title_th,
            element.description_th,
            fact_check[index],
            fact_th,
            element.content_th,
            element.content,
            null,
            null
          )
        );
      }
      console.log('ส่งข้อมูลการค้นหาข่าวสำเร็จ');
      res.status(200).json({ results: data });
    } catch (err) {
      if (err) {
        console.log(err);
        res.status(500).json({ msg: err });
      }
    }
  } else {
    console.log('ส่งข้อมูลการค้นหาข่าวผิดพลาด');
    res.status(400).json({ msg: 'ไม่ได้ใส่ parameter query' });
  }
});

module.exports = router;
