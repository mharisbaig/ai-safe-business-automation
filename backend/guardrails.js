/**
 * Arbre IT Support and Solution
 * Multi-Layer Guardrail System
 * Defense in Depth: Input → Processing → Output
 */

class GuardrailSystem {
  constructor(config = {}) {
    this.config = {
      enablePII: true,
      enableInjectionDetection: true,
      enableToxicityCheck: true,
      ...config
    };
  }

  async validateInput(input, context = {}) {
    const results = {
      safe: true,
      checks: [],
      sanitized: input,
      metadata: {}
    };

    // 1. Injection Detection
    if (this.config.enableInjectionDetection) {
      const injectionCheck = this.detectInjection(input);
      results.checks.push(injectionCheck);
      if (!injectionCheck.passed) results.safe = false;
    }

    // 2. PII Detection
    if (this.config.enablePII) {
      const piiCheck = this.detectAndRedactPII(results.sanitized);
      results.checks.push(piiCheck);
      results.sanitized = piiCheck.redactedText;
      results.metadata.piiDetected = piiCheck.found;
    }

    // 3. Format Validation
    const formatCheck = this.validateFormat(results.sanitized);
    results.checks.push(formatCheck);
    if (!formatCheck.passed) results.safe = false;

    return results;
  }

  async validateOutput(output, context = {}) {
    const results = {
      safe: true,
      checks: [],
      sanitized: output,
      requiresReview: false
    };

    // 1. Content Safety
    const safetyCheck = this.checkContentSafety(output);
    results.checks.push(safetyCheck);
    if (!safetyCheck.passed) {
      results.safe = false;
      results.sanitized = this.generateSafeFallback();
    }

    // 2. Hallucination Detection
    const hallucinationCheck = this.detectHallucination(output);
    results.checks.push(hallucinationCheck);
    if (hallucinationCheck.risk === 'high') {
      results.requiresReview = true;
    }

    // 3. Privilege Check
    if (context.userRole) {
      const privilegeCheck = this.checkPrivilegeEscalation(output, context);
      results.checks.push(privilegeCheck);
      if (!privilegeCheck.passed) {
        results.safe = false;
        results.sanitized = this.generateSafeFallback();
      }
    }

    return results;
  }

  detectInjection(text) {
    const attacks = [
      { pattern: /ignore (your )?previous instructions/gi, type: 'instruction_override' },
      { pattern: /you are now (in |a )?(developer|admin|root|DAN)/gi, type: 'persona_switch' },
      { pattern: /system\s*:|admin\s*:|root\s*:/gi, type: 'command_injection' },
      { pattern: /<script|javascript:|on\w+\s*=/gi, type: 'xss_attempt' },
      { pattern: /(\.\.\/|\/etc\/passwd|cmd\.exe)/gi, type: 'path_traversal' },
      { pattern: /(bhool jao|maaf karo) (apni|pehli) (hidayat|instructions)/gi, type: 'urdu_injection' }
    ];

    for (const attack of attacks) {
      if (attack.pattern.test(text)) {
        return {
          name: 'injection_detection',
          passed: false,
          severity: 'high',
          type: attack.type,
          action: 'block'
        };
      }
    }

    return { name: 'injection_detection', passed: true };
  }

  detectAndRedactPII(text) {
    const piiTypes = [
      { name: 'cnic', pattern: /\b\d{5}-\d{7}-\d{1}\b/g, mask: '[CNIC-REDACTED]' },
      { name: 'email', pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, mask: '[EMAIL-REDACTED]' },
      { name: 'phone_pk', pattern: /(\+92|0)?3\d{2}[-.]?\d{7}\b/g, mask: '[PHONE-REDACTED]' },
      { name: 'phone_intl', pattern: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, mask: '[PHONE-REDACTED]' },
      { name: 'credit_card', pattern: /\b\d{4}[-.]?\d{4}[-.]?\d{4}[-.]?\d{4}\b/g, mask: '[CARD-REDACTED]' },
      { name: 'api_key', pattern: /[a-zA-Z0-9]{32,64}/g, mask: '[API-KEY-REDACTED]' },
      { name: 'address', pattern: /\d+\s+[\w\s]+(?:street|st|road|rd|avenue|ave|lane|ln|karachi|lahore|islamabad)/gi, mask: '[ADDRESS-REDACTED]' }
    ];

    let redacted = text;
    let found = [];

    for (const pii of piiTypes) {
      const matches = text.match(pii.pattern);
      if (matches) {
        found.push({ type: pii.name, count: matches.length });
        redacted = redacted.replace(pii.pattern, pii.mask);
      }
    }

    return {
      name: 'pii_detection',
      passed: found.length === 0,
      found,
      redactedText: redacted,
      action: found.length > 0 ? 'redact' : 'pass'
    };
  }

  checkContentSafety(text) {
    const categories = {
      illegal: ['hack', 'exploit', 'breach', 'steal data', 'unauthorized access', 'database dump'],
      harmful: ['weapon', 'bomb', 'attack', 'hurt someone'],
      discriminatory: ['racist', 'sexist', 'hate speech'],
      unsafe_instructions: ['disable security', 'turn off firewall', 'delete logs', 'bypass authentication']
    };

    const lowerText = text.toLowerCase();
    const violations = [];

    for (const [category, keywords] of Object.entries(categories)) {
      for (const keyword of keywords) {
        if (lowerText.includes(keyword)) {
          violations.push({ category, keyword });
        }
      }
    }

    if (violations.length > 0) {
      return {
        name: 'content_safety',
        passed: false,
        violations,
        severity: 'high',
        action: 'block_and_alert'
      };
    }

    return { name: 'content_safety', passed: true };
  }

  detectHallucination(text) {
    const uncertaintyMarkers = [
      'i think', 'i believe', 'probably', 'maybe', 'might be', 
      'not sure', 'uncertain', 'possibly', 'apparently', 'lagta hai', 'shayad'
    ];
    
    const factClaims = text.match(/\b(is|are|was|were|has|have)\b/gi) || [];
    const uncertaintyCount = uncertaintyMarkers.reduce((count, marker) => 
      count + (text.toLowerCase().includes(marker) ? 1 : 0), 0
    );

    const risk = uncertaintyCount > 2 ? 'high' : uncertaintyCount > 0 ? 'medium' : 'low';

    return {
      name: 'hallucination_check',
      passed: risk !== 'high',
      risk,
      uncertaintyScore: uncertaintyCount,
      action: risk === 'high' ? 'human_review' : 'pass'
    };
  }

  checkPrivilegeEscalation(output, context) {
    if (context.userRole === 'admin') {
      return { name: 'privilege_check', passed: true };
    }

    const sensitivePatterns = [
      /password\s*[:=]\s*\S+/i,
      /api[_-]?key\s*[:=]\s*\S+/i,
      /secret\s*[:=]\s*\S+/i,
      /token\s*[:=]\s*\S+/i,
      /cnic\s*[:=]\s*\d/i,
      /credit[_-]?card\s*[:=]\s*\d/i
    ];

    for (const pattern of sensitivePatterns) {
      if (pattern.test(output)) {
        return {
          name: 'privilege_check',
          passed: false,
          reason: 'Sensitive credential detected in output',
          severity: 'critical'
        };
      }
    }

    return { name: 'privilege_check', passed: true };
  }

  validateFormat(text) {
    if (text.length > 10000) {
      return { name: 'format_check', passed: false, reason: 'Excessive length' };
    }
    if (/\x00/.test(text)) {
      return { name: 'format_check', passed: false, reason: 'Null bytes detected' };
    }
    return { name: 'format_check', passed: true };
  }

  generateSafeFallback() {
    return 'I apologize, but I cannot provide that information. Please contact Arbre IT Support and Solution for assistance: haris.baig@arbreitsolutions.com';
  }
}

module.exports = GuardrailSystem;
