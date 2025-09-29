export interface HtmlFileLink {
  filePath: string;
  linkText: string;
  title?: string;
  isInlineHtml?: boolean;
  htmlContent?: string;
}

interface ProcessedRange {
  start: number;
  end: number;
}

type PatternHandler = (match: RegExpExecArray) => { filePath: string; linkText: string } | null;

/**
 * Detect HTML file links in message content
 * Supports various formats: anchor tags, markdown links, file:// URLs, paths, and inline HTML
 */
export function detectHtmlFileLinks(content: string): HtmlFileLink[] {
  const htmlFileLinks: HtmlFileLink[] = [];
  const processedRanges: ProcessedRange[] = [];

  // First, detect inline HTML content blocks
  detectInlineHtml(content, htmlFileLinks, processedRanges);

  // Then detect various file link formats
  detectFileLinkPatterns(content, htmlFileLinks, processedRanges);

  // Remove duplicates based on filePath
  return removeDuplicateLinks(htmlFileLinks);
}

/**
 * Detect inline HTML content blocks and add them to the results
 */
function detectInlineHtml(
  content: string,
  htmlFileLinks: HtmlFileLink[],
  processedRanges: ProcessedRange[]
): void {
  const inlineHtmlRegex = /<html[^>]*>[\s\S]*?<\/html>/gi;
  let match;
  let count = 1;

  while ((match = inlineHtmlRegex.exec(content)) !== null) {
    const htmlContent = match[0];
    processedRanges.push({ start: match.index, end: match.index + htmlContent.length });

    const title = extractHtmlTitle(htmlContent, count);

    htmlFileLinks.push({
      filePath: `inline-html-${count}`,
      linkText: title,
      title: title,
      isInlineHtml: true,
      htmlContent: htmlContent,
    });

    count++;
  }
}

/**
 * Extract title from HTML content
 */
function extractHtmlTitle(htmlContent: string, fallbackCount: number): string {
  const titleMatch =
    htmlContent.match(/<title[^>]*>([^<]+)<\/title>/i) || htmlContent.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  return titleMatch ? titleMatch[1].trim() : `Inline HTML Content ${fallbackCount}`;
}

/**
 * Detect various file link patterns (anchor tags, markdown, file:// URLs, etc.)
 */
function detectFileLinkPatterns(
  content: string,
  htmlFileLinks: HtmlFileLink[],
  processedRanges: ProcessedRange[]
): void {
  const patterns = getFileLinkPatterns();

  patterns.forEach(({ regex, handler }) => {
    let match;
    while ((match = regex.exec(content)) !== null) {
      // Skip if this match overlaps with already processed content
      if (isInProcessedRange(match.index, match[0].length, processedRanges)) {
        continue;
      }

      const result = handler(match);
      if (!result) {
        continue;
      }

      const { filePath, linkText } = result;

      // Mark this range as processed
      processedRanges.push({ start: match.index, end: match.index + match[0].length });

      htmlFileLinks.push({
        filePath: filePath,
        linkText: linkText.trim(),
        title: extractTitleFromPath(filePath),
        isInlineHtml: false,
      });
    }
  });
}

/**
 * Define regex patterns and handlers for different file link formats
 */
function getFileLinkPatterns(): Array<{ regex: RegExp; handler: PatternHandler }> {
  return [
    // HTML anchor tags with file:// URLs
    {
      regex: /<a\s+href=["']?(file:\/\/[^"'\s>]+\.html)["']?[^>]*>([^<]+)<\/a>/gi,
      handler: (match) => ({ filePath: match[1], linkText: match[2] }),
    },
    // HTML anchor tags with http/https - SKIP these
    {
      regex: /<a\s+href=["']?(https?:\/\/[^"'\s>]+\.html)["']?[^>]*>([^<]+)<\/a>/gi,
      handler: () => null,
    },
    // Markdown links: [text](file://path)
    {
      regex: /\[([^\]]+)\]\((file:\/\/[^)]+\.html)\)/g,
      handler: (match) => ({ linkText: match[1], filePath: match[2] }),
    },
    // File paths in backticks
    {
      regex: /`([^`]+\.html)`/g,
      handler: (match) => createFilePathResult(match[1]),
    },
    // File paths in double quotes
    {
      regex: /"([^"]+\.html)"/g,
      handler: (match) => createFilePathResult(match[1]),
    },
    // File paths in single quotes
    {
      regex: /'([^']+\.html)'/g,
      handler: (match) => createFilePathResult(match[1]),
    },
    // Direct file:// URLs (not in markdown or HTML tags, not containing http/https)
    {
      regex: /(?<!\(|href=["'])(file:\/\/[^\s"'<>`\)]+\.html)(?!["']\s*>|\))/g,
      handler: (match) => {
        const path = match[1] || match[0];
        if (path.includes('http://') || path.includes('https://')) {
          return null;
        }
        return { filePath: path, linkText: extractFilenameFromPath(path) };
      },
    },
    // Plain file paths (absolute paths starting with /)
    {
      regex: /\s(\/[\w\/\-\.]+\.html)\b/g,
      handler: (match) => ({
        filePath: `file://${match[1]}`,
        linkText: extractFilenameFromPath(match[1]),
      }),
    },
  ];
}

/**
 * Create result for a file path, handling http/https filtering
 */
function createFilePathResult(path: string): { filePath: string; linkText: string } | null {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return null;
  }
  return {
    filePath: path.startsWith('file://') ? path : `file://${path}`,
    linkText: extractFilenameFromPath(path),
  };
}

/**
 * Check if a match overlaps with already processed ranges
 */
function isInProcessedRange(index: number, length: number, processedRanges: ProcessedRange[]): boolean {
  const matchStart = index;
  const matchEnd = index + length;
  return processedRanges.some(
    (range) =>
      (matchStart >= range.start && matchStart < range.end) ||
      (matchEnd > range.start && matchEnd <= range.end) ||
      (matchStart <= range.start && matchEnd >= range.end)
  );
}

/**
 * Remove duplicate links based on filePath
 */
function removeDuplicateLinks(links: HtmlFileLink[]): HtmlFileLink[] {
  return links.filter((link, index, self) => index === self.findIndex((l) => l.filePath === link.filePath));
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
    .replace(/\b\w/g, (char) => char.toUpperCase());
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
 * This is used to clean the message content before displaying it alongside HtmlFileRenderer
 */
export function removeHtmlFileLinksFromContent(content: string): string {
  let cleanContent = content;

  // Remove HTML anchor tags to HTML files
  cleanContent = cleanContent.replace(
    /<a\s+href=["']?(file:\/\/[^"'\s>]+\.html)["']?[^>]*>([^<]+)<\/a>/gi,
    ''
  );

  // Remove HTML img tags that reference HTML files
  cleanContent = cleanContent.replace(/<img\s+[^>]*src=["']?(file:\/\/[^"'\s>]+\.html)["']?[^>]*\/?>/gi, '');

  // Remove any complete HTML blocks
  cleanContent = cleanContent.replace(/<html[^>]*>[\s\S]*?<\/html>/gi, '');

  // Remove markdown links to HTML files
  cleanContent = cleanContent.replace(/\[([^\]]+)\]\((file:\/\/[^)]+\.html)\)/g, '');

  // Remove standalone file:// URLs
  cleanContent = cleanContent.replace(/\s(file:\/\/[^\s"'<>`\)]+\.html)\s*(?=[.,!?;:\n]|$)/g, '');
  cleanContent = cleanContent.replace(/^(file:\/\/[^\s"'<>`\)]+\.html)\s*(?=[.,!?;:\n]|$)/gm, '');

  // Remove file paths in various quote styles
  cleanContent = cleanContent.replace(/`([^`]+\.html)`/g, '');
  cleanContent = cleanContent.replace(/"([^"]+\.html)"/g, '');
  cleanContent = cleanContent.replace(/'([^']+\.html)'/g, '');

  // Remove plain file paths
  cleanContent = cleanContent.replace(/\s(\/[\w\/\-\.]+\.html)\s*(?=[.,!?;:\n]|$)/g, '');

  // Clean up extra newlines
  cleanContent = cleanContent.replace(/\n\s*\n\s*\n+/g, '\n\n');

  return cleanContent.trim();
}