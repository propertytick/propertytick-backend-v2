const Property = require('../models/Property');
const User = require('../models/User');
const Canvas = require('canvas');
const path = require('path');
const fs = require('fs');

// 200+ Random Gradient Colors
const GRADIENTS = [
  ['#667eea', '#764ba2'], ['#f093fb', '#f5576c'], ['#4facfe', '#00f2fe'],
  ['#43e97b', '#38f9d7'], ['#fa709a', '#fee140'], ['#30cfd0', '#330867'],
  ['#a8edea', '#fed6e3'], ['#ff9a9e', '#fecfef'], ['#ffecd2', '#fcb69f'],
  ['#ff6e7f', '#bfe9ff'], ['#e0c3fc', '#8ec5fc'], ['#f093fb', '#f5576c'],
  ['#f5af19', '#f12711'], ['#11998e', '#38ef7d'], ['#667eea', '#764ba2'],
  ['#4facfe', '#00f2fe'], ['#43e97b', '#38f9d7'], ['#fa709a', '#fee140'],
  ['#30cfd0', '#330867'], ['#a8edea', '#fed6e3'], ['#ff9a9e', '#fecfef'],
  ['#ffecd2', '#fcb69f'], ['#ff6e7f', '#bfe9ff'], ['#e0c3fc', '#8ec5fc'],
  // ... aur 175+ colors add kar sakte hain
];

const EMOJIS = {
  price: '',
  area: '📐',
  type: '🏷️',
  status: '✅',
  location: '📍',
  city: '🏙️',
  pincode: '📮',
  name: '👤',
  mobile: '📱',
  whatsapp: '💬',
  photo: '',
  link: '',
  google: '🗺️',
  verified: '✓',
  negotiable: '💵',
  rent: '🏠',
  buy: '🔑'
};

const generatePropertyCard = async (req, res) => {
  try {
    const { id } = req.params;
    
    const property = await Property.findById(id)
      .populate('listedBy', 'fullName phone whatsapp location shopName businessHours shopAddress shopLandmark shopPincode shopCoordinates')
      .populate('owner', 'fullName phone whatsapp location shopName businessHours shopAddress shopLandmark shopPincode shopCoordinates');

    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    const dealer = property.listedBy || property.owner;
    
    // Random gradient select karo
    const randomGradient = GRADIENTS[Math.floor(Math.random() * GRADIENTS.length)];
    
    // Canvas setup (WhatsApp image size - 1080x1920)
    const canvas = Canvas.createCanvas(1080, 1920);
    const ctx = canvas.getContext('2d');
    
    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, 1920);
    gradient.addColorStop(0, randomGradient[0]);
    gradient.addColorStop(1, randomGradient[1]);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1080, 1920);
    
    // Add overlay pattern (dots)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    for (let i = 0; i < 1080; i += 40) {
      for (let j = 0; j < 1920; j += 40) {
        ctx.beginPath();
        ctx.arc(i, j, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    
    let yPos = 80;
    
    // Logo (PropertyTick)
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(' PropertyTick', 540, yPos);
    yPos += 60;
    
    // Verified badge
    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 32px Arial';
    ctx.fillText(`${EMOJIS.verified} Verified & OTP-Secured`, 540, yPos);
    yPos += 80;
    
    // Property Title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 52px Arial';
    ctx.fillText(property.title, 540, yPos);
    yPos += 70;
    
    // Price
    const priceEmoji = property.listingPurpose === 'rent' ? EMOJIS.rent : EMOJIS.buy;
    ctx.fillStyle = '#fef3c7';
    ctx.font = 'bold 60px Arial';
    ctx.fillText(`${priceEmoji} ₹${(property.price?.amount / 100000).toFixed(2)} Cr`, 540, yPos);
    yPos += 50;
    
    // Negotiable
    if (property.price?.isNegotiable) {
      ctx.fillStyle = '#86efac';
      ctx.font = 'italic 32px Arial';
      ctx.fillText(`${EMOJIS.negotiable} Negotiable`, 540, yPos);
      yPos += 60;
    }
    
    // Separator
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(100, yPos);
    ctx.lineTo(980, yPos);
    ctx.stroke();
    yPos += 50;
    
    // Property Specs Header
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 40px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('📋 PROPERTY SPECS', 100, yPos);
    yPos += 60;
    
    // Area
    ctx.fillStyle = '#e0f2fe';
    ctx.font = '32px Arial';
    ctx.fillText(`${EMOJIS.area} Area: ${property.area?.value} ${property.area?.unit}`, 100, yPos);
    yPos += 50;
    
    // Type
    ctx.fillText(`${EMOJIS.type} Type: ${property.propertyType || 'N/A'}`, 100, yPos);
    yPos += 50;
    
    // Status
    ctx.fillText(`${EMOJIS.status} Status: ${property.status || 'Active'}`, 100, yPos);
    yPos += 60;
    
    // Location
    ctx.fillText(`${EMOJIS.location} ${property.location?.address || property.location?.landmark || 'N/A'}`, 100, yPos);
    yPos += 50;
    
    // City & Pincode
    ctx.fillText(`${EMOJIS.city} ${property.location?.city || 'N/A'}, ${EMOJIS.pincode} ${property.location?.pincode || 'N/A'}`, 100, yPos);
    yPos += 70;
    
    // Separator
    ctx.beginPath();
    ctx.moveTo(100, yPos);
    ctx.lineTo(980, yPos);
    ctx.stroke();
    yPos += 50;
    
    // Property Dealer Header
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 40px Arial';
    ctx.fillText('👤 PROPERTY DEALER', 100, yPos);
    yPos += 60;
    
    // Dealer Name
    ctx.fillStyle = '#e0f2fe';
    ctx.font = '32px Arial';
    ctx.fillText(`${EMOJIS.name} ${dealer?.fullName || 'N/A'}`, 100, yPos);
    yPos += 50;
    
    // Mobile
    ctx.fillText(`${EMOJIS.mobile} +91 ${dealer?.phone || 'N/A'}`, 100, yPos);
    yPos += 50;
    
    // WhatsApp
    ctx.fillText(`${EMOJIS.whatsapp} +91 ${dealer?.whatsapp || dealer?.phone || 'N/A'}`, 100, yPos);
    yPos += 70;
    
    // Separator
    ctx.beginPath();
    ctx.moveTo(100, yPos);
    ctx.lineTo(980, yPos);
    ctx.stroke();
    yPos += 50;
    
    // Property Media Header
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 40px Arial';
    ctx.fillText('📸 PROPERTY MEDIA', 540, yPos);
    yPos += 60;
    
    // Photo placeholder
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(240, yPos - 40, 600, 350);
    ctx.fillStyle = '#ffffff';
    ctx.font = '28px Arial';
    ctx.fillText(`${EMOJIS.photo} Property Photo`, 540, yPos);
    yPos += 380;
    
    // Property Link
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fef3c7';
    ctx.font = 'bold 28px Arial';
    const propertyLink = `https://propertytick.com/property/${property._id}`;
    ctx.fillText(`${EMOJIS.link} View Full Details`, 540, yPos);
    yPos += 35;
    ctx.fillStyle = '#ffffff';
    ctx.font = '24px Arial';
    ctx.fillText(propertyLink, 540, yPos);
    yPos += 60;
    
    // Google Location (agar hai)
    const coords = dealer?.shopCoordinates?.coordinates;
    const hasCoords = Array.isArray(coords) && coords.length >= 2 && coords[0] !== 0 && coords[1] !== 0;
    
    if (hasCoords) {
      ctx.fillStyle = '#fef3c7';
      ctx.font = 'bold 28px Arial';
      ctx.fillText(`${EMOJIS.google} View on Google Maps`, 540, yPos);
      yPos += 35;
      ctx.fillStyle = '#ffffff';
      ctx.font = '24px Arial';
      ctx.fillText('Click to see exact location', 540, yPos);
      yPos += 60;
    }
    
    // Footer
    yPos = 1700;
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.font = 'bold 36px Arial';
    ctx.fillText('🏠 PropertyTick.com', 540, yPos);
    yPos += 45;
    
    ctx.font = '28px Arial';
    ctx.fillText('📱 Download Our App', 540, yPos);
    yPos += 35;
    
    ctx.font = '24px Arial';
    ctx.fillText('Google Play & App Store', 540, yPos);
    yPos += 55;
    
    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 32px Arial';
    ctx.fillText(`${EMOJIS.verified} Verified & OTP-Secured`, 540, yPos);
    yPos += 45;
    
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.font = '24px Arial';
    ctx.fillText("India's Trusted Property Platform", 540, yPos);
    
    // Buffer mein convert karo
    const buffer = canvas.toBuffer('image/jpeg', { quality: 0.9 });
    
    // Uploads folder mein save karo (optional)
    const uploadsDir = path.join(__dirname, '../uploads/property-cards');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    const fileName = `property-${property._id}-${Date.now()}.jpg`;
    const filePath = path.join(uploadsDir, fileName);
    fs.writeFileSync(filePath, buffer);
    
    // Full URL banao
    const fullUrl = `${process.env.CLIENT_URL || 'https://propertytick.com'}/uploads/property-cards/${fileName}`;
    
    res.json({
      success: true,
      data: {
        fullUrl,
        fileName
      }
    });
    
  } catch (error) {
    console.error('Property card generation error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate property card', error: error.message });
  }
};

const Canvas = require('canvas');
const path = require('path');
const fs = require('fs');

// ... (baaki controllers ke baad ye function add karo) ...

const generatePropertyCardImage = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const property = await Property.findById(id)
      .populate('listedBy', 'fullName phone whatsapp location shopName businessHours shopAddress shopLandmark shopPincode shopCoordinates')
      .populate('owner', 'fullName phone whatsapp location shopName businessHours shopAddress shopLandmark shopPincode shopCoordinates');

    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    const dealer = property.listedBy || property.owner;
    
    // 24 Random Gradient Colors (Har baar alag color aayega)
    const GRADIENTS = [
      ['#667eea', '#764ba2'], ['#f093fb', '#f5576c'], ['#4facfe', '#00f2fe'],
      ['#43e97b', '#38f9d7'], ['#fa709a', '#fee140'], ['#30cfd0', '#330867'],
      ['#a8edea', '#fed6e3'], ['#ff9a9e', '#fecfef'], ['#ffecd2', '#fcb69f'],
      ['#ff6e7f', '#bfe9ff'], ['#e0c3fc', '#8ec5fc'], ['#f093fb', '#f5576c'],
      ['#f5af19', '#f12711'], ['#11998e', '#38ef7d'], ['#667eea', '#764ba2'],
      ['#4facfe', '#00f2fe'], ['#43e97b', '#38f9d7'], ['#fa709a', '#fee140'],
      ['#30cfd0', '#330867'], ['#a8edea', '#fed6e3'], ['#ff9a9e', '#fecfef'],
      ['#ffecd2', '#fcb69f'], ['#ff6e7f', '#bfe9ff'], ['#e0c3fc', '#8ec5fc'],
    ];
    const randomGradient = GRADIENTS[Math.floor(Math.random() * GRADIENTS.length)];
    
    // Canvas setup (WhatsApp Image Size)
    const canvas = Canvas.createCanvas(1080, 1920);
    const ctx = canvas.getContext('2d');
    
    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, 1920);
    gradient.addColorStop(0, randomGradient[0]);
    gradient.addColorStop(1, randomGradient[1]);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1080, 1920);
    
    // Overlay pattern (dots)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    for (let i = 0; i < 1080; i += 40) {
      for (let j = 0; j < 1920; j += 40) {
        ctx.beginPath();
        ctx.arc(i, j, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    
    let yPos = 80;
    
    // Header
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('🏠 PropertyTick', 540, yPos);
    yPos += 60;
    
    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 32px Arial';
    ctx.fillText('✓ Verified & OTP-Secured', 540, yPos);
    yPos += 80;
    
    // Title & Price
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 52px Arial';
    ctx.fillText(property.title, 540, yPos);
    yPos += 70;
    
    const priceEmoji = property.listingPurpose === 'rent' ? '🏠' : '🔑';
    ctx.fillStyle = '#fef3c7';
    ctx.font = 'bold 60px Arial';
    ctx.fillText(`${priceEmoji} ₹${(property.price?.amount / 100000).toFixed(2)} Cr`, 540, yPos);
    yPos += 50;
    
    if (property.price?.isNegotiable) {
      ctx.fillStyle = '#86efac';
      ctx.font = 'italic 32px Arial';
      ctx.fillText('💵 Negotiable', 540, yPos);
      yPos += 60;
    }
    
    // Separator
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(100, yPos); ctx.lineTo(980, yPos); ctx.stroke();
    yPos += 50;
    
    // Specs
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 40px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('📋 PROPERTY SPECS', 100, yPos);
    yPos += 60;
    
    ctx.fillStyle = '#e0f2fe';
    ctx.font = '32px Arial';
    ctx.fillText(`📐 Area: ${property.area?.value} ${property.area?.unit}`, 100, yPos); yPos += 50;
    ctx.fillText(`🏷️ Type: ${property.propertyType || 'N/A'}`, 100, yPos); yPos += 50;
    ctx.fillText(`✅ Status: ${property.status || 'Active'}`, 100, yPos); yPos += 60;
    ctx.fillText(`📍 ${property.location?.address || property.location?.landmark || 'N/A'}`, 100, yPos); yPos += 50;
    ctx.fillText(`🏙️ ${property.location?.city || 'N/A'}, 📮 ${property.location?.pincode || 'N/A'}`, 100, yPos);


module.exports = {
  createProperty,
  listProperties,
  getPropertyById,
  updateProperty,
  deleteProperty,
  getMyProperties,
  lockPropertyShield,
  generatePropertyCardImage, // 👈 Ye add karo
};