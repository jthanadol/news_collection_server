const axios = require('axios');
const fs = require('fs');
const path = require('path');
const gTTS = require('gtts');
const { spawn } = require('child_process');
const translate = require('./translate-text');
const apiKey = require('../config/api-key');
const separateWord = require('./separate-word');
const connectdb = require('../config/db-config');

class TextToSpeech {
  constructor() {
    this.queue = [];
    this.isProcessing = false;
    this.connectdb = connectdb;
  }

  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async getVaja9Api(
    newsId,
    fileName,
    key,
    inputText, //ข้อความที่ต้องการสังเคราะห์เสียง (สูงสุดไม่เกิน 300 ตัวอักษร)
    speaker = 0, //ประเภทของเสียงที่ต้องการ | 0 = เสียงผู้ชาย | 1 = เสียงผู้หญิง | 2 = เสียงเด็กผู้ชาย | 3 = เสียงเด็กผู้หญิง
    phraseBreak = 0, //ประเภทของการหยุดเว้นวรรค | 0 = หยุดเว้นวรรคแบบอัตโนมัติ | 1 = ไม่หยุดเว้นวรรค
    audiovisual = 0 //ประเภทของโมเดล | 0 = โมเดลสังเคราะห์เสียง | 1 = โมเดลสังเคราะห์เสียง และภาพ
  ) {
    try {
      let response = await axios.post(
        apiKey.vaja9Endpoint,
        {
          input_text: inputText,
          speaker: speaker,
          phrase_break: phraseBreak,
          audiovisual: audiovisual,
        },
        {
          headers: {
            Apikey: apiKey.aiForThaiKey[key[0]],
            'Content-Type': 'application/json',
          },
        }
      );
      console.log(response.data);

      response = await axios({
        method: 'GET',
        url: response.data.wav_url,
        responseType: 'stream',
        headers: { Apikey: apiKey.aiForThaiKey[key[1]] },
      });
      const dir = path.dirname(
        './audios/' + newsId + '/th/' + fileName + '.wav'
      );
      //ตรวจสอบว่ามีโฟลเดอร์ที่จะเก็บไฟล์ไมด้วย .existsSync
      if (!fs.existsSync(dir)) {
        //ถ้าไม่มีจะสร้างโฟลเดอร์ขึ้นมา
        fs.mkdirSync(dir, { recursive: true });
      }
      //เตรียมเขียนไฟล์
      const write = fs.createWriteStream(
        './audios/' + newsId + '/th/' + fileName + '.wav'
      );
      //นำข้อมูลจาก stream ไปเขียน
      response.data.pipe(write);
      console.log(
        'ดาวน์โหลดไฟล์เสร็จสิ้น ',
        './audios/' + newsId + '/th/' + fileName + '.wav'
      );
      return './audios/' + newsId + '/th/' + fileName + '.wav';
    } catch (error) {
      console.log('TextToSpeech Error', error);
      return '';
    }
  }

  async intoThaiAudio(newsId, title, content) {
    content = title + ' ' + content;
    content = content.replaceAll(' \n ', ' '); //เอาขึ้นบรรทัดใหม่ออก
    content = content.replaceAll("'", '');
    content = content.replaceAll('"', '');
    content = content.replaceAll('%', 'เปอร์เซ็นต์');

    let textArray = []; //array ที่ใช้เก็บข้อความที่ถูกแบ่งจาก content โดนข้อความแต่ละชุดจะยาวไม่เกิน 150 ตัวอักษร
    const textLimit = 150; //ความยาวข้อความที่จะนำไปแปลง
    let sumLength = 0; //จำนวนตัวอักษรที่ถูกแปลงเป็นเสียงแล้ว
    let text = '';
    let indexOfLastWord = 0; //ตำแหน่งคำสุดท้าย
    let word = [];
    console.log(content);
    while (sumLength < content.length) {
      if (sumLength + textLimit < content.length) {
        text = content.slice(sumLength, sumLength + textLimit);
        word = await separateWord.separateWord(text.replaceAll('&', ' ').trim(), false);
        indexOfLastWord = content.lastIndexOf(word[word.length - 2], sumLength + textLimit);
        text = content.slice(sumLength, indexOfLastWord);
        // console.log(text)
        sumLength += text.length;
      } else {
        text = content.slice(sumLength, content.length);
        sumLength += text.length;
      }
      console.log('sumLength : ', sumLength, ' + เพิ่มจาก : ', text.length);
      console.log('content.length : ', content.length);
      text = text.trim();
      if (text.length != 0) {
        textArray.push(text);
      }
    }
    console.log(textArray);
    let vaja9 = [];
    let numKey;
    for (let i = 0; i < textArray.length;) {
      numKey = 0;
      vaja9 = [];
      for (let j = 0; j < apiKey.aiForThaiKey.length / 2; j++) {
        if (i >= textArray.length) {
          break;
        }
        console.log('แปลง : ', textArray[i]);
        vaja9.push(this.getVaja9Api(newsId, i, [numKey, numKey + 1], textArray[i]));
        numKey += 2;
        i++;
      }
      vaja9 = await Promise.all(vaja9);
      await this.delay(1000); //หยุด 1 วิ
    }



    await new Promise((resolve, reject) => {
      const pythonProcess = spawn("python", ["./merge-audio-file.py", './audios/' + newsId + '/th', './audios/' + newsId + '/th/' + newsId + '.wav']);
      // อ่าน output จาก Python
      pythonProcess.stdout.on("data", (data) => {
        console.log(`Python Output: \n${data}`);
      });

      // แจ้งเตือนเมื่อ process จบ
      pythonProcess.on("close", (code) => {
        // console.log(`Process exited with code ${code}`);
        if (code === 0) {
          resolve("merge file sucess");
        }
        else {
          reject("merge file error")
        }
      });
    });
    console.log("แปลงไฟล์สำเร็จ")
  }

  async intoEngAudio(newsId, title, content) {
    const dir = path.dirname('./audios/' + newsId + '/en/' + newsId + '.mp3');
    //ตรวจสอบว่ามีโฟลเดอร์ที่จะเก็บไฟล์ไมด้วย .existsSync
    if (!fs.existsSync(dir)) {
      //ถ้าไม่มีจะสร้างโฟลเดอร์ขึ้นมา
      fs.mkdirSync(dir, { recursive: true });
    }
    const data = await translate.translateText(title, true);
    if (data.detect == 'en') {
      content = title + ' ' + content;
      content = content.replaceAll(' \n ', ' ');
      let gtts = new gTTS(content, 'en');
      gtts.save(
        './audios/' + newsId + '/en/' + newsId + '.mp3',
        function (err, result) {
          if (err) {
            console.log(err);
          }
          console.log('สร้างไฟล์ eng สำเร็จ ' + './audios/' + newsId + '/en/' + newsId + '.mp3');
        }
      );
    }
  }

  async processQueue() {
    //ถ้าทำงานอยู่ isProcessing จะเป็น true
    if (this.isProcessing) {
      //return ออกเพราะ processQueue ทำงานอยู่
      return;
    }

    this.isProcessing = true;
    while (this.queue.length > 0) {
      console.log(this.queue);
      const newsId = this.queue[0];
      try {
        const response = await this.connectdb.promise().query(
          'SELECT title, title_th, content, content_th,audio_path FROM news WHERE news_id = ?',
          [newsId]
        );
        if (response[0][0].audio_path != null && response[0][0].audio_path != '') {
          console.log('มีไฟล์แล้ว');
        } else {
          if (response[0][0].content != null && response[0][0].content.trim() != '') {
            await Promise.all([
              this.intoEngAudio(newsId, response[0][0].title, response[0][0].content),
              this.intoThaiAudio(newsId, response[0][0].title_th, response[0][0].content_th),
            ]);
            this.connectdb.query(
              'UPDATE news SET audio_path = ? WHERE news_id = ?',
              [`./audios/${newsId}`, newsId],
              (err, result) => {
                if (err) {
                  console.log('update file path error : ', err);
                }
                console.log('เพิ่ม file path ลง db : ', newsId);
              }
            );
          } else {
            this.connectdb.query(
              'UPDATE news SET audio_path = ? WHERE news_id = ?',
              ['', newsId]
            );
          }
        }
      } catch (error) {
        console.log('text to speech error : ', error);
      }
      this.queue.shift(); //เอาตัวแรก array ออก
    }
    this.isProcessing = false;
  }

  addQueue(newsId) {
    if (!this.queue.includes(newsId)) {
      //เพิ่มคิว
      this.queue.push(newsId);
      //เรียกใช้ processQueue
      this.processQueue();
    }
  }
}

module.exports = TextToSpeech;
