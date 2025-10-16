import { ChatApiRequest } from '@/types/chat';
import { HTTP_ENDPOINTS, DEFAULT_HTTP_ENDPOINT } from '@/constants/endpoints';
import { validateRequestURL } from '@/utils/security/url-validation';
import { buildHTTPBaseURL } from '@/utils/backend-url';

export const config = {
  runtime: 'edge',
  api: {
    bodyParser: {
      sizeLimit: '5mb',
    },
  },
};

const generateEndpoint = HTTP_ENDPOINTS.GENERATE;
const chatStreamEndpoint = HTTP_ENDPOINTS.CHAT_STREAM;
const generateStreamEndpoint = HTTP_ENDPOINTS.GENERATE_STREAM;
const chatCaRagEndpoint = HTTP_ENDPOINTS.CHAT_CA_RAG;

function buildGeneratePayload(messages: any[]) {
  const userMessage = messages?.at(-1)?.content;
  if (!userMessage) {
    throw new Error('User message not found.');
  }
  return { input_message: userMessage };
}

function buildOpenAIChatPayload(messages: any[], isStreaming: boolean = true) {
  return {
    messages,
    stream: isStreaming,
  };
}

// Context Aware RAG payload builder with initialization tracking
const buildContextAwareRAGPayload = (() => {
  // Track initialized conversations to avoid re-initialization
  const initializedConversations = new Set<string>();

  return async (messages: any[], conversationId: string, serverURL: string) => {
    if (!messages?.length || messages[messages.length - 1]?.role !== 'user') {
      throw new Error('User message not found: messages array is empty or invalid.');
    }

    // Initialize the retrieval system only once per conversation
    // Combine RAG_UUID and conversation.id to create unique identifier
    const ragUuid = process.env.RAG_UUID || '123456';
    const combinedConversationId = `${ragUuid}-${conversationId || 'default'}`;

    if (!initializedConversations.has(combinedConversationId)) {
      try {
        // Use URL constructor to properly handle trailing slashes and normalization
        const initURL = new URL('/init', serverURL).toString();
        const initResponse = await fetch(initURL, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ uuid: ragUuid }),
        });

        if (!initResponse.ok) {
          throw new Error(`CA RAG initialization failed: ${initResponse.statusText}`);
        }

        // Mark this conversation as initialized
        initializedConversations.add(combinedConversationId);
      } catch (initError) {
        throw new Error(`CA RAG initialization failed: ${initError instanceof Error ? initError.message : 'Unknown error'}`);
      }
    }

    return {
      state: {
        chat: {
          question: messages[messages.length - 1]?.content ?? ''
        }
      }
    };
  };
})();

async function processGenerate(response: Response): Promise<Response> {
  const data = await response.text();
  try {
    const parsed = JSON.parse(data);
    const value =
      parsed?.value ||
      parsed?.output ||
      parsed?.answer ||
      (Array.isArray(parsed?.choices)
        ? parsed.choices[0]?.message?.content
        : null);
    return new Response(typeof value === 'string' ? value : JSON.stringify(value));
  } catch {
    return new Response(data);
  }
}

async function processChat(response: Response): Promise<Response> {
  const data = await response.text();
  try {
    const parsed = JSON.parse(data);
    const content =
      parsed?.output ||
      parsed?.answer ||
      parsed?.value ||
      (Array.isArray(parsed?.choices)
        ? parsed.choices[0]?.message?.content
        : null) ||
      parsed ||
      data;
    return new Response(typeof content === 'string' ? content : JSON.stringify(content));
  } catch {
    return new Response(data);
  }
}

async function processContextAwareRAG(response: Response): Promise<Response> {
  const data = await response.text();
  try {
    const parsed = JSON.parse(data);
    const content =
      parsed?.result ||
      (Array.isArray(parsed?.choices)
        ? parsed.choices[0]?.message?.content
        : null) ||
      parsed ||
      data;
    return new Response(typeof content === 'string' ? content : JSON.stringify(content));
  } catch {
    return new Response(data);
  }
}

async function processGenerateStream(response: Response, encoder: TextEncoder, decoder: TextDecoder, additionalProps: any): Promise<ReadableStream<Uint8Array>> {
  const reader = response?.body?.getReader();
  let buffer = '';
  let streamContent = '';
  let finalAnswerSent = false;
  let counter = 0;

  return new ReadableStream({
    async start(controller) {
      try {
        while (true) {
          const { done, value } = await reader!.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;
          streamContent += chunk;

          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(5);
              if (data.trim() === '[DONE]') {
                controller.close();
                return;
              }
              try {
                const parsed = JSON.parse(data);
                const content =
                  parsed?.value ||
                  parsed?.output ||
                  parsed?.answer ||
                  parsed?.choices?.[0]?.message?.content ||
                  parsed?.choices?.[0]?.delta?.content;
                if (content && typeof content === 'string') {
                  controller.enqueue(encoder.encode(content));
                }
              } catch {}
            } else if (
              line.includes('<intermediatestep>') &&
              line.includes('</intermediatestep>') &&
              additionalProps.enableIntermediateSteps
            ) {
              controller.enqueue(encoder.encode(line));
            } else if (line.startsWith('intermediate_data: ')) {
              try {
                const data = line.split('intermediate_data: ')[1];
                const payload = JSON.parse(data);
                const intermediateMessage = {
                  id: payload?.id || '',
                  status: payload?.status || 'in_progress',
                  error: payload?.error || '',
                  type: 'system_intermediate',
                  parent_id: payload?.parent_id || 'default',
                  intermediate_parent_id: payload?.intermediate_parent_id || 'default',
                  content: {
                    name: payload?.name || 'Step',
                    payload: payload?.payload || 'No details',
                  },
                  time_stamp: payload?.time_stamp || 'default',
                  index: counter++,
                };
                const msg = `<intermediatestep>${JSON.stringify(intermediateMessage)}</intermediatestep>`;
                controller.enqueue(encoder.encode(msg));
              } catch {}
            }
          }
        }
      } finally {
        if (!finalAnswerSent) {
          try {
            const parsed = JSON.parse(streamContent);
            const value =
              parsed?.value ||
              parsed?.output ||
              parsed?.answer ||
              parsed?.choices?.[0]?.message?.content;
            if (value && typeof value === 'string') {
              controller.enqueue(encoder.encode(value.trim()));
              finalAnswerSent = true;
            }
          } catch {}
        }
        controller.close();
        reader?.releaseLock();
      }
    },
  });
}

async function processChatStream(response: Response, encoder: TextEncoder, decoder: TextDecoder, additionalProps: any): Promise<ReadableStream<Uint8Array>> {
  const reader = response?.body?.getReader();
  let buffer = '';
  let counter = 0;

  return new ReadableStream({
    async start(controller) {
      try {
        while (true) {
          const { done, value } = await reader!.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;

          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(5);
              if (data.trim() === '[DONE]') {
                controller.close();
                return;
              }
              try {
                const parsed = JSON.parse(data);
                const content =
                  parsed.choices?.[0]?.message?.content ||
                  parsed.choices?.[0]?.delta?.content;
                if (content) {
                  controller.enqueue(encoder.encode(content));
                }
              } catch {}
            } else if (
              line.startsWith('intermediate_data: ') &&
              additionalProps.enableIntermediateSteps
            ) {
              try {
                const data = line.split('intermediate_data: ')[1];
                const payload = JSON.parse(data);
                const intermediateMessage = {
                  id: payload?.id || '',
                  status: payload?.status || 'in_progress',
                  error: payload?.error || '',
                  type: 'system_intermediate',
                  parent_id: payload?.parent_id || 'default',
                  intermediate_parent_id: payload?.intermediate_parent_id || 'default',
                  content: {
                    name: payload?.name || 'Step',
                    payload: payload?.payload || 'No details',
                  },
                  time_stamp: payload?.time_stamp || 'default',
                  index: counter++,
                };
                const msg = `<intermediatestep>${JSON.stringify(intermediateMessage)}</intermediatestep>`;
                controller.enqueue(encoder.encode(msg));
              } catch {}
            }
          }
        }
      } finally {
        controller.close();
        reader?.releaseLock();
      }
    },
  });
}

const handler = async (req: Request): Promise<Response> => {
  const {
    messages = [],
    httpEndpoint = DEFAULT_HTTP_ENDPOINT,
    optionalGenerationParameters = '',
    additionalProps = { enableIntermediateSteps: true },
  } = (await req.json()) as ChatApiRequest;

  const serverURL = process.env.NAT_BACKEND_URL ||
                    (process.env.NEXT_PUBLIC_NAT_BACKEND_ADDRESS
                      ? buildHTTPBaseURL(process.env.NEXT_PUBLIC_NAT_BACKEND_ADDRESS)
                      : undefined);
  if (!serverURL) {
    return new Response('Backend URL not configured on server', { status: 500 });
  }

  // Build the final URL with base URL from environment variable
  let requestURL: string;
  let finalURL: URL;
  try {
    requestURL = `${serverURL}${httpEndpoint}`;
    finalURL = new URL(requestURL);
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid URL construction' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Validate the URL before making request
  const validationResult = validateRequestURL(finalURL.href);

  if (!validationResult.isValid) {
    return new Response(
      JSON.stringify({
        error: `URL validation failed: ${validationResult.error}`,
        attemptedURL: finalURL.href,
        serverURL: serverURL,
        httpEndpoint: httpEndpoint
      }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  }

  let payload;
  try {
    const isGenerateEndpoint = httpEndpoint.includes('generate');
    const isCaRagEndpoint = httpEndpoint === HTTP_ENDPOINTS.CHAT_CA_RAG;

    // Determine streaming status based on endpoint path
    const isStreamingEndpoint = httpEndpoint.includes('/stream');

    if (isCaRagEndpoint) {
      payload = await buildContextAwareRAGPayload(messages, req.headers.get('Conversation-Id') || '', serverURL);
    } else if (isGenerateEndpoint) {
      payload = buildGeneratePayload(messages);
    } else {
      payload = buildOpenAIChatPayload(messages, isStreamingEndpoint);
    }

    // Merge additional JSON body only for chat/chat stream endpoints
    if (!isGenerateEndpoint && optionalGenerationParameters && optionalGenerationParameters.trim() && !isCaRagEndpoint) {
      try {
        const parsedOptionalGenerationParameters = JSON.parse(optionalGenerationParameters);
        if (typeof parsedOptionalGenerationParameters === 'object' && parsedOptionalGenerationParameters !== null && !Array.isArray(parsedOptionalGenerationParameters)) {
          const reserved = new Set(['messages', 'stream', 'input_message']);
          for (const k of Object.keys(parsedOptionalGenerationParameters)) {
            if (reserved.has(k)) {
              return new Response(`optionalGenerationParameters cannot override reserved field: ${k}`, { status: 400 });
            }
          }
          payload = { ...payload, ...parsedOptionalGenerationParameters };
        }
      } catch (jsonError) {
        return new Response('Invalid additional JSON body format', { status: 400 });
      }
    }
  } catch (err: any) {
    return new Response(err.message || 'Invalid request.', { status: 400 });
  }

  // Make the request
  let response: Response;
  try {
    response = await fetch(requestURL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Conversation-Id': req.headers.get('Conversation-Id') || '',
        'X-Timezone': Intl.DateTimeFormat().resolvedOptions().timeZone || 'Etc/UTC',
        'User-Message-ID': req.headers.get('User-Message-ID') || '',
      },
      body: JSON.stringify(payload),
    });
  } catch (error: any) {
    return new Response(`Request failed: ${error.message}`, { status: 500 });
  }

  if (!response.ok) {
    const error = await response.text();
    return new Response(`Error: ${error}`, { status: 500 });
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  if (httpEndpoint === generateStreamEndpoint) {
    return new Response(await processGenerateStream(response, encoder, decoder, additionalProps));
  } else if (httpEndpoint === chatStreamEndpoint) {
    return new Response(await processChatStream(response, encoder, decoder, additionalProps));
  } else if (httpEndpoint === generateEndpoint) {
    return await processGenerate(response);
  } else if (httpEndpoint === chatCaRagEndpoint) {
    return await processContextAwareRAG(response);
  } else {
    return await processChat(response);
  }
};

export default handler;
