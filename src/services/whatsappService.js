const axios = require('axios');
const logger = require('../utils/logger');

/**
 * Send WhatsApp message via Twilio
 */
const sendWhatsApp = async (toPhone, message) => {
  if (process.env.NODE_ENV === 'development') {
    logger.info(`🧪 [DEV WhatsApp] To: ${toPhone}, Message: ${message}`);
    return { success: true, dev: true };
  }

  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_WHATSAPP_FROM;

    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

    const params = new URLSearchParams();
    params.append('From', from);
    params.append('To', `whatsapp:+91${toPhone}`);
    params.append('Body', message);

    const response = await axios.post(url, params, {
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      timeout: 10000,
    });

    return { success: true, sid: response.data.sid };
  } catch (err) {
    logger.error(`WhatsApp send failed to ${toPhone}: ${err.message}`);
    return { success: false, error: err.message };
  }
};

/**
 * Send bayana memo via WhatsApp (with URL)
 */
const sendBayanaMemo = async (phone, memoUrl, memoNumber) => {
  const message = `🏠 *PropertyTick Digital Bayana Memo*\n\nMemo No: ${memoNumber}\n\nAapka digital bayana memo taiyar hai. Neeche link se PDF download kar sakte hain:\n\n${memoUrl}\n\n- PropertyTick`;
  return sendWhatsApp(phone, message);
};

/**
 * Send deal confirmation
 */
const sendDealConfirmation = async (phone, dealInfo) => {
  const message = `✅ *Deal Confirmed!*\n\nProperty: ${dealInfo.propertyTitle}\nAmount: ₹${dealInfo.amount}\n\nAapka deal successfully close ho gaya hai.\n\n- PropertyTick`;
  return sendWhatsApp(phone, message);
};

module.exports = {
  sendWhatsApp,
  sendBayanaMemo,
  sendDealConfirmation,
};
