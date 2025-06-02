const express = require('express');
const router = express.Router();
const url = require('url');
const factCheck = require('../service/fact-check-tools');
const translate = require('../service/translate-text');

router.get('/factcheck', async (req, res) => {
  const { query } = url.parse(req.url, true);
  if (query.query != undefined && query.query != '') {
    let factData;
    let factDataTh;
    try {
      //"th-TH,en-US"
      if (query.nextPage != undefined && query.nextPage != '') {
        factData = await factCheck.getFactCheck(query.query, query.nextPage);
      } else {
        factData = await factCheck.getFactCheck(query.query, undefined);
      }
      if (factData === null || factData.claims === undefined) {
        res.status(200).json({ fact_check: null, fact_check_th: null });
      } else {
        factDataTh = JSON.parse(JSON.stringify(factData)); //copy object โดยการแปลงเป็น json string แล้วแปลงเป็น object ใน javascript
        for (let i = 0; i < factDataTh.claims.length; i++) {
          factDataTh.claims[i].text = await translate.translateText(
            factDataTh.claims[i].text
          );
          for (let j = 0; j < factDataTh.claims[i].claimReview.length; j++) {
            if (factDataTh.claims[i].claimReview[j].languageCode != 'th') {
              factDataTh.claims[i].claimReview[j].title =
                await translate.translateText(
                  factDataTh.claims[i].claimReview[j].title
                );
              factDataTh.claims[i].claimReview[j].textualRating =
                await translate.translateText(
                  factDataTh.claims[i].claimReview[j].textualRating
                );
            }
          }
        }
        console.log('ส่งข้อมูลผลลัพธ์การค้นหากับ Fact Check สำเร็จ');
        res
          .status(200)
          .json({ fact_check: factData, fact_check_th: factDataTh });
      }
    } catch (error) {
      res.status(500).json({ msg: error });
    }
  } else {
    res.status(400).json({ msg: 'ไม่ได้ใส่ parameter query' });
  }
});

module.exports = router;
