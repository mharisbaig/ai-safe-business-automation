/**
 * Arbre IT Support and Solution
 * Database Configuration
 */

const mongoose = require('mongoose');
const { config } = require('./config');
const auditLogger = require('./middleware/audit-logger');

class DatabaseManager {
  constructor() {
    this.connection = null;
  }

  async connect() {
    try {
      const options = {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      };

      this.connection = await mongoose.connect(config.database.url, options);
      
      auditLogger.info('Database connected successfully', {
        organization: config.organization.name,
        database: config.database.name
      });

      mongoose.connection.on('error', (err) => {
        auditLogger.error('MongoDB connection error', { error: err.message });
      });

      mongoose.connection.on('disconnected', () => {
        auditLogger.warn('MongoDB disconnected');
      });

      return this.connection;
    } catch (error) {
      auditLogger.error('Database connection failed', { error: error.message });
      throw error;
    }
  }

  async disconnect() {
    if (this.connection) {
      await mongoose.connection.close();
      auditLogger.info('Database disconnected');
    }
  }

  getAuditLogSchema() {
    return new mongoose.Schema({
      timestamp: { type: Date, default: Date.now },
      level: { type: String, enum: ['info', 'warn', 'error'], required: true },
      message: { type: String, required: true },
      requestId: String,
      userId: String,
      organization: { type: String, default: 'Arbre IT Support and Solution' },
      metadata: mongoose.Schema.Types.Mixed,
      ipAddress: String,
      userAgent: String
    }, { 
      collection: 'audit_logs',
      timestamps: true 
    });
  }

  getAIRequestSchema() {
    return new mongoose.Schema({
      requestId: { type: String, unique: true, required: true },
      timestamp: { type: Date, default: Date.now },
      userId: String,
      prompt: String,
      response: String,
      safetyChecks: [String],
      processingTime: Number,
      success: Boolean,
      errorType: String,
      organization: { type: String, default: 'Arbre IT Support and Solution' },
      metadata: mongoose.Schema.Types.Mixed
    }, {
      collection: 'ai_requests',
      timestamps: true
    });
  }
}

module.exports = new DatabaseManager();
