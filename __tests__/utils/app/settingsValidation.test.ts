import {
  validateOptionalGenerationJson,
  validateWebSocketCustomParams,
} from '@/utils/app/settingsValidation';

describe('validateOptionalGenerationJson', () => {
  it('accepts empty or whitespace', () => {
    expect(validateOptionalGenerationJson('').isValid).toBe(true);
    expect(validateOptionalGenerationJson('   ').isValid).toBe(true);
  });

  it('rejects non-object JSON', () => {
    expect(validateOptionalGenerationJson('[]').isValid).toBe(false);
    expect(validateOptionalGenerationJson('null').isValid).toBe(false);
  });

  it('rejects reserved field "messages" and reports only that key', () => {
    const r = validateOptionalGenerationJson('{"messages": []}');
    expect(r.isValid).toBe(false);
    expect(r.error).toContain('messages');
    expect(r.error).not.toContain('stream');
  });

  it('rejects reserved field "stream" and reports only that key', () => {
    const r = validateOptionalGenerationJson('{"stream": true}');
    expect(r.isValid).toBe(false);
    expect(r.error).toContain('stream');
    expect(r.error).not.toContain('messages');
  });

  it('rejects both reserved fields and reports both in error', () => {
    const r = validateOptionalGenerationJson('{"messages": [], "stream": true}');
    expect(r.isValid).toBe(false);
    expect(r.error).toContain('messages');
    expect(r.error).toContain('stream');
  });

  it('accepts valid custom params', () => {
    expect(validateOptionalGenerationJson('{"temperature": 0.7}').isValid).toBe(true);
    expect(validateOptionalGenerationJson('{"max_tokens": 100}').isValid).toBe(true);
  });
});

describe('validateWebSocketCustomParams', () => {
  it('accepts empty or whitespace', () => {
    expect(validateWebSocketCustomParams('').isValid).toBe(true);
    expect(validateWebSocketCustomParams('   ').isValid).toBe(true);
  });

  it('rejects invalid JSON or non-object', () => {
    expect(validateWebSocketCustomParams('not json').isValid).toBe(false);
    expect(validateWebSocketCustomParams('[]').isValid).toBe(false);
  });

  it('rejects top-level keys other than query, headers, payload', () => {
    const r = validateWebSocketCustomParams('{"body": {}}');
    expect(r.isValid).toBe(false);
    expect(r.error).toContain('query, headers, payload');
  });

  describe('query reserved keys', () => {
    it('rejects only "session" and error mentions only session', () => {
      const r = validateWebSocketCustomParams(
        '{"query": {"tenant_id": "acme", "session": "should-fail"}}',
      );
      expect(r.isValid).toBe(false);
      expect(r.error).toContain('query: reserved keys (session) cannot be used');
      expect(r.error).not.toContain('conversation_id');
    });

    it('rejects only "conversation_id" and error mentions only conversation_id', () => {
      const r = validateWebSocketCustomParams(
        '{"query": {"conversation_id": "abc"}}',
      );
      expect(r.isValid).toBe(false);
      expect(r.error).toContain('query: reserved keys (conversation_id) cannot be used');
      expect(r.error).not.toContain('session');
    });

    it('rejects both and error mentions both keys', () => {
      const r = validateWebSocketCustomParams(
        '{"query": {"session": "x", "conversation_id": "y"}}',
      );
      expect(r.isValid).toBe(false);
      expect(r.error).toContain('session');
      expect(r.error).toContain('conversation_id');
    });

    it('accepts query without reserved keys', () => {
      expect(
        validateWebSocketCustomParams('{"query": {"tenant_id": "acme"}}').isValid,
      ).toBe(true);
    });
  });

  describe('payload reserved keys', () => {
    it('rejects only "type" and error mentions only type', () => {
      const r = validateWebSocketCustomParams(
        '{"payload": {"tenant_id": "acme", "type": "user"}}',
      );
      expect(r.isValid).toBe(false);
      expect(r.error).toContain('payload: reserved keys (type) cannot be used');
      expect(r.error).not.toContain('content');
    });

    it('rejects only "content" and error mentions only content', () => {
      const r = validateWebSocketCustomParams(
        '{"payload": {"content": "hello"}}',
      );
      expect(r.isValid).toBe(false);
      expect(r.error).toContain('payload: reserved keys (content) cannot be used');
    });

    it('rejects multiple reserved keys and error mentions only those used', () => {
      const r = validateWebSocketCustomParams(
        '{"payload": {"type": "user", "content": "hi", "id": "1"}}',
      );
      expect(r.isValid).toBe(false);
      expect(r.error).toContain('type');
      expect(r.error).toContain('content');
      expect(r.error).toContain('id');
    });

    it('accepts payload without reserved keys', () => {
      expect(
        validateWebSocketCustomParams('{"payload": {"tenant_id": "acme"}}').isValid,
      ).toBe(true);
    });
  });

  it('accepts valid full object', () => {
    const r = validateWebSocketCustomParams(
      '{"query": {"tenant_id": "a"}, "headers": {"X-Tenant": "a"}, "payload": {"tenant_id": "a"}}',
    );
    expect(r.isValid).toBe(true);
  });
});
