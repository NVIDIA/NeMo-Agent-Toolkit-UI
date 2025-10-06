import { env } from 'next-runtime-env';

import { Conversation, Message } from '@/types/chat';
import { FolderInterface } from '@/types/folder';
import { DEFAULT_HTTP_ENDPOINT, HTTP_ENDPOINT_OPTIONS } from '@/constants/endpoints';

export interface HomeInitialState {
  loading: boolean;
  lightMode: 'light' | 'dark';
  messageIsStreaming: boolean;
  folders: FolderInterface[];
  conversations: Conversation[];
  selectedConversation: Conversation | undefined;
  currentMessage: Message | undefined;
  showChatbar: boolean;
  currentFolder: FolderInterface | undefined;
  messageError: boolean;
  searchTerm: string;
  chatHistory: boolean;
  serverURL?: string;
  httpEndpoint?: string;
  httpEndpoints?: Array<{label: string; value: string}>;
  optionalGenerationParameters?: string;
  webSocketMode?: boolean;
  webSocketConnected?: boolean;
  webSocketURL?: string;
  webSocketSchema?: string;
  webSocketSchemas?: string[];
  enableIntermediateSteps?: boolean;
  expandIntermediateSteps?: boolean;
  intermediateStepOverride?: boolean;
  autoScroll?: boolean;
  additionalConfig: any;
}

export const initialState: HomeInitialState = {
  loading: false,
  lightMode: 'light',
  messageIsStreaming: false,
  folders: [],
  conversations: [],
  selectedConversation: undefined,
  currentMessage: undefined,
  showChatbar: true,
  currentFolder: undefined,
  messageError: false,
  searchTerm: '',
  chatHistory:
    env('NEXT_PUBLIC_CHAT_HISTORY_DEFAULT_ON') === 'true' ||
    process?.env?.NEXT_PUBLIC_CHAT_HISTORY_DEFAULT_ON === 'true'
      ? true
      : false,
  serverURL:
    env('NEXT_PUBLIC_SERVER_URL') ||
    process?.env?.NEXT_PUBLIC_SERVER_URL,
  httpEndpoint: DEFAULT_HTTP_ENDPOINT,
  httpEndpoints: HTTP_ENDPOINT_OPTIONS,
  optionalGenerationParameters: '',
  webSocketMode:
    env('NEXT_PUBLIC_WEB_SOCKET_DEFAULT_ON') === 'true' ||
    process?.env?.NEXT_PUBLIC_WEB_SOCKET_DEFAULT_ON === 'true'
      ? true
      : false,
  webSocketConnected: false,
  webSocketURL: (() => {
    const wsURL = env('NEXT_PUBLIC_WEBSOCKET_URL') || process?.env?.NEXT_PUBLIC_WEBSOCKET_URL;
    const wsPath = env('NEXT_PUBLIC_WEBSOCKET_PATH') || process?.env?.NEXT_PUBLIC_WEBSOCKET_PATH;
    return `${wsURL}/${wsPath}`;
  })(),
  webSocketSchema: 'chat_stream',
  webSocketSchemas: ['chat_stream', 'chat', 'generate_stream', 'generate'],
  enableIntermediateSteps:
    env('NEXT_PUBLIC_ENABLE_INTERMEDIATE_STEPS') === 'true' ||
    process?.env?.NEXT_PUBLIC_ENABLE_INTERMEDIATE_STEPS === 'true'
      ? true
      : false,
  expandIntermediateSteps: false,
  intermediateStepOverride: true,
  autoScroll: true,
  additionalConfig: {},
};
