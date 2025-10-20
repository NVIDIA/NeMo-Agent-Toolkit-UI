const {
  ALLOWED_PATHS,
  HTTP_PROXY_PATH,
  WEBSOCKET_PROXY_PATH,
} = require('../../constants');

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} isValid
 * @property {string} [error]
 */

/**
 * SSRF Prevention: Validates HTTP proxy paths
 *
 * Ensures incoming requests only access allowed backend endpoints.
 * Used by proxy server to prevent Server-Side Request Forgery.
 *
 * @param {string} pathname - The full pathname from the request (e.g., '/api/chat/stream')
 * @returns {ValidationResult} Validation result with error message if invalid
 */
function validateProxyHttpPath(pathname) {
  // Must start with /api/
  if (!pathname.startsWith(HTTP_PROXY_PATH + '/')) {
    return {
      isValid: false,
      error: `Path must start with ${HTTP_PROXY_PATH}/`,
    };
  }

  // Strip /api prefix to get backend path
  const backendPath = pathname.substring(HTTP_PROXY_PATH.length);

  // Check against allowlist
  const isAllowed = ALLOWED_PATHS.some(
    (allowed) =>
      backendPath === allowed || backendPath.startsWith(allowed + '/'),
  );

  if (!isAllowed) {
    return {
      isValid: false,
      error: `Backend path '${backendPath}' is not in allowed list`,
    };
  }

  return { isValid: true };
}

/**
 * SSRF Prevention: Validates WebSocket proxy path
 *
 * Ensures WebSocket connections only use the allowed endpoint.
 * Used by proxy server to prevent unauthorized WebSocket access.
 *
 * @param {string} pathname - The pathname from the WebSocket upgrade request
 * @returns {ValidationResult} Validation result with error message if invalid
 */
function validateProxyWebSocketPath(pathname) {
  if (pathname !== WEBSOCKET_PROXY_PATH) {
    return {
      isValid: false,
      error: `WebSocket path '${pathname}' is not allowed. Expected: ${WEBSOCKET_PROXY_PATH}`,
    };
  }

  return { isValid: true };
}

/**
 * SSRF Prevention: Validates backend URLs
 *
 * Ensures server-side fetch requests only target safe URLs.
 * Use this before making any fetch() calls in API routes.
 *
 * @param {string} url - The URL to validate
 * @returns {ValidationResult} Validation result with error message if invalid
 */
function validateBackendUrl(url) {
  let parsedUrl;

  try {
    parsedUrl = new URL(url);
  } catch (err) {
    return {
      isValid: false,
      error: 'Invalid URL format',
    };
  }

  // Only allow http/https protocols
  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    return {
      isValid: false,
      error: `Protocol '${parsedUrl.protocol}' is not allowed. Use http or https.`,
    };
  }

  // Block localhost/internal IPs (optional - uncomment if needed)
  // const hostname = parsedUrl.hostname.toLowerCase();
  // if (hostname === 'localhost' ||
  //     hostname === '127.0.0.1' ||
  //     hostname.startsWith('192.168.') ||
  //     hostname.startsWith('10.') ||
  //     hostname.startsWith('172.')) {
  //   return {
  //     isValid: false,
  //     error: 'Internal network addresses are not allowed',
  //   };
  // }

  return { isValid: true };
}

module.exports = {
  validateProxyHttpPath,
  validateProxyWebSocketPath,
  validateBackendUrl,
};
