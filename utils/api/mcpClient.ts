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
    const response = await fetch('/api/mcp/clients', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: MCPClientResponse = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching MCP clients:', error);
    throw error;
  }
};
