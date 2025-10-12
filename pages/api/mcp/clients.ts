import { NextApiRequest, NextApiResponse } from 'next';
import { MCP_API_URL } from '@/utils/app/const';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const response = await fetch(MCP_API_URL, {
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
    res.status(500).json({
      error: 'Failed to fetch MCP clients',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
