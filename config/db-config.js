const mysql = require('mysql2');
const serverConfig = require('./server-config');

const connectdb = mysql.createConnection({
  host: serverConfig.dbHost,
  user: serverConfig.dbUser,
  password: serverConfig.dbPass,
  database: serverConfig.dbName,
});
connectdb.connect((err) => {
  if (err) {
    console.error('Error connecting to the Database', err);
  }
  console.log('Connect to database success');
});

module.exports = connectdb;
