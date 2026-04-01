// Database configuration
const MONGO_CONFIG = {
  development: {
    uri: process.env.MONGO_URI || 'mongodb://localhost:27017/studyflow',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    },
  },
  production: {
    uri: process.env.MONGO_URI,
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10,
    },
  },
};

// Server configuration
const SERVER_CONFIG = {
  port: process.env.PORT || 5000,
  env: process.env.NODE_ENV || 'development',
  jwt: {
    secret: process.env.JWT_SECRET || 'your_secret_key_here',
    expiresIn: '24h',
  },
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
  },
};

// Validation rules
const VALIDATION_RULES = {
  task: {
    title: { required: true, minLength: 3, maxLength: 100 },
    description: { maxLength: 1000 },
    priority: { enum: ['Low', 'Medium', 'High'] },
    status: { enum: ['To Do', 'In Progress', 'Review', 'Done'] },
  },
  user: {
    username: { required: true, minLength: 3, maxLength: 50 },
    email: { required: true, type: 'email' },
    password: { required: true, minLength: 6 },
  },
};

// Status transitions
const STATUS_FLOW = {
  'To Do': ['In Progress'],
  'In Progress': ['Review', 'To Do'],
  'Review': ['Done', 'In Progress'],
  'Done': ['In Progress'],
};

module.exports = {
  MONGO_CONFIG,
  SERVER_CONFIG,
  VALIDATION_RULES,
  STATUS_FLOW,
};
