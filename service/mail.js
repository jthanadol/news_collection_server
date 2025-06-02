const nodemailer = require('nodemailer');
const serverConfig = require('../config/server-config');

const domainName = 'http://' + serverConfig.serverIp + ':' + serverConfig.serverPort;
const transport = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: serverConfig.emailUser,
    pass: serverConfig.emailPass, //ใส่รหัสผ่านสำหรับแอปของ google
  },
});

async function sendMailVerify(accountId, mailAddress) {
  const verifyUrl = domainName + '/verify?id=' + accountId + '&verify=1';
  try {
    const mail = await transport.sendMail({
      from: 'thanadol1444@gmail.com',
      to: mailAddress,
      subject: 'ยืนยันการสมัครสมาชิก News app',
      html: `
            <h2>โปรดกดลิ้งเพื่อยืนยันการสมัครสมาชิก</h2>
            <br>
            <a href="${verifyUrl}">ลิ้งยืนยันการสมัคร</a>
            <br>
            <h4>ขอบคุณที่ใช้บริการ</h4>
            `,
    });

    console.log('ส่งอีเมลยืนยันตัวตนสำเร็จ:', mail.messageId);
  } catch (error) {
    console.error('ส่งอีเมลล้มเหลว:', error);
  }
}

async function sendMailOTP(mailAddress, otpCode) {
  try {
    const mail = await transport.sendMail({
      from: 'thanadol1444@gmail.com',
      to: mailAddress,
      subject: 'OTP เปลียนรหัสผ่านบัญชี News App',
      html: `
            <h2>รหัส OTP นี้ใช้สำหรับการเปลี่ยนรหัสผ่านบัญชี News App</h2>
            <br>
            <h3>${otpCode}</h3>
            <br>
            <h4>ขอบคุณที่ใช้บริการ</h4>
            `,
    });

    console.log('ส่งอีเมล OTP สำเร็จ:', mail.messageId);
  } catch (error) {
    console.error('ส่งอีเมลล้มเหลว:', error);
  }
}

module.exports.sendMailVerify = sendMailVerify;
module.exports.sendMailOTP = sendMailOTP;
