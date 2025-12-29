// Basic input validation utilities for mobile app security

export const validation = {
  // Login field that accepts either email or username
  emailOrUsername: {
    isValid: (value: string): boolean => {
      // Check if it's a valid email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      // Check if it's a valid username
      const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
      
      return emailRegex.test(value) || usernameRegex.test(value);
    },
    message: 'Please enter a valid email address or username',
  },
  email: {
    isValid: (email: string): boolean => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email);
    },
    message: 'Please enter a valid email address',
  },

  password: {
    isValid: (password: string): boolean => {
      // Minimum 8 characters, at least one letter and one number
      const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/;
      return passwordRegex.test(password);
    },
    message: 'Password must be at least 8 characters with letters and numbers',
  },

  username: {
    isValid: (username: string): boolean => {
      // 3-20 characters, alphanumeric and underscores only
      const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
      return usernameRegex.test(username);
    },
    message: 'Username must be 3-20 characters, letters, numbers and underscores only',
  },

  required: {
    isValid: (value: string): boolean => {
      return value.trim().length > 0;
    },
    message: 'This field is required',
  },

  postTitle: {
    isValid: (title: string): boolean => {
      const sanitized = validation.sanitizeInput(title);
      return sanitized.length >= 3 && sanitized.length <= 100;
    },
    message: 'Title must be between 3 and 100 characters',
  },

  postContent: {
    isValid: (content: string): boolean => {
      const sanitized = validation.sanitizeInput(content);
      return sanitized.length >= 10 && sanitized.length <= 5000;
    },
    message: 'Content must be between 10 and 5000 characters',
  },

  // New validation rules for enhanced security
  noMaliciousContent: {
    isValid: (value: string): boolean => {
      const dangerous = [
        /<script/i,
        /javascript:/i,
        /vbscript:/i,
        /data:/i,
        /on\w+\s*=/i,
        /\beval\b/i,
        /\balert\b/i,
        /\bdocument\./i,
        /\bwindow\./i,
        /\$\w+/,
        /(\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b)/i
      ];

      return !dangerous.some(pattern => pattern.test(value));
    },
    message: 'Content contains potentially dangerous elements',
  },

  safeFilename: {
    isValid: (filename: string): boolean => {
      // Allow only safe characters in filenames
      const filenameRegex = /^[a-zA-Z0-9._-]{1,255}$/;
      return filenameRegex.test(filename) &&
             !filename.startsWith('.') &&
             !filename.includes('..');
    },
    message: 'Filename contains invalid characters',
  },

  // Enhanced input sanitization to prevent injection attempts
  sanitizeInput: (input: string): string => {
    if (typeof input !== 'string') {
      return '';
    }

    return input
      .trim()
      // Remove all HTML tags
      .replace(/<[^>]*>/g, '')
      // Remove script content and tags (case insensitive)
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      // Remove various dangerous protocols
      .replace(/(?:javascript|data|vbscript|file):/gi, '')
      // Remove event handlers (more comprehensive)
      .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
      .replace(/on\w+\s*=\s*[^"'\s>]*/gi, '')
      // Remove SQL injection patterns
      .replace(/(\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b)/gi, '')
      // Remove NoSQL injection patterns
      .replace(/\$\w+/g, '')
      // Remove potential command injection
      .replace(/[;&|`$(){}[\]\\]/g, '')
      // Normalize whitespace
      .replace(/\s+/g, ' ')
      .trim();
  },

  // Sanitize for specific contexts
  sanitizeForDisplay: (input: string): string => {
    if (typeof input !== 'string') {
      return '';
    }

    return input
      .trim()
      // Allow basic formatting but escape dangerous content
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  },

  // Sanitize for search queries (less restrictive)
  sanitizeSearchQuery: (input: string): string => {
    if (typeof input !== 'string') {
      return '';
    }

    return input
      .trim()
      // Remove HTML tags but keep spaces and basic punctuation
      .replace(/<[^>]*>/g, '')
      // Remove dangerous protocols
      .replace(/(?:javascript|data|vbscript|file):/gi, '')
      // Remove SQL injection patterns
      .replace(/(\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b)/gi, '')
      // Limit length for search
      .substring(0, 100)
      .trim();
  },

  // Basic length validation
  maxLength: (value: string, max: number): boolean => {
    return value.length <= max;
  },

  minLength: (value: string, min: number): boolean => {
    return value.length >= min;
  },
};

// Form validation helper
export interface ValidationRule {
  validator: (value: string) => boolean;
  message: string;
}

export const validateField = (value: string, rules: ValidationRule[]): string | undefined => {
  for (const rule of rules) {
    if (!rule.validator(value)) {
      return rule.message;
    }
  }
  return undefined;
};

// Common validation rule sets
export const validationRules = {
  // Updated login validation to accept both email and username
  login: [
    { validator: validation.required.isValid, message: validation.required.message },
    { validator: validation.emailOrUsername.isValid, message: validation.emailOrUsername.message },
  ],
  
  // Keep the old one for backward compatibility if needed
  loginEmail: [
    { validator: validation.required.isValid, message: validation.required.message },
    { validator: validation.email.isValid, message: validation.email.message },
  ],
  
  loginPassword: [
    { validator: validation.required.isValid, message: validation.required.message },
  ],
  
  signupEmail: [
    { validator: validation.required.isValid, message: validation.required.message },
    { validator: validation.email.isValid, message: validation.email.message },
  ],
  
  signupUsername: [
    { validator: validation.required.isValid, message: validation.required.message },
    { validator: validation.username.isValid, message: validation.username.message },
  ],
  
  signupPassword: [
    { validator: validation.required.isValid, message: validation.required.message },
    { validator: validation.password.isValid, message: validation.password.message },
  ],
  
  postTitle: [
    { validator: validation.required.isValid, message: validation.required.message },
    { validator: validation.noMaliciousContent.isValid, message: validation.noMaliciousContent.message },
    { validator: validation.postTitle.isValid, message: validation.postTitle.message },
  ],

  postContent: [
    { validator: validation.required.isValid, message: validation.required.message },
    { validator: validation.noMaliciousContent.isValid, message: validation.noMaliciousContent.message },
    { validator: validation.postContent.isValid, message: validation.postContent.message },
  ],

  // New validation rule sets with enhanced security
  filename: [
    { validator: validation.required.isValid, message: validation.required.message },
    { validator: validation.safeFilename.isValid, message: validation.safeFilename.message },
  ],

  userInput: [
    { validator: validation.required.isValid, message: validation.required.message },
    { validator: validation.noMaliciousContent.isValid, message: validation.noMaliciousContent.message },
    { validator: (value: string) => validation.maxLength(value, 1000), message: 'Input too long' },
  ],

  searchQuery: [
    { validator: validation.required.isValid, message: validation.required.message },
    { validator: (value: string) => validation.maxLength(value, 100), message: 'Search query too long' },
  ],
};