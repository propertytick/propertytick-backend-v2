const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const path = require('path');
const rentDealRoutes = require('./routes/rentDeal.routes');
const routes = require('./routes');
const adminRoutes = require('./routes/admin.routes');
const superviserRoutes = require('./routes/superviserRoutes'); // 
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
const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:3000',
  'http://localhost:5173',
  'https://www.propertytick.com', 
  'https://propertytick.com',
  'https://propertytick-frontend.vercel.app' 
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
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
// 7. ROUTES (Yahan sahi se mount kiya gaya hai)
// ==========================================
app.use(`/api/${process.env.API_VERSION || 'v1'}`, routes);
app.use(`/api/${process.env.API_VERSION || 'v1'}/admin`, adminRoutes); 
app.use(`/api/${process.env.API_VERSION || 'v1'}/rent-deals`, rentDealRoutes);
app.use(`/superviser`, superviserRoutes);

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