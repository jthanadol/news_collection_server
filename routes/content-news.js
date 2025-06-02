const express = require('express');
const router = express.Router();
const url = require('url');
const connectdb = require('../config/db-config');
const scrape = require('../service/web-scraping');
const translate = require('../service/translate-text');

//id คือ id ข่าวที่จะเอาเนื้อหา
router.get('/content', async (req, res) => {
  const { query } = url.parse(req.url, true);
  if (query.id != undefined) {
    let data = await connectdb
      .promise()
      .query(
        'SELECT news_id, title, news_url, content, content_th FROM news WHERE news_id = ?',
        [query.id]
      );
    data = data[0][0];
    console.log(data);
    if (data.content === null || data.content.trim() === '') {
      data.content = await scrape.scrapeWeb(data.news_url, data.title);
      data.content.trim();
      if (data.content === '') {
        data.content_th = '';
      } else {
        data.content_th = await translate.translateText(data.content);
        connectdb.query(
          'UPDATE news SET content = ? , content_th = ? WHERE news_id = ?',
          [data.content, data.content_th, query.id]
        );
      }

    } else {
      if (data.content_th === null) {
        data.content_th = await translate.translateText(data.content);
        connectdb.query('UPDATE news SET content_th = ? WHERE news_id = ?', [
          data.content_th,
          query.id,
        ]);
      }
    }
    console.log('ส่งเนื้อข่าวสำเร็จ');
    res.status(200).json({ data: data });
  } else {
    res.status(400).json({ msg: 'โปรดระบุ ID ข่าว' });
  }
});

module.exports = router;
