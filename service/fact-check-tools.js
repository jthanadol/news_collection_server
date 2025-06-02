const axios = require('axios');
const apiKey = require('../config/api-key');
const translate = require('./translate-text');

/* 
query ข้อความที่จะค้น ต้องระบุเว้นแต่จะระบุ reviewPublisherSiteFilter ไว้
languageCode รหัสภาษา BCP-47 เช่น "en-US" ใช้เพื่อจํากัดผลลัพธ์ตามภาษา
reviewPublisherSiteFilter domain เว็บไซต์ของผู้เผยแพร่ตรวจสอบเพื่อกรองผลลัพธ์ 
maxAgeDays อายุสูงสุดของผลการค้นหาที่ส่งคืน หน่วยเป็นวัน
pageSize ขนาดผลลัพธ์ ค่าเริ่มต้นจะเป็น 10
pageToken ส่ง nextPageToken กลับมาจากคําขอลิสต์ก่อนหน้าเพื่อไปยังหน้าถัดไป
offset
*/

async function getFactCheck(
  query,
  pageToken,
  languageCode,
  reviewPublisherSiteFilter,
  maxAgeDays,
  pageSize,
  offset
) {
  let url = apiKey.factCheckToolEndpoint;
  if (query != undefined) {
    if (query.indexOf('&') != -1) {
      query = query.replaceAll('&', ' and ');
    }
    if (query.indexOf('#') != -1) {
      query = query.replaceAll('#', '-');
    }
    if (query.indexOf('?') != -1) {
      query = query.replaceAll('?', '');
    }
    url += `query=${query}&`;
  }
  if (languageCode != undefined) {
    url += `languageCode=${languageCode}&`;
  }
  if (reviewPublisherSiteFilter != undefined) {
    url += `reviewPublisherSiteFilter=${reviewPublisherSiteFilter}&`;
  }
  if (maxAgeDays != undefined) {
    url += `maxAgeDays=${maxAgeDays}&`;
  }
  if (pageSize != undefined) {
    url += `pageSize=${pageSize}&`;
  }
  if (pageToken != undefined) url += `pageToken=${pageToken}&`;
  if (offset != undefined) {
    url += `offset=${offset}&`;
  }
  url += `key=${apiKey.factCheckToolKey}`;
  try {
    const data = await axios.get(url);
    return data.data;
  } catch (error) {
    console.log(
      'FACT CHECK TOOLS ERROR STATUS : ',
      error.response.status,
      ' || STATUS TEXT : ',
      error.response.statusText
    );

    console.error(query);

    return null;
  }
}

async function checkNews(title, dateNews) {
  let data = await getFactCheck(title);
  //ตรวจสอบว่าเจอไม
  if (!data?.claims) {
    const titleEng = await translate.translateText(title, true, 'en');
    //ไม่เจอแล้วเป็นข่าวไทย
    if (titleEng.detect == 'th') {
      data = await getFactCheck(titleEng.text);
    }
  }
  //ถ้ามีค่าจะวนเอาข้อมูลการตรวจสอบที่มีเวลาน้อยกว่าข่าวออก
  if (data?.claims) {
    // console.log(data);
    for (let index = 0; index < data.claims.length; index++) {
      //filter ใช้กรอกข้อมูลใน array ถ้า function ข้างใน return true คือ เอา
      data.claims[index].claimReview = data.claims[index].claimReview.filter((item) => {
        //ถ้า reviewDate มี
        if (item.reviewDate) {
          return new Date(item.reviewDate).getTime() >= new Date(dateNews).getTime();
        } else {
          return new Date(item.claimDate).getTime() >= new Date(dateNews).getTime();
        }
      });
      if (data.claims[index].claimReview.length === 0) {
        //splice ใช้ลบ array โดยเริ่มตำแหน่งเท่าไร และลบออกกี่ตัว
        data.claims.splice(index, 1);
        index--;
      }

    }
    // console.log('เวลาข่าว : ' + dateNews + ' ผลลัพธ์ ');
    // console.log(data);
  }
  return data;
}

module.exports.getFactCheck = getFactCheck;
module.exports.checkNews = checkNews;
