
'use client';

import { ChatInput } from './ChatInput';
import { ChatLoader } from './ChatLoader';
import { MemoizedChatMessage } from './MemoizedChatMessage';
import { InteractionModal } from '@/components/Chat/ChatInteractionMessage';
import HomeContext from '@/pages/api/home/home.context';
import { 
  DEFAULT_CORE_ROUTE, 
  WEBSOCKET_PROXY_PATH, 
  HTTP_PROXY_PATH,
  CORE_ROUTES,
  EXTENDED_ROUTES,
} from '@/constants';
import { Conversation, Message } from '@/types/chat';
import {
  WebSocketInbound,
  validateWebSocketMessage,
  validateWebSocketMessageWithConversationId,
  validateConversationId,
  isSystemResponseMessage,
  isSystemIntermediateMessage,
  isSystemInteractionMessage,
  isErrorMessage,
  isSystemResponseInProgress,
  isSystemResponseComplete,
  isOAuthConsentMessage,
  isObservabilityTraceMessage,
  extractOAuthUrl,
  shouldAppendResponseContent,
} from '@/types/websocket';
import { webSocketMessageTypes } from '@/utils/app/const';
import {
  saveConversation,
  saveConversations,
  updateConversation,
} from '@/utils/app/conversation';
import {
  fetchLastMessage,
  processIntermediateMessage,
  updateConversationTitle,
} from '@/utils/app/helper';
import {
  shouldAppendResponse,
  appendAssistantText,
  mergeIntermediateSteps,
  applyMessageUpdate,
  createAssistantMessage,
  updateAssistantMessage,
  shouldRenderAssistantMessage,
} from '@/utils/chatTransform';
import { throttle } from '@/utils/data/throttle';
import { useTranslation } from 'next-i18next';
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';

import { SESSION_COOKIE_NAME } from '@/constants';
import { isValidConsentPromptURL } from '@/utils/security/oauth-validation';
import {
  buildGeneratePayload,
  buildGenerateStreamPayload,
  buildChatPayload,
  buildChatStreamPayload,
  buildCaRagPayload,
} from '@/proxy/request-transformers';



// Streaming utilities for handling SSE and NDJSON safely
function normalizeNewlines(s: string): string {
  // turn CRLF into LF so splitting is predictable
  return s.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}


function extractSsePayloads(buffer: string): {
  frames: string[];
  rest: string;
} {
  buffer = normalizeNewlines(buffer);

  // Split on blank line (event delimiter)
  const parts = buffer.split(/\n\n/);
  const rest = parts.pop() ?? '';

  const frames: string[] = [];

  for (const block of parts) {
    // Keep only lines that start with "data:" possibly followed by a space
    const dataLines = block
      .split('\n')
      .filter(line => /^data:\s*/.test(line))
      .map(line => line.replace(/^data:\s*/, '').trim())
      .filter(line => line.length > 0);

    if (dataLines.length === 0) continue;

    // Some servers send multi-line JSON; join them
    const payload = dataLines.join('\n');

    // Ignore sentinel frames
    if (payload === '[DONE]' || payload === 'DONE') continue;

    frames.push(payload);
  }

  return { frames, rest };
}

function splitNdjson(buffer: string): { lines: string[]; rest: string } {
  buffer = normalizeNewlines(buffer);
  const parts = buffer.split('\n');
  const rest = parts.pop() ?? '';
  // strip empty/whitespace lines
  const lines = parts.map(l => l.trim()).filter(Boolean);
  return { lines, rest };
}

function tryParseJson<T = any>(s: string): T | null {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

interface WorkflowError {
  code: string;
  message: string;
  details: string;
}

function isWorkflowError(obj: unknown): obj is WorkflowError {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'code' in obj &&
    'message' in obj &&
    'details' in obj &&
    typeof (obj as WorkflowError).code === 'string' &&
    typeof (obj as WorkflowError).message === 'string' &&
    typeof (obj as WorkflowError).details === 'string'
  );
}

function formatWorkflowError(error: WorkflowError): string {
  return `\n\n**Error (${error.code}):** ${error.message} — ${error.details}`;
}

function parsePossiblyConcatenatedJson(payload: string): any[] {
  // Fast path
  const single = tryParseJson(payload);
  if (single !== null) return [single];

  // Slow path: try to split concatenated top-level objects
  const objs: any[] = [];
  let depth = 0,
    start = -1;
  for (let i = 0; i < payload.length; i++) {
    const ch = payload[i];
    if (ch === '{') {
      if (depth === 0) start = i;
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0 && start !== -1) {
        const slice = payload.slice(start, i + 1);
        const parsed = tryParseJson(slice);
        if (parsed !== null) objs.push(parsed);
        start = -1;
      }
    }
  }
  return objs;
}

export const Chat = () => {
  const { t } = useTranslation('chat');
  const {
    state: {
      selectedConversation,
      conversations,
      messageIsStreaming,
      loading,
      chatHistory,
      webSocketConnected,
      webSocketMode,
      webSocketSchema,
      httpEndpoint,
      optionalGenerationParameters,
      expandIntermediateSteps,
      intermediateStepOverride,
      enableIntermediateSteps,
    },
    handleUpdateConversation,
    dispatch: homeDispatch,
  } = useContext(HomeContext);

  const [currentMessage, setCurrentMessage] = useState<Message>();
  const [autoScrollEnabled, setAutoScrollEnabled] = useState<boolean>(true);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showScrollDownButton, setShowScrollDownButton] =
    useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const controllerRef = useRef(new AbortController());
  const selectedConversationRef = useRef(selectedConversation);
  const conversationsRef = useRef(conversations);

  const [modalOpen, setModalOpen] = useState(false);
  const [interactionMessage, setInteractionMessage] = useState(null);
  const webSocketRef = useRef<WebSocket | null>(null);
  const webSocketConnectedRef = useRef(false);
  const webSocketModeRef = useRef(
    sessionStorage.getItem('webSocketMode') === 'false' ? false : webSocketMode
  );
  let websocketLoadingToastId: string | null = null;
  const lastScrollTop = useRef(0); // Store last known scroll position

  // Add these variables near the top of your component
  const isUserInitiatedScroll = useRef(false);
  const scrollTimeout = useRef<NodeJS.Timeout | null>(null);

  // Keep ref in sync with context toggle so callbacks read the latest value
  useEffect(() => {
    webSocketModeRef.current = webSocketMode;
  }, [webSocketMode]);

  // WebSocket message tracking for stop generating functionality
  const activeUserMessageId = useRef<string | null>(null);

  /**
   * Handles stopping conversation generation for WebSocket mode
   * Marks the current active user message as stopped and resets UI state
   */
  const handleStopConversation = useCallback(() => {
    if (webSocketModeRef?.current) {
      console.log('Stopping generation for user message:', activeUserMessageId.current);

      // Set active user message ID to null to ignore subsequent messages
      activeUserMessageId.current = null;
      // Clear from sessionStorage
      const conversationId = selectedConversationRef.current?.id;
      if (conversationId) {
        sessionStorage.removeItem(`activeUserMessageId_${conversationId}`);
      }

      // Reset UI state
      homeDispatch({ field: 'loading', value: false });
      homeDispatch({ field: 'messageIsStreaming', value: false });
    } else {
      // HTTP mode - use the existing abort controller logic
      try {
        controllerRef?.current?.abort('aborted');
        setTimeout(() => {
          controllerRef.current = new AbortController(); // Reset the controller
        }, 100);
      } catch (error) {
        console.log('error aborting - ', error);
      }
    }
  }, [webSocketModeRef, homeDispatch]);

  const openModal = (data: any = {}) => {
    setInteractionMessage(data);
    setModalOpen(true);
  };

  const handleUserInteraction = ({
    interactionMessage = {},
    userResponse = '',
  }: any) => {
    if (!selectedConversation) {
      console.error('Cannot send interaction response: no conversation selected');
      return;
    }

    const wsMessage = {
      type: webSocketMessageTypes.userInteractionMessage,
      id: uuidv4(), //new id for every new message
      conversation_id: selectedConversation.id, // Required for backend routing
      thread_id: interactionMessage?.thread_id, // same thread_id from interaction message received
      parent_id: interactionMessage?.parent_id, // same parent_id from interaction message received
      content: {
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: userResponse,
              },
            ],
          },
        ],
      },
      timestamp: new Date().toISOString(),
    };
    webSocketRef?.current?.send(JSON.stringify(wsMessage));
  };

  useEffect(() => {
    selectedConversationRef.current = selectedConversation;
  }, [selectedConversation]);

  // Reset WebSocket state when conversation changes to prevent stale message display
  useEffect(() => {
    if (selectedConversation?.id) {
      activeUserMessageId.current = null;
      homeDispatch({ field: 'messageIsStreaming', value: false });
      homeDispatch({ field: 'loading', value: false });
    }
  }, [selectedConversation?.id]);

  useEffect(() => {
    if (webSocketMode && !webSocketConnectedRef.current) {
      connectWebSocket();
    } else {
      // todo cancel ongoing connection attempts
      if (websocketLoadingToastId) toast.dismiss(websocketLoadingToastId);
    }

    return () => {
      if (webSocketRef?.current) {
        webSocketRef?.current?.close();
        webSocketConnectedRef.current = false;
      }
    };
  }, [webSocketMode]);

  const connectWebSocket = async (retryCount = 0) => {
    const maxRetries = 3;
    const retryDelay = 1000; // 1-second delay between retries

    return new Promise(resolve => {
      // Get session cookie
      const getCookie = (name: string) => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop()?.split(';').shift();
      };

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      let wsUrl = `${protocol}//${window.location.host}${WEBSOCKET_PROXY_PATH}`;
      
      // Add session cookie as query parameter for backend authentication
      const sessionCookie = getCookie(SESSION_COOKIE_NAME);
      if (sessionCookie) {
        wsUrl += `?session=${encodeURIComponent(sessionCookie)}`;
      }

      // Add conversation_id for reconnection support (HITL state restoration)
      const conversationId = selectedConversationRef.current?.id;
      if (conversationId) {
        wsUrl += `${wsUrl.includes('?') ? '&' : '?'}conversation_id=${encodeURIComponent(conversationId)}`;
      }

      const ws = new WebSocket(wsUrl);

      websocketLoadingToastId = toast.loading(
        'WebSocket is not connected, trying to connect...',
        { id: 'websocketLoadingToastId' }
      );

      ws.onopen = () => {
        toast.success(
          'WebSocket connected',
          {
            id: 'websocketSuccessToastId',
          }
        );
        if (websocketLoadingToastId) toast.dismiss(websocketLoadingToastId);

        // using ref due to usecallback for handlesend which will be recreated during next render when dependency array changes
        // so values inside of are still one and be updated after next render
        // so we'll not see any changes to websocket (state variable) or webSocketConnected (context variable) changes while the function is executing
        webSocketConnectedRef.current = true;
        homeDispatch({ field: 'webSocketConnected', value: true });
        webSocketRef.current = ws;
        
        // Restore activeUserMessageId from sessionStorage on reconnect
        const conversationId = selectedConversationRef.current?.id;
        if (conversationId) {
          const storedMessageId = sessionStorage.getItem(`activeUserMessageId_${conversationId}`);
          if (storedMessageId) {
            activeUserMessageId.current = storedMessageId;
          }
        }
        
        resolve(true); // Resolve true only when connected
      };

      ws.onerror = (evt) => {
        console.error('[WebSocket] error:', evt);
        // Do not ws.close() here; let server/proxy drive closure
      };

      ws.onmessage = event => {
        const message = JSON.parse(event.data);
        handleWebSocketMessage(message);
      };

      ws.onclose = async (event) => {
        console.log('[WebSocket] Connection closed. Code:', event.code, 'Reason:', event.reason, 'Clean:', event.wasClean);
        
        if (retryCount < maxRetries) {
          retryCount++;

          // Retry and capture the result
          if (webSocketModeRef?.current) {
            // Wait for retry delay
            await new Promise(res => setTimeout(res, retryDelay));

            const success = await connectWebSocket(retryCount);
            resolve(success);
          }
        } else {
          // Only resolve(false) after all retries fail
          homeDispatch({ field: 'webSocketConnected', value: false });
          webSocketConnectedRef.current = false;
          homeDispatch({ field: 'loading', value: false });
          homeDispatch({ field: 'messageIsStreaming', value: false });
          if (websocketLoadingToastId) toast.dismiss(websocketLoadingToastId);
          
          toast.error('WebSocket connection failed. Ensure the backend server is running.', {
            id: 'websocketErrorToastId',
          });
          resolve(false);
        }
      };
    });
  };

  // Re-attach the WebSocket handler when intermediateStepOverride changes because we need updated value from settings
  useEffect(() => {
    if (webSocketRef.current) {
      webSocketRef.current.onmessage = event => {
        const message = JSON.parse(event.data);
        handleWebSocketMessage(message);
      };
    }
  }, [intermediateStepOverride]);

  /**
   * Handles OAuth consent flow by opening popup window
   */
  const handleOAuthConsent = (message: WebSocketInbound) => {
    if (!isSystemInteractionMessage(message)) return false;

    if (message.content?.input_type === 'oauth_consent') {
      const oauthUrl = extractOAuthUrl(message);
      if (oauthUrl) {
        // Validate URL before opening
        if (!isValidConsentPromptURL(oauthUrl)) {
          console.error('OAuth URL validation failed in popup handler, refusing to open potentially malicious URL.');
          toast.error('OAuth URL validation failed.');
          return false;
        }
        
        const popup = window.open(
          oauthUrl,
          'oauth-popup',
          'width=600,height=700,scrollbars=yes,resizable=yes,noopener,noreferrer'
        );
        const handleOAuthComplete = (event: MessageEvent) => {
          if (popup && !popup.closed) popup.close();
          window.removeEventListener('message', handleOAuthComplete);
        };
        window.addEventListener('message', handleOAuthComplete);
      }
      return true;
    }
    return false;
  };

  /**
   * Updates refs immediately before React dispatch to prevent stale reads
   */
  const updateRefsAndDispatch = (
    updatedConversations: Conversation[],
    updatedConversation: Conversation,
    currentSelectedConversation: Conversation | null | undefined
  ) => {
    // Write-through to refs before dispatch to avoid stale reads on next WS tick
    conversationsRef.current = updatedConversations;
    if (currentSelectedConversation?.id === updatedConversation.id) {
      selectedConversationRef.current = updatedConversation;
    }

    // Dispatch and persist
    homeDispatch({ field: 'conversations', value: updatedConversations });
    saveConversations(updatedConversations);

    if (currentSelectedConversation?.id === updatedConversation.id) {
      homeDispatch({
        field: 'selectedConversation',
        value: updatedConversation,
      });
      saveConversation(updatedConversation);
    }
  };

  /**
   * Processes system response messages for content updates
   * Only appends content for in_progress status with non-empty text
   */
  const processSystemResponseMessage = (
    message: WebSocketInbound,
    messages: Message[]
  ): Message[] => {
    if (!shouldAppendResponse(message)) {
      return messages;
    }

    const incomingText = isSystemResponseMessage(message)
      ? message.content?.text?.trim() || ''
      : '';
    const lastMessage = messages.at(-1);
    const isLastAssistant = lastMessage?.role === 'assistant';

    if (isLastAssistant) {
      // Append to existing assistant message using pure helper
      const combinedContent = appendAssistantText(
        lastMessage.content || '',
        incomingText
      );
      return messages.map((m, idx) =>
        idx === messages.length - 1
          ? updateAssistantMessage(m, combinedContent)
          : m
      );
    } else {
      // Create new assistant message using pure helper
      return [
        ...messages,
        createAssistantMessage(message.id, message.parent_id, incomingText),
      ];
    }
  };

  /**
   * Processes intermediate step messages without modifying content
   */
  const processIntermediateStepMessage = (
    message: WebSocketInbound,
    messages: Message[]
  ): Message[] => {
    if (!isSystemIntermediateMessage(message)) return messages;

    const lastMessage = messages.at(-1);
    const isLastAssistant = lastMessage?.role === 'assistant';

    if (!isLastAssistant) {
      // Create new assistant message with empty content for intermediate steps
      const stepWithIndex = { ...message, index: 0 };
      return [
        ...messages,
        createAssistantMessage(message.id, message.parent_id, '', [
          stepWithIndex,
        ]),
      ];
    } else {
      // Update intermediate steps on existing assistant message using pure helper
      const lastIdx = messages.length - 1;
      const lastSteps = messages[lastIdx]?.intermediateSteps || [];
      const mergedSteps = mergeIntermediateSteps(
        lastSteps,
        message,
        sessionStorage.getItem('intermediateStepOverride') === 'false'
          ? false
          : Boolean(intermediateStepOverride)
      );

      return messages.map((m, idx) =>
        idx === lastIdx ? updateAssistantMessage(m, m.content, mergedSteps) : m
      );
    }
  };

  /**
   * Processes error messages by attaching them to assistant messages
   */
  const processErrorMessage = (
    message: WebSocketInbound,
    messages: Message[]
  ): Message[] => {
    if (!isErrorMessage(message)) return messages;

    const lastMessage = messages.at(-1);
    const isLastAssistant = lastMessage?.role === 'assistant';

    if (isLastAssistant) {
      // Attach error to existing assistant message
      return messages.map((m, idx) =>
        idx === messages.length - 1
          ? {
              ...m,
              errorMessages: [...(m.errorMessages || []), message],
              observabilityTraceId: m.observabilityTraceId,
              timestamp: Date.now(),
            }
          : m
      );
    } else {
      // Create new assistant message for error using pure helper
      return [
        ...messages,
        createAssistantMessage(
          message.id,
          message.parent_id,
          '',
          [],
          [],
          [message]
        ),
      ];
    }
  };

  /**
   * Processes observability trace messages by attaching trace ID to last assistant message
   */
  const processObservabilityTraceMessage = (
    message: WebSocketInbound,
    messages: Message[]
  ): Message[] => {
    if (!isObservabilityTraceMessage(message)) return messages;

    const traceId = message.content?.observability_trace_id;
    if (!traceId) {
      return messages;
    }

    // Attach trace ID to last assistant message
    return messages.map((m, idx) =>
      idx === messages.length - 1
        ? {
            ...m,
            observabilityTraceId: traceId,
            timestamp: Date.now(),
          }
        : m
    );
  };

  /**
   * Main WebSocket message handler
   * Processes different message types and updates conversation state
   */
  const handleWebSocketMessage = (message: any) => {
    // Validate message structure AND conversation ID with detailed error reporting
    try {
      validateWebSocketMessageWithConversationId(message);
    } catch (error: any) {
      console.error('WebSocket message validation failed:', error.message);
      toast.error(`WebSocket Error: ${error.message}`);

      // Log additional debugging info
      console.error('Raw message data:', message);
      console.error(
        'Available conversations:',
        conversationsRef.current?.map(c => ({ id: c.id, name: c.name }))
      );

      return; // Don't process invalid messages
    }

        // Filter messages based on active conversation for stop generating functionality
    const messageConversationId = message.conversation_id;
    const currentConversationId = selectedConversationRef.current?.id;

    if (activeUserMessageId.current === null || messageConversationId !== currentConversationId) {
      return;
    }

    // End loading indicators as messages arrive
    homeDispatch({ field: 'loading', value: false });
    if (isSystemResponseComplete(message)) {
      setTimeout(() => {
        homeDispatch({ field: 'messageIsStreaming', value: false });
        // Clear active tracking when response is complete
        activeUserMessageId.current = null;
        // Clear from sessionStorage
        sessionStorage.removeItem(`activeUserMessageId_${message.conversation_id}`);
      }, 200);
    }

    // Handle human-in-the-loop interactions using type guard
    if (isSystemInteractionMessage(message)) {
      // Check for OAuth consent message and securely open OAuth URL
      if (message?.content?.input_type === 'oauth_consent') {
        // Expect the OAuth URL to be directly in the message content
        const oauthUrl =
          message?.content?.oauth_url ||
          message?.content?.redirect_url ||
          message?.content?.text;
        if (oauthUrl) {
          // Validate URL before opening to prevent Open Redirect attacks
          if (isValidConsentPromptURL(oauthUrl)) {
            // Open the validated OAuth URL in a new tab
            window.open(oauthUrl, '_blank', 'noopener,noreferrer');
          } else {
            console.error('OAuth URL validation failed, refusing to open potentially malicious URL:', oauthUrl);
            toast.error('Invalid OAuth URL received. Please contact support.');
          }
        } else {
          console.error(
            'OAuth consent message received but no URL found in content:',
            message?.content
          );
          toast.error('OAuth URL not found in message content');
        }
        return; // Don't process further or show modal
      }
      openModal(message);
      return;
    }

    // Respect intermediate-steps toggle
    if (
      sessionStorage.getItem('enableIntermediateSteps') === 'false' &&
      isSystemIntermediateMessage(message)
    ) {
      return;
    }

    // Skip creating/updating assistant text for system_response:complete using type guard
    if (isSystemResponseComplete(message)) {
      return;
    }

    // Find target conversation with enhanced error reporting
    const currentConversations = conversationsRef.current;
    const targetConversation = currentConversations.find(
      c => c.id === message.conversation_id
    );

    if (!targetConversation) {
      const errorMsg = `WebSocket message received for unknown conversation ID: ${message.conversation_id}`;
      console.error(errorMsg);
      console.error('Message details:', {
        type: message.type,
        conversation_id: message.conversation_id,
        id: message.id,
      });
      console.error(
        'Available conversations:',
        currentConversations?.map(c => ({ id: c.id, name: c.name }))
      );

      return;
    }

    // Process message based on type using pure helpers
    let updatedMessages = targetConversation.messages;
    updatedMessages = processSystemResponseMessage(message, updatedMessages);
    updatedMessages = processIntermediateStepMessage(message, updatedMessages);
    updatedMessages = processErrorMessage(message, updatedMessages);
    updatedMessages = processObservabilityTraceMessage(message, updatedMessages);

    // Update conversation with new messages and title using pure helper
    const updatedConversation = applyMessageUpdate(
      targetConversation,
      updatedMessages
    );

    // Update conversations array
    const updatedConversations = currentConversations.map(c =>
      c.id === updatedConversation.id ? updatedConversation : c
    );

    // Update state and persistence
    updateRefsAndDispatch(
      updatedConversations,
      updatedConversation,
      selectedConversationRef.current
    );
  };

  const handleSend = useCallback(
    async (message: Message, deleteCount = 0, retry = false) => {
      message.id = uuidv4();

      // Set the active user message ID for WebSocket message tracking
      activeUserMessageId.current = message.id;
      // Persist to sessionStorage for reconnection recovery
      if (selectedConversation?.id) {
        sessionStorage.setItem(`activeUserMessageId_${selectedConversation.id}`, message.id);
      }
      // chat with bot
      if (selectedConversation) {
        let updatedConversation: Conversation;
        if (deleteCount) {
          const updatedMessages = [...selectedConversation.messages];
          for (let i = 0; i < deleteCount; i++) {
            updatedMessages.pop();
          }
          updatedConversation = {
            ...selectedConversation,
            messages: [...updatedMessages, message],
          };
        } else {
          // remove content from attachment since it could a large base64 encoded string which can cause session stroage overflow
          // Clone the message and update the attachment contentconst updateMessage = JSON.parse(JSON.stringify(message));
          const updateMessage = JSON.parse(JSON.stringify(message));
          if (updateMessage?.attachment) {
            updateMessage.attachment.content = '';
          }
          updatedConversation = {
            ...selectedConversation,
            messages: [...selectedConversation.messages, { ...updateMessage }],
            // Remove isHomepageConversation flag when first message is sent to make it visible in sidebar
            isHomepageConversation: undefined,
          };
        }
        homeDispatch({
          field: 'selectedConversation',
          value: updatedConversation,
        });

        homeDispatch({ field: 'loading', value: true });
        homeDispatch({ field: 'messageIsStreaming', value: true });

        // websocket connection chat request
        if (webSocketModeRef?.current) {
          if (!webSocketConnectedRef?.current) {
            const connected = await connectWebSocket();
            if (!connected) {
              homeDispatch({ field: 'loading', value: false });
              homeDispatch({ field: 'messageIsStreaming', value: false });
              return;
            } else {
              handleSend(message, 1);
              return;
            }
          }
          toast.dismiss();

          saveConversation(updatedConversation);
          // Use conversationsRef.current to avoid stale closure that causes conversation wiping
          const updatedConversations: Conversation[] =
            conversationsRef.current.map(conversation => {
              if (conversation.id === selectedConversation.id) {
                return updatedConversation;
              }
              return conversation;
            });
          
          // Update ref immediately to prevent stale reads
          conversationsRef.current = updatedConversations;
          selectedConversationRef.current = updatedConversation;
          
          // Removed fallback block that was wiping conversations
          homeDispatch({
            field: 'conversations',
            value: updatedConversations,
          });
          saveConversations(updatedConversations);

          let chatMessages;
          if (chatHistory) {
            chatMessages = updatedConversation?.messages?.map(
              (message: Message) => {
                return {
                  role: message.role,
                  content: [
                    {
                      type: 'text',
                      text: message?.content?.trim() || '',
                    },
                    ...(typeof message?.content === 'object' &&
                    message?.content &&
                    'attachments' in message.content &&
                    (message.content as any).attachments?.length > 0
                      ? (message.content as any).attachments?.map(
                          (attachment: any) => ({
                            type: 'image',
                            image_url: attachment?.content,
                          })
                        )
                      : []),
                  ],
                };
              }
            );
          }
          // else set only the user last message
          else {
            chatMessages = [
              updatedConversation?.messages[
                updatedConversation?.messages?.length - 1
              ],
            ].map(message => {
              return {
                role: message.role,
                content: [
                  {
                    type: 'text',
                    text: message?.content?.trim() || '',
                  },
                ],
              };
            });
          }

                              const wsMessage = {
            type: webSocketMessageTypes.userMessage,
            schema_type:
              sessionStorage.getItem('webSocketSchema') || webSocketSchema,
            id: message?.id,
            conversation_id: selectedConversation.id,
            content: {
              messages: chatMessages,
            },
            timestamp: new Date().toISOString(),
          };

          // console.log('Sent message via websocket', wsMessage)
          webSocketRef?.current?.send(JSON.stringify(wsMessage));
          return;
        }

        // Get selected endpoint from settings
        const httpEndpointPath = sessionStorage.getItem('httpEndpoint') || httpEndpoint;
        const optionalParams = sessionStorage.getItem('optionalGenerationParameters') || optionalGenerationParameters;
        
        // Clean messages for chat endpoints
        const messagesCleaned = updatedConversation.messages.map(msg => ({
          role: msg.role,
          content: (typeof msg.content === 'string' ? msg.content : '').trim(),
        }));
        
        // Build endpoint-specific payload using dedicated builder functions
        let requestPayload: any;
        
        if (httpEndpointPath === CORE_ROUTES.GENERATE) {
          requestPayload = buildGeneratePayload(message?.content || '');
        } else if (httpEndpointPath === CORE_ROUTES.GENERATE_STREAM) {
          requestPayload = buildGenerateStreamPayload(message?.content || '');
        } else if (httpEndpointPath === CORE_ROUTES.CHAT) {
          requestPayload = buildChatPayload(
            chatHistory ? messagesCleaned : [{ role: 'user', content: message?.content }],
            chatHistory,
            optionalParams || ''
          );
        } else if (httpEndpointPath === CORE_ROUTES.CHAT_STREAM) {
          requestPayload = buildChatStreamPayload(
            chatHistory ? messagesCleaned : [{ role: 'user', content: message?.content }],
            chatHistory,
            optionalParams || ''
          );
        } else if (httpEndpointPath === EXTENDED_ROUTES.CHAT_CA_RAG) {
          requestPayload = buildCaRagPayload(message?.content || '');
        } else {
          // Fallback for other endpoints
          requestPayload = {
            messages: chatHistory
              ? messagesCleaned
              : [{ role: 'user', content: message?.content }],
          };
        }

        const body = JSON.stringify(requestPayload);

        let response;
        try {
          response = await fetch(`${HTTP_PROXY_PATH}${httpEndpointPath}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Conversation-Id': selectedConversation?.id || '',
              'User-Message-ID': message?.id || '',
            },
            signal: controllerRef.current.signal,
            body,
          });

          if (!response?.ok) {
            homeDispatch({ field: 'loading', value: false });
            homeDispatch({ field: 'messageIsStreaming', value: false });
            
            // Handle 422 workflow errors - display in assistant message
            if (response.status === 422) {
              try {
                const errorBody = await response.json();
                if (isWorkflowError(errorBody)) {
                  const errorContent = formatWorkflowError(errorBody);
                  
                  const updatedMessages: Message[] = [
                    ...updatedConversation.messages,
                    {
                      id: uuidv4(),
                      role: 'assistant',
                      content: errorContent,
                    },
                  ];
                  
                  updatedConversation = {
                    ...updatedConversation,
                    messages: updatedMessages,
                  };
                  
                  homeDispatch({
                    field: 'selectedConversation',
                    value: updatedConversation,
                  });
                  
                  saveConversation(updatedConversation);
                  const updatedConversations = conversations.map((c) =>
                    c.id === updatedConversation.id ? updatedConversation : c
                  );
                  homeDispatch({ field: 'conversations', value: updatedConversations });
                  saveConversations(updatedConversations);
                  return;
                }
              } catch {
                // Fall through to default error handling if JSON parse fails
              }
            }
            
            // Default: show toast for other errors (404, 500, etc.)
            const errorMsg = response.status === 404
              ? 'API communication not available at this URL. Access the application at the default URL http://localhost:3000 (or check terminal startup logs for the correct web application URL).'
              : response.statusText;

            toast.error(errorMsg, { duration: 8000 });
            return;
          }

          const data = response?.body;
          if (!data) {
            homeDispatch({ field: 'loading', value: false });
            homeDispatch({ field: 'messageIsStreaming', value: false });
            toast.error('Error: No data received from server');
            return;
          }
          
          // Extract Observability-Trace-Id from response headers
          const observabilityTraceId = response.headers.get('Observability-Trace-Id') || undefined;
          
          if (!false) {
            if (updatedConversation.messages.length === 1) {
              const { content } = message;
              const customName =
                content.length > 30
                  ? content.substring(0, 30) + '...'
                  : content;
              updatedConversation = {
                ...updatedConversation,
                name: customName,
              };
            }
            homeDispatch({ field: 'loading', value: false });
            const reader = data.getReader();
            const decoder = new TextDecoder();
            let done = false;
            let isFirst = true;
            let text = '';
            let counter = 1;
            let partialIntermediateStep = ''; // Add this to store partial chunks

            // Initialize streaming buffers
            const selectedEndpoint = sessionStorage.getItem('httpEndpoint') || httpEndpoint || DEFAULT_CORE_ROUTE;
            const isGenerateStream = selectedEndpoint.includes('/generate/stream');
            let sseBuffer = '';
            let ndjsonBuffer = '';
            let extractedObservabilityTraceId: string | undefined = undefined;

            while (!done) {
              const { value, done: doneReading } = await reader.read();
              done = doneReading;
              if (!value) continue;

              let chunkValue = '';

              // Handle generate/stream endpoints safely
              if (isGenerateStream) {
                const chunkText = decoder.decode(value, { stream: true });

                // 1) Try SSE first
                sseBuffer += chunkText;
                let sseFrames: string[] = [];
                ({ frames: sseFrames, rest: sseBuffer } =
                  extractSsePayloads(sseBuffer));

                let extractedText = '';

                if (sseFrames.length > 0) {
                  for (const frame of sseFrames) {
                    const objs = parsePossiblyConcatenatedJson(frame);
                    for (const obj of objs) {
                      if (obj && typeof obj.value === 'string') {
                        extractedText += obj.value;
                      } else if (typeof obj === 'string') {
                        extractedText += obj; // some servers may send string payloads
                      }
                    }
                  }
                } else {
                  // 2) Fall back to NDJSON if it wasn't SSE
                  ndjsonBuffer += chunkText;
                  let lines: string[] = [];
                  ({ lines, rest: ndjsonBuffer } = splitNdjson(ndjsonBuffer));
                  for (const line of lines) {
                    const obj = tryParseJson<any>(line);
                    if (obj && typeof obj.value === 'string') {
                      extractedText += obj.value;
                    } else if (typeof obj === 'string') {
                      extractedText += obj;
                    }
                  }
                }

                // 3) If neither SSE nor NDJSON detected, treat as plain text
                chunkValue = extractedText || chunkText;
              } else {
                // Non-generate streaming path (existing logic)
                chunkValue = decoder.decode(value, { stream: true });
              }

              // Ensure chunkValue is always a string
              if (typeof chunkValue !== 'string') {
                chunkValue = String(chunkValue ?? '');
              }

              counter++;

              // First, handle any partial chunk from previous iteration
              if (partialIntermediateStep) {
                chunkValue = partialIntermediateStep + chunkValue;
                partialIntermediateStep = '';
              }

              // Process complete observability_trace_id tags
              let observabilityTraceIdMatches =
                chunkValue.match(
                  /<observabilitytraceid>([\s\S]*?)<\/observabilitytraceid>/g
                ) || [];
              for (const match of observabilityTraceIdMatches) {
                try {
                  const idString = match
                    .replace('<observabilitytraceid>', '')
                    .replace('</observabilitytraceid>', '')
                    .trim();
                  if (idString && !extractedObservabilityTraceId) {
                    extractedObservabilityTraceId = idString;
                  }
                } catch (error) {
                  // Ignore parse errors
                }
              }

              // if the received chunk contains observabilityTraceId then remove them from the chunkValue
              if (observabilityTraceIdMatches.length > 0) {
                chunkValue = chunkValue.replace(
                  /<observabilitytraceid>[\s\S]*?<\/observabilitytraceid>/g,
                  ''
                );
              }

              // Check for incomplete tags
              const openingTagIndex =
                chunkValue.lastIndexOf('<intermediatestep>');
              const closingTagIndex = chunkValue.lastIndexOf(
                '</intermediatestep>'
              );

              // If we have an opening tag without a closing tag (or closing tag comes before opening)
              if (openingTagIndex > closingTagIndex) {
                // Store the partial chunk for the next iteration
                partialIntermediateStep = chunkValue.substring(openingTagIndex);
                // Remove the partial chunk from current processing
                chunkValue = chunkValue.substring(0, openingTagIndex);
              }

              // Process complete intermediate steps
              let rawIntermediateSteps: any[] = [];
              let stepMatches =
                chunkValue.match(
                  /<intermediatestep>([\s\S]*?)<\/intermediatestep>/g
                ) || [];
              for (const stepMatch of stepMatches) {
                try {
                  const jsonString = stepMatch
                    .replace('<intermediatestep>', '')
                    .replace('</intermediatestep>', '')
                    .trim();
                  let rawIntermediateMessage = tryParseJson<any>(jsonString);
                  // handle intermediate data
                  if (rawIntermediateMessage?.type === 'system_intermediate') {
                    rawIntermediateSteps.push(rawIntermediateMessage);
                  }
                } catch (error) {
                  // console.log('Stream response parse error:', error.message);
                }
              }

              // if the received chunk contains rawIntermediateSteps then remove them from the chunkValue
              if (stepMatches.length > 0) {
                chunkValue = chunkValue.replace(
                  /<intermediatestep>[\s\S]*?<\/intermediatestep>/g,
                  ''
                );
              }

              // Check if chunk is a workflow error JSON and format accordingly
              const parsed = tryParseJson<unknown>(chunkValue.trim());
              if (isWorkflowError(parsed)) {
                text += formatWorkflowError(parsed);
              } else {
                text = text + chunkValue;
              }

              homeDispatch({ field: 'loading', value: false });
              if (isFirst) {
                isFirst = false;

                // loop through rawIntermediateSteps and add them to the processedIntermediateSteps
                let processedIntermediateSteps: any[] = [];
                rawIntermediateSteps.forEach(step => {
                  processedIntermediateSteps = processIntermediateMessage(
                    processedIntermediateSteps,
                    step,
                    sessionStorage.getItem('intermediateStepOverride') ===
                      'false'
                      ? false
                      : intermediateStepOverride
                  );
                });

                // update the message
                const updatedMessages: Message[] = [
                  ...updatedConversation.messages,
                  {
                    role: 'assistant',
                    content: text, // main response content without intermediate steps
                    intermediateSteps: [...processedIntermediateSteps], // intermediate steps
                    observabilityTraceId: extractedObservabilityTraceId || observabilityTraceId, // Trace ID from stream or headers
                  },
                ];

                updatedConversation = {
                  ...updatedConversation,
                  messages: updatedMessages,
                };

                homeDispatch({
                  field: 'selectedConversation',
                  value: updatedConversation,
                });
              } else {
                const updatedMessages: Message[] =
                  updatedConversation.messages.map((message, index) => {
                    if (index === updatedConversation.messages.length - 1) {
                      // process intermediate steps
                      // need to loop through raw rawIntermediateSteps and add them to the updatedIntermediateSteps
                      let updatedIntermediateSteps = Array.isArray(
                        message?.intermediateSteps
                      )
                        ? [...message.intermediateSteps]
                        : [];
                      rawIntermediateSteps.forEach(step => {
                        updatedIntermediateSteps = processIntermediateMessage(
                          updatedIntermediateSteps,
                          step,
                          sessionStorage.getItem('intermediateStepOverride') ===
                            'false'
                            ? false
                            : intermediateStepOverride
                        );
                      });

                      // update the message
                      const msg = {
                        ...message,
                        content: text, // main response content
                        intermediateSteps: updatedIntermediateSteps, // intermediate steps
                        observabilityTraceId: extractedObservabilityTraceId || observabilityTraceId, // Trace ID from stream or headers
                      };
                      return msg;
                    }
                    return message;
                  });
                updatedConversation = {
                  ...updatedConversation,
                  messages: updatedMessages,
                };
                homeDispatch({
                  field: 'selectedConversation',
                  value: updatedConversation,
                });
              }
            }

            saveConversation(updatedConversation);
            const updatedConversations: Conversation[] = conversations.map(
              conversation => {
                if (conversation.id === selectedConversation.id) {
                  return updatedConversation;
                }
                return conversation;
              }
            );
            if (updatedConversations.length === 0) {
              updatedConversations.push(updatedConversation);
            }
            homeDispatch({
              field: 'conversations',
              value: updatedConversations,
            });
            saveConversations(updatedConversations);
            // to show the message on UI and scroll to the bottom after 500ms delay
            setTimeout(() => {
              homeDispatch({ field: 'messageIsStreaming', value: false });
              homeDispatch({ field: 'loading', value: false });
            }, 200);
          } else {
            const { answer } = await response?.json();
            const updatedMessages: Message[] = [
              ...updatedConversation.messages,
              { role: 'assistant', content: answer, observabilityTraceId },
            ];
            updatedConversation = {
              ...updatedConversation,
              messages: updatedMessages,
            };
            homeDispatch({
              field: 'selectedConversation',
              value: updatedConversation,
            });
            saveConversation(updatedConversation);
            const updatedConversations: Conversation[] = conversations.map(
              conversation => {
                if (conversation.id === selectedConversation.id) {
                  return updatedConversation;
                }
                return conversation;
              }
            );
            if (updatedConversations.length === 0) {
              updatedConversations.push(updatedConversation);
            }
            homeDispatch({
              field: 'conversations',
              value: updatedConversations,
            });
            saveConversations(updatedConversations);
            homeDispatch({ field: 'loading', value: false });
            homeDispatch({ field: 'messageIsStreaming', value: false });
          }
        } catch (error) {
          saveConversation(updatedConversation);
          homeDispatch({ field: 'loading', value: false });
          homeDispatch({ field: 'messageIsStreaming', value: false });
          if (error === 'aborted' || (error as any)?.name === 'AbortError') {
            return;
          } else {
            return;
          }
        }
      }
    },
    [
      conversations,
      selectedConversation,
      homeDispatch,
      chatHistory,
      webSocketConnected,
      webSocketSchema,
      httpEndpoint,
      optionalGenerationParameters,
      expandIntermediateSteps,
      intermediateStepOverride,
      enableIntermediateSteps,
    ]
  );

  // Create stable onEdit callback to prevent unnecessary re-renders
  const handleEditMessage = useCallback((editedMessage: Message, deleteCount?: number) => {
    setCurrentMessage(editedMessage);
    handleSend(editedMessage, deleteCount || 0);
  }, [handleSend]);

  // Add a new effect to handle streaming state changes
  useEffect(() => {
    if (messageIsStreaming) {
      setAutoScrollEnabled(true);
      setShowScrollDownButton(false);
      homeDispatch({ field: 'autoScroll', value: true });
    }
  }, [messageIsStreaming]);

  // Add an effect to set up wheel and touchmove event listeners
  useEffect(() => {
    const container = chatContainerRef.current;
    if (!container) return;

    // Function to handle user input events (mouse wheel, touch)
    const handleUserInput = () => {
      // Mark this as user-initiated scrolling
      isUserInitiatedScroll.current = true;

      // Reset the flag after a short delay
      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current);
      }
      scrollTimeout.current = setTimeout(() => {
        isUserInitiatedScroll.current = false;
      }, 200) as NodeJS.Timeout;
    };

    // Add event listeners for user interactions
    container.addEventListener('wheel', handleUserInput, { passive: true });
    container.addEventListener('touchmove', handleUserInput, { passive: true });

    return () => {
      // Clean up
      container.removeEventListener('wheel', handleUserInput);
      container.removeEventListener('touchmove', handleUserInput);
      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current);
      }
    };
  }, [chatContainerRef.current]); // Only re-run if the container ref changes

  // Now modify your handleScroll function to use this flag
  const handleScroll = useCallback(() => {
    if (!chatContainerRef.current || !isUserInitiatedScroll.current) return;

    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    const isScrollingUp = scrollTop < lastScrollTop.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 20;

    // Only disable auto-scroll if it's a user-initiated upward scroll
    if (isScrollingUp && autoScrollEnabled && messageIsStreaming) {
      setAutoScrollEnabled(false);
      homeDispatch({ field: 'autoScroll', value: false });
      setShowScrollDownButton(true);
    }

    // Re-enable auto-scroll if user scrolls to bottom
    if (isAtBottom && !autoScrollEnabled) {
      setAutoScrollEnabled(true);
      homeDispatch({ field: 'autoScroll', value: true });
      setShowScrollDownButton(false);
    }

    lastScrollTop.current = scrollTop;
  }, [autoScrollEnabled, messageIsStreaming]);

  const handleScrollDown = () => {
    chatContainerRef.current?.scrollTo({
      top: chatContainerRef.current.scrollHeight,
      behavior: 'smooth',
    });
    // Enable auto-scroll after user clicks scroll down, assuming the user wants to auto-scroll
    setAutoScrollEnabled(true);
    homeDispatch({ field: 'autoScroll', value: true });
  };

  const scrollDown = () => {
    if (autoScrollEnabled) {
      messagesEndRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'end',
      });
    }
  };

  const throttledScrollDown = throttle(scrollDown, 250);

  useEffect(() => {
    throttledScrollDown();
    selectedConversation &&
      setCurrentMessage(() => {
        const len = selectedConversation?.messages.length ?? 0;
        return len >= 2 ? selectedConversation.messages[len - 2] : undefined;
      });
  }, [selectedConversation, throttledScrollDown]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          textareaRef.current?.focus();
        }

        // Only auto-scroll if we're streaming and auto-scroll is enabled
        if (autoScrollEnabled && messageIsStreaming) {
          requestAnimationFrame(() => {
            messagesEndRef.current?.scrollIntoView({
              behavior: 'smooth',
              block: 'end',
            });
          });
        }
      },
      {
        root: null,
        threshold: 0.5,
      }
    );

    const messagesEndElement = messagesEndRef.current;
    if (messagesEndElement) {
      observer.observe(messagesEndElement);
    }
    return () => {
      if (messagesEndElement) {
        observer.unobserve(messagesEndElement);
      }
    };
  }, [autoScrollEnabled, messageIsStreaming]);

  return (
    <div className="relative flex-1 overflow-hidden bg-white dark:bg-[#343541] transition-all duration-300 ease-in-out">
      <>
        <div
          className="max-h-full overflow-x-hidden overflow-y-auto"
          ref={chatContainerRef}
          onScroll={handleScroll}
        >
          {selectedConversation?.messages.map((message, index) => {
            if (!shouldRenderAssistantMessage(message)) {
              return null; // Hide empty assistant messages
            }

            return (
              <MemoizedChatMessage
                key={message.id ?? index}
                message={message}
                messageIndex={index}
                onEdit={handleEditMessage}
              />
            );
          })}
          {loading && <ChatLoader statusUpdateText={`Thinking...`} />}
          <div
            className="h-[162px] bg-white dark:bg-[#343541]"
            ref={messagesEndRef}
          ></div>
        </div>
        <ChatInput
          textareaRef={textareaRef}
          onSend={message => {
            setCurrentMessage(message);
            handleSend(message, 0);
          }}
          onScrollDownClick={handleScrollDown}
          onRegenerate={() => {
            if (currentMessage && currentMessage?.role === 'user') {
              handleSend(currentMessage, 0);
            } else {
              const lastUserMessage = fetchLastMessage({
                messages: selectedConversation?.messages || [],
                role: 'user',
              });
              lastUserMessage && handleSend(lastUserMessage, 1);
            }
          }}
          showScrollDownButton={showScrollDownButton}
          controller={controllerRef}
          onStopConversation={handleStopConversation}
        />
        <InteractionModal
          isOpen={modalOpen}
          interactionMessage={interactionMessage}
          onClose={() => setModalOpen(false)}
          onSubmit={handleUserInteraction}
        />
      </>
    </div>
  );
};
Chat.displayName = 'Chat';
