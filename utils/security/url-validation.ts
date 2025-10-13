/**
 * Get allowed hosts from environment variables
 * This is computed dynamically to support testing
 */
const getAllowedHosts = (): string[] => {
  const allowedServerUrls = (process.env.ALLOWED_SERVER_URLS || '')
    .split(',')
    .map((host) => host.trim())
    .filter(Boolean);

  let defaultServerHost = '';
  try {
    if (process.env.NEXT_PUBLIC_SERVER_URL) {
      defaultServerHost = new URL(process.env.NEXT_PUBLIC_SERVER_URL).hostname;
    }
  } catch {
    // Invalid URL, ignore
  }

  // Combine allowlist with default server (avoid duplicates)
  const hosts = [...allowedServerUrls];
  if (defaultServerHost && !hosts.includes(defaultServerHost)) {
    hosts.push(defaultServerHost);
  }

  return hosts;
};

// Private IP address ranges (RFC1918, loopback, link-local, etc.)
const PRIVATE_IP_PATTERNS = [
  /^127\./, // Loopback (127.0.0.0/8)
  /^10\./, // Private Class A (10.0.0.0/8)
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // Private Class B (172.16.0.0/12)
  /^192\.168\./, // Private Class C (192.168.0.0/16)
  /^169\.254\./, // Link-local / AWS metadata (169.254.0.0/16)
  /^::1$/, // IPv6 loopback
  /^fe80:/i, // IPv6 link-local
  /^fc00:/i, // IPv6 unique local
  /^fd00:/i, // IPv6 unique local
  /^localhost$/i, // Localhost
  /^0\.0\.0\.0$/, // Unspecified
  /^255\.255\.255\.255$/, // Broadcast
];

// Known cloud metadata endpoints
const METADATA_ENDPOINTS = [
  '169.254.169.254', // AWS, Azure, GCP metadata
  '169.254.170.2', // AWS ECS metadata
  'metadata.google.internal', // GCP metadata
  '100.100.100.200', // Alibaba Cloud metadata
];

/**
 * Check if a hostname or IP address is in a private range
 */
export function isPrivateIP(hostname: string): boolean {
  // Check against private IP patterns
  if (PRIVATE_IP_PATTERNS.some((pattern) => pattern.test(hostname))) {
    return true;
  }

  // Check against known metadata endpoints
  if (METADATA_ENDPOINTS.includes(hostname.toLowerCase())) {
    return true;
  }

  return false;
}

/**
 * Validate if a URL is allowed based on allowlist
 */
export function isAllowedRequestURL(url: string): boolean {
  try {
    const parsedUrl = new URL(url);

    // Only allow HTTPS in production
    if (process.env.NODE_ENV === 'production' && parsedUrl.protocol !== 'https:') {
      return false;
    }

  // Allow HTTP in development for localhost only
  if (process.env.NODE_ENV === 'development' && parsedUrl.protocol === 'http:') {
    // Check if it's a localhost address
    const localhostAddresses = ['localhost', '127.0.0.1', '::1', '[::1]'];
    const isLocalhost = localhostAddresses.includes(parsedUrl.hostname) ||
                       parsedUrl.hostname.startsWith('127.');
    if (!isLocalhost) {
      return false;
    }
  } else if (process.env.NODE_ENV === 'development' && parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    return false;
  }

    // Check against allowlist
    const allowedHosts = getAllowedHosts();
    if (allowedHosts.length === 0) {
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.warn('WARNING: No allowlist configured. All URLs will be allowed in development mode.');
        return true;
      }
      return false;
    }

    return allowedHosts.includes(parsedUrl.hostname);
  } catch {
    return false;
  }
}


export async function checkDNSRebinding(hostname: string): Promise<boolean> {
  // First check if hostname itself looks like a private IP
  if (isPrivateIP(hostname)) {
    return true; // Returns true if it's a private IP (should be blocked)
  }
  // Check for IP address patterns that might be obfuscated
  // e.g., decimal notation (2130706433 = 127.0.0.1), hex notation (0x7f000001)
  if (/^\d+$/.test(hostname)) {
    // Decimal IP notation
    return true;
  }

  if (/^0x[0-9a-f]+$/i.test(hostname)) {
    // Hexadecimal IP notation
    return true;
  }

  return false;
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  url?: URL;
}

/**
 * Comprehensive URL validation with SSRF protection
 */
export async function validateRequestURL(urlString: string): Promise<ValidationResult> {
  // Basic URL parsing
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(urlString);
  } catch (error) {
    return {
      isValid: false,
      error: 'Invalid URL format',
    };
  }

  // Protocol validation
  const allowedProtocols = process.env.NODE_ENV === 'production' ? ['https:'] : ['http:', 'https:'];
  if (!allowedProtocols.includes(parsedUrl.protocol)) {
    return {
      isValid: false,
      error: `Invalid protocol. Only ${allowedProtocols.join(', ')} are allowed`,
    };
  }

  if (!isAllowedRequestURL(urlString)) {
    return {
      isValid: false,
      error: 'URL is not in the allowlist of permitted servers',
    };
  }

  if (process.env.NODE_ENV === 'production' && isPrivateIP(parsedUrl.hostname)) {
    return {
      isValid: false,
      error: 'Access to private IP addresses is not allowed in production',
    };
  }

  const isDirectIP = /^[\d.]+$/.test(parsedUrl.hostname) || /^[0-9a-f:]+$/i.test(parsedUrl.hostname);
  if (!isDirectIP) {
    const isDNSRebinding = await checkDNSRebinding(parsedUrl.hostname);
    if (isDNSRebinding) {
      return {
        isValid: false,
        error: 'Potential DNS rebinding attack detected',
      };
    }
  }

  return {
    isValid: true,
    url: parsedUrl,
  };
}

/**
 * Log request for security monitoring
 */
export function logRequest(url: string, status: 'success' | 'blocked' | 'error', reason?: string): void {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    type: 'request',
    url,
    status,
    reason,
    environment: process.env.NODE_ENV,
  };

  // In production, you would send this to your logging service
  // For now, we use console logging
  if (status === 'blocked') {
    // eslint-disable-next-line no-console
    console.warn('[SECURITY] Blocked request:', JSON.stringify(logEntry));
  } else if (status === 'error') {
    // eslint-disable-next-line no-console
    console.error('[SECURITY] Request error:', JSON.stringify(logEntry));
  } else {
    // eslint-disable-next-line no-console
    console.info('[SECURITY] Request:', JSON.stringify(logEntry));
  }
}

/**
 * Get allowed hosts for diagnostic purposes
 */
export function getAllowedHostsList(): string[] {
  return getAllowedHosts();
}

