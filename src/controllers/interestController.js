const Property = require('../models/Property');
const User = require('../models/User');
const Notification = require('../models/Notification');
const ApiResponse = require('../utils/apiResponse');
const { sendViaBrevo } = require('../services/emailService');
const { HTTP_STATUS } = require('../config/constants');
const jwt = require('jsonwebtoken'); // ✅ Token check karne ke liye add kiya

/**
 * POST /api/v1/property/:propertyId/interest
 * Jab koi user (Guest ya Logged-in) "I'm Interested" button click kare
 */
const expressInterest = async (req, res, next) => {
  try {
    const { propertyId } = req.params;
    
    // Property dhundho with owner details
    const property = await Property.findById(propertyId)
      .populate('listedBy', 'fullName email phone location city pinCode')
      .populate('owner', 'fullName email phone location city pinCode');

    if (!property) {
      return ApiResponse.error(res, 'Property not found', HTTP_STATUS.NOT_FOUND);
    }

    // Property owner determine karo (listedBy ya owner)
    const propertyOwner = property.listedBy || property.owner;
    if (!propertyOwner) {
      return ApiResponse.error(res, 'Property owner not found', HTTP_STATUS.NOT_FOUND);
    }

    // ✅ STEP 1: Check karo ki user logged in hai ya nahi
    let interestedUser = null;
    
    // Pehle req.user check karo (agar koi middleware laga ho)
    if (req.user) {
      interestedUser = req.user;
    } else {
      // Agar req.user nahi hai, toh manually Authorization header se token check karo
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          const token = authHeader.split(' ')[1];
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          interestedUser = await User.findById(decoded.id).select('fullName email phone location city pinCode');
        } catch (err) {
          // Token invalid ya expired hai, ise guest maan lenge
        }
      }
    }

    // ✅ STEP 2: Agar abhi bhi user nahi mila, toh ye Guest User hai
    if (!interestedUser) {
      const { name, email, phone, city, pinCode } = req.body;
      if (!email || !phone) {
        return ApiResponse.error(res, 'Email and phone are required for guest users', HTTP_STATUS.BAD_REQUEST);
      }
      interestedUser = { name, email, phone, city, pinCode };
    }

    // ✅ STEP 3: OFFER PRICE nikalo (agar user ne bhari hai)
    const offeredPrice = req.body.offeredPrice ? Number(req.body.offeredPrice) : null;

    // ========================================
    // 1. PROPERTY OWNER KO NOTIFICATION BHEJO (In-App)
    // ========================================
    let notificationBody = `${interestedUser.fullName || interestedUser.name || 'Someone'} is interested in your property "${property.title}". Contact: ${interestedUser.phone || 'N/A'}, ${interestedUser.email || 'N/A'}`;
    
    if (offeredPrice) {
      notificationBody += ` | 💰 Offer Price: ₹${offeredPrice.toLocaleString('en-IN')}`;
    }

    await Notification.create({
      user: propertyOwner._id,
      title: '🎯 New Interest on Your Property!',
      body: notificationBody,
      type: 'interest',
      link: `/property/${property._id}`,
      metadata: {
        propertyId: property._id,
        propertyTitle: property.title,
        offeredPrice: offeredPrice,
        interestedUser: {
          name: interestedUser.fullName || interestedUser.name,
          email: interestedUser.email,
          phone: interestedUser.phone,
          city: interestedUser.city || interestedUser.location?.city,
          pinCode: interestedUser.pinCode || interestedUser.location?.pinCode,
        }
      }
    });

    // ========================================
    // 2. PROPERTY OWNER KO EMAIL BHEJO
    // ========================================
    const listedPrice = property.price?.amount || property.price || 0;
    const offerHighlight = offeredPrice 
      ? `<div style="background:#fef3c7;padding:16px;border-radius:8px;margin:16px 0;border-left:4px solid #f59e0b;">
           <p style="margin:0;font-size:14px;color:#92400e;"><strong>💰 User's Offer Price:</strong></p>
           <p style="margin:8px 0 0 0;font-size:24px;font-weight:bold;color:#92400e;">₹${offeredPrice.toLocaleString('en-IN')}</p>
           <p style="margin:4px 0 0 0;font-size:12px;color:#92400e;">Listed Price: ₹${listedPrice.toLocaleString('en-IN')}</p>
         </div>`
      : `<div style="background:#f3f4f6;padding:12px;border-radius:8px;margin:16px 0;">
           <p style="margin:0;font-size:14px;color:#6b7280;">User ne koi offer price nahi bhari hai. Listed Price: ₹${listedPrice.toLocaleString('en-IN')}</p>
         </div>`;

    const ownerEmailHtml = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;">
        <div style="background:#2563eb;color:white;padding:20px;border-radius:8px 8px 0 0;margin:-32px -32px 24px -32px;">
          <h1 style="margin:0;font-size:24px;">🎯 New Interest on Your Property!</h1>
        </div>
        <p style="font-size:16px;color:#374151;">Hi <strong>${propertyOwner.fullName || propertyOwner.name}</strong>,</p>
        <p style="font-size:16px;color:#374151;">Great news! Someone is interested in your property:</p>
        
        <div style="background:#f3f4f6;padding:20px;border-radius:8px;margin:20px 0;border-left:4px solid #2563eb;">
          <h3 style="margin:0 0 10px 0;color:#1f2937;">${property.title}</h3>
          <p style="margin:5px 0;color:#6b7280;">📍 ${property.location?.address || property.location?.city || 'Location not specified'}</p>
          <p style="margin:5px 0;color:#6b7280;">💰 Listed Price: ₹${listedPrice.toLocaleString('en-IN')}</p>
        </div>

        ${offerHighlight}

        <h3 style="color:#2563eb;margin-top:24px;">👤 Interested User Details:</h3>
        <div style="background:#eff6ff;padding:20px;border-radius:8px;margin:16px 0;">
          <p style="margin:8px 0;"><strong>Name:</strong> ${interestedUser.fullName || interestedUser.name || 'Not provided'}</p>
          <p style="margin:8px 0;"><strong>📧 Email:</strong> <a href="mailto:${interestedUser.email}" style="color:#2563eb;">${interestedUser.email}</a></p>
          <p style="margin:8px 0;"><strong>📱 Phone:</strong> <a href="tel:${interestedUser.phone}" style="color:#2563eb;">${interestedUser.phone}</a></p>
          <p style="margin:8px 0;"><strong>🏙️ City:</strong> ${interestedUser.city || interestedUser.location?.city || 'Not provided'}</p>
          <p style="margin:8px 0;"><strong>📮 Pin Code:</strong> ${interestedUser.pinCode || interestedUser.location?.pinCode || 'Not provided'}</p>
        </div>

        <p style="margin-top:32px;color:#6b7280;font-size:14px;">Best regards,<br><strong>PropertyTick Team</strong></p>
      </div>
    `;

    try {
      await sendViaBrevo(
        propertyOwner.email,
        `🎯 New Interest: ${property.title}${offeredPrice ? ` (Offer: ₹${offeredPrice.toLocaleString('en-IN')})` : ''}`,
        ownerEmailHtml,
        `New Interest: ${property.title}`
      );
      console.log('✅ Owner notification email sent to:', propertyOwner.email);
    } catch (emailErr) {
      console.error('❌ Owner email failed:', emailErr.message);
    }

    // ========================================
    // 3. INTERESTED USER KO CONFIRMATION EMAIL BHEJO (Sirf agar logged in hai)
    // ========================================
    if (req.user && req.user.email) {
      const userConfirmationHtml = `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;">
          <div style="background:#10b981;color:white;padding:20px;border-radius:8px 8px 0 0;margin:-32px -32px 24px -32px;">
            <h1 style="margin:0;font-size:24px;">✅ Interest Expressed Successfully!</h1>
          </div>
          <p style="font-size:16px;color:#374151;">Hi <strong>${req.user.fullName}</strong>,</p>
          <p style="font-size:16px;color:#374151;">Thank you for your interest! We've shared your details with the property owner.</p>
          
          <div style="background:#f0fdf4;padding:20px;border-radius:8px;margin:20px 0;border-left:4px solid #10b981;">
            <h3 style="margin:0 0 10px 0;color:#1f2937;">${property.title}</h3>
            <p style="margin:5px 0;color:#6b7280;">📍 ${property.location?.address || property.location?.city || 'Location not specified'}</p>
            <p style="margin:5px 0;color:#6b7280;">💰 Listed Price: ₹${listedPrice.toLocaleString('en-IN')}</p>
            ${offeredPrice ? `<p style="margin:5px 0;color:#6b7280;"><strong>Your Offer: ₹${offeredPrice.toLocaleString('en-IN')}</strong></p>` : ''}
          </div>
          <p style="font-size:16px;color:#374151;">The property owner will contact you soon on your registered phone number.</p>
          <p style="margin-top:32px;color:#6b7280;font-size:14px;">Best regards,<br><strong>PropertyTick Team</strong></p>
        </div>
      `;

      try {
        await sendViaBrevo(
          req.user.email,
          '✅ Interest Confirmed - PropertyTick',
          userConfirmationHtml,
          'Interest Confirmed'
        );
        console.log('✅ User confirmation email sent to:', req.user.email);
      } catch (emailErr) {
        console.error('❌ User confirmation email failed:', emailErr.message);
      }
    }

    return ApiResponse.success(
      res,
      {
        propertyId: property._id,
        propertyTitle: property.title,
        offeredPrice: offeredPrice,
        message: 'Interest expressed successfully. Property owner has been notified.'
      },
      'Interest expressed successfully'
    );
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/property/interests/my
 * Property owner apne interests dekhe
 */
const getMyInterests = async (req, res, next) => {
  try {
    const userId = req.user._id;
    
    const properties = await Property.find({
      $or: [{ listedBy: userId }, { owner: userId }]
    }).select('_id title listingPurpose price location');

    const propertyIds = properties.map(p => p._id);

    const interests = await Notification.find({
      user: userId,
      type: 'interest',
      'metadata.propertyId': { $in: propertyIds }
    })
    .sort({ createdAt: -1 })
    .lean();

    return ApiResponse.success(res, { interests, total: interests.length }, 'Interests fetched');
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/v1/property/interests/:id/contacted
 * Owner mark kare ki usne contact kar liya
 */
const markAsContacted = async (req, res, next) => {
  try {
    const notification = await Notification.findById(req.params.id);
    
    if (!notification) {
      return ApiResponse.error(res, 'Notification not found', HTTP_STATUS.NOT_FOUND);
    }

    if (notification.user.toString() !== req.user._id.toString()) {
      return ApiResponse.error(res, 'Unauthorized', HTTP_STATUS.FORBIDDEN);
    }

    notification.isContacted = true;
    notification.contactedAt = new Date();
    await notification.save();

    return ApiResponse.success(res, { notification }, 'Marked as contacted');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  expressInterest,
  getMyInterests,
  markAsContacted,
};