export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * SSRF Prevention: Validates HTTP proxy paths
 */
export function validateProxyHttpPath(_pathname: string): ValidationResult;

/**
 * SSRF Prevention: Validates WebSocket proxy path
 */
export function validateProxyWebSocketPath(_pathname: string): ValidationResult;

/**
 * SSRF Prevention: Validates backend URLs
 */
export function validateBackendUrl(_url: string): ValidationResult;
