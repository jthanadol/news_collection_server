const connectdb = require('../config/db-config');

function generateOTP(length = 6) {
  let otp = '';
  for (let index = 0; index < length; index++) {
    otp += Math.floor(Math.random() * 10);
  }
  return otp;
}

//ยกเลิก OTP เมื่อถึงเวลาที่กำหนด
function invalidateOTP(otp, accountId) {
  setTimeout(() => {
    connectdb.query(
      'SELECT otp FROM account WHERE account_id = ?',
      [accountId],
      (err, result) => {
        if (err) {
          console.log('ลบ OTP ผิดพลาด');
        }
        if (result[0].otp === otp) {
          connectdb.query(
            'UPDATE account SET otp = NULL WHERE account_id = ?',
            [accountId],
            (err, result) => {
              if (err) {
                console.log('ลบ OTP ผิดพลาด');
              }
              console.log('ลบ OTP สำเร็จ');
            }
          );
        } else {
          console.log('ไม่ลบ OTP เพราะไม่ตรงกับใน DB');
        }
      }
    );
  }, 600000); //600000 มิลลิวินาที คือ 10 นาที
}

module.exports.generateOTP = generateOTP;
module.exports.invalidateOTP = invalidateOTP;
