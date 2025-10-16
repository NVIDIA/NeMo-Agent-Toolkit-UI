import { HTTP_ENDPOINTS } from '@/constants/endpoints';
import { WEBSOCKET_PATH } from '@/constants/constants';

/**
 * Validates if a string is a valid URL
 */
function isValidURL(urlString: string): boolean {
  try {
    new URL(urlString);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validates if protocol is correct for the environment
 */
function isValidProtocol(urlString: string): boolean {
  const isProd = process.env.NODE_ENV === 'production';
  
  if (isProd) {
    return urlString.startsWith('https://') || urlString.startsWith('wss://');
  } else {
    return urlString.startsWith('http://') || urlString.startsWith('https://') || 
           urlString.startsWith('ws://') || urlString.startsWith('wss://');
  }
}

/**
 * Validates if the path is allowed (HTTP endpoint or WebSocket path)
 */
function isValidPath(urlString: string): boolean {
  const url = new URL(urlString);
  const pathname = url.pathname;
  
  // Check if it's a valid HTTP endpoint
  const httpEndpoints = Object.values(HTTP_ENDPOINTS);
  if (httpEndpoints.includes(pathname as any)) {
    return true;
  }
  
  // Check if it's the WebSocket path
  if (pathname === WEBSOCKET_PATH) {
    return true;
  }
  
  return false;
}

/**
 * Validates if base address matches the configured backend
 */
function isValidBaseAddress(urlString: string): boolean {
  const backendAddress = process.env.NEXT_PUBLIC_NAT_BACKEND_ADDRESS;
  if (!backendAddress) {
    return false;
  }
  
  try {
    const url = new URL(urlString);
    return url.host === backendAddress;
  } catch {
    return false;
  }
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validates a request URL (HTTP or WebSocket)
 * Validates: base address, protocol, path, and URL format
 */
export function validateRequestURL(urlString: string): ValidationResult {
  // Validate base address
  if (!isValidBaseAddress(urlString)) {
    return {
      isValid: false,
      error: 'Base address does not match configured backend',
    };
  }
  
  // Validate protocol
  if (!isValidProtocol(urlString)) {
    const isProd = process.env.NODE_ENV === 'production';
    return {
      isValid: false,
      error: isProd 
        ? 'Invalid protocol. Only https: and wss: are allowed in production'
        : 'Invalid protocol',
    };
  }
  
  // Validate path
  if (!isValidPath(urlString)) {
    return {
      isValid: false,
      error: 'Path is not in the allowed list',
    };
  }
  
  // Validate final URL format
  if (!isValidURL(urlString)) {
    return {
      isValid: false,
      error: 'Invalid URL format',
    };
  }
  
  return {
    isValid: true,
  };
}

/**
 * WebSocket URL validation - wrapper for backward compatibility
 */
export function validateWebSocketURL(url: string): boolean {
  const result = validateRequestURL(url);
  if (!result.isValid) {
    // eslint-disable-next-line no-console
    console.warn(`WebSocket URL validation failed: ${result.error}`, url);
  }
  return result.isValid;
}
