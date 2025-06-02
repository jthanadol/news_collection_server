const express = require('express');
const cron = require('node-cron');
const { readdirSync } = require('fs');
const serverConfig = require('./config/server-config');
const fetchNewsData = require('./service/fetch-newsdata');
let searchTextENGToday = require('./config/array-field').searchTextENGToday;

const port = serverConfig.serverPort;
const app = express();


app.use(express.json());

readdirSync('./routes').map((file) => app.use(require('./routes/' + file)));

app.listen(port, () => {
  console.log(`RUN SERVER AT PORT ${port}`);
});

// fetchNewsData.fetchNews()
//ดึงข่าวทุกๆ 00.00 น. ของทุกวัน
cron.schedule('0 0 * * *', () => {
  console.log('เริ่มดึงข่าวประจำวัน ณ 12.00 น.');
  fetchNewsData.fetchNews();

  searchTextENGToday.length = 0;
});
