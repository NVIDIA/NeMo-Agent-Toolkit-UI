/**
 * URL Validation Tests
 * 
 * Tests for HTTP request URL, WebSocket URL, Media URL, and OAuth URL validation
 */
import { validateRequestURL, validateWebSocketURL } from '@/utils/security/url-validation';
import { HTTP_ENDPOINTS } from '@/constants/endpoints';
import { isValidMediaURL } from '@/utils/media/validation';
import { isValidConsentPromptURL } from '@/utils/security/oauth-validation';

describe('URL Validation Tests', () => {
  const originalEnv = process.env.NODE_ENV;
  const originalBackendAddress = process.env.NEXT_PUBLIC_NAT_BACKEND_ADDRESS;
  
  beforeAll(() => {
    // @ts-ignore - Modifying NODE_ENV for test purposes
    process.env.NODE_ENV = 'development';
    process.env.NEXT_PUBLIC_NAT_BACKEND_ADDRESS = '127.0.0.1:8000';
  });
  
  afterAll(() => {
    // @ts-ignore - Restoring NODE_ENV after test
    process.env.NODE_ENV = originalEnv;
    if (originalBackendAddress) {
      process.env.NEXT_PUBLIC_NAT_BACKEND_ADDRESS = originalBackendAddress;
    } else {
      delete process.env.NEXT_PUBLIC_NAT_BACKEND_ADDRESS;
    }
  });

  // ============================================================================
  // HTTP REQUEST VALIDATION
  // ============================================================================
  describe('HTTP Request Validation', () => {
    it.each([
      ...Object.values(HTTP_ENDPOINTS).map(endpoint => ({ endpoint, shouldPass: true })),
      { endpoint: '/admin', shouldPass: false },
      { endpoint: '/secrets', shouldPass: false },
      { endpoint: '/api/users', shouldPass: false },
      { endpoint: '/chat/../admin', shouldPass: false },
    ])('should validate endpoint path: $endpoint (shouldPass: $shouldPass)', ({ endpoint, shouldPass }) => {
      
      const result = validateRequestURL(`http://127.0.0.1:8000${endpoint}`);
      expect(result.isValid).toBe(shouldPass);
      if (!shouldPass) {
        expect(result.error).toContain('Path is not in the allowed list');
      }
    });

    it.each([
      { protocol: 'http:', url: 'http://127.0.0.1:8000/chat', shouldPass: true },
      { protocol: 'https:', url: 'https://127.0.0.1:8000/chat', shouldPass: true },
      { protocol: 'ftp:', url: 'ftp://127.0.0.1:8000/chat', shouldPass: false },
    ])('should validate HTTP protocol $protocol in development', ({ url, shouldPass }) => {
      const result = validateRequestURL(url);
      expect(result.isValid).toBe(shouldPass);
      if (!shouldPass) {
        expect(result.error).toContain('Invalid protocol');
      }
    });

    it.each([
      { protocol: 'https:', url: 'https://127.0.0.1:8000/chat', shouldPass: true },
      { protocol: 'http:', url: 'http://127.0.0.1:8000/chat', shouldPass: false },
    ])('should validate HTTP protocol $protocol in production', ({ url, shouldPass }) => {
      const originalEnv = process.env.NODE_ENV;
      // @ts-ignore - Modifying NODE_ENV for test purposes
      process.env.NODE_ENV = 'production';
      
      const result = validateRequestURL(url);
      expect(result.isValid).toBe(shouldPass);
      if (!shouldPass) {
        expect(result.error).toContain('Invalid protocol');
      }
      
      // @ts-ignore - Restoring NODE_ENV after test
      process.env.NODE_ENV = originalEnv;
    });

    it('should reject wrong backend address', () => {
      const result = validateRequestURL('http://evil.com:8000/chat');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Base address does not match configured backend');
    });
  });

  // ============================================================================
  // WEBSOCKET REQUEST VALIDATION
  // ============================================================================
  describe('WebSocket Request Validation', () => {
    it('should validate WebSocket URL with correct path', () => {
      expect(validateWebSocketURL('ws://127.0.0.1:8000/websocket')).toBe(true);
    });

    it('should reject wrong backend address', () => {
      expect(validateWebSocketURL('ws://evil.com:8000/websocket')).toBe(false);
    });

    it('should reject invalid paths', () => {
      expect(validateWebSocketURL('ws://127.0.0.1:8000/admin')).toBe(false);
      expect(validateWebSocketURL('ws://127.0.0.1:8000/secrets')).toBe(false);
    });

    it('should validate wss in production', () => {
      const originalEnv = process.env.NODE_ENV;
      // @ts-ignore
      process.env.NODE_ENV = 'production';
      
      expect(validateWebSocketURL('wss://127.0.0.1:8000/websocket')).toBe(true);
      expect(validateWebSocketURL('ws://127.0.0.1:8000/websocket')).toBe(false);
      
      // @ts-ignore
      process.env.NODE_ENV = originalEnv;
    });
  });

  // ============================================================================
  // MEDIA URL VALIDATION
  // ============================================================================
  describe('Media URL Validation', () => {
    describe('Positive Tests - Valid media URLs should pass', () => {
      it('accepts valid HTTPS image URLs', () => {
        const validUrls = [
          'https://cdn.example.com/image.jpg',
          'https://images.unsplash.com/photo.png',
          'https://static.website.com/video.mp4',
          'https://media.company.org/assets/logo.svg'
        ];

        validUrls.forEach(url => {
          expect(isValidMediaURL(url)).toBe(true);
        });
      });

      it('accepts valid HTTP media URLs', () => {
        expect(isValidMediaURL('http://example.com/image.jpg')).toBe(true);
        expect(isValidMediaURL('http://media.site.com/video.webm')).toBe(true);
      });

      it('accepts localhost URLs for development environments', () => {
        const devUrls = [
          'http://localhost/image.jpg',
          'https://localhost:3000/video.mp4',
          'http://127.0.0.1:8080/media.png',
          'https://127.1.1.1:5000/asset.gif',
          'http://[::1]:3000/image.jpg'
        ];

        devUrls.forEach(url => {
          expect(isValidMediaURL(url)).toBe(true);
        });
      });
    });

    describe('Negative Tests - Invalid URLs should be blocked', () => {
      it('blocks dangerous protocol schemes', () => {
        const dangerousUrls = [
          'javascript:alert("xss")',
          'data:image/svg+xml,<svg><script>alert("xss")</script></svg>',
          'file:///etc/passwd',
          'ftp://evil.com/image.jpg'
        ];

        dangerousUrls.forEach(url => {
          expect(isValidMediaURL(url)).toBe(false);
        });
      });

      it('blocks URLs with embedded credentials', () => {
        const credentialUrls = [
          'https://user:password@example.com/image.jpg',
          'http://admin:secret@cdn.com/video.mp4'
        ];

        credentialUrls.forEach(url => {
          expect(isValidMediaURL(url)).toBe(false);
        });
      });

      it('blocks reserved IP ranges to prevent SSRF', () => {
        const ssrfUrls = [
          'http://0.0.0.0/image.jpg',
          'https://224.0.0.1/video.mp4', // Multicast
          'http://240.1.1.1/media.png',   // Multicast
          'https://255.255.255.255/image.gif' // Broadcast
        ];

        ssrfUrls.forEach(url => {
          expect(isValidMediaURL(url)).toBe(false);
        });
      });

      it('blocks malformed and empty URLs', () => {
        const invalidUrls = [
          '',
          'not-a-url',
          'ht tp://broken.com/image.jpg',
          '://no-protocol.com/video.mp4',
          null,
          undefined,
          123
        ];

        invalidUrls.forEach(url => {
          expect(isValidMediaURL(url as any)).toBe(false);
        });
      });

      it('blocks URLs with control characters', () => {
        const controlCharUrls = [
          'https://example.com\x00/image.jpg',
          'https://example.com\x0a/video.mp4',
          'https://example.com\x0d/media.png',
          'https://example.com\x7f/image.gif'
        ];

        controlCharUrls.forEach(url => {
          expect(isValidMediaURL(url)).toBe(false);
        });
      });
    });
  });

  // ============================================================================
  // OAUTH URL VALIDATION
  // ============================================================================
  describe('OAuth URL Validation', () => {
    describe('Positive Tests - Valid URLs should pass', () => {
      it('accepts valid HTTPS OAuth URLs', () => {
        const validUrls = [
          'https://accounts.google.com/oauth/authorize',
          'https://login.microsoftonline.com/oauth2/authorize',
          'https://github.com/login/oauth/authorize',
          'https://api.example.com/oauth/consent'
        ];

        validUrls.forEach(url => {
          expect(isValidConsentPromptURL(url)).toBe(true);
        });
      });

      it('accepts valid HTTP URLs', () => {
        expect(isValidConsentPromptURL('http://example.com/oauth')).toBe(true);
      });
    });

    describe('Negative Tests - Invalid URLs should be blocked', () => {
      it('blocks dangerous protocol schemes', () => {
        const dangerousUrls = [
          'javascript:alert("xss")',
          'data:text/html,<script>alert("xss")</script>',
          'vbscript:msgbox("xss")',
          'file:///etc/passwd',
          'ftp://evil.com/malware'
        ];

        dangerousUrls.forEach(url => {
          expect(isValidConsentPromptURL(url)).toBe(false);
        });
      });

      it('blocks URLs with embedded credentials', () => {
        const credentialUrls = [
          'https://user:password@example.com/oauth',
          'http://admin:secret@malicious.com',
          'https://attacker:token@legitimate-site.com/oauth'
        ];

        credentialUrls.forEach(url => {
          expect(isValidConsentPromptURL(url)).toBe(false);
        });
      });

      it('blocks malformed URLs', () => {
        const malformedUrls = [
          '',
          'not-a-url',
          'ht tp://broken.com',
          '://no-protocol.com',
          null,
          undefined
        ];

        malformedUrls.forEach(url => {
          expect(isValidConsentPromptURL(url as any)).toBe(false);
        });
      });

      it('blocks URLs with control characters', () => {
        const controlCharUrls = [
          'https://example.com /oauth',  // space character
          'https://example.com\t/oauth', // tab character
          'https://example.com\n/oauth', // newline character
          'https://example.com\r/oauth'  // carriage return
        ];

        controlCharUrls.forEach(url => {
          expect(isValidConsentPromptURL(url)).toBe(false);
        });
      });
    });
  });
});
