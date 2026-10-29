const Interest = require('../models/Interest');
const Property = require('../models/Property');
const Notification = require('../models/Notification');
const ApiResponse = require('../utils/apiResponse');
const { sendViaBrevo } = require('../services/emailService');
const { HTTP_STATUS } = require('../config/constants');

const expressInterest = async (req, res, next) => {
  try {
    const { propertyId } = req.params;
    const { name, mobile, email, pincode, message } = req.body;

    const property = await Property.findById(propertyId).populate('owner', 'fullName email');
    if (!property) return ApiResponse.error(res, 'Property not found', HTTP_STATUS.NOT_FOUND);

    // Check if it's a rent or sale property for dynamic messages
    const isRent = property.listingPurpose === 'rent';
    const propertyTypeText = isRent ? 'Rent Property' : 'Property';

    // 1. Interest save karo
    const interest = await Interest.create({
      property: propertyId,
      owner: property.owner._id,
      interestedUser: { name, mobile, email, pincode },
      message: message || ''
    });

    // 2. Owner ko Notification bhejo (Dynamic Text)
    await Notification.create({
      user: property.owner._id,
      title: `New Interest in your ${propertyTypeText}! 🏠`,
      body: `${name} is interested in your ${propertyTypeText.toLowerCase()} "${property.title}". Contact: ${mobile}`,
      type: 'info',
      link: `/dashboard/messages`
    });

    // 3. Owner ko Email bhejo (Dynamic Text)
    try {
      await sendViaBrevo(
        property.owner.email,
        `New Lead: ${propertyTypeText} - ${property.title}`,
        `<h2>New Property Lead</h2>
         <p><strong>Property Type:</strong> ${propertyTypeText}</p>
         <p><strong>Property Title:</strong> ${property.title}</p>
         <hr>
         <p><strong>Interested User Name:</strong> ${name}</p>
         <p><strong>Mobile:</strong> ${mobile}</p>
         <p><strong>Email:</strong> ${email}</p>
         <p><strong>Pincode:</strong> ${pincode}</p>
         <p><strong>Message:</strong> ${message || 'No message'}</p>
         <br>
         <p>Login to your dashboard to view all leads and contact the user.</p>`,
        `New Lead: ${name}`
      );
    } catch (emailErr) {
      console.error('Interest email failed:', emailErr.message);
    }

    return ApiResponse.success(res, { interest }, 'Your interest has been sent successfully! The owner will contact you soon.');
  } catch (err) {
    next(err);
  }
};

// ... baaki ke functions (getMyInterests, markAsContacted) wahi rahenge ...
module.exports = { expressInterest, getMyInterests, markAsContacted };