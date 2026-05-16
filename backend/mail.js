const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

async function sendMail({ receiver, subject, text, html }) {
  try {
    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: receiver,
      subject,
      text,
      html,
    });

    return { success: true };
  } catch (error) {
    console.log('MAIL ERROR:', error);
    return { success: false, error };
  }
}

module.exports = { sendMail };
