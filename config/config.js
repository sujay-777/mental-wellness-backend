require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || 5000,
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/mental-wellness',
  JWT_SECRET: process.env.JWT_SECRET || 'your_super_secret_jwt_key_change_this_in_production',
  NODE_ENV: process.env.NODE_ENV || 'development',
  // Email configuration
  EMAIL_HOST: process.env.EMAIL_HOST || 'smtp.gmail.com',
  EMAIL_PORT: process.env.EMAIL_PORT || 587,
  EMAIL_USER: process.env.EMAIL_USER || '',
  EMAIL_PASS: process.env.EMAIL_PASS || '',
  EMAIL_FROM: process.env.EMAIL_FROM || 'noreply@mentalwellness.com',
  // Reminder settings
  REMINDER_24H: process.env.REMINDER_24H === 'true' || true,
  REMINDER_1H: process.env.REMINDER_1H === 'true' || true,
  REMINDER_15MIN: process.env.REMINDER_15MIN === 'true' || false
}; 