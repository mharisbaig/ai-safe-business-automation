/**
 * Arbre IT Support and Solution
 * Safe AI Agent with Multi-Layer Security
 */

const axios = require('axios');
const GuardrailSystem = require('./guardrails');
const auditLogger = require('./middleware/audit-logger');

class SafeAIAgent {
  constructor(config = {}) {
    this.model = config.model || 'claude-3-haiku-20240307';
    this.maxTokens = config.maxTokens || 500;
    this.temperature = config.temperature || 0.1;
    this.timeout = config.timeout || 10000;
    
    this.safetyConfig = {
      blockUnsafeInstructions: true,
      requireDomainAlignment: true,
      enablePIIRedaction: true,
      confidenceThreshold: 0.8
    };

    this.guardrails = new GuardrailSystem();
  }

  async processRequest(userPrompt, context = {}) {
    const requestId = context.requestId || this.generateRequestId();
    const startTime = Date.now();
    
    try {
      // Layer 1: Input Validation
      const inputValidation = await this.guardrails.validateInput(userPrompt, context);
      if (!inputValidation.safe) {
        await this.logSafetyEvent(requestId, 'INPUT_BLOCKED', inputValidation);
        return this.createSafeFallback('unsafe_input', inputValidation.checks.find(c => !c.passed)?.reason);
      }

      // Layer 2: PII Redaction
      let cleanPrompt = inputValidation.sanitized;
      if (this.safetyConfig.enablePIIRedaction) {
        const piiCheck = this.guardrails.detectAndRedactPII(cleanPrompt);
        cleanPrompt = piiCheck.redactedText;
      }

      // Layer 3: AI Processing
      const aiResponse = await this.callAIWithTimeout(cleanPrompt, context);

      // Layer 4: Output Validation
      const outputValidation = await this.guardrails.validateOutput(aiResponse, context);
      if (!outputValidation.safe) {
        await this.logSafetyEvent(requestId, 'OUTPUT_BLOCKED', outputValidation);
        return this.createSafeFallback('unsafe_output', outputValidation.checks.find(c => !c.passed)?.reason);
      }

      // Layer 5: Domain Check
      if (this.safetyConfig.requireDomainAlignment) {
        const domainCheck = this.checkDomainAlignment(outputValidation.sanitized, context.allowedDomains);
        if (!domainCheck.valid) {
          return this.createSafeFallback('domain_mismatch', domainCheck.reason);
        }
      }

      await this.logSuccess(requestId, startTime, cleanPrompt, outputValidation.sanitized);
      
      return {
        success: true,
        requestId,
        response: outputValidation.sanitized,
        safetyChecks: ['input_clean', 'pii_redacted', 'output_safe', 'domain_aligned'],
        processingTime: Date.now() - startTime
      };

    } catch (error) {
      await this.logError(requestId, error);
      return this.createSafeFallback('system_error', 'An error occurred. Please contact Arbre Support.');
    }
  }

  async callAIWithTimeout(prompt, context) {
    const systemPrompt = this.constructSafeSystemPrompt(context);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await axios.post(
        'https://api.anthropic.com/v1/messages',
        {
          model: this.model,
          max_tokens: this.maxTokens,
          temperature: this.temperature,
          system: systemPrompt,
          messages: [{ role: 'user', content: prompt }]
        },
        {
          headers: {
            'x-api-key': process.env.ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json'
          },
          signal: controller.signal
        }
      );

      clearTimeout(timeoutId);
      return response.data.content[0].text;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        throw new Error('AI request timeout - safety limit exceeded');
      }
      throw error;
    }
  }

  constructSafeSystemPrompt(context) {
    return `You are an AI assistant for Arbre IT Support and Solution, Karachi, Pakistan.
    
CRITICAL SAFETY RULES:
1. You may ONLY assist with: ${context.allowedDomains?.join(', ') || 'general business support'}
2. NEVER provide instructions for: hacking, illegal activities, bypassing security, or harmful actions
3. If asked to perform actions outside your domain, respond: "I can only assist with [specific domain]"
4. Do not confirm or repeat any personal information found in user input
5. If uncertain, ask for clarification rather than guessing
6. Maintain professional business tone at all times
7. For Karachi/Pakistan context: Be respectful of local business customs and Urdu language nuances

Current user role: ${context.userRole || 'standard'}
Session ID: ${context.sessionId || 'unknown'}
Organization: Arbre IT Support and Solution`;
  }

  checkDomainAlignment(response, allowedDomains) {
    if (!allowedDomains || allowedDomains.includes('general')) {
      return { valid: true };
    }

    const domainKeywords = {
      customer_support: ['refund', 'shipping', 'complaint', 'warranty', 'support', 'help'],
      access_control: ['door', 'access', 'entry', 'badge', 'lock', 'card'],
      it_automation: ['server', 'deploy', 'script', 'backup', 'monitor', 'database']
    };

    const keywords = allowedDomains.flatMap(d => domainKeywords[d] || []);
    const hasDomainContent = keywords.some(kw => response.toLowerCase().includes(kw));
    
    if (!hasDomainContent && response.length > 100) {
      return {
        valid: false,
        reason: `Response may not align with ${allowedDomains.join(', ')} domain`
      };
    }

    return { valid: true };
  }

  createSafeFallback(type, reason) {
    const messages = {
      unsafe_input: 'I cannot process this request as it may contain unsafe instructions. Contact Arbre Support if you believe this is an error.',
      unsafe_output: 'The generated response was blocked by Arbre safety filters.',
      domain_mismatch: 'This request is outside my authorized domain. Please contact haris.baig@arbreitsolutions.com for assistance.',
      system_error: 'A system error occurred. Please contact Arbre Support: support@arbreitsolutions.com'
    };

    return {
      success: false,
      errorType: type,
      message: messages[type] || 'Request could not be processed.',
      requiresHumanReview: true,
      safetyReason: reason,
      organization: 'Arbre IT Support and Solution'
    };
  }

  generateRequestId() {
    return `arb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async logSafetyEvent(requestId, type, details) {
    await auditLogger.warn('Safety violation detected', {
      requestId,
      type,
      details,
      organization: 'Arbre IT Support and Solution',
      timestamp: new Date().toISOString()
    });
  }

  async logSuccess(requestId, startTime, prompt, response) {
    await auditLogger.info('AI request processed successfully', {
      requestId,
      processingTime: Date.now() - startTime,
      promptLength: prompt.length,
      responseLength: response.length,
      organization: 'Arbre IT Support and Solution'
    });
  }

  async logError(requestId, error) {
    await auditLogger.error('AI processing error', {
      requestId,
      error: error.message,
      stack: error.stack,
      organization: 'Arbre IT Support and Solution'
    });
  }
}

module.exports = SafeAIAgent;
