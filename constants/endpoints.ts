import { env } from 'next-runtime-env';

// HTTP Endpoint Constants
export const HTTP_ENDPOINTS = {
  CHAT_STREAM: '/chat/stream',
  CHAT: '/chat',
  GENERATE_STREAM: '/generate/stream',
  GENERATE: '/generate',
  CHAT_CA_RAG: '/call',  /* This endpoint is used for context-aware RAG integrations, see DATA_STREAMING.md */
} as const;

// Type for HTTP endpoints
export type HttpEndpoint = typeof HTTP_ENDPOINTS[keyof typeof HTTP_ENDPOINTS];

// Endpoint options for settings dialog
export const HTTP_ENDPOINT_OPTIONS = [
  { label: 'Chat Completions — Streaming', value: HTTP_ENDPOINTS.CHAT_STREAM },
  { label: 'Chat Completions — Non-Streaming', value: HTTP_ENDPOINTS.CHAT },
  { label: 'Generate — Streaming', value: HTTP_ENDPOINTS.GENERATE_STREAM },
  { label: 'Generate — Non-Streaming', value: HTTP_ENDPOINTS.GENERATE },
  { label: 'Context-Aware RAG — Non-Streaming', value: HTTP_ENDPOINTS.CHAT_CA_RAG },
];

// Default endpoint
const envEndpoint = env('NEXT_PUBLIC_DEFAULT_ENDPOINT') as keyof typeof HTTP_ENDPOINTS | undefined;
export const DEFAULT_HTTP_ENDPOINT =
  envEndpoint && envEndpoint in HTTP_ENDPOINTS
    ? HTTP_ENDPOINTS[envEndpoint]
    : HTTP_ENDPOINTS.CHAT_STREAM;
