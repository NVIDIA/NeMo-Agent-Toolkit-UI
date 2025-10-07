import { ChatBody } from '@/types/chat';

export const config = {
  runtime: 'edge',
  api: {
    bodyParser: {
      sizeLimit: '5mb',
    },
  },
};

const generateEndpoint = 'generate';
const chatEndpoint = 'chat';
const chatStreamEndpoint = 'chat/stream';
const generateStreamEndpoint = 'generate/stream';
const chatCaRagEndpoint = 'chat/ca-rag';

function buildGeneratePayload(messages: any[]) {
  const userMessage = messages?.at(-1)?.content;
  if (!userMessage) {
    throw new Error('User message not found.');
  }
  return { input_message: userMessage };
}

function buildOpenAIChatPayload(messages: any[]) {
  return {
    messages,
    model: 'string',
    temperature: 0,
    max_tokens: 0,
    top_p: 0,
    use_knowledge_base: true,
    top_k: 0,
    collection_name: 'string',
    stop: true,
    additionalProp1: {},
  };
}

// Track initialized conversations to avoid re-initialization
const initializedConversations = new Set<string>();

function getBackendURL(frontendURL: string): string {
  // Map frontend endpoints to their backend equivalents
  return frontendURL.replace(/\/chat\/ca-rag$/, '/call');
}

async function initializeContextAwareRAG(conversationId: string, chatCompletionURL: string) {
  // Initialize the retrieval system only once per conversation
  // Combine RAG_UUID and conversation.id to create unique identifier
  const ragUuid = (globalThis as any).process?.env?.RAG_UUID || '123456';
  const combinedConversationId = `${ragUuid}-${conversationId || 'default'}`;

  if (!initializedConversations.has(combinedConversationId)) {
    const initUrl = getBackendURL(chatCompletionURL).replace('/call', '/init');

    try {
      const initResponse = await fetch(initUrl, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ uuid: ragUuid }),
      });

      if (!initResponse.ok) {
        console.log('aiq - CA RAG initialization failed', initResponse.status);
        throw new Error(`CA RAG initialization failed: ${initResponse.statusText}`);
      }

      const initData = await initResponse.json();
      console.log('aiq - CA RAG initialization', initData?.status);

      // Mark this conversation as initialized
      initializedConversations.add(combinedConversationId);
    } catch (initError) {
      console.log('aiq - CA RAG initialization error', initError);
      throw new Error(`CA RAG initialization failed: ${initError instanceof Error ? initError.message : 'Unknown error'}`);
    }
  } else {
    console.log('aiq - CA RAG conversation already initialized', combinedConversationId);
  }
}

function buildContextAwareRAGPayload(messages: any[]) {
  if (!messages?.length || messages[messages.length - 1]?.role !== 'user') {
    throw new Error('User message not found: messages array is empty or invalid.');
  }

  return {
    state: {
      chat: {
        question: messages[messages.length - 1]?.content ?? ''
      }
    }
  };
}

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
      parsed?.result ||
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
    chatCompletionURL = '',
    messages = [],
    additionalProps = { enableIntermediateSteps: true },
  } = (await req.json()) as ChatBody;

  let payload;
  try {
    if (chatCompletionURL.includes(generateEndpoint)) {
      payload = buildGeneratePayload(messages);
    } else if (chatCompletionURL.includes(chatCaRagEndpoint)) {
      const conversationId = req.headers.get('Conversation-Id') || '';
      await initializeContextAwareRAG(conversationId, chatCompletionURL);
      payload = buildContextAwareRAGPayload(messages);
    } else {
      payload = buildOpenAIChatPayload(messages);
    }
  } catch (err: any) {
    return new Response(err.message || 'Invalid request.', { status: 400 });
  }

  const response = await fetch(getBackendURL(chatCompletionURL), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Conversation-Id': req.headers.get('Conversation-Id') || '',
      'X-Timezone': Intl.DateTimeFormat().resolvedOptions().timeZone || 'Etc/UTC',
      'User-Message-ID': req.headers.get('User-Message-ID') || '',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.text();
    return new Response(`Error: ${error}`, { status: 500 });
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  if (chatCompletionURL.includes(generateStreamEndpoint)) {
    return new Response(await processGenerateStream(response, encoder, decoder, additionalProps));
  } else if (chatCompletionURL.includes(chatStreamEndpoint)) {
    return new Response(await processChatStream(response, encoder, decoder, additionalProps));
  } else if (chatCompletionURL.includes(generateEndpoint)) {
    return await processGenerate(response);
  } else {
    return await processChat(response);
  }
};

export default handler;
