import { isValidMediaURL } from '@/utils/media/validation';

describe('Media URL Validation Security', () => {
  describe('Positive Tests - Valid media URLs should pass', () => {
    test('accepts valid HTTPS image URLs', () => {
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

    test('accepts valid HTTP media URLs', () => {
      expect(isValidMediaURL('http://example.com/image.jpg')).toBe(true);
      expect(isValidMediaURL('http://media.site.com/video.webm')).toBe(true);
    });

    test('accepts localhost URLs for development environments', () => {
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
    test('blocks dangerous protocol schemes', () => {
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

    test('blocks URLs with embedded credentials', () => {
      const credentialUrls = [
        'https://user:password@example.com/image.jpg',
        'http://admin:secret@cdn.com/video.mp4'
      ];

      credentialUrls.forEach(url => {
        expect(isValidMediaURL(url)).toBe(false);
      });
    });

    test('blocks reserved IP ranges to prevent SSRF', () => {
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

    test('blocks malformed and empty URLs', () => {
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

    test('blocks URLs with control characters', () => {
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
