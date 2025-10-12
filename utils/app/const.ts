export const nextEndPoints = {
  chat: 'api/chat',
};

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

// MCP API configuration following WebSocket pattern
export const MCP_API_URL = (() => {
  const serverURL = process.env.NEXT_PUBLIC_SERVER_URL;
  const mcpPath = process.env.NEXT_PUBLIC_MCP_PATH || '/mcp/client/tool/list';

  if (!serverURL) {
    // Fallback to localhost if no server URL is configured
    return `http://localhost:8080${mcpPath}`;
  }

  return `${serverURL}${mcpPath}`;
})();
