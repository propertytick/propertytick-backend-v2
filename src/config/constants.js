// ==========================================================
// PropertyTick Global Constants — Single Source of Truth
// ==========================================================

const USER_ROLES = {
  BUYER: 'buyer',
  BROKER: 'broker',
  ADVOCATE: 'advocate',
  COLONIZER: 'colonizer',
  TYPIST: 'typist',
  STAMP_VENDOR: 'stamp_vendor',
  RENT: 'rent',           // 👈 NAYA ROLE
  ADMIN: 'admin',
};

const ADVOCATE_SERVICES = Object.freeze({
  LEGAL_VERIFICATION: 'legal_verification',
  DEED_DRAFTING: 'deed_drafting',
  BOTH: 'both',
});

const PROPERTY_STATUS = Object.freeze({
  DRAFT: 'draft',
  ACTIVE: 'active',
  SOLD: 'sold',
  PAUSED: 'paused',
  BLOCKED: 'blocked',
});

const DEAL_STATUS = Object.freeze({
  INITIATED: 'initiated',
  BUYER_OTP_VERIFIED: 'buyer_otp_verified',
  OWNER_OTP_VERIFIED: 'owner_otp_verified',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
});

const WALLET_TIER = Object.freeze({
  WELCOME: 'welcome',   // first 3 points free
  GROWTH: 'growth',     // next 10 = ₹3000
  REGULAR: 'regular',   // every 10 = ₹5000
});

const POINT_PRICING = Object.freeze({
  BROKER: {
    WELCOME_FREE: 3,
    GROWTH_PACK_SIZE: 10,
    GROWTH_PACK_PRICE: 3000,   // ₹300/deal
    REGULAR_PACK_SIZE: 10,
    REGULAR_PACK_PRICE: 5000,  // ₹500/deal
  },
  ADVOCATE: {
    WELCOME_FREE: 3,
    PACK_SIZE: 10,
    PACK_PRICE: 500,           // flat ₹50/case
  },
});

const KYC_STATUS = Object.freeze({
  PENDING: 'pending',
  VERIFIED: 'verified',
  REJECTED: 'rejected',
});

const RATING_TYPE = Object.freeze({
  BROKER_TO_BUYER: 'broker_to_buyer',
  BUYER_TO_BROKER: 'buyer_to_broker',
  BUYER_TO_ADVOCATE: 'buyer_to_advocate',
  BUYER_TO_COLONIZER: 'buyer_to_colonizer',
  BUYER_TO_TYPIST: 'buyer_to_typist',
  BUYER_TO_STAMP_VENDOR: 'buyer_to_stamp_vendor',
});

const LAND_UNITS = Object.freeze({
  BIGHA: 'bigha',
  BISWA: 'biswa',
  GAZ: 'gaz',
  MURABBA: 'murabba',
  KATTHA: 'kattha',
  SQFT: 'sqft',
  ACRE: 'acre',
  HECTARE: 'hectare',
});

const AUDIT_ACTIONS = Object.freeze({
  LOGIN: 'login',
  LOGOUT: 'logout',
  REGISTER: 'register',
  PROPERTY_CREATE: 'property_create',
  PROPERTY_UPDATE: 'property_update',
  PROPERTY_DELETE: 'property_delete',
  DEAL_CLOSE: 'deal_close',
  POINT_DEDUCT: 'point_deduct',
  KYC_UPDATE: 'kyc_update',
  FEE_UPDATE: 'fee_update',
  ADMIN_ACTION: 'admin_action',
});

const HTTP_STATUS = Object.freeze({
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  TOO_MANY: 429,
  SERVER_ERROR: 500,
});

module.exports = {
  USER_ROLES,
  ADVOCATE_SERVICES,
  PROPERTY_STATUS,
  DEAL_STATUS,
  WALLET_TIER,
  POINT_PRICING,
  KYC_STATUS,
  RATING_TYPE,
  LAND_UNITS,
  AUDIT_ACTIONS,
  HTTP_STATUS,
};
