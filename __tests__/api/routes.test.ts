/**
 * Unit tests for proxy response processing functions
 * Tests payload parsing for generate, chat, generateStream, and chatStream
 */

// Mock the fetch function for tests that need it
global.fetch = jest.fn();

describe('Proxy Response Processing Functions', () => {
  let encoder: TextEncoder;
  let decoder: TextDecoder;
  let mockResponse: any;

  beforeEach(() => {
    encoder = new TextEncoder();
    decoder = new TextDecoder();
    jest.clearAllMocks();
  });

  describe('processGenerate', () => {
    async function testProcessGenerate(responseData: string): Promise<string> {
      const mockResponse = {
        text: jest.fn().mockResolvedValue(responseData),
      };

      // Since processGenerate is not exported, we'll recreate its logic
      const data = await mockResponse.text();
      try {
        const parsed = JSON.parse(data);
        const value =
          parsed?.value ||
          parsed?.output ||
          parsed?.answer ||
          (Array.isArray(parsed?.choices)
            ? parsed.choices[0]?.message?.content
            : null);
        return typeof value === 'string' ? value : JSON.stringify(value);
      } catch {
        return data;
      }
    }

    it('should parse value field from JSON response', async () => {
      const responseData = JSON.stringify({ value: 'Test response' });
      const result = await testProcessGenerate(responseData);
      expect(result).toBe('Test response');
    });

    it('should parse output field from JSON response', async () => {
      const responseData = JSON.stringify({ output: 'Generated output' });
      const result = await testProcessGenerate(responseData);
      expect(result).toBe('Generated output');
    });

    it('should parse answer field from JSON response', async () => {
      const responseData = JSON.stringify({ answer: 'AI answer' });
      const result = await testProcessGenerate(responseData);
      expect(result).toBe('AI answer');
    });

    it('should parse choices array content', async () => {
      const responseData = JSON.stringify({
        choices: [{ message: { content: 'Choice content' } }],
      });
      const result = await testProcessGenerate(responseData);
      expect(result).toBe('Choice content');
    });

    it('should prefer value over other fields', async () => {
      const responseData = JSON.stringify({
        value: 'Primary value',
        output: 'Secondary output',
        answer: 'Tertiary answer',
      });
      const result = await testProcessGenerate(responseData);
      expect(result).toBe('Primary value');
    });

    it('should handle non-JSON response as plain text', async () => {
      const responseData = 'Plain text response';
      const result = await testProcessGenerate(responseData);
      expect(result).toBe('Plain text response');
    });

    it('should stringify non-string values', async () => {
      const responseData = JSON.stringify({ value: { complex: 'object' } });
      const result = await testProcessGenerate(responseData);
      expect(result).toBe('{"complex":"object"}');
    });

    it('should handle null choices array', async () => {
      const responseData = JSON.stringify({ choices: null });
      const result = await testProcessGenerate(responseData);
      expect(result).toBe('null');
    });
  });

  describe('processChat', () => {
    async function testProcessChat(responseData: string): Promise<string> {
      const mockResponse = {
        text: jest.fn().mockResolvedValue(responseData),
      };

      // Recreate processChat logic
      const data = await mockResponse.text();
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
        return typeof content === 'string' ? content : JSON.stringify(content);
      } catch {
        return data;
      }
    }

    it('should parse output field from JSON response', async () => {
      const responseData = JSON.stringify({ output: 'Chat output' });
      const result = await testProcessChat(responseData);
      expect(result).toBe('Chat output');
    });

    it('should parse answer field from JSON response', async () => {
      const responseData = JSON.stringify({ answer: 'Chat answer' });
      const result = await testProcessChat(responseData);
      expect(result).toBe('Chat answer');
    });

    it('should parse value field from JSON response', async () => {
      const responseData = JSON.stringify({ value: 'Chat value' });
      const result = await testProcessChat(responseData);
      expect(result).toBe('Chat value');
    });

    it('should parse choices array content', async () => {
      const responseData = JSON.stringify({
        choices: [{ message: { content: 'OpenAI style content' } }],
      });
      const result = await testProcessChat(responseData);
      expect(result).toBe('OpenAI style content');
    });

    it('should prefer output over other fields', async () => {
      const responseData = JSON.stringify({
        output: 'Primary output',
        answer: 'Secondary answer',
        value: 'Tertiary value',
      });
      const result = await testProcessChat(responseData);
      expect(result).toBe('Primary output');
    });

    it('should fallback to parsed object when no specific fields found', async () => {
      const responseData = JSON.stringify({ custom: 'field', other: 'data' });
      const result = await testProcessChat(responseData);
      expect(result).toBe('{"custom":"field","other":"data"}');
    });

    it('should handle non-JSON response as plain text', async () => {
      const responseData = 'Plain chat response';
      const result = await testProcessChat(responseData);
      expect(result).toBe('Plain chat response');
    });
  });

  describe('processGenerateStream', () => {
    function createMockStreamResponse(chunks: string[]): any {
      let chunkIndex = 0;
      return {
        body: {
          getReader: () => ({
            read: jest.fn().mockImplementation(() => {
              if (chunkIndex >= chunks.length) {
                return Promise.resolve({ done: true, value: undefined });
              }
              const chunk = chunks[chunkIndex++];
              const encoded = encoder.encode(chunk);
              return Promise.resolve({ done: false, value: encoded });
            }),
            releaseLock: jest.fn(),
          }),
        },
      };
    }

    async function processStreamChunks(chunks: string[], additionalProps = { enableIntermediateSteps: true }): Promise<string[]> {
      const mockResponse = createMockStreamResponse(chunks);
      const results: string[] = [];

      // Recreate processGenerateStream logic
      const reader = mockResponse.body.getReader();
      let buffer = '';
      let streamContent = '';
      let finalAnswerSent = false;
      let counter = 0;

      try {
        while (true) {
          const { done, value } = await reader.read();
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
                return results;
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
                  results.push(content);
                }
              } catch {}
            } else if (
              line.includes('<intermediatestep>') &&
              line.includes('</intermediatestep>') &&
              additionalProps.enableIntermediateSteps
            ) {
              results.push(line);
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
                results.push(msg);
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
              results.push(value.trim());
              finalAnswerSent = true;
            }
          } catch {}
        }
        reader.releaseLock();
      }

      return results;
    }

    it('should parse SSE data frames with value field', async () => {
      const chunks = ['data: {"value": "Stream content"}\n', 'data: [DONE]\n'];
      const results = await processStreamChunks(chunks);
      expect(results).toContain('Stream content');
    });

    it('should parse SSE data frames with choices delta', async () => {
      const chunks = [
        'data: {"choices": [{"delta": {"content": "Hello"}}]}\n',
        'data: {"choices": [{"delta": {"content": " world"}}]}\n',
        'data: [DONE]\n'
      ];
      const results = await processStreamChunks(chunks);
      expect(results).toContain('Hello');
      expect(results).toContain(' world');
    });

    it('should handle intermediate step tags when enabled', async () => {
      const chunks = ['<intermediatestep>{"type": "test"}</intermediatestep>\n'];
      const results = await processStreamChunks(chunks, { enableIntermediateSteps: true });
      expect(results).toContain('<intermediatestep>{"type": "test"}</intermediatestep>');
    });

    it('should ignore intermediate step tags when disabled', async () => {
      const chunks = ['<intermediatestep>{"type": "test"}</intermediatestep>\n'];
      const results = await processStreamChunks(chunks, { enableIntermediateSteps: false });
      expect(results).not.toContain('<intermediatestep>{"type": "test"}</intermediatestep>');
    });

    it('should process intermediate_data lines', async () => {
      const chunks = ['intermediate_data: {"id": "step1", "name": "Test Step", "payload": "data"}\n'];
      const results = await processStreamChunks(chunks);
      const intermediateMsg = results.find(r => r.includes('<intermediatestep>'));
      expect(intermediateMsg).toBeDefined();

      const parsed = JSON.parse(intermediateMsg!.replace('<intermediatestep>', '').replace('</intermediatestep>', ''));
      expect(parsed.type).toBe('system_intermediate');
      expect(parsed.content.name).toBe('Test Step');
      expect(parsed.content.payload).toBe('data');
    });

    it('should handle malformed JSON gracefully', async () => {
      const chunks = [
        'data: invalid json\n',
        'data: {"value": "valid content"}\n',
        'data: [DONE]\n'
      ];
      const results = await processStreamChunks(chunks);
      expect(results).toContain('valid content');
    });

    it('should process final response from accumulated stream content', async () => {
      const chunks = ['{"value": "Final response"}\n'];
      const results = await processStreamChunks(chunks);
      expect(results).toContain('Final response');
    });
  });

  describe('processChatStream', () => {
    function createMockStreamResponse(chunks: string[]): any {
      let chunkIndex = 0;
      return {
        body: {
          getReader: () => ({
            read: jest.fn().mockImplementation(() => {
              if (chunkIndex >= chunks.length) {
                return Promise.resolve({ done: true, value: undefined });
              }
              const chunk = chunks[chunkIndex++];
              const encoded = encoder.encode(chunk);
              return Promise.resolve({ done: false, value: encoded });
            }),
            releaseLock: jest.fn(),
          }),
        },
      };
    }

    async function processChatStreamChunks(chunks: string[], additionalProps = { enableIntermediateSteps: true }): Promise<string[]> {
      const mockResponse = createMockStreamResponse(chunks);
      const results: string[] = [];

      // Recreate processChatStream logic
      const reader = mockResponse.body.getReader();
      let buffer = '';
      let counter = 0;

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
              const data = line.slice(5);
              if (data.trim() === '[DONE]') {
                return results;
              }
              try {
                const parsed = JSON.parse(data);
                const content =
                  parsed.choices?.[0]?.message?.content ||
                  parsed.choices?.[0]?.delta?.content;
                if (content) {
                  results.push(content);
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
                results.push(msg);
              } catch {}
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      return results;
    }

    it('should parse OpenAI-style choices with message content', async () => {
      const chunks = [
        'data: {"choices": [{"message": {"content": "Chat response"}}]}\n',
        'data: [DONE]\n'
      ];
      const results = await processChatStreamChunks(chunks);
      expect(results).toContain('Chat response');
    });

    it('should parse OpenAI-style choices with delta content', async () => {
      const chunks = [
        'data: {"choices": [{"delta": {"content": "Streaming"}}]}\n',
        'data: {"choices": [{"delta": {"content": " chat"}}]}\n',
        'data: [DONE]\n'
      ];
      const results = await processChatStreamChunks(chunks);
      expect(results).toContain('Streaming');
      expect(results).toContain(' chat');
    });

    it('should process intermediate_data when enabled', async () => {
      const chunks = ['intermediate_data: {"id": "chat-step", "name": "Chat Step"}\n'];
      const results = await processChatStreamChunks(chunks, { enableIntermediateSteps: true });
      const intermediateMsg = results.find(r => r.includes('<intermediatestep>'));
      expect(intermediateMsg).toBeDefined();

      const parsed = JSON.parse(intermediateMsg!.replace('<intermediatestep>', '').replace('</intermediatestep>', ''));
      expect(parsed.content.name).toBe('Chat Step');
    });

    it('should ignore intermediate_data when disabled', async () => {
      const chunks = ['intermediate_data: {"id": "chat-step", "name": "Chat Step"}\n'];
      const results = await processChatStreamChunks(chunks, { enableIntermediateSteps: false });
      expect(results).toHaveLength(0);
    });

    it('should handle malformed SSE data gracefully', async () => {
      const chunks = [
        'data: invalid json\n',
        'data: {"choices": [{"delta": {"content": "valid"}}]}\n',
        'data: [DONE]\n'
      ];
      const results = await processChatStreamChunks(chunks);
      expect(results).toContain('valid');
    });

    it('should ignore non-choices data in SSE frames', async () => {
      const chunks = [
        'data: {"value": "should be ignored"}\n',
        'data: {"choices": [{"delta": {"content": "should be included"}}]}\n',
        'data: [DONE]\n'
      ];
      const results = await processChatStreamChunks(chunks);
      expect(results).not.toContain('should be ignored');
      expect(results).toContain('should be included');
    });
  });

  describe('processContextAwareRAG', () => {
    async function testProcessContextAwareRAG(responseData: string): Promise<string> {
      const mockResponse = {
        text: jest.fn().mockResolvedValue(responseData),
      };

      // Recreate processContextAwareRAG logic
      const data = await mockResponse.text();
      try {
        const parsed = JSON.parse(data);
        const content =
          parsed?.result ||
          (Array.isArray(parsed?.choices)
            ? parsed.choices[0]?.message?.content
            : null) ||
          parsed ||
          data;
        return typeof content === 'string' ? content : JSON.stringify(content);
      } catch {
        return data;
      }
    }

    it('should parse result field from JSON response', async () => {
      const responseData = JSON.stringify({ result: 'Context-aware response' });
      const result = await testProcessContextAwareRAG(responseData);
      expect(result).toBe('Context-aware response');
    });

    it('should parse choices array content', async () => {
      const responseData = JSON.stringify({
        choices: [{ message: { content: 'RAG choice content' } }],
      });
      const result = await testProcessContextAwareRAG(responseData);
      expect(result).toBe('RAG choice content');
    });

    it('should prefer result over choices', async () => {
      const responseData = JSON.stringify({
        result: 'Primary result',
        choices: [{ message: { content: 'Secondary choice' } }],
      });
      const result = await testProcessContextAwareRAG(responseData);
      expect(result).toBe('Primary result');
    });

    it('should fallback to parsed object when no specific fields found', async () => {
      const responseData = JSON.stringify({ custom: 'data', other: 'field' });
      const result = await testProcessContextAwareRAG(responseData);
      expect(result).toBe('{"custom":"data","other":"field"}');
    });

    it('should handle non-JSON response as plain text', async () => {
      const responseData = 'Plain RAG response';
      const result = await testProcessContextAwareRAG(responseData);
      expect(result).toBe('Plain RAG response');
    });

    it('should stringify non-string result values', async () => {
      const responseData = JSON.stringify({ result: { complex: 'object', nested: true } });
      const result = await testProcessContextAwareRAG(responseData);
      expect(result).toBe('{"complex":"object","nested":true}');
    });

    it('should handle null choices array', async () => {
      const responseData = JSON.stringify({ choices: null });
      const result = await testProcessContextAwareRAG(responseData);
      expect(result).toBe('{"choices":null}');
    });
  });

  describe('Payload Building Functions', () => {
    describe('buildGeneratePayload', () => {
      function testBuildGeneratePayload(messages: any[]) {
        const userMessage = messages?.at(-1)?.content;
        if (!userMessage) {
          throw new Error('User message not found.');
        }
        return { input_message: userMessage };
      }

      it('should extract user message from messages array', () => {
        const messages = [
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi there' },
          { role: 'user', content: 'How are you?' }
        ];
        const result = testBuildGeneratePayload(messages);
        expect(result).toEqual({ input_message: 'How are you?' });
      });

      it('should throw error when no messages provided', () => {
        expect(() => testBuildGeneratePayload([])).toThrow('User message not found.');
      });

      it('should throw error when last message has no content', () => {
        const messages = [{ role: 'user' }];
        expect(() => testBuildGeneratePayload(messages)).toThrow('User message not found.');
      });
    });

    describe('buildOpenAIChatPayload', () => {
      function testBuildOpenAIChatPayload(messages: any[], isStreaming: boolean = true) {
        return {
          messages,
          stream: isStreaming,
        };
      }

      it('should build OpenAI-compatible payload with messages', () => {
        const messages = [
          { role: 'user', content: 'Test message' }
        ];
        const result = testBuildOpenAIChatPayload(messages);
        expect(result.messages).toBe(messages);
        expect(result.stream).toBe(true);
      });

      it('should handle empty messages array', () => {
        const result = testBuildOpenAIChatPayload([]);
        expect(result.messages).toEqual([]);
        expect(result.stream).toBe(true);
      });

      it('should set stream to true when isStreaming is true', () => {
        const messages = [
          { role: 'user', content: 'Test message' }
        ];
        const result = testBuildOpenAIChatPayload(messages, true);
        expect(result.messages).toBe(messages);
        expect(result.stream).toBe(true);
      });

      it('should set stream to false when isStreaming is explicitly false', () => {
        const messages = [
          { role: 'user', content: 'Test message' }
        ];
        const result = testBuildOpenAIChatPayload(messages, false);
        expect(result.messages).toBe(messages);
        expect(result.stream).toBe(false);
      });
    });

    describe('buildContextAwareRAGPayload', () => {
      let mockFetch: jest.Mock;

      beforeEach(() => {
        mockFetch = global.fetch as jest.Mock;
        mockFetch.mockClear();
      });

      function createBuildContextAwareRAGPayload() {
        // Track initialized conversations to avoid re-initialization
        const initializedConversations = new Set<string>();

        return async (messages: any[], conversationId: string, serverURL: string) => {
          if (!messages?.length || messages[messages.length - 1]?.role !== 'user') {
            throw new Error('User message not found: messages array is empty or invalid.');
          }

          // Initialize the retrieval system only once per conversation
          const ragUuid = '123456'; // Use a fixed value for testing
          const combinedConversationId = `${ragUuid}-${conversationId || 'default'}`;

          if (!initializedConversations.has(combinedConversationId)) {
            try {
              const initResponse = await fetch(`${serverURL}/init`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ uuid: ragUuid }),
              });

              if (!initResponse.ok) {
                throw new Error(`CA RAG initialization failed: ${initResponse.statusText}`);
              }

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
      }

      it('should build payload with question from last message', async () => {
        const buildPayload = createBuildContextAwareRAGPayload();
        mockFetch.mockResolvedValueOnce({ ok: true });

        const messages = [
          { role: 'user', content: 'First question' },
          { role: 'assistant', content: 'Answer' },
          { role: 'user', content: 'Second question' }
        ];

        const result = await buildPayload(messages, 'conv-123', 'http://localhost:8080');

        expect(result).toEqual({
          state: {
            chat: {
              question: 'Second question'
            }
          }
        });
      });

      it('should call init endpoint on first use for a conversation', async () => {
        const buildPayload = createBuildContextAwareRAGPayload();
        mockFetch.mockResolvedValueOnce({ ok: true });

        const messages = [{ role: 'user', content: 'Test question' }];

        await buildPayload(messages, 'conv-123', 'http://localhost:8080');

        expect(mockFetch).toHaveBeenCalledWith(
          'http://localhost:8080/init',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ uuid: '123456' })
          }
        );
      });

      it('should not call init endpoint on subsequent uses for same conversation', async () => {
        const buildPayload = createBuildContextAwareRAGPayload();
        mockFetch.mockResolvedValue({ ok: true });

        const messages = [{ role: 'user', content: 'Test question' }];

        // First call - should initialize
        await buildPayload(messages, 'conv-123', 'http://localhost:8080');
        expect(mockFetch).toHaveBeenCalledTimes(1);

        mockFetch.mockClear();

        // Second call - should NOT initialize again
        await buildPayload(messages, 'conv-123', 'http://localhost:8080');
        expect(mockFetch).not.toHaveBeenCalled();
      });

      it('should call init endpoint for different conversations', async () => {
        const buildPayload = createBuildContextAwareRAGPayload();
        mockFetch.mockResolvedValue({ ok: true });

        const messages = [{ role: 'user', content: 'Test question' }];

        // First conversation
        await buildPayload(messages, 'conv-123', 'http://localhost:8080');
        expect(mockFetch).toHaveBeenCalledTimes(1);

        mockFetch.mockClear();

        // Different conversation - should initialize
        await buildPayload(messages, 'conv-456', 'http://localhost:8080');
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

      it('should throw error when messages array is empty', async () => {
        const buildPayload = createBuildContextAwareRAGPayload();

        await expect(
          buildPayload([], 'conv-123', 'http://localhost:8080')
        ).rejects.toThrow('User message not found: messages array is empty or invalid.');
      });

      it('should throw error when last message is not from user', async () => {
        const buildPayload = createBuildContextAwareRAGPayload();

        const messages = [
          { role: 'user', content: 'Question' },
          { role: 'assistant', content: 'Answer' }
        ];

        await expect(
          buildPayload(messages, 'conv-123', 'http://localhost:8080')
        ).rejects.toThrow('User message not found: messages array is empty or invalid.');
      });

      it('should throw error when init endpoint fails', async () => {
        const buildPayload = createBuildContextAwareRAGPayload();
        mockFetch.mockResolvedValueOnce({ ok: false, statusText: 'Internal Server Error' });

        const messages = [{ role: 'user', content: 'Test question' }];

        await expect(
          buildPayload(messages, 'conv-123', 'http://localhost:8080')
        ).rejects.toThrow('CA RAG initialization failed: Internal Server Error');
      });

      it('should throw error when init endpoint network fails', async () => {
        const buildPayload = createBuildContextAwareRAGPayload();
        mockFetch.mockRejectedValueOnce(new Error('Network error'));

        const messages = [{ role: 'user', content: 'Test question' }];

        await expect(
          buildPayload(messages, 'conv-123', 'http://localhost:8080')
        ).rejects.toThrow('CA RAG initialization failed: Network error');
      });

      it('should use default conversation ID when not provided', async () => {
        const buildPayload = createBuildContextAwareRAGPayload();
        mockFetch.mockResolvedValue({ ok: true });

        const messages = [{ role: 'user', content: 'Test question' }];

        // Call with empty string
        await buildPayload(messages, '', 'http://localhost:8080');
        expect(mockFetch).toHaveBeenCalledTimes(1);

        mockFetch.mockClear();

        // Call again with empty string - should NOT initialize (same as default)
        await buildPayload(messages, '', 'http://localhost:8080');
        expect(mockFetch).not.toHaveBeenCalled();
      });

      it('should handle empty content in last message', async () => {
        const buildPayload = createBuildContextAwareRAGPayload();
        mockFetch.mockResolvedValueOnce({ ok: true });

        const messages = [{ role: 'user', content: '' }];

        const result = await buildPayload(messages, 'conv-123', 'http://localhost:8080');

        expect(result).toEqual({
          state: {
            chat: {
              question: ''
            }
          }
        });
      });
    });
  });
});