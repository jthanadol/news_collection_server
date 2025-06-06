const mysql = require('mysql2');
const configServer = require('./server-config');

const pool = mysql.createPool({
  host: configServer.dbHost,
  user: configServer.dbUser,
  password: configServer.dbPass,
  database: configServer.dbName,
  waitForConnections: true, //ให้รอคิวได้
  connectionLimit: 30, //จำนวนช่องเชื่อมต่อ
  queueLimit: 0, //จำนวนคิว 0 คือไม่จำกัด
  ssl: {},
});

module.exports = pool.promise();
