const express = require('express');
const router = express.Router();
const url = require('url');
const fs = require('fs');
const path = require('path');
const connectdb = require('../config/db-config');
const TextToSpeech = require('../service/text-to-speech');

let textToSpeech = new TextToSpeech();
//มี parameter เป็น id ของข่าว
router.get('/audio', (req, res) => {
  const { query } = url.parse(req.url, true);
  connectdb.query(
    'SELECT audio_path FROM news WHERE news_id = ?',
    [query.id],
    (err, result) => {
      if (err) {
        console.log('ขอไฟล์ error : ', err);
        res.status(500).json({ msg: 'ส่งรายชื่อไฟล์ไม่สำเร็จ' });
      }
      if (result[0].audio_path != null) {
        if (result[0].audio_path === '') {
          textToSpeech.addQueue(query.id);
          res.status(202).json({
            msg: 'ไม่สามารแปลงเสียงได้',
            path: '',
            fileTH: null,
            fileEN: null,
          });
        } else {
          try {
            const fileTH = fs.readdirSync(result[0].audio_path + '/th');
            const fileEN = fs.readdirSync(result[0].audio_path + '/en');
            // console.log(fileTH);
            // console.log(fileEN);
            if (fileTH.length != 0) {
              console.log('ส่งไฟล์เสียงแล้ว : ', result[0].audio_path);
              res.status(200).json({
                msg: 'ส่งรายชื่อไฟล์สำเร็จ',
                path: result[0].audio_path,
                fileTH: (fileTH.length === 0) ? null : fileTH[0],
                fileEN: (fileEN.length === 0) ? null : fileEN[0],
              });
            } else {
              connectdb.query(
                'UPDATE news SET audio_path = ? WHERE news_id = ?',
                ['', query.id],
                (err, result) => {
                  textToSpeech.addQueue(query.id);
                  res.status(202).json({
                    msg: 'กำลังทำการแปลงเสียง',
                    path: '',
                    fileTH: null,
                    fileEN: null,
                  });
                }
              );
            }

          } catch (error) {
            connectdb.query(
              'UPDATE news SET audio_path = ? WHERE news_id = ?',
              ['', query.id],
              (err, result) => {
                textToSpeech.addQueue(query.id);
                res.status(202).json({
                  msg: 'กำลังทำการแปลงเสียง',
                  path: '',
                  fileTH: null,
                  fileEN: null,
                });
              }
            );

          }

        }
      } else {
        textToSpeech.addQueue(query.id);
        res.status(202).json({
          msg: 'กำลังทำการแปลงเสียง',
          path: '',
          fileTH: null,
          fileEN: null,
        });
      }
    }
  );
});

router.get('/audios/:dirname/:language/:filename', (req, res) => {
  const dirName = req.params.dirname;
  const language = req.params.language;
  const fileName = req.params.filename;
  try {
    //__dirname คือที่อยู่ของ dir ที่ server.js อยู่
    const filePath = path.join(
      __dirname,
      '..',
      'audios',
      dirName,
      language,
      fileName
    );
    const fileSize = fs.statSync(filePath).size;
    const type = fileName.indexOf('.wav') != -1 ? 'audio/wav' : 'audio/mp3';
    res.writeHead(200, {
      'content-type': type,
      'content-length': fileSize,
    });
    const readStream = fs.createReadStream(filePath);
    console.log('ส่งไฟล์เสียงเรียบร้อย : ', filePath);
    readStream.pipe(res);
    readStream.on('error', (err) => {
      console.log('ส่งไฟล์ผิดพลาด : ', err);
      res.status(500).json({ msg: 'ส่งไฟล์ผิดพลาด' });
    });
  } catch (error) {
    console.log('ส่งไฟล์ผิดพลาด : ', error);
    res.status(500).json({ msg: 'ส่งไฟล์ผิดพลาด' });
  }
});

module.exports = router;
