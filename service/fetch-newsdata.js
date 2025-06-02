const axios = require('axios');
const apiKey = require('../config/api-key');
const newsConfig = require('../config/news-config');
const dbPool = require('../config/db-pool-config');
// const scrapeWeb = require('../service/web-scraping');

// API Key ที่ได้รับจาก newsdata.io
const apiNewsDataKey = apiKey.newsDataKey;
const urlNewsData = apiKey.newsDataEndpoint;
const prioritydomain = 'top'; //เอาข่าวจากแหล่งข่าวชั้นนำ 10% แรกของ NewsData
const domainurl = 'bbc.com,reuters.com,nytimes.com,aljazeera.com'; //จำกัดเอาข่าวจาก BBC Reuters The New York Times และ Al Jazeera
const removeduplicate = 1; //1 เอาข่าวที่ซ้ำออก
let totalRepeatedNews = 0; //นับข่าวซ้ำ

//หยุดการทำงานตามเวลาที่กำหนดเช่นหยุด 15 นาที
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function processNews(news, category, country) {
  let repeatedNews = false; // true ข่าวซ้ำ
  //ค้นว่าข่าวซ้ำไม ถ้าซ้ำจะกำหนดค่า repeatedNews เป็น true
  let queryRes = await dbPool.query(
    'SELECT news_id FROM news WHERE title = ? AND news_url = ? LIMIT 2',
    [news.title, news.link]
  );

  //ถ้ามีผลลัพธ์จากการค้นหาด้วยชื่อหัวข่าว กับ urlข่าว แปลว่าเป็นข่าวซ้ำ
  if (queryRes[0].length != 0) {
    repeatedNews = true;
    totalRepeatedNews++; //นับข่าวซ้ำ
  }

  //ถ้าข่าวไม่ซ้ำจะนำข้อมูลลง database
  if (!repeatedNews) {
    //เพิ่มข้อมูลข่าวลง database
    //description คือคำอธิบายสั้นๆ แต่ถ้ายาวไปจะตัดออก
    if (news.description != null) {
      news.description =
        news.description.length > 16000
          ? news.description.substring(0, 16000) + '...'
          : news.description;
    }
    queryRes = await dbPool.query(
      'INSERT INTO news (title,description,img_url,news_url,pub_date) VALUES (? ,? ,? ,? ,? )',
      [news.title, news.description, news.image_url, news.link, news.pubDate]
    );
    const idNews = queryRes[0].insertId;
    // console.log('NewsID : ', idNews);
    insertInfoNews(
      idNews,
      country,
      category,
      news
    );

    //news.source_name, news.source_icon
  }
}

async function insertInfoNews(
  newsId,
  country,
  category,
  news
) {
  try {
    let source = await dbPool.query(
      'SELECT source_name FROM sources WHERE source_name = ?',
      [news.source_name]
    );
    if (source[0].length === 0) {
      if (news.source_name != null && news.source_name != '') {
        await dbPool.query(
          'INSERT IGNORE INTO sources (source_name,source_icon) VALUES (? ,? )',
          [news.source_name, news.source_icon]
        );
      }
    }
    if (news.source_name != null && news.source_name != '') {
      dbPool.query('INSERT INTO news_source (news_id,source_name) VALUES (?,?)', [
        newsId,
        news.source_name,
      ]);
    } else {
      dbPool.query('INSERT INTO news_source (news_id,source_name) VALUES (?,?)', [
        newsId,
        'Unkown',
      ]);
    }
    //... เป็นการทำให้ผลที่ได้ไม่เป็น [] จากข้างล่างผลที่ได้จะไม่เป็น [[],[]]
    await Promise.all([
      ...news.country.map((element) => {
        return dbPool.query(
          'INSERT INTO country_news (news_id, country_code) VALUES (?, ?)',
          [newsId, country.get(element.toLowerCase())]
        );
      }),
      ...news.category.map((element) => {
        return dbPool.query(
          'INSERT INTO news_category (news_id, category_id) VALUES (?, ?)',
          [newsId, category.get(element)]
        );
      }),
    ]);
    console.log('INSERT INFO NEWS SUCCESS : ', newsId);
  } catch (error) {
    console.error('ERROR INSERT INFO NEWS : ', error);
  }
}

async function fetchNews() {
  const category = await newsConfig.getCategory();
  const country = await newsConfig.getCountry();
  let timeFirstKeyLimit;

  let response; //เก็บข้อมูลการตอบกลับ
  let data; //ข้อมูลใน response
  let urlNews = ''; //url ที่จะใช้ดึงข่าว
  const countryCode = (
    await dbPool.query('SELECT country_code FROM country;')
  )[0].map((item) => item.country_code);
  let countError = 0; //จำนวนครั้งที่ error ถ้า error ติดกันเท่ากับจำนวน key ที่มีแปลว่า credit ของทุก key หมด
  let numKey = 0; //ใช้ระบุตำแหน่ง keyIndex

  let totalNews = 0; //เก็บจำนวนข่าว
  totalRepeatedNews = 0; //จำนวนข่าวที่ซ้ำ

  for (let index = 0; index < countryCode.length;) {
    if (urlNews == '') {
      urlNews =
        urlNewsData +
        `video=0&country=${countryCode[index]}&removeduplicate=${removeduplicate}`;

      //ข่าวต่างประเทศจะเอาภาษาอังกฤษ และจำกัดแหล่งข่าว
      if (countryCode[index] == 'th') {
        //prioritydomain=low คือ เอาข่าวจากแหล่งข่าว 50%แรก ของ newsdata
        urlNews += '&language=th&prioritydomain=low';
      } else {
        urlNews += `&language=en&domainurl=${domainurl}`;
      }
    }

    try {
      // ส่งคำขอ GET ไปยัง API
      response = await axios.get(urlNews + `&apikey=${apiNewsDataKey[numKey]}`);
      countError = 0; //reset countError เป็น 0 เพราะ ไม่เกิด error
      data = response.data;

      console.log('URL : ', urlNews + `&apikey=${apiNewsDataKey[numKey]}`);
      if (data.results.length == 0 && countryCode[index] != 'th') {
        //ถ้าข่าวต่างประเทศไม่มีจะค้นหาโดยจำกัดแหล่งข่าวเป็นแหล่งข่าวชั้นนำ 30% แรก
        if (urlNews.indexOf(`&language=en&domainurl=${domainurl}`) != -1) {
          urlNews =
            urlNewsData +
            `video=0&country=${countryCode[index]}&removeduplicate=${removeduplicate}&language=en&prioritydomain=${prioritydomain}`;

          response = await axios.get(
            urlNews + `&apikey=${apiNewsDataKey[numKey]}`
          );
          countError = 0;
          data = response.data;
          console.log('URL : ', urlNews + `&apikey=${apiNewsDataKey[numKey]}`);
        }
      }

      for (; ;) {
        //ถ้าไม่มีข่าวจะออกจาก loop
        if (data.results.length == 0) {
          break;
        }
        let task = [];
        for (const news of data.results) {
          task.push(processNews(news, category, country));
        }
        await Promise.all(task);

        //เช็คว่ามีข่าวหน้าถัดไปไม ถ้าไม่มีจะจบ loop
        if (data.nextPage != null) {
          if (urlNews.indexOf('&page=') != -1) {
            urlNews = urlNews.replace(/&page=.*/, ''); //ลบ string ตั้งแต่ &page= จนถึงตัวสุดท้าย
          }
          urlNews += `&page=${data.nextPage}`;
          response = await axios.get(
            urlNews + `&apikey=${apiNewsDataKey[numKey]}`
          );
          countError = 0; //reset countError เป็น 0 เพราะ .get ไม่ error
          data = response.data;
          console.log('URL : ', urlNews + `&apikey=${apiNewsDataKey[numKey]}`);
        } else {
          break;
        }
      }

      totalNews += data.totalResults; //นับจำนวนข่าว
      console.log('จำนวนข่าว ', totalNews);
      console.log('country code :', countryCode[index]);
      urlNews = ''; //reset url
      index++; //ถ้าดึงข่าวประเทศที่ index เสร็จจะ ไปดึงประเทศถัดไป
    } catch (error) {
      if (error.response) {
        console.log(
          'NEWSDATA API ERROR STATUS : ',
          error.response.status,
          ' || STATUS TEXT : ',
          error.response.statusText
        );
      } else {
        console.log('NEWSDATA API ERROR : ', error);
      }
      countError++;

      //เช็คว่า numKey เป็นตัวสุดท้ายไม
      if (numKey == apiNewsDataKey.length - 1) {
        //ถ้า countError เท่ากับจำนวน key ที่มี แปลว่า มี error key ทุกตัว error เพราะ credit หมด
        if (countError == apiNewsDataKey.length) {
          break;
        } else {
          // key ไม่ได้ error ติดกัน แต่ error เพราะ rate limit เกิน ทำให้ error ไม่ต่อเนื่อง แล้ว numKey เป็น key ตัวสุดท้าย จึงต้องหยุดรอ rate limit
          countError = 0;
          numKey = 0;
          const timeStop = 900000 - (Date.now() - timeFirstKeyLimit) + 60000; //หาเวลา cooldown limit ของ key ตัวแรกว่าเหลือเท่าไร แล้ว + ไปอีก 1 นาที
          if (timeStop > 0) {
            console.log('หยุดพัก ' + timeStop / 60000 + ' นาที');
            await delay(timeStop); //หยุดการทำงานเพื่อรอ rate limit api reset
            console.log('เริ่มทำงานต่อ');
          }
        }
      }
      //ถ้าไม่จะ numKey++ เพื่อขยับไป key ตัวถัดไป
      else {
        if (numKey === 0) {
          timeFirstKeyLimit = Date.now();
        }
        numKey++;
      }
    }
  }

  console.log('จบการทำงานการดึงข้อมูลข่าวประจำวัน');
  console.log('ผลลัพธ์การดึงข่าวจาก NewsData');
  console.log('จำนวนข่าวที่ซ้ำกับข่าวใน database : ', totalRepeatedNews);
  console.log('จำนวนข่าวทั้งหมดที่ได้จาก NewsData : ', totalNews);
}

module.exports.fetchNews = fetchNews;
