import { isValidWebSocketURL } from '@/utils/security/websocket-validation';

describe('WebSocket URL Validation Security', () => {
  describe('Positive Tests - Valid WebSocket URLs should pass', () => {
    test('accepts valid WSS WebSocket URLs', () => {
      const validUrls = [
        'wss://websocket.example.com/chat',
        'wss://api.company.com/ws',
        'wss://secure-ws.org/realtime',
        'wss://localhost:8080/websocket'
      ];

      validUrls.forEach(url => {
        expect(isValidWebSocketURL(url)).toBe(true);
      });
    });

    test('accepts valid WS WebSocket URLs', () => {
      expect(isValidWebSocketURL('ws://localhost:3000/websocket')).toBe(true);
      expect(isValidWebSocketURL('ws://example.com/chat')).toBe(true);
    });
  });

  describe('Negative Tests - Invalid URLs should be blocked', () => {
    test('blocks non-WebSocket protocols', () => {
      const nonWsUrls = [
        'http://example.com/websocket',
        'https://example.com/websocket', 
        'javascript:alert("xss")',
        'data:text/plain,malicious',
        'file:///etc/passwd',
        'ftp://evil.com/ws'
      ];

      nonWsUrls.forEach(url => {
        expect(isValidWebSocketURL(url)).toBe(false);
      });
    });

    test('blocks URLs with embedded credentials', () => {
      const credentialUrls = [
        'ws://user:password@example.com/chat',
        'wss://admin:secret@websocket.com/ws',
        'ws://attacker:token@target.com/websocket'
      ];

      credentialUrls.forEach(url => {
        expect(isValidWebSocketURL(url)).toBe(false);
      });
    });

    test('blocks malformed URLs', () => {
      const malformedUrls = [
        '',
        'not-a-url',
        'w s://broken.com/ws',
        '://no-protocol.com/websocket',
        null,
        undefined,
        123
      ];

      malformedUrls.forEach(url => {
        expect(isValidWebSocketURL(url as any)).toBe(false);
      });
    });

    test('blocks URLs with control characters', () => {
      const controlCharUrls = [
        'ws://example.com /websocket',  // space character
        'wss://example.com\t/chat',    // tab character
        'ws://example.com\n/ws',       // newline character  
        'wss://example.com\r/realtime' // carriage return
      ];

      controlCharUrls.forEach(url => {
        expect(isValidWebSocketURL(url)).toBe(false);
      });
    });

    test('blocks excessively long URLs', () => {
      const longUrl = 'ws://example.com/' + 'a'.repeat(3000);
      expect(isValidWebSocketURL(longUrl)).toBe(false);
    });
  });
});
