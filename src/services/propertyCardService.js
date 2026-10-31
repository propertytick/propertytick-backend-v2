const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

// ✅ FIX 1: Helper functions SABSE UPAR (Crash fix)
const capitalize = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
};

const formatPrice = (amount) => {
  if (!amount) return '₹0';
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(2)} Cr`;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)} L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(0)}K`;
  return `₹${amount}`;
};

// ✅ FIX 2: Random Background Colors (Har baar alag color)
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
  'linear-gradient(135deg, #fc00ff 0%, #00dbde 100%)',
  'linear-gradient(135deg, #ed4264 0%, #ffedbc 100%)',
  'linear-gradient(135deg, #654ea3 0%, #eaafc8 100%)',
  'linear-gradient(135deg, #c471f5 0%, #fa71cd 100%)'
];

/**
 * Build Beautiful HTML for property card (JPG Image ke liye)
 * ✅ FIX 3: Proper HTML/CSS, Clickable Maps, Clickable Photos
 */
const buildPropertyCardHtml = (property, owner, referralCode) => {
  const randomGradient = GRADIENTS[Math.floor(Math.random() * GRADIENTS.length)];
  const mainPhoto = property.photos?.[0] || 'https://via.placeholder.com/800x400?text=No+Image';
  const otherPhotos = property.photos?.slice(1, 10) || [];
  
  // ✅ Clickable Google Maps Link
  const addressQuery = encodeURIComponent(
    `${property.location?.landmark || ''} ${property.location?.city || ''} ${property.location?.state || ''}`
  );
  const mapsLink = `https://www.google.com/maps/search/?api=1&query=${addressQuery}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Property Card</title>
<style>
  body {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    background: ${randomGradient};
    margin: 0;
    padding: 40px;
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
  }
  .card {
    background: #ffffff;
    border-radius: 20px;
    box-shadow: 0 15px 35px rgba(0,0,0,0.2);
    width: 100%;
    max-width: 900px;
    overflow: hidden;
    color: #333;
  }
  .header { background: #2563eb; color: white; padding: 25px; text-align: center; }
  .header h1 { margin: 0; font-size: 32px; font-weight: 800; }
  .content { padding: 30px; }
  .main-photo { width: 100%; height: 400px; object-fit: cover; border-radius: 15px; margin-bottom: 25px; border: 3px solid #f3f4f6; }
  .title { font-size: 28px; font-weight: bold; color: #1f2937; margin-bottom: 10px; }
  .location-link { color: #2563eb; font-size: 18px; margin-bottom: 25px; display: block; text-decoration: none; font-weight: 600; }
  .location-link:hover { text-decoration: underline; }
  .price-box { background: #fef3c7; border-left: 6px solid #f59e0b; padding: 20px; border-radius: 10px; margin-bottom: 25px; }
  .price { font-size: 36px; font-weight: bold; color: #92400e; }
  .negotiable { color: #059669; font-size: 16px; margin-top: 8px; font-weight: 600; }
  .specs { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 25px; }
  .spec-item { background: #f3f4f6; padding: 15px; border-radius: 10px; font-size: 18px; font-weight: 500; }
  .photos-grid { display: flex; gap: 10px; overflow-x: auto; margin-bottom: 25px; padding-bottom: 10px; }
  .photo-thumb { width: 100px; height: 100px; object-fit: cover; border-radius: 10px; cursor: pointer; border: 2px solid #e5e7eb; transition: transform 0.2s; }
  .photo-thumb:hover { transform: scale(1.05); border-color: #2563eb; }
  .dealer-box { background: #eff6ff; padding: 25px; border-radius: 15px; margin-top: 25px; border: 1px solid #dbeafe; }
  .dealer-title { font-weight: bold; color: #1e40af; margin-bottom: 15px; font-size: 20px; }
  .dealer-info { margin-bottom: 10px; font-size: 18px; color: #374151; }
  .footer { text-align: center; padding: 25px; background: #f9fafb; color: #6b7280; font-size: 16px; border-top: 1px solid #e5e7eb; }
</style>
</head>
<body>
  <div class="card">
    <div class="header"><h1>🏠 PropertyTick</h1></div>
    <div class="content">
      <img src="${mainPhoto}" class="main-photo" alt="Main Property Photo">
      <div class="title">${property.title || 'Premium Property Listing'}</div>
      
      <!-- ✅ Clickable Location -->
      <a href="${mapsLink}" target="_blank" class="location-link">
        📍 ${property.location?.landmark ? property.location.landmark + ', ' : ''}
        ${property.location?.city || ''}${property.location?.district ? ', ' + property.location.district : ''}
        ${property.location?.state ? ', ' + property.location.state : ''}
        ${property.location?.pincode ? ' - ' + property.location.pincode : ''}
        <span style="font-size:14px; color:#6b7280;">(Click to view on Google Maps)</span>
      </a>

      <div class="price-box">
        <div class="price">💰 ${formatPrice(property.price?.amount || 0)}</div>
        ${property.price?.isNegotiable ? '<div class="negotiable">✍️ Negotiable</div>' : ''}
      </div>

      <div class="specs">
        <div class="spec-item">📐 Area: ${property.area?.value || 0} ${property.area?.unit || ''}</div>
        <div class="spec-item">🏠 Type: ${capitalize(property.propertyType)}</div>
        <div class="spec-item">✅ Status: ${capitalize(property.status)}</div>
        <div class="spec-item">🎯 Purpose: ${capitalize(property.listingPurpose)}</div>
      </div>

      <!-- ✅ Clickable Other Photos -->
      ${otherPhotos.length > 0 ? `
        <div style="margin-bottom:10px; font-weight:bold; color:#4b5563;">📸 MORE PHOTOS (Click to view):</div>
        <div class="photos-grid">
          ${otherPhotos.map(url => `<a href="${url}" target="_blank"><img src="${url}" class="photo-thumb" alt="Photo"></a>`).join('')}
        </div>
      ` : ''}

      <div class="dealer-box">
        <div class="dealer-title">👤 ${property.listingPurpose === 'rent' ? 'RENT DEALER' : 'PROPERTY DEALER'}</div>
        <div class="dealer-info"><strong>Name:</strong> ${owner?.fullName || 'N/A'}</div>
        ${owner?.shopName ? `<div class="dealer-info">🏢 ${owner.shopName}</div>` : ''}
        ${owner?.phone ? `<div class="dealer-info">📞 +91 ${owner.phone}</div>` : ''}
        ${owner?.whatsapp && owner.whatsapp !== owner.phone ? `<div class="dealer-info">💬 +91 ${owner.whatsapp}</div>` : ''}
        ${owner?.location?.city ? `<div class="dealer-info">📍 ${owner.location.city}${owner.location.state ? ', ' + owner.location.state : ''}</div>` : ''}
      </div>
    </div>
    
    <div class="footer">
      🌐 www.propertytick.com | 📧 support@propertytick.com<br>
      ${referralCode ? `Use referral code: <b>${referralCode}</b> for discounts!` : ''}
    </div>
  </div>
</body>
</html>`;
};

/**
 * Generate property card as JPG image
 */
const generatePropertyCard = async (property, owner, referralCode = null) => {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      timeout: 60000,
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 2 });

    const html = buildPropertyCardHtml(property, owner, referralCode);

    await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForNetworkIdle({ idleTime: 500, timeout: 10000 }).catch(() => {});

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

module.exports = { generatePropertyCard };