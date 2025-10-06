import { ChatApiRequest } from '@/types/chat';
import { HTTP_ENDPOINTS, DEFAULT_HTTP_ENDPOINT } from '@/constants/endpoints';

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

  // Validate httpEndpoint against allowed values
  const validEndpoints = Object.values(HTTP_ENDPOINTS);
  if (!validEndpoints.includes(httpEndpoint as any)) {
    return new Response(
      JSON.stringify({ error: 'Invalid httpEndpoint. Must be one of: ' + validEndpoints.join(', ') }), 
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Construct URL by appending endpoint to server URL
  const serverURL = process.env.NEXT_PUBLIC_SERVER_URL as string | undefined;
  if (!serverURL) {
    return new Response('Server URL not configured', { status: 500 });
  }
  const chatCompletionURL = `${serverURL}${httpEndpoint}`;

  let payload;
  try {
    const isGenerateEndpoint = httpEndpoint.includes('generate');
    
    // Determine streaming status based on endpoint path
    const isStreamingEndpoint = httpEndpoint.includes('/stream');
    
    payload = isGenerateEndpoint
      ? buildGeneratePayload(messages)
      : buildOpenAIChatPayload(messages, isStreamingEndpoint);
    
    // Merge additional JSON body only for chat/chat stream endpoints
    if (!isGenerateEndpoint && optionalGenerationParameters && optionalGenerationParameters.trim()) {
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

  const response = await fetch(chatCompletionURL, {
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

  if (httpEndpoint === generateStreamEndpoint) {
    return new Response(await processGenerateStream(response, encoder, decoder, additionalProps));
  } else if (httpEndpoint === chatStreamEndpoint) {
    return new Response(await processChatStream(response, encoder, decoder, additionalProps));
  } else if (httpEndpoint === generateEndpoint) {
    return await processGenerate(response);
  } else {
    return await processChat(response);
  }
};

export default handler;
