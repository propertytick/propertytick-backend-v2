const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

// ============================================================
// 24+ BEAUTIFUL RANDOM GRADIENT COLORS
// Har baar jab koi share karega, background color alag hoga
// ============================================================
const GRADIENTS = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
  'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
  'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
  'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
  'linear-gradient(135deg, #ff6e7f 0%, #bfe9ff 100%)',
  'linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)',
  'linear-gradient(135deg, #f5af19 0%, #f12711 100%)',
  'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
  'linear-gradient(135deg, #0ba360 0%, #3cba92 100%)',
  'linear-gradient(135deg, #00c6fb 0%, #005bea 100%)',
  'linear-gradient(135deg, #f83600 0%, #f9d423 100%)',
  'linear-gradient(135deg, #b721ff 0%, #21d4fd 100%)',
  'linear-gradient(135deg, #6a11cb 0%, #2575fc 100%)',
  'linear-gradient(135deg, #ff0844 0%, #ffb199 100%)',
  'linear-gradient(135deg, #4776E6 0%, #8E54E9 100%)',
  'linear-gradient(135deg, #00d2ff 0%, #3a7bd5 100%)',
  'linear-gradient(135deg, #f953c6 0%, #b91d73 100%)',
  'linear-gradient(135deg, #834d9b 0%, #d04ed6 100%)',
  'linear-gradient(135deg, #1f4037 0%, #99f2c8 100%)',
  'linear-gradient(135deg, #ee0979 0%, #ff6a00 100%)',
  'linear-gradient(135deg, #fc466b 0%, #3f5efb 100%)',
  'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
  'linear-gradient(135deg, #fc00ff 0%, #00dbde 100%)',
  'linear-gradient(135deg, #ed4264 0%, #ffedbc 100%)',
  'linear-gradient(135deg, #654ea3 0%, #eaafc8 100%)'
];

// ============================================================
// HELPER FUNCTIONS
// ============================================================
const capitalize = (str) => {
  if (!str) return 'N/A';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

const formatPrice = (amount) => {
  if (!amount) return '₹0';
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)} L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(0)}K`;
  return `₹${amount}`;
};

const escapeHtml = (str) => {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

// ============================================================
// MAIN FUNCTION: Generate Property Card as JPG Image
// ============================================================
const generatePropertyCard = async (property, owner, referralCode = null) => {
  let browser;
  try {
    // Puppeteer browser launch with safe args for Render/VPS
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-software-rasterizer',
        '--font-render-hinting=none'
      ],
      timeout: 60000,
    });

    const page = await browser.newPage();
    
    // Mobile viewport (1080x1920 - WhatsApp status size)
    await page.setViewport({ 
      width: 1080, 
      height: 1920, 
      deviceScaleFactor: 2 
    });

    // Build HTML
    const html = buildPropertyCardHtml(property, owner, referralCode);

    // Set HTML content
    await page.setContent(html, { 
      waitUntil: 'domcontentloaded', 
      timeout: 60000 
    });

    // Wait for images to load
    await page.waitForNetworkIdle({ idleTime: 500, timeout: 10000 }).catch(() => {});

    // Ensure uploads directory exists
    const dir = path.join(__dirname, '..', 'uploads', 'property-cards');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Generate unique filename
    const fileName = `property-${property._id}-${Date.now()}.jpg`;
    const outputPath = path.join(dir, fileName);

    // Take screenshot
    await page.screenshot({
      path: outputPath,
      type: 'jpeg',
      quality: 95,
      fullPage: true,
    });

    await browser.close();
    
    // Return relative path
    return `/uploads/property-cards/${fileName}`;
  } catch (err) {
    if (browser) await browser.close().catch(() => {});
    logger.error('Property card generation failed:', err.message);
    throw err;
  }
};

// ============================================================
// BUILD HTML: Professional Property Card with 24+ Colors
// ============================================================
const buildPropertyCardHtml = (property, owner, referralCode) => {
  // Random gradient select karo (har baar alag color)
  const randomGradient = GRADIENTS[Math.floor(Math.random() * GRADIENTS.length)];
  
  // Property photo
  const mainPhoto = property.photos?.[0] || 'https://via.placeholder.com/1080x600/2563eb/ffffff?text=PropertyTick';
  
  // Dealer info
  const dealer = owner || property.listedBy || {};

  // Property title
  const title = escapeHtml(property.title || 'Premium Property');
  
  // Price
  const price = formatPrice(property.price?.amount);
  
  // Negotiable
  const isNegotiable = property.price?.isNegotiable;
  
  // Area
  const areaValue = property.area?.value || 0;
  const areaUnit = property.area?.unit || 'sqft';
  
  // Type, Status, Purpose
  const propType = capitalize(property.propertyType);
  const status = capitalize(property.status);
  const purpose = capitalize(property.listingPurpose);
  
  // Location
  const landmark = escapeHtml(property.location?.landmark);
  const city = escapeHtml(property.location?.city);
  const district = escapeHtml(property.location?.district);
  const state = escapeHtml(property.location?.state);
  const pincode = escapeHtml(property.location?.pincode);
  
  // Dealer details
  const dealerName = escapeHtml(dealer?.fullName || 'N/A');
  const dealerPhone = dealer?.phone || '';
  const dealerWhatsApp = dealer?.whatsapp || '';
  const shopName = escapeHtml(dealer?.shopName);
  const dealerCity = escapeHtml(dealer?.location?.city);
  const dealerState = escapeHtml(dealer?.location?.state);
  
  // Referral code
  const referral = referralCode ? escapeHtml(referralCode) : '';

  // ============================================
  // PROPER HTML5 STRUCTURE WITH CSS STYLING
  // ============================================
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Property Card - ${title}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;800&display=swap');

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Poppins', sans-serif;
  background: ${randomGradient};
  color: #ffffff;
  width: 1080px;
  min-height: 1920px;
  padding: 60px 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.card-container {
  width: 100%;
  max-width: 1000px;
  background: rgba(255, 255, 255, 0.97);
  border-radius: 30px;
  padding: 40px;
  color: #1f2937;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.header {
  text-align: center;
  margin-bottom: 30px;
}

.header h1 {
  font-size: 48px;
  font-weight: 800;
  color: #2563eb;
  margin-bottom: 10px;
}

.verified-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: #10b981;
  color: white;
  padding: 8px 20px;
  border-radius: 50px;
  font-size: 20px;
  font-weight: 600;
}

.main-image {
  width: 100%;
  height: 500px;
  object-fit: cover;
  border-radius: 20px;
  margin-bottom: 30px;
  border: 4px solid #e5e7eb;
}

.title {
  font-size: 42px;
  font-weight: 700;
  color: #111827;
  margin-bottom: 15px;
  line-height: 1.2;
}

.price-section {
  background: #fef3c7;
  padding: 25px;
  border-radius: 16px;
  margin-bottom: 30px;
  text-align: center;
  border-left: 6px solid #f59e0b;
}

.price {
  font-size: 56px;
  font-weight: 800;
  color: #92400e;
}

.negotiable {
  font-size: 24px;
  color: #059669;
  font-weight: 600;
  margin-top: 8px;
}

.section-title {
  font-size: 28px;
  font-weight: 700;
  color: #2563eb;
  margin: 30px 0 20px 0;
  padding-bottom: 10px;
  border-bottom: 3px solid #e5e7eb;
}

.specs-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 20px;
}

.spec-item {
  font-size: 24px;
  display: flex;
  align-items: center;
  gap: 12px;
  background: #f3f4f6;
  padding: 16px 20px;
  border-radius: 12px;
}

.spec-item span {
  font-size: 28px;
}

.location-text {
  font-size: 24px;
  line-height: 1.6;
  background: #f3f4f6;
  padding: 20px;
  border-radius: 12px;
}

.dealer-box {
  background: #eff6ff;
  padding: 30px;
  border-radius: 16px;
  border-left: 6px solid #2563eb;
}

.dealer-name {
  font-size: 32px;
  font-weight: 700;
  color: #1e40af;
  margin-bottom: 15px;
}

.dealer-detail {
  font-size: 24px;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.referral-box {
  margin-top: 25px;
  background: #fef3c7;
  padding: 20px;
  border-radius: 12px;
  text-align: center;
  color: #92400e;
  font-size: 22px;
  font-weight: 600;
}

.footer {
  margin-top: 40px;
  text-align: center;
  padding-top: 30px;
  border-top: 3px dashed #d1d5db;
}

.footer p {
  font-size: 22px;
  color: #4b5563;
  margin-bottom: 10px;
}

.footer .website {
  font-size: 28px;
  font-weight: 700;
  color: #2563eb;
}

.footer .secure {
  color: #10b981;
  font-weight: 700;
  font-size: 24px;
  margin-top: 15px;
}
</style>
</head>
<body>
  <div class="card-container">
    
    <!-- Header with Logo -->
    <div class="header">
      <h1>🏠 PropertyTick</h1>
      <div class="verified-badge">✓ Verified & OTP-Secured</div>
    </div>

    <!-- Main Property Photo -->
    <img src="${mainPhoto}" class="main-image" alt="Property" crossorigin="anonymous" />

    <!-- Property Title -->
    <div class="title">${title}</div>

    <!-- Price Section -->
    <div class="price-section">
      <div class="price">💰 ${price}</div>
      ${isNegotiable ? '<div class="negotiable">💵 Negotiable</div>' : ''}
    </div>

    <!-- Property Specs -->
    <div class="section-title">📋 PROPERTY SPECS</div>
    <div class="specs-grid">
      <div class="spec-item">
        <span>📐</span> Area: ${areaValue} ${areaUnit}
      </div>
      <div class="spec-item">
        <span>🏷️</span> Type: ${propType}
      </div>
      <div class="spec-item">
        <span>✅</span> Status: ${status}
      </div>
      <div class="spec-item">
        <span>🎯</span> Purpose: ${purpose}
      </div>
    </div>

    <!-- Location -->
    <div class="section-title">📍 LOCATION</div>
    <div class="location-text">
      ${landmark ? `🏛️ ${landmark}<br>` : ''}
      🌆 ${city || 'N/A'}${district ? `, ${district}` : ''}<br>
      ${state ? `🗺️ ${state}<br>` : ''}
      📮 Pincode: ${pincode || 'N/A'}
    </div>

    <!-- Dealer Section -->
    <div class="section-title">👤 ${property.listingPurpose === 'rent' ? 'RENT DEALER' : 'PROPERTY DEALER'}</div>
    <div class="dealer-box">
      <div class="dealer-name">👤 ${dealerName}</div>
      ${shopName ? `<div class="dealer-detail">🏢 ${shopName}</div>` : ''}
      ${dealerPhone ? `<div class="dealer-detail">📱 +91 ${dealerPhone}</div>` : ''}
      ${dealerWhatsApp && dealerWhatsApp !== dealerPhone ? `<div class="dealer-detail">💬 +91 ${dealerWhatsApp}</div>` : ''}
      ${dealerCity ? `<div class="dealer-detail">📍 ${dealerCity}${dealerState ? `, ${dealerState}` : ''}</div>` : ''}
    </div>

    <!-- Referral Code (if available) -->
    ${referral ? `
      <div class="referral-box">
        🎁 Use referral code: <strong>${referral}</strong> for special discounts!
      </div>
    ` : ''}

    <!-- Footer -->
    <div class="footer">
      <p class="website">🌐 www.propertytick.com</p>
      <p>📧 support@propertytick.com</p>
      <p>📱 Download Our App on Google Play & App Store</p>
      <p class="secure">✓ Verified & OTP-Secured | India's Trusted Property Platform</p>
    </div>

  </div>
</body>
</html>`;
};

module.exports = { generatePropertyCard };