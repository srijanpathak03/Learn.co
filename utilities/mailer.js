var nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'mail.privateemail.com',
  port: 465,
  secure: true, // Use SSL/TLS
  auth: {
    user: 'info@automoviecreator.com',
    pass: 'infoPassword@12345'
  },
  // logger: true, // Enable logging
  // debug: true
});

const sendEmail = (to, subject, html, attachmentBuffer = null) => {
  console.log('to', to, 'subject', subject, 'html', html);

  const mailOptions = {
    from: 'info@automoviecreator.com',
    to,
    subject,
    html,
  };

   // If attachmentBuffer is provided, add it as an attachment
   if (attachmentBuffer) {
    mailOptions.attachments = [
      {
        filename: 'invoice.pdf',  // You can customize the filename
        content: attachmentBuffer,
        contentType: 'application/pdf'
      }
    ];
  }

  transporter.sendMail(mailOptions, function(error, info){
    if (error) {
      console.log('Error:', error);
    } else {
      console.log('Email sent:', info);
    }
  });
};

module.exports = { sendEmail }
