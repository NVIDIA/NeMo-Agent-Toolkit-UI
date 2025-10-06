/**
 * WebSocket URL validation to prevent malicious connections
 * @param url - WebSocket URL to validate
 * @returns boolean indicating if URL is safe for WebSocket connections
 */
export function isValidWebSocketURL(url: string): boolean {
  // Check control chars or whitespace that can confuse parsers
  if (/[ \t\r\n\v\f]/.test(url)) {
    console.warn('WebSocket URL validation failed: Contains control characters or whitespace', url);
    return false;
  }

  // Must be parseable URL
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch (error) {
    console.warn('WebSocket URL validation failed: Invalid URL format', url);
    return false;
  }

  // Only allow WebSocket protocols
  if (parsedUrl.protocol !== 'ws:' && parsedUrl.protocol !== 'wss:') {
    console.warn('WebSocket URL validation failed: Only ws:// and wss:// protocols allowed', url);
    return false;
  }

  // Block embedded credentials for security
  if (parsedUrl.username || parsedUrl.password) {
    console.warn('WebSocket URL validation failed: Embedded credentials not allowed', url);
    return false;
  }

  // Cap URL length to prevent abuse
  if (url.length > 2048) {
    console.warn('WebSocket URL validation failed: URL too long', url);
    return false;
  }

  return true;
}
