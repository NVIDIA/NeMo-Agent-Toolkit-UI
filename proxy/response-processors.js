/**
 * Response processors for backend API routes
 * Each endpoint has its own processor that handles backend responses
 * and transforms them into client-expected formats
 *
 * Architecture:
 * - Request payload builders (request-transformers.js): UI format → Backend format
 * - Response processors (this file): Backend response → UI format
 */

const constants = require('../constants');

/**
 * Helper function to process intermediate_data lines
 * Parses the intermediate data payload and writes it to the response stream
 * in the format expected by the UI
 *
 * @param {string} line - The line starting with "intermediate_data: "
 * @param {Object} res - The response object to write to
 */
function processIntermediateData(line, res) {
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
    };
    res.write(
      `<intermediatestep>${JSON.stringify(
        intermediateMessage,
      )}</intermediatestep>`,
    );
  } catch (e) {
    // Ignore parse errors
  }
}

/**
 * Processes /chat/stream responses (SSE format)
 * Backend format: Stream with "data:" lines containing chat completion chunks
 * and "intermediate_data:" lines for progress updates
 */
async function processChatStream(backendRes, res) {
  if (!backendRes.ok) {
    res.writeHead(backendRes.status, { 'Content-Type': 'application/json' });
    res.end(await backendRes.text());
    return;
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Transfer-Encoding': 'chunked',
    'Access-Control-Allow-Origin': constants.CORS_ORIGIN,
    'Access-Control-Allow-Credentials': 'true',
  });

  const reader = backendRes.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      const chunk = decoder.decode(value, { stream: true });
      buffer += chunk;

      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();
          if (data === '[DONE]' || data === 'DONE') {
            res.end();
            return;
          }
          try {
            const parsed = JSON.parse(data);
            const content =
              parsed.choices?.[0]?.message?.content ||
              parsed.choices?.[0]?.delta?.content;
            if (content) {
              res.write(content);
            }
          } catch (e) {
            // Ignore parse errors
          }
        } else if (line.startsWith('intermediate_data: ')) {
          processIntermediateData(line, res);
        }
      }
    }
  } catch (err) {
    // Stream processing error
  } finally {
    res.end();
  }
}

/**
 * Processes /chat responses
 */
async function processChat(backendRes, res) {
  if (!backendRes.ok) {
    res.writeHead(backendRes.status, { 'Content-Type': 'application/json' });
    res.end(await backendRes.text());
    return;
  }

  const data = await backendRes.text();
  try {
    const parsed = JSON.parse(data);
    const content =
      parsed?.choices?.[0]?.message?.content ||
      parsed?.message ||
      parsed?.answer ||
      parsed?.value;

    res.writeHead(200, {
      'Content-Type': 'text/plain; charset=utf-8',
      'Access-Control-Allow-Origin': constants.CORS_ORIGIN,
      'Access-Control-Allow-Credentials': 'true',
    });
    res.end(typeof content === 'string' ? content : JSON.stringify(content));
  } catch (e) {
    res.writeHead(200, {
      'Content-Type': 'text/plain; charset=utf-8',
      'Access-Control-Allow-Origin': constants.CORS_ORIGIN,
      'Access-Control-Allow-Credentials': 'true',
    });
    res.end(data);
  }
}

/**
 * Processes /generate/stream endpoint responses (SSE format)
 */
async function processGenerateStream(backendRes, res) {
  if (!backendRes.ok) {
    res.writeHead(backendRes.status, { 'Content-Type': 'application/json' });
    res.end(await backendRes.text());
    return;
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Transfer-Encoding': 'chunked',
    'Access-Control-Allow-Origin': constants.CORS_ORIGIN,
    'Access-Control-Allow-Credentials': 'true',
  });

  const reader = backendRes.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      const chunk = decoder.decode(value, { stream: true });
      buffer += chunk;

      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();
          if (data === '[DONE]' || data === 'DONE') {
            res.end();
            return;
          }
          try {
            const parsed = JSON.parse(data);
            if (parsed?.value && typeof parsed.value === 'string') {
              res.write(data);
            }
          } catch (e) {
            // Ignore parse errors
          }
        } else if (line.startsWith('intermediate_data: ')) {
          processIntermediateData(line, res);
        }
      }
    }
  } catch (err) {
    console.error('[ERROR] Stream processing error:', err.message);
  } finally {
    res.end();
  }
}

/**
 * Processes /generate endpoint responses
 */
async function processGenerate(backendRes, res) {
  if (!backendRes.ok) {
    res.writeHead(backendRes.status, { 'Content-Type': 'application/json' });
    res.end(await backendRes.text());
    return;
  }

  const data = await backendRes.text();

  res.writeHead(200, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': constants.CORS_ORIGIN,
    'Access-Control-Allow-Credentials': 'true',
  });
  res.end(data);
}

/**
 * Processes Context-Aware RAG responses
 * Extracts answer from state.chat.answer field
 */
async function processCaRag(backendRes, res) {
  if (!backendRes.ok) {
    res.writeHead(backendRes.status, { 'Content-Type': 'application/json' });
    res.end(await backendRes.text());
    return;
  }

  const data = await backendRes.text();
  try {
    const parsed = JSON.parse(data);
    const answer = parsed?.state?.chat?.answer || parsed?.answer || data;

    res.writeHead(200, {
      'Content-Type': 'text/plain; charset=utf-8',
      'Access-Control-Allow-Origin': constants.CORS_ORIGIN,
      'Access-Control-Allow-Credentials': 'true',
    });
    res.end(typeof answer === 'string' ? answer : JSON.stringify(answer));
  } catch (e) {
    res.writeHead(200, {
      'Content-Type': 'text/plain; charset=utf-8',
      'Access-Control-Allow-Origin': constants.CORS_ORIGIN,
      'Access-Control-Allow-Credentials': 'true',
    });
    res.end(data);
  }
}

module.exports = {
  processChatStream,
  processChat,
  processGenerateStream,
  processGenerate,
  processCaRag,
};
