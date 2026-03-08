/**
 * Arbre IT Support and Solution
 * AI Safe Business Automation Platform
 * Main Server Entry Point
 */

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const SafeAIAgent = require('./ai-agent');
const GuardrailSystem = require('./guardrails');
const auditLogger = require('./middleware/audit-logger');
const authMiddleware = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Security Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
}));

// Rate Limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: {
    error: 'Too many requests from this IP, please try again later.',
    organization: 'Arbre IT Support and Solution'
  }
});
app.use('/api/', limiter);

// Body Parsing
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Logging
app.use(morgan('combined', { stream: auditLogger.stream }));

// Initialize AI Agent with Safety
const aiAgent = new SafeAIAgent({
  model: process.env.AI_MODEL || 'claude-3-haiku-20240307',
  maxTokens: parseInt(process.env.MAX_TOKENS) || 500,
  temperature: parseFloat(process.env.TEMPERATURE) || 0.1
});

const guardrails = new GuardrailSystem({
  enablePII: process.env.ENABLE_PII_REDACTION === 'true',
  enableInjectionDetection: process.env.ENABLE_INJECTION_DETECTION === 'true'
});

// Health Check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    organization: 'Arbre IT Support and Solution',
    location: 'Karachi, Pakistan',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Main AI Endpoint with Full Safety Pipeline
app.post('/api/ai/process', authMiddleware, async (req, res) => {
  const requestId = `arb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    const { prompt, context = {} } = req.body;
    
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Invalid prompt provided',
        requestId
      });
    }

    const enrichedContext = {
      ...context,
      userId: req.user?.id,
      userRole: req.user?.role || 'standard',
      sessionId: req.sessionId,
      requestId,
      allowedDomains: context.domain ? [context.domain] : ['general_support']
    };

    const result = await aiAgent.processRequest(prompt, enrichedContext);

    if (result.success) {
      res.json({
        success: true,
        requestId,
        response: result.response,
        safetyChecks: result.safetyChecks,
        processingTime: result.processingTime,
        organization: 'Arbre IT Support and Solution'
      });
    } else {
      res.status(400).json({
        success: false,
        requestId,
        error: result.message,
        errorType: result.errorType,
        requiresHumanReview: result.requiresHumanReview,
        safetyReason: result.safetyReason
      });
    }

  } catch (error) {
    auditLogger.error('Unhandled error in AI processing', {
      requestId,
      error: error.message,
      stack: error.stack
    });
    
    res.status(500).json({
      success: false,
      requestId,
      error: 'Internal server error',
      organization: 'Arbre IT Support and Solution',
      support: 'Contact haris.baig@arbreitsolutions.com'
    });
  }
});

// Safety Status Endpoint
app.get('/api/safety/status', authMiddleware, async (req, res) => {
  res.json({
    guardrails: {
      piiRedaction: process.env.ENABLE_PII_REDACTION === 'true',
      injectionDetection: process.env.ENABLE_INJECTION_DETECTION === 'true',
      contentSafety: process.env.ENABLE_CONTENT_SAFETY === 'true',
      hallucinationDetection: process.env.ENABLE_HALLUCINATION_DETECTION === 'true'
    },
    thresholds: {
      confidence: parseFloat(process.env.SAFETY_CONFIDENCE_THRESHOLD) || 0.8,
      maxLength: parseInt(process.env.MAX_REQUEST_LENGTH) || 4000
    },
    organization: 'Arbre IT Support and Solution',
    compliance: ['NIST AI RMF', 'OWASP LLM Top 10', 'ISO 42001 Ready']
  });
});

// Dashboard Static Files
app.use('/dashboard', express.static('dashboard'));

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    organization: 'Arbre IT Support and Solution',
    documentation: '/docs/README.md'
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  auditLogger.error('Global error handler triggered', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method
  });
  
  res.status(500).json({
    error: 'Internal server error',
    requestId: req.requestId,
    organization: 'Arbre IT Support and Solution'
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`
🌳 ===========================================
   Arbre IT Support and Solution
   AI Safe Business Automation Platform
   
   Server running on port ${PORT}
   Environment: ${process.env.NODE_ENV || 'development'}
   Location: Karachi, Pakistan
   
   Safety First. Always.
   ===========================================
  `);
  
  auditLogger.info('Server started', {
    port: PORT,
    environment: process.env.NODE_ENV,
    organization: 'Arbre IT Support and Solution'
  });
});

module.exports = app;
