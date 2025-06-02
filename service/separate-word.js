const axios = require('axios');
const apiKey = require('../config/api-key');

//text ข้อความที่จะตัดคำ || noun true คือเอาคำนาม false คือเอาทั้งหมด
async function separateWord(text, getNoun, numKey = 0) {
  try {
    const response = await axios.post(apiKey.tposEndpoint, `text=${text}`, {
      headers: {
        Apikey: apiKey.aiForThaiKey[numKey],
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    if (getNoun) {
      let noun = [];
      for (let index = 0; index < response.data.words.length; index++) {
        const element = response.data.words[index];
        if (
          response.data.tags[index] === 'FWN' ||
          response.data.tags[index] === 'NN'
        ) {
          noun.push(element);
        }
      }
      return noun;
    } else {
      return response.data.words;
    }
  } catch (error) {
    if (error.response) {
      console.error('TLex++ API ERROR STATUS : ', error.response.status, ' || STATUS TEXT : ', error.response.statusText);
      if (error.response.status === 429) {
        if (numKey === apiKey.aiForThaiKey.length - 1) {
          numKey = 0;
        } else {
          numKey++;
        }
        return separateWord(text, getNoun, numKey);
      }
    }
    else {
      console.error('TLex++ API ERROR : ', error);
    }
    return null;
  }

}

module.exports.separateWord = separateWord;
