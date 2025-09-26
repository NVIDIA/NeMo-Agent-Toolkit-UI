import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { path: filePath } = req.query;

  if (!filePath || typeof filePath !== 'string') {
    return res.status(400).json({ error: 'File path is required' });
  }

  try {
    // Security check: only allow HTML files
    if (!filePath.endsWith('.html')) {
      return res.status(400).json({ error: 'Only HTML files are allowed' });
    }

    // Security check: prevent directory traversal attacks
    const resolvedPath = path.resolve(filePath);
    const workspaceRoot = process.cwd();
    
    // Check if the file is within the workspace or in expected output directories
    const isInWorkspace = resolvedPath.startsWith(workspaceRoot) || 
                         resolvedPath.includes('/output_data/') ||
                         resolvedPath.includes('/plots/');
    
    if (!isInWorkspace) {
      return res.status(403).json({ error: 'Access to this file path is not allowed' });
    }

    // Check if file exists
    if (!fs.existsSync(resolvedPath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Read the HTML file
    const htmlContent = fs.readFileSync(resolvedPath, 'utf-8');

    // Set appropriate headers
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    
    return res.status(200).send(htmlContent);

  } catch (error: any) {
    console.error('Error loading HTML file:', error);
    return res.status(500).json({ 
      error: 'Failed to load HTML file',
      details: error.message 
    });
  }
} 