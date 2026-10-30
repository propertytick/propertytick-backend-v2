const Property = require('../models/Property');
const User = require('../models/User');
const Notification = require('../models/Notification');
const ApiResponse = require('../utils/apiResponse');
const { sendViaBrevo } = require('../services/emailService');
const { HTTP_STATUS } = require('../config/constants');

/**
 * POST /api/v1/property/:propertyId/interest
 * Jab koi user "I'm Interested" button click kare
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

    // Interested user details (agar logged in hai)
    let interestedUser = null;
    if (req.user) {
      interestedUser = req.user;
    } else {
      // Guest user ke liye body se details lo
      const { name, email, phone, city, pinCode } = req.body;
      if (!email || !phone) {
        return ApiResponse.error(res, 'Email and phone are required', HTTP_STATUS.BAD_REQUEST);
      }
      interestedUser = { name, email, phone, city, pinCode };
    }

    // ========================================
    // 1. PROPERTY OWNER KO NOTIFICATION BHEJO (In-App)
    // ========================================
    await Notification.create({
      user: propertyOwner._id,
      title: '🎯 New Interest on Your Property!',
      body: `${interestedUser.name || interestedUser.fullName || 'Someone'} is interested in your property "${property.title}". Contact: ${interestedUser.phone || 'N/A'}, ${interestedUser.email || 'N/A'}`,
      type: 'interest',
      link: `/property/${property._id}`,
      metadata: {
        propertyId: property._id,
        propertyTitle: property.title,
        interestedUser: {
          name: interestedUser.name || interestedUser.fullName,
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
          <p style="margin:5px 0;color:#6b7280;">💰 ₹${property.price?.amount?.toLocaleString() || property.price || 'N/A'}</p>
          <p style="margin:5px 0;color:#6b7280;"> Purpose: ${property.listingPurpose === 'buy' ? 'For Sale' : 'For Rent'}</p>
        </div>

        <h3 style="color:#2563eb;margin-top:24px;"> Interested User Details:</h3>
        <div style="background:#eff6ff;padding:20px;border-radius:8px;margin:16px 0;">
          <p style="margin:8px 0;"><strong>Name:</strong> ${interestedUser.name || interestedUser.fullName || 'Not provided'}</p>
          <p style="margin:8px 0;"><strong>📧 Email:</strong> <a href="mailto:${interestedUser.email}" style="color:#2563eb;">${interestedUser.email}</a></p>
          <p style="margin:8px 0;"><strong>📱 Phone:</strong> <a href="tel:${interestedUser.phone}" style="color:#2563eb;">${interestedUser.phone}</a></p>
          <p style="margin:8px 0;"><strong>🏙️ City:</strong> ${interestedUser.city || interestedUser.location?.city || 'Not provided'}</p>
          <p style="margin:8px 0;"><strong>📮 Pin Code:</strong> ${interestedUser.pinCode || interestedUser.location?.pinCode || 'Not provided'}</p>
        </div>

        <div style="margin-top:24px;text-align:center;">
          <a href="${process.env.CLIENT_URL || 'https://www.propertytick.com'}/property/${property._id}" 
             style="display:inline-block;background:#2563eb;color:white;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:bold;">
            View Property Details
          </a>
        </div>

        <p style="margin-top:32px;color:#6b7280;font-size:14px;">Best regards,<br><strong>PropertyTick Team</strong></p>
      </div>
    `;

    try {
      await sendViaBrevo(
        propertyOwner.email,
        `🎯 New Interest: ${property.title}`,
        ownerEmailHtml,
        `New Interest: ${property.title}`
      );
      console.log('✅ Owner notification email sent to:', propertyOwner.email);
    } catch (emailErr) {
      console.error(' Owner email failed:', emailErr.message);
    }

    // ========================================
    // 3. INTERESTED USER KO CONFIRMATION EMAIL BHEJO (agar logged in hai)
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
            <p style="margin:5px 0;color:#6b7280;"> ₹${property.price?.amount?.toLocaleString() || property.price || 'N/A'}</p>
          </div>

          <p style="font-size:16px;color:#374151;">The property owner will contact you soon on your registered phone number.</p>

          <div style="margin-top:24px;text-align:center;">
            <a href="${process.env.CLIENT_URL || 'https://www.propertytick.com'}/property/${property._id}" 
               style="display:inline-block;background:#10b981;color:white;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:bold;">
              View Property
            </a>
          </div>

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
        message: 'Interest expressed successfully. Property owner has been notified.'
      },
      'Interest expressed successfully'
    );
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/v1/property/my
 * Property owner apne interests dekhe
 */
const getMyInterests = async (req, res, next) => {
  try {
    const userId = req.user._id;
    
    // Is user ki saari properties dhundho
    const properties = await Property.find({
      $or: [{ listedBy: userId }, { owner: userId }]
    }).select('_id title listingPurpose price location');

    const propertyIds = properties.map(p => p._id);

    // Un properties par jo interests aaye hain
    const Notification = require('../models/Notification');
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
 * PUT /api/v1/property/:id/contacted
 * Owner mark kare ki usne contact kar liya
 */
const markAsContacted = async (req, res, next) => {
  try {
    const Notification = require('../models/Notification');
    const notification = await Notification.findById(req.params.id);
    
    if (!notification) {
      return ApiResponse.error(res, 'Notification not found', HTTP_STATUS.NOT_FOUND);
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