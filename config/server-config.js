require('dotenv').config();

module.exports = {
  dbHost: process.env.DB_HOST,
  dbUser: process.env.DB_USER,
  dbPass: process.env.DB_PASS,
  dbName: process.env.DB_NAME,

  serverIp: process.env.SERVER_IP,
  serverPort: process.env.SERVER_PORT,

  emailUser: process.env.EMAIL_USER,
  emailPass: process.env.EMAIL_PASS,
};
