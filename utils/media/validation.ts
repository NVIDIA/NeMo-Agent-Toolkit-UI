/**
 * Validates media URLs to prevent SSRF and protocol injection
 * @param url - URL to validate
 * @returns boolean indicating if URL is safe to load
 */
export function isValidMediaURL(url: string): boolean {
  // Block empty or non-string URLs
  if (!url || typeof url !== 'string') return false;
  
  // Block control characters that can confuse parsers
  if (/[\x00-\x1f\x7f]/.test(url)) return false;
  
  // Must be a valid URL
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch (error) {
    return false;
  }
  
  // Only allow HTTP/HTTPS protocols for images/videos
  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    return false;
  }
  
  // Block embedded credentials for security
  if (parsedUrl.username || parsedUrl.password) return false;
  
  // Block internal/private network addresses to prevent SSRF
  const hostname = parsedUrl.hostname.toLowerCase();
  
  // Block multicast and reserved ranges
  if (hostname.match(/^2[24][0-9]\./) || hostname.match(/^0\./) || hostname.match(/^255\./)) {
    return false;
  }
  
  return true;
}
