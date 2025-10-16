import { NextApiRequest, NextApiResponse } from 'next';
import { getMcpApiUrl } from '@/utils/app/const';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const url = getMcpApiUrl();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    console.error('Error fetching MCP clients:', error);

    if (error instanceof Error && error.name === 'AbortError') {
      return res.status(504).json({
        error: 'Request timeout',
      });
    }

    const message = error instanceof Error ? error.message : 'Unknown error';
    const isConfigError = message.startsWith('Server URL is not configured');
    res.status(isConfigError ? 400 : 500).json({
      error: isConfigError ? 'MCP is not configured' : 'Failed to fetch MCP clients',
    });
  }
}
