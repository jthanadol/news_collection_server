const axios = require('axios');
const apiKey = require('../config/api-key');
const translate = require('./translate-text');
const newsConfig = require('../config/news-config');
const connectPool = require('../config/db-pool-config');

/* 
q คือ คำค้นหา , count คือ จำนวนบทความข่าว 10-100 , originalImg ถ้าเป็น true จะชี้ไปยังภาพต้นฉบับ
since ส่งคืนหัวข้อที่กำลังเป็นที่นิยมที่มันค้นพบในวันที่และเวลาหรือหลังจากวันที่และเวลาที่ระบุ ไม่ใช่วันที่ที่หัวข้อนั้นถูกเผยแพร่ เพื่อใช้พารามิเตอร์นี้, ต้องระบุพารามิเตอร์ sortBy และตั้งค่าให้เป็น Date ด้วย
sortBy ส่งคืนค่าตามวันจากใหม่ไปเก่า Date , ส่งคืนหัวข้อข่าวที่จัดเรียงตามความเกี่ยวข้อง Relevance 
*/
async function searchBingNews(
  q,
  since = null,
  count = 100,
  originalImg = true,
  sortBy = 'Relevance',
  numKey = 0
) {
  if (numKey >= apiKey.bingSearchKey.length) {
    numKey = 0;
  }
  // ถ้ามี & จะทำให้ api error
  if (q.indexOf('&') != -1) {
    q = q.replaceAll('&', ' and ');
  }
  if (since != null) {
    url += `&since=${since}`;
    sortBy = 'Date';
  }
  let url =
    apiKey.bingSearchEndpoint +
    `&q=${q}&count=${count}&originalImg=${originalImg}&sortBy=${sortBy}`;

  try {
    const response = await axios.get(url, {
      headers: { 'Ocp-Apim-Subscription-Key': apiKey.bingSearchKey[numKey] },
    });
    return response.data;
  } catch (error) {
    console.error(
      'BING SEARCH NEWS API ERROR STATUS : ',
      error.response.status,
      ' || STATUS TEXT : ',
      error.response.statusText
    );
    return null;
  }
}

//ค้นคำที่รับมาก่อน ถ้าไม่เจอค่อยแปลแล้วค้นใหม่
async function bingSearch(q, word, since = null) {
  // let start = process.hrtime();
  let msg = '';
  let total = 0;
  let query = '';
  let queryEng = '';
  let sumQ = q;
  let data;
  msg += 'Bing ค้นด้วย : ' + q;
  query = word.join('|');
  if (q.indexOf(' ') != -1) {
    sumQ = `"${q}"`;
  }
  if (q != query && query.length != 0) {
    msg += ' และ ( ' + query + ' ) ';
    sumQ += '|' + query;
  }
  data = await searchBingNews(sumQ, since);
  total += data.value.length;
  msg += ` ได้ผลลัพธ์ทั้งหมด : ${total}`;
  if (total == 0) {
    queryEng = await translate.translateText(q, false, 'en');
    sumQ = queryEng;
    if (queryEng.indexOf(' ') != -1) {
      sumQ = `"${queryEng}"`;
    }
    if (queryEng != q) {
      total = 0;
      msg += 'ค้นต่อด้วย Eng : ' + queryEng;
      word = await Promise.all(
        word.map((i) => translate.translateText(i, false, 'en'))
      );
      query = word.join('|');
      if (queryEng != query && query.length != 0) {
        sumQ += '|' + query;
        msg += ' และ ( ' + query + ' ) ';
      }
      console.log(sumQ);
      data = await searchBingNews(sumQ, since);
      total += data.value.length;
      msg += ` ได้ผลลัพธ์ทั้งหมด : ${total}`;
    }
  }
  console.log(msg);
  // let [seconds, nanoseconds] = process.hrtime(start);
  // console.log(msg, ' เวลาที่ใช้ ', seconds + nanoseconds / 1000000000, ' วิ');
  return data;
}

async function addNews(response, searchText) {
  if (response != null) {
    let task = [];
    const category = newsConfig.getCategory();

    for (let index = 0; index < response.value.length; index++) {
      const responseValue = response.value[index];
      task.push(processNews(responseValue, searchText, category));
    }
    await Promise.all(task);
  }
}

async function processNews(responseValue, searchText, category) {
  let repeatedNews = false; // true ข่าวซ้ำ
  //ค้นว่าข่าวซ้ำไม ถ้าซ้ำจะกำหนดค่า repeatedNews เป็น true
  let queryRes = await connectPool.query(
    'SELECT news_id FROM news WHERE title = ? AND news_url = ? LIMIT 2',
    [responseValue.name, responseValue.url]
  );
  //ถ้ามีผลลัพธ์จากการค้นหาด้วยชื่อหัวข่าว กับ urlข่าว แปลว่าเป็นข่าวซ้ำ
  if (queryRes[0].length != 0) {
    repeatedNews = true;
  }
  if (!repeatedNews) {
    if (responseValue.name != searchText) {
      let newsValue = [];
      newsValue.push(responseValue.name);
      newsValue.push(responseValue.description);
      if (responseValue.image == undefined || responseValue.image == null) {
        newsValue.push(null);
      } else {
        newsValue.push(responseValue.image.contentUrl);
      }
      newsValue.push(responseValue.url);
      //datePublished มีค่าเป็น 2025-01-01T01:59:41.0000000Z เลยต้องตัดให้เหลือ 2025-01-01T01:59:41 ก็คือตัดเอาตำแหน่ง 0 - 19 แล้วเอา T ตรงกลางออก
      let pubDate = new Date(responseValue.datePublished)
        .toISOString()
        .slice(0, 19)
        .replace('T', ' ');
      newsValue.push(pubDate);
      const queryRes = await connectPool.query(
        'INSERT INTO news (title,description,img_url,news_url,pub_date) VALUES (? ,? ,? ,? ,? )',
        newsValue
      );
      const idNews = queryRes[0].insertId;
      // console.log(idNews);
      insertInfoNews(idNews, responseValue, category);
    }
  }
}

async function insertInfoNews(idNews, responseValue, category) {
  try {
    let task = [];

    if (responseValue.provider == undefined || responseValue.provider == null) {
      task.push(
        connectPool.query(
          'INSERT INTO news_source (news_id,source_name) VALUES (?,?)',
          [idNews, 'Unkown']
        )
      );
    } else {
      let source = await connectPool.query(
        'SELECT source_name FROM sources WHERE source_name = ?',
        [responseValue.provider[0].name]
      );
      if (source[0].length === 0) {
        let sourceValue = [responseValue.provider[0].name];
        if (
          responseValue.provider[0].image == undefined ||
          responseValue.provider[0].image == null
        ) {
          sourceValue.push(null);
        } else {
          sourceValue.push(
            responseValue.provider[0].image.thumbnail.contentUrl
          );
        }
        await connectPool.query(
          'INSERT IGNORE INTO sources (source_name,source_icon) VALUES (? ,? )',
          sourceValue
        );
      }
      task.push(
        connectPool.query(
          'INSERT INTO news_source (news_id,source_name) VALUES (?,?)',
          [idNews, responseValue.provider[0].name]
        )
      );
    }
    //เพิ่มข้อมูลหมวดหมู่
    if (responseValue.category == undefined || responseValue.category == null) {
      task.push(
        connectPool.query(
          'INSERT INTO news_category (news_id,category_id) VALUES (?,?)',
          [idNews, 17]
        )
      ); //17 คือ อื่นๆ
    } else {
      if (category.get(responseValue.category) == undefined) {
        task.push(
          connectPool.query(
            'INSERT INTO news_category (news_id,category_id) VALUES (?,?)',
            [idNews, 17]
          )
        ); //17 คือ อื่นๆ
      } else {
        task.push(
          connectPool.query(
            'INSERT INTO news_category (news_id,category_id) VALUES (?,?)',
            [idNews, category.get(responseValue.category)]
          )
        );
      }
    }
    //เพิ่มข้อมูลประเทศ
    let tra = await translate.translateText(responseValue.name, true);
    if (tra.detect == 'th') {
      task.push(
        connectPool.query(
          'INSERT INTO country_news (news_id,country_code) VALUES (?,?)',
          [idNews, 'th']
        )
      );
    } else {
      task.push(
        connectPool.query(
          'INSERT INTO country_news (news_id,country_code) VALUES (?,?)',
          [idNews, 'wo']
        )
      );
    }
    task.push(
      connectPool.query('UPDATE news SET title_th = ? WHERE news_id = ?', [
        tra.text,
        idNews,
      ])
    );
    await Promise.all(task);

    console.log('INSERT NEWSID FROM SEARCH = ', idNews);
  } catch (error) {
    console.error('ERROR INSERT INFO NEWS FROM SEARCH : ', error);
  }
}

module.exports.searchBingNews = searchBingNews;
module.exports.bingSearch = bingSearch;
module.exports.addNews = addNews;
