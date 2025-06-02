const axios = require('axios');
const apiKey = require('../config/api-key');

const urlTranslate = apiKey.translateEndpoint;
const apiTranslateKey = apiKey.translateKey;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

//method แปลภาษา โดยรับ text เป็นข้อความที่จะแปล || to เป็นภาษาผลลัพธ์การแปล || from เป็นภาษาของ text
//getDetect คือ เอาผลการตรวจสอบภาษาด้วย
async function translateText(
  text,
  getDetect = false,
  to = 'th',
  from = null,
  numKey = 0
) {
  let url = urlTranslate + `&to=${to}`;
  if (from != null) {
    url += `&from=${from}`;
  }

  const body = [{ text: text }];

  try {
    const data = await axios.post(url, body, {
      headers: {
        'Content-type': 'application/json',
        'Ocp-Apim-Subscription-Key': apiTranslateKey[numKey].key,
        'Ocp-Apim-Subscription-Region': apiTranslateKey[numKey].region,
      },
    });
    if (getDetect) {
      return {
        text: data.data[0].translations[0].text,
        detect: data.data[0].detectedLanguage.language,
      };
    } else {
      return data.data[0].translations[0].text;
    }
  } catch (error) {
    console.log(
      'TRANSLATE TEXT API ERROR STATUS : ',
      error.response.status,
      ' || STATUS TEXT : ',
      error.response.statusText
    );
    //bad req 400 เป็นเพราะข้อมูลที่ส่งไปแปลไม่ถูกต้อง
    if (error.response.status == 400) {
      console.log('Translate error 400 text : ', text);
      return '';
    } else {
      if (numKey == apiTranslateKey.length - 1) {
        await delay(1000);
        return await translateText(
          text,
          getDetect,
          (to = 'th'),
          (from = null),
          0
        );
      } else {
        numKey++;
        return await translateText(
          text,
          getDetect,
          (to = 'th'),
          (from = null),
          numKey
        );
      }
    }
  }
}

module.exports.translateText = translateText;
