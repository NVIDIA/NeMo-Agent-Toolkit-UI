import { NextApiRequest, NextApiResponse } from 'next';
import { getMcpApiUrl } from '@/utils/app/const';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const url = getMcpApiUrl();
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    console.error('Error fetching MCP clients:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    const isConfigError = message.includes('Server URL is not configured');
    res.status(isConfigError ? 400 : 500).json({
      error: isConfigError ? 'Server URL is not configured' : 'Failed to fetch MCP clients',
      details: message,
    });
  }
}
