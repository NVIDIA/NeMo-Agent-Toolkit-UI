import { isValidConsentPromptURL } from '@/utils/security/oauth-validation';

describe('OAuth URL Validation Security', () => {
  describe('Positive Tests - Valid URLs should pass', () => {
    test('accepts valid HTTPS OAuth URLs', () => {
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

    test('accepts valid HTTP URLs', () => {
      expect(isValidConsentPromptURL('http://example.com/oauth')).toBe(true);
    });
  });

  describe('Negative Tests - Invalid URLs should be blocked', () => {
    test('blocks dangerous protocol schemes', () => {
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

    test('blocks URLs with embedded credentials', () => {
      const credentialUrls = [
        'https://user:password@example.com/oauth',
        'http://admin:secret@malicious.com',
        'https://attacker:token@legitimate-site.com/oauth'
      ];

      credentialUrls.forEach(url => {
        expect(isValidConsentPromptURL(url)).toBe(false);
      });
    });

    test('blocks malformed URLs', () => {
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

    test('blocks URLs with control characters', () => {
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
