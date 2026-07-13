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

export const authMessageMethods = {
  oauthModePreference: 'oauth_mode_preference' as const,
};

export type OAuthMode = 'redirect' | 'popup';

// The UI, not the server, decides how the OAuth login page opens. Redirect is the
// default because it survives popup blockers; popup is opt-in.
export const getOAuthMode = (): OAuthMode =>
  process.env.NEXT_PUBLIC_NAT_OAUTH_MODE === 'popup' ? 'popup' : 'redirect';

// The exact frame the UI sends on WebSocket open to declare its OAuth presentation
// mode. Kept here (not inline in Chat) so both production and tests share one source
// of truth for the frame shape.
export const buildOAuthModePreferenceMessage = () => ({
  type: 'auth_message',
  payload: {
    method: authMessageMethods.oauthModePreference,
    mode: getOAuthMode(),
  },
});

// MCP API configuration helper
export const getMcpApiUrl = () => {
  const mcpPath = process.env.NEXT_PUBLIC_MCP_PATH || MCP_CLIENT_TOOL_LIST;
  return `${HTTP_PROXY_PATH}${mcpPath}`;
};
