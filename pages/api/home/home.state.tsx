import { env } from 'next-runtime-env';

import { Conversation, Message } from '@/types/chat';
import { FolderInterface } from '@/types/folder';
import { DEFAULT_HTTP_ENDPOINT, HTTP_ENDPOINT_OPTIONS } from '@/constants/endpoints';
import { buildWebSocketBaseURL } from '@/utils/backend-url';

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
  enableStreamingRagVizOptions: boolean;  /* This toggle displays settings that are hidden during with default / core functionality */
  additionalConfig: any;
  dataStreams: string[];  /* Used for holding the associated label of live data streams (see `stream_id` in DATA_STREAMING.md) */
  showDataStreamDisplay: boolean;  /* This toggle displays the data stream display in the chat interface (see DATA_STREAMING.md) */
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
    env('NEXT_PUBLIC_NAT_CHAT_HISTORY_DEFAULT_ON') === 'true' ||
    process?.env?.NEXT_PUBLIC_NAT_CHAT_HISTORY_DEFAULT_ON === 'true'
      ? true
      : false,
  httpEndpoint: DEFAULT_HTTP_ENDPOINT,
  httpEndpoints: HTTP_ENDPOINT_OPTIONS,
  optionalGenerationParameters: '',
  webSocketMode:
    env('NEXT_PUBLIC_NAT_WEB_SOCKET_DEFAULT_ON') === 'true' ||
    process?.env?.NEXT_PUBLIC_NAT_WEB_SOCKET_DEFAULT_ON === 'true'
      ? true
      : false,
  webSocketConnected: false,
  webSocketURL: (() => {
    const backendAddress = env('NEXT_PUBLIC_NAT_BACKEND_ADDRESS') || process?.env?.NEXT_PUBLIC_NAT_BACKEND_ADDRESS;
    if (backendAddress) {
      return buildWebSocketBaseURL(backendAddress);
    }
    return undefined;
  })(),
  webSocketSchema: 'chat_stream',
  webSocketSchemas: ['chat_stream', 'chat', 'generate_stream', 'generate'],
  enableIntermediateSteps:
    env('NEXT_PUBLIC_NAT_ENABLE_INTERMEDIATE_STEPS') === 'true' ||
    process?.env?.NEXT_PUBLIC_NAT_ENABLE_INTERMEDIATE_STEPS === 'true'
      ? true
      : false,
  expandIntermediateSteps: false,
  intermediateStepOverride: true,
  autoScroll: true,
  enableStreamingRagVizOptions:
    env('NEXT_PUBLIC_NAT_ADDITIONAL_VIZ_DEFAULT_ON') === 'true' ||
    process?.env?.NEXT_PUBLIC_NAT_ADDITIONAL_VIZ_DEFAULT_ON === 'true'
      ? true
      : false,
  additionalConfig: {},
  dataStreams: [],  /* Used for holding the associated label of live data streams (see `stream_id` in DATA_STREAMING.md) */
  showDataStreamDisplay:
    env('NEXT_PUBLIC_NAT_SHOW_DATA_STREAM_DEFAULT_ON') === 'true' ||
    process?.env?.NEXT_PUBLIC_NAT_SHOW_DATA_STREAM_DEFAULT_ON === 'true'
      ? true
      : false,
};
