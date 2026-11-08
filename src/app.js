const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const path = require('path');

// Routes Imports
const routes = require('./routes');
const adminRoutes = require('./routes/admin.routes');
const superviserRoutes = require('./routes/superviserRoutes'); // ✅ Sirf import, app.use nahi
const rentDealRoutes = require('./routes/rentDeal.routes');
const interestRoutes = require('./routes/interest.routes');

const { notFound, errorHandler } = require('./middlewares/errorHandler');
const { globalLimiter } = require('./middlewares/rateLimiter');
const logger = require('./utils/logger');

const app = express();
app.set('query parser', 'extended');
app.set('trust proxy', 1);

// 1. Security Middlewares
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false,
}));

// 2. CORS Setup
// 2. CORS Setup
const allowedOrigins = [
  process.env.CLIENT_URL, 
  'https://www.propertytick.com',
  'https://propertytick.com',
  'http://localhost:3000', 
  'http://localhost:5173'
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Agar origin nahi hai (jaise mobile apps ya postman) ya allowed list mein hai
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// 3. Body Parsers & Sanitization
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(mongoSanitize());
app.use(compression());

// 4. Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', {
    stream: { write: (msg) => logger.http(msg.trim()) },
  }));
}

// 5. Static Folder
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 6. Rate Limiter
app.use('/api', globalLimiter);


// ==========================================
// 7. ROUTES (Sabse Neeche, app define hone ke baad)
// ==========================================
app.use(`/api/${process.env.API_VERSION || 'v1'}`, routes);
app.use(`/api/${process.env.API_VERSION || 'v1'}/admin`, adminRoutes);
app.use(`/api/${process.env.API_VERSION || 'v1'}/rent-deals`, rentDealRoutes);
app.use(`/api/${process.env.API_VERSION || 'v1'}/property`, interestRoutes);
const advertisementRoutes = require('./routes/advertisementRoutes');
app.use(`/api/${process.env.API_VERSION || 'v1'}/advertisements`, advertisementRoutes);

// ✅ Superviser route (sahi jagah par, ek hi baar)
app.use(`/api/${process.env.API_VERSION || 'v1'}/superviser`, superviserRoutes);

// 8. Root Route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '🏠 PropertyTick API',
    docs: '/api/v1/health',
  });
});

// 9. Error Handlers (Hamesha sabse neeche)
app.use(notFound);
app.use(errorHandler);

module.exports = app;