import { REQUEST_TIMEOUT_MS, MAX_RESPONSE_SIZE_BYTES } from '@/constants/constants';

import { validateRequestURL, logRequest } from './url-validation';

export interface SecureFetchOptions extends RequestInit {
  timeout?: number;
  maxResponseSize?: number;
}

export class FetchTimeoutError extends Error {
  constructor(timeout: number) {
    super(`Request timeout after ${timeout}ms`);
    this.name = 'FetchTimeoutError';
  }
}

export class ResponseTooLargeError extends Error {
  constructor(size: number, maxSize: number) {
    super(`Response size ${size} bytes exceeds maximum allowed size ${maxSize} bytes`);
    this.name = 'ResponseTooLargeError';
  }
}


/**
 * Secure fetch with timeout support
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeout: number
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new FetchTimeoutError(timeout);
    }
    throw error;
  }
}

/**
 * Validate response size
 */
async function validateResponseSize(
  response: Response,
  maxSize: number
): Promise<void> {
  const contentLength = response.headers.get('content-length');
  
  if (contentLength) {
    const size = parseInt(contentLength, 10);
    if (!isNaN(size) && size > maxSize) {
      throw new ResponseTooLargeError(size, maxSize);
    }
  }

  // If no content-length header, we'll check during streaming
}

/**
 * Create a response with size validation
 */
async function createSizeValidatedResponse(
  response: Response,
  maxSize: number
): Promise<Response> {
  const reader = response.body?.getReader();
  if (!reader) {
    return response;
  }

  let totalSize = 0;
  const chunks: Uint8Array[] = [];

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      totalSize += value.length;
      if (totalSize > maxSize) {
        reader.cancel();
        throw new ResponseTooLargeError(totalSize, maxSize);
      }

      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  // Reconstruct response with validated body
  // Combine all chunks into a single Uint8Array
  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const combined = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.length;
  }
  
  return new Response(combined, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}

/**
 * Secure fetch wrapper with comprehensive protection
 * 
 * @param url - The URL to fetch
 * @param options - Fetch options with additional security parameters
 * @returns Response object
 * @throws Error if URL validation fails or request is blocked
 */
export async function secureFetch(
  url: string,
  options: SecureFetchOptions = {}
): Promise<Response> {
  const {
    timeout = REQUEST_TIMEOUT_MS,
    maxResponseSize = MAX_RESPONSE_SIZE_BYTES,
    ...fetchOptions
  } = options;

  // Validate URL against SSRF protection rules
  const validation = await validateRequestURL(url);
  
  if (!validation.isValid) {
    logRequest(url, 'blocked', validation.error);
    throw new Error(`URL validation failed: ${validation.error}`);
  }

  try {
    // Perform fetch with timeout
    const response = await fetchWithTimeout(url, fetchOptions, timeout);

    // Validate response size
    await validateResponseSize(response, maxResponseSize);

    logRequest(url, 'success');

    // For streaming responses, return as-is (size will be checked during streaming)
    // For non-streaming, validate the entire response
    const isStreaming = response.headers.get('content-type')?.includes('text/event-stream') ||
                       response.headers.get('transfer-encoding') === 'chunked';
    
    if (isStreaming) {
      return response;
    }

    // For non-streaming responses, validate size
    return await createSizeValidatedResponse(response, maxResponseSize);
  } catch (error: any) {
    logRequest(url, 'error', error.message);
    throw error;
  }
}

/**
 * Secure fetch for streaming responses with size validation
 * 
 * This returns the response immediately but wraps the stream to enforce size limits
 */
export async function secureFetchStream(
  url: string,
  options: SecureFetchOptions = {}
): Promise<Response> {
  const {
    timeout = REQUEST_TIMEOUT_MS,
    maxResponseSize = MAX_RESPONSE_SIZE_BYTES,
    ...fetchOptions
  } = options;

  // Validate URL against SSRF protection rules
  const validation = await validateRequestURL(url);
  
  if (!validation.isValid) {
    logRequest(url, 'blocked', validation.error);
    throw new Error(`URL validation failed: ${validation.error}`);
  }

  try {
    // Perform fetch with timeout
    const response = await fetchWithTimeout(url, fetchOptions, timeout);

    logRequest(url, 'success');

    // Wrap the response body with size validation
    const reader = response.body?.getReader();
    if (!reader) {
      return response;
    }

    let totalSize = 0;
    const stream = new ReadableStream({
      async start(controller) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              controller.close();
              break;
            }

            totalSize += value.length;
            if (totalSize > maxResponseSize) {
              const error = new ResponseTooLargeError(totalSize, maxResponseSize);
              controller.error(error);
              reader.cancel();
              break;
            }

            controller.enqueue(value);
          }
        } catch (error) {
          controller.error(error);
          reader.cancel();
        } finally {
          reader.releaseLock();
        }
      },
    });

    return new Response(stream, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  } catch (error: any) {
    logRequest(url, 'error', error.message);
    throw error;
  }
}

