// =============================================================================
// Application Information
// =============================================================================

export const APPLICATION_NAME: string;
export const APPLICATION_UI_NAME: string;
export const botHeader: string;

// =============================================================================
// Security & Session
// =============================================================================
export const SESSION_COOKIE_NAME: string;
export const MAX_FILE_SIZE_BYTES: number;

// =============================================================================
// Proxy & Routing Configuration
// =============================================================================
export const HTTP_PROXY_PATH: string;
export const WEBSOCKET_PROXY_PATH: string;
export const WEBSOCKET_BACKEND_PATH: string;

// =============================================================================
// API Routes
// =============================================================================
export const CHAT_STREAM: string;
export const CHAT: string;
export const GENERATE_STREAM: string;
export const GENERATE: string;
export const CA_RAG_INIT: string;
export const CHAT_CA_RAG: string;
export const UPDATE_DATA_STREAM: string;
export const MCP_CLIENTS: string;
export const MCP_CLIENT_TOOL_LIST: string;

// =============================================================================
// Route Collections
// =============================================================================

export const CORE_ROUTES: {
  readonly CHAT_STREAM: string;
  readonly CHAT: string;
  readonly GENERATE_STREAM: string;
  readonly GENERATE: string;
  readonly MCP_CLIENTS: string;
  readonly MCP_CLIENT_TOOL_LIST: string;
};

export type HttpEndpoint = typeof CORE_ROUTES[keyof typeof CORE_ROUTES];

export const EXTENDED_ROUTES: {
  readonly CA_RAG_INIT: string;
  readonly CHAT_CA_RAG: string;
  readonly UPDATE_DATA_STREAM: string;
};

export const EXTENDED_BACKEND_TARGETS: {
  readonly [path: string]: 'NAT_BACKEND' | 'NEXTJS';
};

// =============================================================================
// Route UI Configuration
// =============================================================================

export const CORE_ROUTE_OPTIONS: Array<{
  label: string;
  value: string;
}>;

export const DEFAULT_CORE_ROUTE: string;

// =============================================================================
// Security & Validation
// =============================================================================

export const ALLOWED_PATHS: string[];

// =============================================================================
// HTTP Methods
// =============================================================================

export const HTTP_METHOD_GET: 'GET';
export const HTTP_METHOD_POST: 'POST';
export const HTTP_METHOD_PUT: 'PUT';
export const HTTP_METHOD_DELETE: 'DELETE';
export const HTTP_METHOD_OPTIONS: 'OPTIONS';

// =============================================================================
// HTTP Headers
// =============================================================================

export const HTTP_HEADER_CONTENT_TYPE: 'Content-Type';
export const HTTP_HEADER_AUTHORIZATION: 'Authorization';
export const HTTP_HEADER_CONVERSATION_ID: 'Conversation-Id';
export const HTTP_HEADER_TIMEZONE: 'X-Timezone';
export const HTTP_HEADER_USER_MESSAGE_ID: 'User-Message-ID';

// =============================================================================
// CORS Configuration
// =============================================================================

export const CORS_METHODS: string;
export const CORS_HEADERS: string;
export const CORS_ORIGIN: string;
