export interface Message {
  id?: string;
  role: Role;
  content: string;
  intermediateSteps?: any;
  humanInteractionMessages?: any;
  errorMessages?: any;
  timestamp?: number;
  parentId?: string;
}

export type Role = 'assistant' | 'user' | 'agent' | 'system';

export interface ChatBody {
  messages?: Message[];
  // Additional fields from user's JSON will be merged here
}

export interface Conversation {
  id: string;
  name: string;
  messages: Message[];
  folderId: string | null;
  isHomepageConversation?: boolean; // Flag to track homepage conversations before first message
  selectedStream?: string;  // Determines which live data stream is being displayed (by `stream_id`) see "Data Stream Display" in DATA_STREAMING.md
}

// WebSocket Message Types
export interface WebSocketMessageBase {
  id?: string;
  conversation_id?: string;
  parent_id?: string;
  timestamp?: string;
  status?: string;
}

export interface SystemResponseMessage extends WebSocketMessageBase {
  type: 'system_response_message';
  status: 'in_progress' | 'complete';
  content?: {
    text?: string;
  };
}

export interface SystemIntermediateMessage extends WebSocketMessageBase {
  type: 'system_intermediate_message';
  status?: string;
  content?: any;
  index?: number;
}

export interface SystemInteractionMessage extends WebSocketMessageBase {
  type: 'system_interaction_message';
  content?: {
    input_type?: string;
    oauth_url?: string;
    redirect_url?: string;
    text?: string;
  };
}

export interface ErrorMessage extends WebSocketMessageBase {
  type: 'error';
  content?: any;
}

export type WebSocketMessage =
  | SystemResponseMessage
  | SystemIntermediateMessage
  | SystemInteractionMessage
  | ErrorMessage;
