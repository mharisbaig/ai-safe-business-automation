/**
 * Arbre IT Support and Solution
 * Configuration Management
 */

require('dotenv').config();

const config = {
  organization: {
    name: process.env.COMPANY_NAME || 'Arbre IT Support and Solution',
    tagline: process.env.COMPANY_TAGLINE || 'Growing Technology, Rooted in Security',
    location: process.env.LOCATION || 'Karachi, Pakistan',
    adminEmail: process.env.ADMIN_EMAIL || 'admin@arbreitsolutions.com',
    supportEmail: process.env.SUPPORT_EMAIL || 'support@arbreitsolutions.com'
  },

  server: {
    port: parseInt(process.env.PORT) || 3000,
    host: process.env.HOST || 'localhost',
    nodeEnv: process.env.NODE_ENV || 'development'
  },

  security: {
    jwtSecret: process.env.JWT_SECRET,
    jwtExpire: process.env.JWT_EXPIRE || '24h',
    encryptionKey: process.env.ENCRYPTION_KEY,
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS) || 12
  },

  database: {
    url: process.env.DATABASE_URL || 'mongodb://localhost:27017/arbre_ai_safe',
    name: process.env.DATABASE_NAME || 'arbre_ai_safe',
    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379'
  },

  ai: {
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: process.env.AI_MODEL || 'claude-3-haiku-20240307',
    maxTokens: parseInt(process.env.MAX_TOKENS) || 500,
    temperature: parseFloat(process.env.TEMPERATURE) || 0.1,
    timeout: parseInt(process.env.AI_TIMEOUT) || 10000
  },

  safety: {
    enablePIIRedaction: process.env.ENABLE_PII_REDACTION === 'true',
    enableInjectionDetection: process.env.ENABLE_INJECTION_DETECTION === 'true',
    enableContentSafety: process.env.ENABLE_CONTENT_SAFETY === 'true',
    enableHallucinationDetection: process.env.ENABLE_HALLUCINATION_DETECTION === 'true',
    confidenceThreshold: parseFloat(process.env.SAFETY_CONFIDENCE_THRESHOLD) || 0.8,
    maxRequestLength: parseInt(process.env.MAX_REQUEST_LENGTH) || 4000
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
  },

  audit: {
    logLevel: process.env.AUDIT_LOG_LEVEL || 'info',
    retentionDays: parseInt(process.env.AUDIT_LOG_RETENTION_DAYS) || 90,
    enableConsole: process.env.ENABLE_CONSOLE_LOGS === 'true'
  },

  integrations: {
    whatsapp: {
      enabled: process.env.ENABLE_WHATSAPP_INTEGRATION === 'true',
      apiVersion: process.env.WHATSAPP_API_VERSION || 'v17.0',
      businessId: process.env.WHATSAPP_BUSINESS_ID,
      phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
      accessToken: process.env.WHATSAPP_ACCESS_TOKEN
    },
    accessControl: {
      enabled: process.env.ENABLE_ACCESS_CONTROL === 'true'
    }
  }
};

function validateConfig() {
  const required = [
    'security.jwtSecret',
    'security.encryptionKey',
    'ai.apiKey'
  ];

  const missing = required.filter(path => {
    const keys = path.split('.');
    let value = config;
    for (const key of keys) {
      value = value[key];
      if (value === undefined) return true;
    }
    return false;
  });

  if (missing.length > 0) {
    console.error('❌ Missing required configuration:', missing.join(', '));
    console.error('🌳 Arbre IT Support and Solution - Please check your .env file');
    process.exit(1);
  }

  console.log('✅ Configuration validated successfully');
  console.log(`🌳 Organization: ${config.organization.name}`);
  console.log(`📍 Location: ${config.organization.location}`);
}

module.exports = { config, validateConfig };
