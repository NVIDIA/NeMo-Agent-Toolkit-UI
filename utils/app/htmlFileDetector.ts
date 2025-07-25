export interface HtmlFileLink {
    filePath: string;
    linkText: string;
    title?: string;
    isInlineHtml?: boolean;
    htmlContent?: string;
  }
  
  /**
   * Detect HTML file links in message content
   */
  export function detectHtmlFileLinks(content: string): HtmlFileLink[] {
    const htmlFileLinks: HtmlFileLink[] = [];
    
    // First, detect inline HTML content blocks
    const inlineHtmlRegex = /<html[^>]*>[\s\S]*?<\/html>/gi;
    let inlineMatch;
    let inlineCount = 1;
    
    while ((inlineMatch = inlineHtmlRegex.exec(content)) !== null) {
      const htmlContent = inlineMatch[0];
      
      // Extract title from HTML content if possible
      const titleMatch = htmlContent.match(/<title[^>]*>([^<]+)<\/title>/i) || 
                        htmlContent.match(/<h1[^>]*>([^<]+)<\/h1>/i);
      const title = titleMatch ? titleMatch[1].trim() : `Inline HTML Content ${inlineCount}`;
      
      htmlFileLinks.push({
        filePath: `inline-html-${inlineCount}`,
        linkText: title,
        title: title,
        isInlineHtml: true,
        htmlContent: htmlContent
      });
      
      inlineCount++;
    }
    
    // Regex patterns to match different types of HTML file references
    const patterns = [
      // HTML anchor tags: <a href="file://path/to/file.html">text</a>
      /<a\s+href=["']?(file:\/\/[^"'\s>]+\.html)["']?[^>]*>([^<]+)<\/a>/gi,
      // Markdown links: [text](file://path/to/file.html)
      /\[([^\]]+)\]\((file:\/\/[^)]+\.html)\)/g,
      // Direct file:// URLs
      /(file:\/\/[^\s"'<>`]+\.html)/g,
      // File paths ending in .html (without href attributes) - including those in backticks
      /(?<!href=["']?)`?([^\s"'<>`]+\.html)`?(?!["'])/g,
      // File paths in backticks specifically
      /`([^`]+\.html)`/g,
      // File paths wrapped in double quotes
      /"([^"]+\.html)"/g,
      // File paths wrapped in single quotes
      /'([^']+\.html)'/g,
    ];
  
    patterns.forEach((pattern, patternIndex) => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        let filePath: string;
        let linkText: string;
        
        // Handle different pattern types
        if (patternIndex === 0) {
          // HTML anchor tag: <a href="file://path">text</a>
          filePath = match[1];
          linkText = match[2];
        } else if (patternIndex === 1) {
          // Markdown link: [text](file://path)
          linkText = match[1];
          filePath = match[2];
        } else if (patternIndex === 2) {
          // Direct file:// URL
          filePath = match[1] || match[0];
          linkText = extractFilenameFromPath(filePath);
        } else if (patternIndex === 3) {
          // File path (possibly in backticks)
          filePath = match[1] || match[0];
          linkText = extractFilenameFromPath(filePath);
          
          // Ensure file:// prefix
          if (!filePath.startsWith('file://')) {
            filePath = `file://${filePath}`;
          }
        } else if (patternIndex === 4) {
          // File path in backticks specifically
          filePath = match[1];
          linkText = extractFilenameFromPath(filePath);
          
          // Ensure file:// prefix
          if (!filePath.startsWith('file://')) {
            filePath = `file://${filePath}`;
          }
        } else if (patternIndex === 5) {
          // File path wrapped in double quotes
          filePath = match[1];
          linkText = extractFilenameFromPath(filePath);
          
          // Ensure file:// prefix
          if (!filePath.startsWith('file://')) {
            filePath = `file://${filePath}`;
          }
        } else if (patternIndex === 6) {
          // File path wrapped in single quotes
          filePath = match[1];
          linkText = extractFilenameFromPath(filePath);
          
          // Ensure file:// prefix
          if (!filePath.startsWith('file://')) {
            filePath = `file://${filePath}`;
          }
        } else {
          // Default case for any additional patterns
          filePath = match[1] || match[0];
          linkText = extractFilenameFromPath(filePath);
          
          // Skip if it looks like a URL that's not file://
          if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
            continue;
          }
          
          // Ensure file:// prefix
          if (!filePath.startsWith('file://')) {
            filePath = `file://${filePath}`;
          }
        }
        
        // Clean up any malformed URLs
        filePath = cleanFilePath(filePath);
        
        htmlFileLinks.push({
          filePath,
          linkText: linkText.trim(),
          title: extractTitleFromPath(filePath),
          isInlineHtml: false
        });
      }
    });
  
    // Remove duplicates
    const uniqueLinks = htmlFileLinks.filter((link, index, self) => 
      index === self.findIndex(l => l.filePath === link.filePath)
    );
  
    return uniqueLinks;
  }
  
  /**
   * Clean up malformed file paths
   */
  function cleanFilePath(filePath: string): string {
    // Remove any href= prefixes that might have been captured
    let cleaned = filePath.replace(/^.*?href=["']?/, '');
    
    // Remove trailing quotes or HTML characters
    cleaned = cleaned.replace(/["'>].*$/, '');
    
    // Ensure proper file:// prefix
    if (!cleaned.startsWith('file://')) {
      // If it starts with a slash, it's an absolute path
      if (cleaned.startsWith('/')) {
        cleaned = `file://${cleaned}`;
      } else {
        // Relative path, might need current working directory
        cleaned = `file://${cleaned}`;
      }
    }
    
    return cleaned;
  }
  
  /**
   * Extract a readable title from the file path
   */
  function extractTitleFromPath(filePath: string): string {
    const filename = extractFilenameFromPath(filePath);
    
    // Convert underscores/hyphens to spaces and capitalize
    return filename
      .replace(/\.html$/, '')
      .replace(/[_-]/g, ' ')
      .replace(/\b\w/g, char => char.toUpperCase());
  }
  
  /**
   * Extract filename from file path
   */
  function extractFilenameFromPath(filePath: string): string {
    const cleanPath = filePath.replace('file://', '');
    return cleanPath.split('/').pop() || cleanPath;
  }
  
  /**
   * Remove HTML file links from content to avoid duplicate display
   */
  export function removeHtmlFileLinksFromContent(content: string): string {
    // Remove HTML anchor tags to HTML files
    let cleanContent = content.replace(/<a\s+href=["']?(file:\/\/[^"'\s>]+\.html)["']?[^>]*>([^<]+)<\/a>/gi, '');
    
    // Remove HTML img tags that reference HTML files (this causes "Failed to load image" errors)
    cleanContent = cleanContent.replace(/<img\s+[^>]*src=["']?(file:\/\/[^"'\s>]+\.html)["']?[^>]*\/?>/gi, '');
    
    // Remove any complete HTML blocks - we'll display these as separate interactive cards
    cleanContent = cleanContent.replace(/<html[^>]*>[\s\S]*?<\/html>/gi, '');
    
    // Remove markdown links to HTML files
    cleanContent = cleanContent.replace(/\[([^\]]+)\]\((file:\/\/[^)]+\.html)\)/g, '');
    
    // Remove standalone file:// URLs to HTML files
    cleanContent = cleanContent.replace(/(^|\s)(file:\/\/[^\s"'<>`]+\.html)/g, '$1');
    
    // Remove standalone HTML file paths (including those in backticks)
    cleanContent = cleanContent.replace(/(^|\s)`?([^\s"'<>`]+\.html)`?(\s|$)/g, '$1$3');
    
    // Remove HTML file paths wrapped in backticks specifically
    cleanContent = cleanContent.replace(/`([^`]+\.html)`/g, '');
    
    // Remove HTML file paths wrapped in double quotes
    cleanContent = cleanContent.replace(/"([^"]+\.html)"/g, '');
    
    // Remove HTML file paths wrapped in single quotes
    cleanContent = cleanContent.replace(/'([^']+\.html)'/g, '');
    
    // Clean up extra whitespace
    cleanContent = cleanContent.replace(/\n\s*\n\s*\n/g, '\n\n');
    cleanContent = cleanContent.trim();
    
    return cleanContent;
  }
