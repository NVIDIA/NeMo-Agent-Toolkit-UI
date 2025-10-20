import { HTTP_PROXY_PATH, MCP_CLIENT_TOOL_LIST } from '@/constants';

export interface MCPTool {
  name: string;
  description: string;
  server: string;
  available: boolean;
}

export interface MCPClient {
  function_group: string;
  server: string;
  transport: string;
  session_healthy: boolean;
  protected?: boolean;
  tools: MCPTool[];
  total_tools: number;
  available_tools: number;
}

export interface MCPClientResponse {
  mcp_clients: MCPClient[];
}

export const fetchMCPClients = async (): Promise<MCPClientResponse> => {
  try {
    // Use server-side API route instead of direct client-side call
    const response = await fetch(`${HTTP_PROXY_PATH}${MCP_CLIENT_TOOL_LIST}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const text = await response.text();
    let body: any = undefined;
    try {
      body = text ? JSON.parse(text) : undefined;
    } catch {
      // ignore JSON parse error; fall back to text
    }

    if (!response.ok) {
      const serverMessage = body?.error || body?.details || text || `HTTP ${response.status}`;
      throw new Error(serverMessage);
    }

    return body as MCPClientResponse;
  } catch (error) {
    console.error('Error fetching MCP clients:', error);
    throw error;
  }
};
