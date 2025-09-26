import { env } from 'next-runtime-env';

import { Conversation, Message } from '@/types/chat';
import { FolderInterface } from '@/types/folder';

import { t } from 'i18next';

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
  chatCompletionURL?: string;
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
  dataStreams: string[];
  showDataStreamDisplay: boolean;
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
  chatCompletionURL:
    env('NEXT_PUBLIC_HTTP_CHAT_COMPLETION_URL') ||
    process?.env?.NEXT_PUBLIC_HTTP_CHAT_COMPLETION_URL ||
    'http://127.0.0.1:8000/chat/stream',
  webSocketMode:
    env('NEXT_PUBLIC_WEB_SOCKET_DEFAULT_ON') === 'true' ||
    process?.env?.NEXT_PUBLIC_WEB_SOCKET_DEFAULT_ON === 'true'
      ? true
      : false,
  webSocketConnected: false,
  webSocketURL:
    env('NEXT_PUBLIC_WEBSOCKET_CHAT_COMPLETION_URL') ||
    process?.env?.NEXT_PUBLIC_WEBSOCKET_CHAT_COMPLETION_URL ||
    'ws://127.0.0.1:8000/websocket',
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
  dataStreams: [],
  showDataStreamDisplay:
    env('NEXT_PUBLIC_SHOW_DATA_STREAM_DEFAULT_ON') === 'true' ||
    process?.env?.NEXT_PUBLIC_SHOW_DATA_STREAM_DEFAULT_ON === 'true'
      ? true
      : false,
};
