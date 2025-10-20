import { MCP_CLIENT_TOOL_LIST, HTTP_PROXY_PATH } from '@/constants';

export const webSocketMessageTypes = {
  userMessage: 'user_message',
  userInteractionMessage: 'user_interaction_message',
  systemResponseMessage: 'system_response_message',
  systemIntermediateMessage: 'system_intermediate_message',
  systemInteractionMessage: 'system_interaction_message',
  oauthConsent: 'oauth_consent',
};

export const appConfig = {
  fileUploadEnabled: false,
};

// MCP API configuration helper
export const getMcpApiUrl = () => {
  const mcpPath = process.env.NEXT_PUBLIC_MCP_PATH || MCP_CLIENT_TOOL_LIST;
  return `${HTTP_PROXY_PATH}${mcpPath}`;
};
