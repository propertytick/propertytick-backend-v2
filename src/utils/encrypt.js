const CryptoJS = require('crypto-js');

const KEY = process.env.ENCRYPTION_KEY;

if (!KEY || KEY.length < 32) {
  throw new Error('ENCRYPTION_KEY must be at least 32 characters long');
}

// AES-256 encrypt
const encrypt = (text) => {
  if (!text) return null;
  try {
    return CryptoJS.AES.encrypt(String(text), KEY).toString();
  } catch (err) {
    throw new Error('Encryption failed');
  }
};

// AES-256 decrypt
const decrypt = (cipherText) => {
  if (!cipherText) return null;
  try {
    const bytes = CryptoJS.AES.decrypt(cipherText, KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (err) {
    throw new Error('Decryption failed');
  }
};

// Mask sensitive data (e.g., PAN: ABCDE1234F -> ABCDE****F)
const mask = (value, visibleStart = 4, visibleEnd = 2) => {
  if (!value || value.length < visibleStart + visibleEnd) return '****';
  return (
    value.substring(0, visibleStart) +
    '*'.repeat(value.length - visibleStart - visibleEnd) +
    value.substring(value.length - visibleEnd)
  );
};

module.exports = { encrypt, decrypt, mask };
