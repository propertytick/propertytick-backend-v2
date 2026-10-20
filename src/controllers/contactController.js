const nodemailer = require('nodemailer');
const ApiResponse = require('../utils/apiResponse');
const logger = require('../utils/logger');

// Email bhejne ka function
const sendContactEmail = async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;

    // Validation
    if (!name || !email || !message) {
      return ApiResponse.error(res, 'Name, email, and message are required', 400);
    }

    // Nodemailer transporter (Aapke .env se details aayengi)
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Email options
    const mailOptions = {
      from: `"PropertyTick Contact" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER, // Aapko khud ko email aayega
      replyTo: email, // Agar aap reply karenge toh user ko jayega
      subject: `New Contact: ${subject}`,
      html: `
        <h2>New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Phone:</strong> ${phone || 'N/A'}</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <p><strong>Message:</strong></p>
        <p>${message}</p>
      `,
    };

    // Email send karein
    await transporter.sendMail(mailOptions);
    logger.info(`Contact email sent from ${email}`);

    return ApiResponse.success(res, null, 'Message sent successfully!');
  } catch (error) {
    logger.error(`Contact form error: ${error.message}`);
    return ApiResponse.error(res, 'Failed to send message. Please try again.', 500);
  }
};

module.exports = { sendContactEmail };