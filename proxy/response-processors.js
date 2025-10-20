/**
 * Response processing functions for backend endpoints
 * Transforms backend SSE/JSON responses into client-expected formats
 */

const constants = require('../constants');

/**
 * Processes streaming chat responses (SSE format)
 * Extracts content from choices[].delta.content and handles intermediate steps
 */
async function processChatStream(backendRes, res) {
  if (!backendRes.ok) {
    res.writeHead(backendRes.status, { 'Content-Type': 'application/json' });
    res.end(await backendRes.text());
    return;
  }

  res.writeHead(200, {
    'Content-Type': 'text/plain; charset=utf-8',
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
      if (done) break;

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
          try {
            const data = line.split('intermediate_data: ')[1];
            const payload = JSON.parse(data);
            const intermediateMessage = {
              id: payload?.id || '',
              status: payload?.status || 'in_progress',
              error: payload?.error || '',
              type: 'system_intermediate',
              parent_id: payload?.parent_id || 'default',
              intermediate_parent_id:
                payload?.intermediate_parent_id || 'default',
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
      }
    }
  } catch (err) {
    console.error('[ERROR] Stream processing error:', err.message);
  } finally {
    res.end();
  }
}

/**
 * Processes non-streaming chat responses
 * Extracts content from choices[].message.content or similar fields
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
 * Processes streaming generate responses (SSE format)
 * Extracts value/output/answer fields and handles intermediate steps + final answer
 */
async function processGenerateStream(backendRes, res) {
  if (!backendRes.ok) {
    res.writeHead(backendRes.status, { 'Content-Type': 'application/json' });
    res.end(await backendRes.text());
    return;
  }

  res.writeHead(200, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Transfer-Encoding': 'chunked',
    'Access-Control-Allow-Origin': constants.CORS_ORIGIN,
    'Access-Control-Allow-Credentials': 'true',
  });

  const reader = backendRes.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let finalAnswerSent = false;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

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
            const content = parsed.value || parsed.output || parsed.answer;
            if (content && typeof content === 'string') {
              res.write(content);
            }
          } catch (e) {
            // Ignore parse errors
          }
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
              intermediate_parent_id:
                payload?.intermediate_parent_id || 'default',
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
        } else if (line.startsWith('final_answer: ') && !finalAnswerSent) {
          try {
            const data = line.split('final_answer: ')[1];
            const parsed = JSON.parse(data);
            const answer = parsed?.answer || parsed?.value || data;
            if (answer && typeof answer === 'string') {
              res.write(answer);
              finalAnswerSent = true;
            }
          } catch (e) {
            // Ignore parse errors
          }
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
 * Processes non-streaming generate responses
 * Extracts value/output/answer from JSON response
 */
async function processGenerate(backendRes, res) {
  if (!backendRes.ok) {
    res.writeHead(backendRes.status, { 'Content-Type': 'application/json' });
    res.end(await backendRes.text());
    return;
  }

  const data = await backendRes.text();
  try {
    const parsed = JSON.parse(data);
    const value =
      parsed?.value ||
      parsed?.output ||
      parsed?.answer ||
      (Array.isArray(parsed?.choices)
        ? parsed.choices[0]?.message?.content
        : null);

    res.writeHead(200, {
      'Content-Type': 'text/plain; charset=utf-8',
      'Access-Control-Allow-Origin': constants.CORS_ORIGIN,
      'Access-Control-Allow-Credentials': 'true',
    });
    res.end(typeof value === 'string' ? value : JSON.stringify(value));
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
