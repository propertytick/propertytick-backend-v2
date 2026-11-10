const Project = require('../models/Project');
const Colonizer = require('../models/Colonizer');
const ApiResponse = require('../utils/apiResponse');
const { HTTP_STATUS } = require('../config/constants');
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
    
    // ✅ GRADIENTS function ke bahar se use karein (line 7 wala)
    const randomGradient = GRADIENTS[Math.floor(Math.random() * GRADIENTS.length)];
    
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
    yPos += 70;
    
    // Separator
    ctx.beginPath(); ctx.moveTo(100, yPos); ctx.lineTo(980, yPos); ctx.stroke();
    yPos += 50;
    
    // Dealer Info
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 40px Arial';
    ctx.fillText('👤 PROPERTY DEALER', 100, yPos);
    yPos += 60;
    
    ctx.fillStyle = '#e0f2fe';
    ctx.font = '32px Arial';
    ctx.fillText(`👤 ${dealer?.fullName || 'N/A'}`, 100, yPos); yPos += 50;
    ctx.fillText(`📱 +91 ${dealer?.phone || 'N/A'}`, 100, yPos); yPos += 50;
    ctx.fillText(`💬 +91 ${dealer?.whatsapp || dealer?.phone || 'N/A'}`, 100, yPos); yPos += 70;
    
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
    ctx.fillText('✓ Verified & OTP-Secured', 540, yPos);
    yPos += 45;
    
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.font = '24px Arial';
    ctx.fillText("India's Trusted Property Platform", 540, yPos);
    
    // ✅ Image Buffer & Save
    const buffer = canvas.toBuffer('image/jpeg', { quality: 0.9 });
    
    const uploadsDir = path.join(__dirname, '../uploads/property-cards');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    const fileName = `property-${property._id}-${Date.now()}.jpg`;
    const filePath = path.join(uploadsDir, fileName);
    fs.writeFileSync(filePath, buffer);
    
    const fullUrl = `${process.env.CLIENT_URL || 'https://propertytick.com'}/uploads/property-cards/${fileName}`;
    
    res.json({
      success: true,
      data: { fullUrl, fileName }
    });
    
  } catch (error) {
    console.error('Property card generation error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate property card', error: error.message });
  }
};

// ... (aapke imports, GRADIENTS, EMOJIS, aur generatePropertyCardImage function ke baad)

// ✅ BAaki Functions (jo missing the)

const createProperty = async (req, res, next) => {
  try {
    const {
      title, projectType, description, projectAddress,
      city, state, pincode, landmark,
      totalArea, totalPlots, priceRange, reraNumber,
      photos, naksha, contacts,
    } = req.body;

    const colonizer = await Colonizer.findOne({ user: req.user._id });
    if (!colonizer) {
      return ApiResponse.error(res, 'Colonizer profile not found', HTTP_STATUS.NOT_FOUND);
    }

    const project = await Project.create({
      colonizer: colonizer._id,
      title,
      projectType,
      description,
      projectAddress,
      location: { city, state, pincode, landmark },
      totalArea,
      totalPlots,
      priceRange,
      reraNumber,
      photos,
      naksha,
      contacts,
    });

    return ApiResponse.success(res, { project }, 'Project created successfully', HTTP_STATUS.CREATED);
  } catch (err) {
    next(err);
  }
};

const listProperties = async (req, res, next) => {
  try {
    const properties = await Property.find({ status: 'active' })
      .populate('listedBy', 'fullName phone whatsapp shopName')
      .sort({ createdAt: -1 });
    return res.json({ success: true, data: properties });
  } catch (err) {
    next(err);
  }
};

const getPropertyById = async (req, res, next) => {
  try {
    const property = await Property.findById(req.params.id)
      .populate('listedBy', 'fullName phone whatsapp shopName shopAddress')
      .populate('owner', 'fullName phone whatsapp');
    if (!property) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }
    return res.json({ success: true, data: property });
  } catch (err) {
    next(err);
  }
};

const updateProperty = async (req, res, next) => {
  try {
    const property = await Property.findByIdAndUpdate(req.params.id, req.body, { new: true });
    return res.json({ success: true, data: property });
  } catch (err) {
    next(err);
  }
};

const deleteProperty = async (req, res, next) => {
  try {
    await Property.findByIdAndDelete(req.params.id);
    return res.json({ success: true, message: 'Property deleted' });
  } catch (err) {
    next(err);
  }
};

const getMyProperties = async (req, res, next) => {
  try {
    const properties = await Property.find({ listedBy: req.user._id }).sort({ createdAt: -1 });
    return res.json({ success: true, data: properties });
  } catch (err) {
    next(err);
  }
};

const lockPropertyShield = async (req, res, next) => {
  try {
    // Yahan aapka logic aayega
    return res.json({ success: true, message: 'Property shield locked' });
  } catch (err) {
    next(err);
  }
};

// 👇 Ab module.exports mein sab kuch add karein
module.exports = {
  createProperty,
  listProperties,
  getPropertyById,
  updateProperty,
  deleteProperty,
  getMyProperties,
  lockPropertyShield,
  generatePropertyCardImage, 
};

