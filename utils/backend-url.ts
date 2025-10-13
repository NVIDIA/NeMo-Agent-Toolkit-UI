import { WEBSOCKET_PATH } from '@/constants/constants';

/**
 * Build backend URLs with appropriate protocols based on environment
 * @param backendAddress - Backend address without protocol (e.g., "localhost:8000")
 * @returns Object with httpUrl and websocketUrl with correct protocols
 */
export function buildURLProtocol(backendAddress: string): { httpUrl: string; websocketUrl: string } {
  const cleanAddress = backendAddress.replace(/^(https?|wss?):\/\//, '');
  const isProd = process.env.NODE_ENV === 'production';
  const protocol = isProd ? { http: 'https', ws: 'wss' } : { http: 'http', ws: 'ws' };

  return {
    httpUrl: `${protocol.http}://${cleanAddress}`,
    websocketUrl: `${protocol.ws}://${cleanAddress}`,
  };
}

/**
 * Build complete HTTP base URL at app initialization
 * @param backendAddress - Backend address without protocol (e.g., "localhost:8000")
 * @returns Complete HTTP base URL (e.g., "http://localhost:8000")
 */
export function buildHTTPBaseURL(backendAddress: string): string {
  const { httpUrl } = buildURLProtocol(backendAddress);
  return httpUrl;
}

/**
 * Build complete WebSocket URL at app initialization
 * @param backendAddress - Backend address without protocol (e.g., "localhost:8000")
 * @returns Complete WebSocket URL with path (e.g., "ws://localhost:8000/websocket")
 */
export function buildWebSocketBaseURL(backendAddress: string): string {
  const { websocketUrl } = buildURLProtocol(backendAddress);
  return `${websocketUrl}${WEBSOCKET_PATH}`;
}
