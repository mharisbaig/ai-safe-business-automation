/**
 * Arbre IT Support and Solution
 * Audit Logging System
 */

const winston = require('winston');
const { config } = require('../config');

const auditLogger = winston.createLogger({
  level: config.audit.logLevel,
  defaultMeta: {
    organization: config.organization.name,
    service: 'ai-safe-automation'
  },
  transports: [
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
      maxsize: 5242880,
      maxFiles: 5
    }),
    new winston.transports.File({ 
      filename: 'logs/combined.log',
      maxsize: 5242880,
      maxFiles: 5
    })
  ]
});

if (config.audit.enableConsole || config.server.nodeEnv === 'development') {
  auditLogger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

auditLogger.stream = {
  write: (message) => {
    auditLogger.info(message.trim(), { type: 'http' });
  }
};

auditLogger.security = (message, meta) => {
  auditLogger.warn(message, { ...meta, category: 'security' });
};

auditLogger.ai = (message, meta) => {
  auditLogger.info(message, { ...meta, category: 'ai_interaction' });
};

auditLogger.compliance = (message, meta) => {
  auditLogger.info(message, { ...meta, category: 'compliance' });
};

module.exports = auditLogger;
