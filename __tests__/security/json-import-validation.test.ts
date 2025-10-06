// Mock toast to prevent errors in tests
const mockToast = {
  error: jest.fn(),
  success: jest.fn()
};

// Standalone version of the validation function for testing
function validateImportData(rawJson: string): any | null {
  // Basic input validation
  if (!rawJson || typeof rawJson !== 'string') {
    return null;
  }

  // Limit file size to prevent DoS (5MB limit)
  if (rawJson.length > 5 * 1024 * 1024) {
    mockToast.error('Import file too large (max 5MB)');
    return null;
  }

  let parsed: any;
  try {
    // Parse JSON safely
    parsed = JSON.parse(rawJson);
  } catch (error) {
    mockToast.error('Invalid JSON format');
    return null;
  }

  // Block null or non-object data
  if (parsed === null || typeof parsed !== 'object') {
    mockToast.error('Import data must be a valid object');
    return null;
  }

  // Prevent prototype pollution by blocking dangerous properties
  const dangerousKeys = ['__proto__', 'constructor', 'prototype'];
  function sanitizeObject(obj: any): any {
    if (obj === null || typeof obj !== 'object') return obj;
    
    if (Array.isArray(obj)) {
      return obj.map(item => sanitizeObject(item));
    }

    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      // Block dangerous prototype pollution keys
      if (dangerousKeys.includes(key)) {
        console.warn(`Blocked dangerous key during import: ${key}`);
        continue;
      }
      
      // Recursively sanitize nested objects
      sanitized[key] = sanitizeObject(value);
    }
    return sanitized;
  }

  // Sanitize the parsed data
  const sanitized = sanitizeObject(parsed);

  // Validate export format structure
  if (Array.isArray(sanitized)) {
    // ExportFormatV1 - array of conversations
    if (sanitized.every(item => 
      typeof item === 'object' && 
      item !== null &&
      typeof item.id === 'number' &&
      typeof item.name === 'string' &&
      Array.isArray(item.messages)
    )) {
      return sanitized;
    }
  } else if (typeof sanitized === 'object' && sanitized !== null) {
    // Check for V2, V3, V4 formats
    if (sanitized.version === 4 && 
        Array.isArray(sanitized.history) && 
        Array.isArray(sanitized.folders) && 
        Array.isArray(sanitized.prompts)) {
      return sanitized;
    }
    
    if (sanitized.version === 3 && 
        Array.isArray(sanitized.history) && 
        Array.isArray(sanitized.folders)) {
      return sanitized;
    }
    
    // V2 format (history and folders properties)
    if ((sanitized.history === null || Array.isArray(sanitized.history)) &&
        (sanitized.folders === null || Array.isArray(sanitized.folders))) {
      return sanitized;
    }
  }

  mockToast.error('Invalid import format. Please use a valid export file.');
  return null;
}

describe('JSON Import Validation Security', () => {
  describe('Positive Tests - Valid JSON should pass', () => {
    test('accepts valid conversation export format V1 (array)', () => {
      const validJson = JSON.stringify([
        {
          id: 1,
          name: "Test Conversation",
          messages: [
            { role: "user", content: "Hello" },
            { role: "assistant", content: "Hi there!" }
          ]
        }
      ]);

      const result = validateImportData(validJson);
      expect(result).not.toBeNull();
      expect(Array.isArray(result)).toBe(true);
      expect(result[0].name).toBe("Test Conversation");
    });

    test('accepts valid conversation export format V2+ (object)', () => {
      const validJson = JSON.stringify({
        version: 4,
        history: [
          {
            id: "conv-1",
            name: "Chat",
            messages: [],
            folderId: null
          }
        ],
        folders: [],
        prompts: []
      });

      const result = validateImportData(validJson);
      expect(result).not.toBeNull();
      expect(result.version).toBe(4);
      expect(Array.isArray(result.history)).toBe(true);
    });

    test('accepts empty valid structures', () => {
      const emptyArray = JSON.stringify([]);
      const emptyObject = JSON.stringify({ history: [], folders: [] });

      expect(validateImportData(emptyArray)).not.toBeNull();
      expect(validateImportData(emptyObject)).not.toBeNull();
    });
  });

  describe('Negative Tests - Invalid/malicious JSON should be blocked', () => {
    test('blocks prototype pollution attempts', () => {
      const maliciousJson = JSON.stringify({
        "__proto__": { "isAdmin": true },
        "constructor": { "prototype": { "isEvil": true } },
        "history": [
          {
            id: "conv-1",
            name: "Test Conversation", 
            messages: []
          }
        ],
        "folders": []
      });

      const result = validateImportData(maliciousJson);
      expect(result).not.toBeNull();
      // Dangerous payloads should be sanitized - the malicious content should not be there  
      const proto = Object.getPrototypeOf(result!);
      expect(proto).not.toHaveProperty('isAdmin');
      
      // The constructor property exists naturally, but shouldn't contain our malicious payload
      expect(result!.constructor).not.toEqual({ "prototype": { "isEvil": true } });
      // Safe data should remain
      expect(result!.history).toBeDefined();
    });

    test('blocks malformed JSON', () => {
      const malformedJsons = [
        '{"invalid": json}',
        '{"incomplete": ',
        'not json at all',
        '{"trailing": "comma",}',
        ''
      ];

      malformedJsons.forEach(json => {
        expect(validateImportData(json)).toBeNull();
      });
    });

    test('blocks non-object/non-array data', () => {
      const invalidData = [
        JSON.stringify("just a string"),
        JSON.stringify(123),
        JSON.stringify(true),
        JSON.stringify(null)
      ];

      invalidData.forEach(json => {
        expect(validateImportData(json)).toBeNull();
      });
    });

    test('blocks oversized JSON (DoS protection)', () => {
      // Create a JSON string larger than 5MB
      const largeObject = {
        data: 'x'.repeat(6 * 1024 * 1024) // 6MB of data
      };
      const largeJson = JSON.stringify(largeObject);

      expect(validateImportData(largeJson)).toBeNull();
    });

    test('blocks invalid input types', () => {
      const invalidInputs = [
        null,
        undefined,
        123,
        true,
        {},
        []
      ];

      invalidInputs.forEach(input => {
        expect(validateImportData(input as any)).toBeNull();
      });
    });

    test('sanitizes nested prototype pollution attempts', () => {
      const nestedMaliciousJson = JSON.stringify({
        history: [
          {
            id: "conv-1",
            name: "Normal Conversation",
            messages: [],
            "__proto__": { "evil": true }
          }
        ],
        folders: [
          {
            name: "Normal Folder",
            "constructor": { "prototype": { "malicious": true } }
          }
        ]
      });

      const result = validateImportData(nestedMaliciousJson);
      expect(result).not.toBeNull();
      
      // Check that dangerous payloads were sanitized from nested objects
      // The malicious content should not be present
      const historyProto = Object.getPrototypeOf(result!.history[0]);
      expect(historyProto).not.toHaveProperty('evil');
      
      // The constructor property exists naturally, but shouldn't contain our malicious payload
      expect(result!.folders[0].constructor).not.toEqual({ "prototype": { "malicious": true } });
      
      // Check that safe data remains
      expect(result!.history[0].name).toBe("Normal Conversation");
      expect(result!.folders[0].name).toBe("Normal Folder");
    });
  });
});
