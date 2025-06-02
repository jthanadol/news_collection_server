const express = require('express');
const router = express.Router();
const url = require('url');
const connectdb = require('../config/db-config');

router.get('/searchHistory', (req, res) => {
  const { query } = url.parse(req.url, true);
  try {
    if (!query.accountId) {
      res.status(500).json({ history: [] });
    } else {
      connectdb.query(
        'SELECT search_text, search_date FROM search_history WHERE account_id = ?',
        [query.accountId],
        (err, result) => {
          if (err) {
            res.status(500).json({ history: [] });
          } else {
            res.status(200).json({ history: result });
          }
        }
      );
    }
  } catch (error) {
    res.status(500).json({ history: [] });
  }
});

router.get('/popularSearch', (req, res) => {
  try {
    connectdb.query(
      'SELECT search_text FROM search_history GROUP BY search_text ORDER BY count(search_text) DESC',
      (err, result) => {
        if (err) {
          res.status(500).json({ result: [] });
        } else {
          res.status(200).json({ result: result });
        }
      }
    );
  } catch (error) {
    res.status(500).json({ result: [] });
  }
});

router.delete('/deleteSearchHistory', (req, res) => {
  const { query } = url.parse(req.url, true);
  try {
    if (!query.accountId) {
      res.status(400).json({ msg: 'ข้อมูลไม่ครบ' });
    } else {
      connectdb.query(
        'DELETE FROM search_history WHERE account_id = ?',
        [query.accountId],
        (err, result) => {
          if (err) {
            res.status(500).json({ msg: 'ลบไม่สำเร็จ' });
          } else {
            res.status(200).json({ msg: 'ลบสำเร็จ' });
          }
        }
      );
    }
  } catch (error) {
    res.status(500).json({ msg: 'เกิดข้อผิดพลาดบางอย่าง' });
  }
});

module.exports = router;
