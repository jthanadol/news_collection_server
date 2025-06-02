const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const url = require('url');
const otpCode = require('../service/otp-generator');
const connectdb = require('../config/db-config');
const mail = require('../service/mail');

//endpoind สมัครสมาชิก โดยจะรับ parameter จาก body คือ email,password
router.post('/register', (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ msg: 'โปรดกรอกข้อมูลให้ครบ' });
    } else {
      //เช็คว่ามี email นี้อยู่แล้วไม
      connectdb.query(
        'SELECT account_id, email FROM account WHERE email = ? AND account_type = ?',
        [email, 'Email'],
        async (err, result) => {
          if (err) {
            res.status(500).json({ msg: 'มีข้อผิดพลาดบางอย่าง' });
          }
          if (result.length > 0) {
            res.status(400).json({ msg: 'มีอีเมลผู้ใช้นี้อยู่แล้ว' });
          } else {
            //เข้ารหัส 10 รอบ
            const hashedPassword = await bcrypt.hash(password, 10);

            connectdb.query(
              'INSERT INTO account (email, password, account_type) VALUES (?, ?, ?)',
              [email, hashedPassword, 'Email'],
              (err, result) => {
                if (err) {
                  res.status(500).json({ msg: 'มีข้อผิดพลาดบางอย่าง' });
                }
                //code ส่งอีเมล ลิ้งยืนยันการสมัคร
                mail.sendMailVerify(result.insertId, email);

                res
                  .status(200)
                  .json({
                    msg: 'สมัครสำเร็จ โปรดยืนยันการสมัครที่อีเมลของท่าน',
                  });
              }
            );
          }
        }
      );
    }
  } catch (error) {
    console.log('register error : ', error);
    res.status(500).json({ msg: 'มีข้อผิดพลาดบางอย่าง' });
  }
});

//endpoind ล็อคอิน โดยจะรับ parameter จาก body คือ email,password
router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ msg: 'โปรดกรอกข้อมูลให้ครบ' });
    } else {
      connectdb.query(
        'SELECT account_id, email, password, verify FROM account WHERE email = ? AND account_type = ?',
        [email, 'Email'],
        async (err, result) => {
          if (err) {
            res.status(500).json({ msg: 'มีข้อผิดพลาดบางอย่าง' });
          }
          if (result.length === 0) {
            res.status(400).json({ msg: 'ไม่มีบัญชีนี้อยู่' });
          } else {
            //ถ้า verify = 0 แปลว่ายังไม่เคยยืนยันการสมัคร
            if (result[0].verify === 0) {
              //code ส่งอีเมล ลิ้งยืนยันการสมัคร
              mail.sendMailVerify(result[0].account_id, result[0].email);

              res.status(400).json({ msg: 'ต้องทำการยืนยันตัวตนก่อน โปรดตรวจสอบจดหมายยืนยันในอีเมล' });
            } else {
              //ตรวจสอบว่ารหัสผ่านตรงไม
              const isMatch = await bcrypt.compare(password, result[0].password);
              if (isMatch) {
                res.status(200).json({
                  msg: 'เข้าสู่ระบบสำเร็จ',
                  accountId: result[0].account_id,
                });
              } else {
                res.status(400).json({ msg: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
              }
            }
          }
        }
      );
    }
  } catch (error) {
    console.log('login error : ', error);
    res.status(500).json({ msg: 'มีข้อผิดพลาดบางอย่าง' });
  }
});

//endpoint ที่ใช้ยืนยันการสมัคร โดยมี parameter เป็น id(account_id ของผู้ใช้) , verify(สถานะการยืนยัน 1 คือ true)
router.get('/verify', (req, res) => {
  try {
    const { query } = url.parse(req.url, true);
    if (!query.id || !query.verify) {
      res.status(400).send('<h1>เกิดข้อผิดพลาดบางอย่าง</h1>');
    } else {
      connectdb.query(
        'UPDATE account SET verify = ? WHERE account_id = ?',
        [query.verify, query.id],
        (err, result) => {
          if (err) {
            res.status(500).send('<h1>เกิดข้อผิดพลาดบางอย่าง</h1>');
          }
          res
            .status(200)
            .send(
              '<h1>ยืนยันสำเร็จ</h1><br><h4>ท่านสามารถเข้าสู่ระบบเพื่อใช้งาน New app ได้แล้ว</h4>'
            );
        }
      );
    }
  } catch (error) {
    res.status(500).send('<h1>เกิดข้อผิดพลาดบางอย่าง</h1>');
  }
});

//api ตัวนี้มีไว้สร้าง otp แล้วส่งไปทางอีเมลเพื่อใช้เปลี่ยนรหัสผ่าน มี parameter เป็น email
router.post('/OTP', (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ msg: 'เกิดข้อผิดพลาดไม่มีข้อมูลอีเมล' });
    } else {
      connectdb.query(
        'SELECT account_id FROM account WHERE email = ? AND account_type = ?',
        [email, 'Email'],
        (err, result) => {
          if (err) {
            res.status(500).json({ msg: 'เกิดข้อผิดพลาดบางอย่าง' });
          } else {
            if (result.length === 0) {
              res
                .status(400)
                .json({ msg: 'ไม่มีบัญชีนี้อยู่ โปรดตรวจสอบอีเมลของท่าน' });
            } else {
              const accountId = result[0].account_id;
              const otp = otpCode.generateOTP();
              connectdb.query(
                'UPDATE account SET otp = ? WHERE account_id = ?',
                [otp, accountId],
                (err, result) => {
                  if (err) {
                    res.status(500).json({ msg: 'เกิดข้อผิดพลาดบางอย่าง' });
                  } else {
                    mail.sendMailOTP(email, otp);
                    otpCode.invalidateOTP(otp, accountId);
                    res
                      .status(200)
                      .json({
                        msg: 'ส่ง OTP สำเร็จ โปรดตรวจสอบในอีเมลของท่าน',
                      });
                  }
                }
              );
            }
          }
        }
      );
    }
  } catch (error) {
    res.status(500).json({ msg: 'เกิดข้อผิดพลาดบางอย่าง' });
  }
});

router.put('/forgot', (req, res) => {
  try {
    const { email, otp, password, oldPassword } = req.body;
    if (!email || !password) {
      res.status(400).json({ msg: 'กรอกข้อมูลไม่ครบ' });
    } else {
      if (!otp && !oldPassword) {
        res.status(400).json({ msg: 'กรอกข้อมูลไม่ครบ' });
      } else {
        //เช็คว่า OTP มี ค่าไม
        if (otp) {
          connectdb.query(
            'SELECT account_id, otp FROM account WHERE email = ? AND account_type = ?',
            [email, 'Email'],
            async (err, result) => {
              if (err) {
                console.error('ค้นหาบัญชีผู้ใช้ที่จะเปลี่ยนรหัสผิดพลาด : ', err);
                res.status(500).json({ msg: 'เกิดข้อผิดพลาดบางอย่าง' });
              }
              if (result.length === 0) {
                res.status(400).json({ msg: 'ไม่พบบัญชีผู้ใช้' });
              } else {
                if (result[0].otp == null) {
                  res
                    .status(400)
                    .json({ msg: 'โปรดกดปุ่มส่ง OTP เพื่อรับรหัส OTP' });
                } else {
                  if (result[0].otp === otp) {
                    const accountId = result[0].account_id;
                    //เข้ารหัส 10 รอบ
                    const hashedPassword = await bcrypt.hash(password, 10);
                    connectdb.query(
                      'UPDATE account SET password = ? , otp = NULL WHERE account_id = ?',
                      [hashedPassword, accountId],
                      (err, result) => {
                        if (err) {
                          console.error('อัพเดทรหัสผ่านผิดพลาด : ', err);
                          res.status(500).json({ msg: 'เกิดข้อผิดพลาดบางอย่าง' });
                        }
                        res.status(200).json({ msg: 'เปลี่ยนรหัสผ่านสำเร็จ' });
                      }
                    );
                  } else {
                    res.status(400).json({ msg: 'รหัส OTP ไม่ถูกต้อง' });
                  }
                }
              }
            }
          );
        }
        else {
          connectdb.query(
            'SELECT account_id, password FROM account WHERE email = ? AND account_type = ?',
            [email, 'Email'],
            async (err, result) => {
              if (err) {
                console.error('ค้นหาบัญชีผู้ใช้ที่จะเปลี่ยนรหัสผิดพลาด : ', err);
                res.status(500).json({ msg: 'เกิดข้อผิดพลาดบางอย่าง' });
              }
              if (result.length === 0) {
                res.status(400).json({ msg: 'ไม่พบบัญชีผู้ใช้' });
              } else {
                //ตรวจสอบว่ารหัสผ่านตรงไม
                const isMatch = await bcrypt.compare(oldPassword, result[0].password);
                if (isMatch) {
                  //เข้ารหัส 10 รอบ
                  const accountId = result[0].account_id;
                  const hashedPassword = await bcrypt.hash(password, 10);
                  connectdb.query(
                    'UPDATE account SET password = ? WHERE account_id = ?',
                    [hashedPassword, accountId],
                    (err, result) => {
                      if (err) {
                        console.error('อัพเดทรหัสผ่านผิดพลาด : ', err);
                        res.status(500).json({ msg: 'เกิดข้อผิดพลาดบางอย่าง' });
                      }
                      res.status(200).json({ msg: 'เปลี่ยนรหัสผ่านสำเร็จ' });
                    }
                  );
                } else {
                  res.status(400).json({ msg: 'ข้อมูล Email หรือ รหัสผ่านเก่าไม่ถูกต้อง' });
                }

              }
            }
          );
        }
      }


    }
  } catch (error) {
    console.error('API เปลี่ยนรหัสผ่านผิดพลาด : ', error);
    res.status(500).json({ msg: 'เกิดข้อผิดพลาดบางอย่าง' });
  }
});

router.post('/googleLogin', (req, res) => {
  const { email, googleId } = req.body;
  if (!email || !googleId) {
    res.status(400).json({ msg: 'ข้อมูลไม่ครบ' });
  } else {
    connectdb.query(
      'SELECT account_id, email, password, account_type FROM account WHERE email = ? AND account_type = ?',
      [email, 'Google'],
      async (err, result) => {
        if (err) {
          console.error('ค้นหาผู้ใช้ Google ผิดพลาด');
          res.status(500).json({ msg: 'เกิดข้อผิดพลาดบางอย่าง' });
        } else {
          if (result.length === 0) {
            //จะใช้ google id แทน pass เพราะ google id ไม่มีการเปลี่ยนแปลงและไม่ซ้ำกัน
            const hashedPassword = await bcrypt.hash(googleId, 10);
            connectdb.query(
              'INSERT INTO account (email, password, account_type, verify) VALUES (?, ?, ?, ?)',
              [email, hashedPassword, 'Google', '1'],
              (err, result) => {
                if (err) {
                  console.error('เพิ่มผู้ใช้ Google ผิดพลาด');
                  res.status(500).json({ msg: 'เกิดข้อผิดพลาดบางอย่าง' });
                }
                res
                  .status(200)
                  .json({ msg: 'ไม่มีผู้ใช้', accountId: result.insertId });
              }
            );
          } else {
            const isMatch = await bcrypt.compare(googleId, result[0].password);
            if (isMatch) {
              res
                .status(200)
                .json({
                  msg: 'มีผู้ใช้ และเข้าสู่ระบบสำเร็จ',
                  accountId: result[0].account_id,
                });
            } else {
              res.status(400).json({ msg: 'มีผู้ใช้แต่ข้อมูลไม่ถูกต้อง' });
            }
          }
        }
      }
    );
  }
});

module.exports = router;
