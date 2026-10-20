const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');


const routes = require('./routes');
const { notFound, errorHandler } = require('./middlewares/errorHandler');
const { globalLimiter } = require('./middlewares/rateLimiter');
const logger = require('./utils/logger');

const app = express();
app.set('query parser', 'extended');
app.set('trust proxy', 1);

const path = require('path');

// ---- Security headers ----
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false,
}));

// ---- CORS ----
// ---- CORS ----
const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:3000',
  'http://localhost:5173',
  'https://www.propertytick.com', 
  'https://propertytick.com',
  'https://propertytick-frontend.vercel.app' 
].filter(Boolean);

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// ---- Body parsers ----
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// ---- Sanitization ----
app.use(mongoSanitize());
// xss-clean disabled — was corrupting camelCase query params like listingPurpose
// app.use(xss());
// hpp() disabled — was dropping single query params
// app.use(hpp());

// ---- Compression ----
app.use(compression());

// ---- HTTP logger ----
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', {
    stream: { write: (msg) => logger.http(msg.trim()) },
  }));
}

// ---- Rate limiting ----
app.use('/api', globalLimiter);

// ---- Routes ----
app.use(`/api/${process.env.API_VERSION || 'v1'}`, routes);
const superviserRoutes = require('./routes/superviserRoutes');
app.use(`/api/${process.env.API_VERSION || 'v1'}/superviser`, superviserRoutes);
// ---- Root ----
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: '🏠 PropertyTick API',
    docs: '/api/v1/health',
  });
});

// ---- 404 & Error handlers ----
app.use(notFound);
app.use(errorHandler);

module.exports = app;
