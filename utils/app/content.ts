/**
 * Load a content file from the /public/content directory
 * This function is meant to be used client-side
 * 
 * @param filename - The name of the content file (e.g., 'welcome.md', 'config.json')
 * @param parseJson - If true, parse the content as JSON
 * @returns Promise resolving to the content text or parsed JSON object
 */
export async function loadContentFile(filename: string): Promise<string>;
export async function loadContentFile<T>(filename: string, parseJson: true): Promise<T | null>;
export async function loadContentFile<T = string>(filename: string, parseJson: boolean = false): Promise<T | string | null> {
  try {
    const response = await fetch(`/content/${filename}`);
    
    if (!response.ok) {
      console.error(`Failed to load content file: ${filename}`);
      return parseJson ? null : '';
    }
    
    if (parseJson) {
      return await response.json();
    }
    
    return await response.text();
  } catch (error) {
    console.error(`Error loading content file ${filename}:`, error);
    return parseJson ? null : '';
  }
}

/**
 * Load a content file from the /public/content directory
 * This function is meant to be used server-side (API routes, getServerSideProps, etc.)
 * 
 * @param filename - The name of the content file (e.g., 'welcome.md', 'config.json')
 * @param parseJson - If true, parse the content as JSON
 * @returns The content text or parsed JSON object, or empty string/null if not found
 */
export function loadContentFileSync(filename: string): string;
export function loadContentFileSync<T>(filename: string, parseJson: true): T | null;
export function loadContentFileSync<T = string>(filename: string, parseJson: boolean = false): T | string | null {
  try {
    const fs = require('fs');
    const path = require('path');
    
    const contentPath = path.join(process.cwd(), 'public', 'content', filename);
    const content = fs.readFileSync(contentPath, 'utf8');
    
    if (parseJson) {
      return JSON.parse(content);
    }
    
    return content;
  } catch (error) {
    console.error(`Error loading content file ${filename}:`, error);
    return parseJson ? null : '';
  }
}
