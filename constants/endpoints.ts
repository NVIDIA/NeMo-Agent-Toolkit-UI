// HTTP Endpoint Constants
export const HTTP_ENDPOINTS = {
  CHAT_STREAM: '/chat/stream',
  CHAT: '/chat',
  GENERATE_STREAM: '/generate/stream',
  GENERATE: '/generate',
} as const;

// Type for HTTP endpoints
export type HttpEndpoint = typeof HTTP_ENDPOINTS[keyof typeof HTTP_ENDPOINTS];

// Default endpoint
export const DEFAULT_HTTP_ENDPOINT = HTTP_ENDPOINTS.CHAT_STREAM;

// Endpoint options for settings dialog
export const HTTP_ENDPOINT_OPTIONS = [
  { label: 'Chat Completions — Streaming', value: HTTP_ENDPOINTS.CHAT_STREAM },
  { label: 'Chat Completions — Non-Streaming', value: HTTP_ENDPOINTS.CHAT },
  { label: 'Generate — Streaming', value: HTTP_ENDPOINTS.GENERATE_STREAM },
  { label: 'Generate — Non-Streaming', value: HTTP_ENDPOINTS.GENERATE },
];
