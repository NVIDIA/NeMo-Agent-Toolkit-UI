// =============================================================================
// Application Information
// =============================================================================

const APPLICATION_NAME = 'NeMo Agent Toolkit';
const APPLICATION_UI_NAME = 'NeMo Agent Toolkit UI';
const botHeader = 'Scout Bot';

// =============================================================================
// Security & Session
// =============================================================================

const SESSION_COOKIE_NAME = 'nemo-agent-toolkit-session';
const MAX_FILE_SIZE_BYTES = 5242880; // 5MB

// =============================================================================
// Proxy & Routing Configuration
// =============================================================================

const HTTP_PROXY_PATH = process.env.HTTP_PUBLIC_PATH || '/api';
const WEBSOCKET_PROXY_PATH = process.env.WS_PUBLIC_PATH || '/ws';
const WEBSOCKET_BACKEND_PATH = '/websocket';

// =============================================================================
// API Routes
// =============================================================================
const CHAT_STREAM = '/chat/stream';
const CHAT = '/chat';
const GENERATE_STREAM = '/generate/stream';
const GENERATE = '/generate';
const CA_RAG_INIT = '/init';
const CHAT_CA_RAG = '/call';
const UPDATE_DATA_STREAM = '/update-data-stream';
const MCP_CLIENT_TOOL_LIST = '/mcp/client/tool/list';
const FEEDBACK = '/feedback';

// =============================================================================
// Route Collections
// =============================================================================

const CORE_ROUTES = {
  CHAT_STREAM,
  CHAT,
  GENERATE_STREAM,
  GENERATE,
  MCP_CLIENT_TOOL_LIST,
};

const EXTENDED_ROUTES = {
  CA_RAG_INIT,
  CHAT_CA_RAG,
  UPDATE_DATA_STREAM,
  FEEDBACK,
};

const EXTENDED_BACKEND_TARGETS = {
  [CA_RAG_INIT]: 'NAT_BACKEND',
  [CHAT_CA_RAG]: 'NAT_BACKEND',
  [UPDATE_DATA_STREAM]: 'NEXTJS',
  [FEEDBACK]: 'NAT_BACKEND',
};

// =============================================================================
// Route UI Configuration
// =============================================================================

const CORE_ROUTE_OPTIONS = [
  { label: 'Chat Completions — Streaming', value: CHAT_STREAM },
  { label: 'Chat Completions — Non-Streaming', value: CHAT },
  { label: 'Generate — Streaming', value: GENERATE_STREAM },
  { label: 'Generate — Non-Streaming', value: GENERATE },
  {
    label: 'Context-Aware RAG — Non-Streaming (Experimental)',
    value: CHAT_CA_RAG,
  },
];

const DEFAULT_CORE_ROUTE = CHAT_STREAM;

// =============================================================================
// Security & Validation
// =============================================================================

const ALLOWED_PATHS = [
  ...Object.values(CORE_ROUTES),
  ...Object.values(EXTENDED_ROUTES),
];

// =============================================================================
// HTTP Methods
// =============================================================================

const HTTP_METHOD_GET = 'GET';
const HTTP_METHOD_POST = 'POST';
const HTTP_METHOD_PUT = 'PUT';
const HTTP_METHOD_DELETE = 'DELETE';
const HTTP_METHOD_OPTIONS = 'OPTIONS';

// =============================================================================
// HTTP Headers
// =============================================================================

const HTTP_HEADER_CONTENT_TYPE = 'Content-Type';
const HTTP_HEADER_AUTHORIZATION = 'Authorization';
const HTTP_HEADER_CONVERSATION_ID = 'Conversation-Id';
const HTTP_HEADER_TIMEZONE = 'X-Timezone';
const HTTP_HEADER_USER_MESSAGE_ID = 'User-Message-ID';

// =============================================================================
// CORS Configuration
// =============================================================================

const CORS_METHODS = [
  HTTP_METHOD_GET,
  HTTP_METHOD_POST,
  HTTP_METHOD_PUT,
  HTTP_METHOD_DELETE,
  HTTP_METHOD_OPTIONS,
].join(', ');

const CORS_HEADERS = [
  HTTP_HEADER_CONTENT_TYPE,
  HTTP_HEADER_AUTHORIZATION,
  HTTP_HEADER_CONVERSATION_ID,
  HTTP_HEADER_TIMEZONE,
  HTTP_HEADER_USER_MESSAGE_ID,
].join(', ');

const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';

module.exports = {
  APPLICATION_NAME,
  APPLICATION_UI_NAME,
  botHeader,
  SESSION_COOKIE_NAME,
  MAX_FILE_SIZE_BYTES,
  HTTP_PROXY_PATH,
  WEBSOCKET_PROXY_PATH,
  WEBSOCKET_BACKEND_PATH,
  CHAT_STREAM,
  CHAT,
  GENERATE_STREAM,
  GENERATE,
  CA_RAG_INIT,
  CHAT_CA_RAG,
  UPDATE_DATA_STREAM,
  MCP_CLIENT_TOOL_LIST,
  FEEDBACK,
  CORE_ROUTES,
  CORE_ROUTE_OPTIONS,
  DEFAULT_CORE_ROUTE,
  EXTENDED_ROUTES,
  EXTENDED_BACKEND_TARGETS,
  ALLOWED_PATHS,
  HTTP_METHOD_GET,
  HTTP_METHOD_POST,
  HTTP_METHOD_PUT,
  HTTP_METHOD_DELETE,
  HTTP_METHOD_OPTIONS,
  CORS_METHODS,
  HTTP_HEADER_CONTENT_TYPE,
  HTTP_HEADER_AUTHORIZATION,
  HTTP_HEADER_CONVERSATION_ID,
  HTTP_HEADER_TIMEZONE,
  HTTP_HEADER_USER_MESSAGE_ID,
  CORS_HEADERS,
  CORS_ORIGIN,
};
