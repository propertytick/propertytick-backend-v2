const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

/**
 * Generate property card as JPG image
 */
const generatePropertyCard = async (property, owner, referralCode = null) => {
  let browser;
  try {
        browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      timeout: 60000,
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 2 });

    const html = buildPropertyCardHtml(property, owner, referralCode);

    // 👈 networkidle0 → domcontentloaded (timeout fix)
    await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 60000 });

    // Images load hone ka wait (optional)
    await page.waitForNetworkIdle({ idleTime: 500, timeout: 10000 }).catch(() => {});

    // Ensure directory exists
    const dir = path.join(__dirname, '..', 'uploads', 'property-cards');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const fileName = `property-${property._id}-${Date.now()}.jpg`;
    const outputPath = path.join(dir, fileName);

    await page.screenshot({
      path: outputPath,
      type: 'jpeg',
      quality: 90,
      fullPage: true,
    });

    await browser.close();
    return `/uploads/property-cards/${fileName}`;
  } catch (err) {
    if (browser) await browser.close();
    logger.error('Property card generation failed:', err.message);
    throw err;
  }
};

/**
 * Build HTML for property card
 */
const buildPropertyCardHtml = (property, owner, referralCode) => {
  const mainPhoto = property.photos?.[0] || '';
  const otherPhotos = property.photos?.slice(1, 10) || [];

  const formatPrice = (amount) => {
    if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)} L`;
    if (amount >= 1000) return `₹${(amount / 1000).toFixed(0)}K`;
    return `₹${amount}`;
  };

  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<link href="https://fonts.googleapis.com/css2?family=Noto+Color+Emoji&family=Poppins:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Poppins', 'Noto Color Emoji', sans-serif;
    background: linear-gradient(135deg, #0a5c36 0%, #064229 100%);
    color: #ffffff;
    width: 1080px;
    min-height: 1920px;
    padding: 40px;
  }

  .card {
    background: rgba(255, 255, 255, 0.05);
    border: 2px solid rgba(255, 255, 255, 0.15);
    border-radius: 24px;
    padding: 40px;
    backdrop-filter: blur(10px);
  }

  /* Header */
  .header {
    text-align: center;
    border-bottom: 3px solid rgba(255, 255, 255, 0.2);
    padding-bottom: 24px;
    margin-bottom: 32px;
  }

  .header h1 {
    font-size: 48px;
    font-weight: 800;
    letter-spacing: 4px;
    margin-bottom: 8px;
  }

  .header .subtitle {
    font-size: 24px;
    font-style: italic;
    color: #a8e6c4;
    font-weight: 600;
  }

  /* Main Photo */
  .main-photo {
    width: 100%;
    height: 500px;
    border-radius: 20px;
    overflow: hidden;
    margin-bottom: 32px;
    border: 4px solid rgba(255, 255, 255, 0.2);
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  }

  .main-photo img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  /* Address */
  .address {
    font-size: 26px;
    line-height: 1.6;
    margin-bottom: 32px;
    font-weight: 600;
    padding: 20px;
    background: rgba(0, 0, 0, 0.2);
    border-radius: 16px;
    border-left: 6px solid #34d399;
  }

  /* Section */
  .section {
    margin-bottom: 28px;
  }

  .section-title {
    font-size: 24px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 3px;
    padding: 12px 0;
    border-top: 2px solid rgba(255, 255, 255, 0.2);
    border-bottom: 2px solid rgba(255, 255, 255, 0.2);
    margin-bottom: 16px;
    text-align: center;
  }

  .section-body {
    font-size: 22px;
    line-height: 1.8;
  }

  .section-body .label {
    color: #a8e6c4;
    font-weight: 600;
  }

  .price-highlight {
    font-size: 42px;
    font-weight: 800;
    color: #34d399;
    text-decoration: line-through;
    text-decoration-color: rgba(255, 255, 255, 0.4);
  }

  .price-negotiable {
    font-size: 20px;
    font-style: italic;
    color: #a8e6c4;
    margin-top: 4px;
  }

  /* Other Photos Grid */
  .photo-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
    margin-top: 16px;
  }

  .photo-grid img {
    width: 100%;
    height: 140px;
    object-fit: cover;
    border-radius: 12px;
    border: 2px solid rgba(255, 255, 255, 0.15);
  }

  /* Dealer Section */
  .dealer {
    background: rgba(0, 0, 0, 0.25);
    border-radius: 16px;
    padding: 24px;
    margin-top: 24px;
    text-align: center;
    border: 2px solid rgba(52, 211, 153, 0.4);
  }

  .dealer h3 {
    font-size: 26px;
    font-weight: 800;
    color: #a8e6c4;
    margin-bottom: 8px;
  }

  .dealer p {
    font-size: 22px;
    font-weight: 600;
  }

  /* Advertisement */
  .advertisement {
    background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
    border-radius: 20px;
    padding: 32px;
    margin-top: 32px;
    text-align: center;
    color: #ffffff;
    box-shadow: 0 10px 40px rgba(245, 158, 11, 0.4);
  }

  .advertisement h2 {
    font-size: 32px;
    font-weight: 800;
    margin-bottom: 12px;
    letter-spacing: 2px;
  }

  .advertisement p {
    font-size: 20px;
    line-height: 1.6;
    margin-bottom: 16px;
  }

  .advertisement .cta {
    display: inline-block;
    background: #ffffff;
    color: #d97706;
    padding: 14px 32px;
    border-radius: 12px;
    font-size: 22px;
    font-weight: 800;
    text-decoration: none;
  }

  /* Footer */
  .footer {
    text-align: center;
    margin-top: 32px;
    font-size: 18px;
    color: rgba(255, 255, 255, 0.6);
  }

  .referral {
    background: rgba(52, 211, 153, 0.15);
    border: 2px dashed #34d399;
    border-radius: 12px;
    padding: 16px;
    margin-top: 20px;
    text-align: center;
    font-size: 20px;
  }

  .referral strong {
    color: #34d399;
    font-size: 24px;
  }
</style>
</head>
<body>
  <div class="card">

    <!-- Header -->
    <div class="header">
      <h1>🏠 PropertyTick</h1>
      <div class="subtitle">⭐ Premium Listing ⭐</div>
    </div>

    <!-- Main Photo -->
    ${mainPhoto ? `
      <div class="main-photo">
        <img src="${mainPhoto}" alt="Main Property Photo" />
      </div>
    ` : ''}

    <!-- Address -->
    <div class="address">
      📍 ${property.title || property.location?.address || 'Property'}<br>
      ${property.location?.landmark ? `🏛️ ${property.location.landmark}<br>` : ''}
      ${property.location?.city ? `🌆 ${property.location.city}` : ''}${property.location?.district ? `, ${property.location.district}` : ''}<br>
      ${property.location?.state ? `${property.location.state}` : ''}${property.location?.pincode ? ` - ${property.location.pincode}` : ''}
    </div>

    <!-- Price -->
    <div class="section">
      <div class="section-title">💰 PRICE DETAILS</div>
      <div class="section-body" style="text-align: center;">
        <div class="price-highlight">${formatPrice(property.price?.amount || 0)}</div>
        ${property.price?.isNegotiable ? '<div class="price-negotiable">✍️ Negotiable</div>' : ''}
      </div>
    </div>

    <!-- Property Specs -->
    <div class="section">
      <div class="section-title">📋 PROPERTY SPECS</div>
      <div class="section-body">
        <div>📐 <span class="label">Area:</span> ${property.area?.value || 0} ${property.area?.unit || ''}</div>
        <div>🏠 <span class="label">Type:</span> ${capitalize(property.propertyType)}</div>
        <div>✅ <span class="label">Status:</span> ${capitalize(property.status)}</div>
      </div>
    </div>

    <!-- Other Photos -->
    ${otherPhotos.length > 0 ? `
      <div class="section">
        <div class="section-title">📸 MORE PHOTOS</div>
        <div class="photo-grid">
          ${otherPhotos.map(url => `<img src="${url}" alt="Property photo" />`).join('')}
        </div>
      </div>
    ` : ''}

        <!-- Dealer Info -->
    <div class="dealer">
      <h3>👤 ${property.listingPurpose === 'rent' ? 'RENT DEALER' : 'PROPERTY DEALER'}</h3>
      <p style="font-size: 26px; font-weight: 800; margin-bottom: 10px;">
        ${owner?.fullName || 'N/A'}
      </p>
      ${owner?.shopName ? `
        <p style="font-size: 22px; color: #a8e6c4; font-weight: 600; margin-bottom: 8px;">
          🏢 ${owner.shopName}
        </p>
      ` : ''}
      ${owner?.phone ? `
        <p style="font-size: 22px; margin-bottom: 6px;">
          📞 +91 ${owner.phone}
        </p>
      ` : ''}
      ${owner?.whatsapp && owner.whatsapp !== owner.phone ? `
        <p style="font-size: 22px; margin-bottom: 6px;">
          💬 +91 ${owner.whatsapp}
        </p>
      ` : ''}
      ${owner?.location?.city ? `
        <p style="font-size: 22px;">
          📍 ${owner.location.city}${owner.location.state ? ', ' + owner.location.state : ''}
        </p>
      ` : ''}
    </div>

    <!-- Referral -->
    ${referralCode ? `
      <div class="referral">
        🎁 Use referral code: <strong>${referralCode}</strong><br>
        Get special discounts!
      </div>
    ` : ''}

    <!-- Advertisement -->
    <div class="advertisement">
      <h2>🏗️ COLONIZER</h2>
      <p>Own a colony? List your project on PropertyTick and reach thousands of buyers!</p>
      <div class="cta">📞 Contact Us Today</div>
    </div>

    <!-- Footer -->
    <div class="footer">
      🌐 www.propertytick.com<br>
      📧 support@propertytick.com
    </div>

  </div>
</body>
</html>
  `;
};

const capitalize = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
};

module.exports = { generatePropertyCard };
