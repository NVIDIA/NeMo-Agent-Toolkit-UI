'use client';
import React, { useState, useEffect } from 'react';
import { IconEye, IconEyeOff, IconExternalLink, IconFile, IconDownload } from '@tabler/icons-react';

interface HtmlFileRendererProps {
  filePath: string;
  title?: string;
  isInlineHtml?: boolean;
  htmlContent?: string;
}

export const HtmlFileRenderer: React.FC<HtmlFileRendererProps> = ({ 
  filePath, 
  title,
  isInlineHtml = false,
  htmlContent: inlineHtmlContent
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [htmlContent, setHtmlContent] = useState<string>(inlineHtmlContent || '');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const cleanFilePath = (path: string): string => {
    // For inline HTML, return a descriptive name
    if (isInlineHtml) {
      return title || 'Inline HTML Content';
    }
    
    // Remove any malformed prefixes or HTML artifacts
    let cleaned = path.replace(/^.*?href=["']?/, '');
    cleaned = cleaned.replace(/["'>].*$/, '');
    
    // Remove file:// prefix for API call
    cleaned = cleaned.replace('file://', '');
    
    return cleaned;
  };

  const loadHtmlContent = async () => {
    // If it's inline HTML, content is already provided
    if (isInlineHtml && inlineHtmlContent) {
      setHtmlContent(inlineHtmlContent);
      return;
    }
    
    if (isExpanded && !htmlContent && !error) {
      setIsLoading(true);
      setError('');
      
      try {
        const cleanPath = cleanFilePath(filePath);
        console.log('Loading HTML file via API:', cleanPath);
        
        const response = await fetch(`/api/load-html-file?path=${encodeURIComponent(cleanPath)}`);
        
        if (!response.ok) {
          throw new Error(`Failed to load file: ${response.status} ${response.statusText}`);
        }
        
        const content = await response.text();
        setHtmlContent(content);
      } catch (err: any) {
        console.error('Error loading HTML file:', err);
        setError(`Failed to load HTML file: ${err.message}`);
      } finally {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    if (isExpanded) {
      loadHtmlContent();
    }
  }, [isExpanded, filePath, isInlineHtml, inlineHtmlContent]);

  const openInSystemBrowser = () => {
    if (isInlineHtml) {
      // For inline HTML, create a blob URL and try to open it
      try {
        const blob = new Blob([inlineHtmlContent || ''], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        // Clean up the URL after a delay
        setTimeout(() => URL.revokeObjectURL(url), 10000);
      } catch (error) {
        console.error('Error opening inline HTML:', error);
        alert('Unable to open inline HTML content in new window.');
      }
      return;
    }
    
    const cleanPath = cleanFilePath(filePath);
    // Try to open in system file manager/browser
    try {
      // For desktop apps or Electron, this might work
      if ((window as any).electronAPI) {
        (window as any).electronAPI.openFile(cleanPath);
      } else {
        // Provide instructions to user
        alert(`To view this plot, please open the following file in your browser:\n\n${cleanPath}\n\nYou can copy this path and paste it into your browser's address bar.`);
      }
    } catch (error) {
      console.error('Error opening file:', error);
      alert(`To view this plot, please open the following file in your browser:\n\n${cleanPath}`);
    }
  };

  const copyPathToClipboard = async () => {
    try {
      if (isInlineHtml) {
        // For inline HTML, copy the HTML content itself
        await navigator.clipboard.writeText(inlineHtmlContent || '');
        alert('HTML content copied to clipboard!');
      } else {
        const cleanPath = cleanFilePath(filePath);
        await navigator.clipboard.writeText(cleanPath);
        alert('File path copied to clipboard! Paste it into your browser address bar to view the plot.');
      }
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      if (isInlineHtml) {
        alert('Failed to copy HTML content to clipboard.');
      } else {
        const cleanPath = cleanFilePath(filePath);
        alert(`Copy this path to your browser:\n\n${cleanPath}`);
      }
    }
  };

  const displayPath = cleanFilePath(filePath);

  return (
    <div className="my-4 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 px-4 py-3 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <IconFile size={20} className="text-green-600 dark:text-green-400" />
          <div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {title || (isInlineHtml ? 'Inline HTML Content' : 'Interactive Plot')}
            </span>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                {isInlineHtml ? 'Inline HTML' : 'HTML Plot'}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {isInlineHtml ? 'HTML response content' : 'Interactive Bokeh visualization'}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors shadow-sm"
          >
            {isExpanded ? <IconEyeOff size={16} /> : <IconEye size={16} />}
            {isExpanded ? 'Hide' : 'Show'} {isInlineHtml ? 'Content' : 'Plot'}
          </button>
          
          <button
            onClick={copyPathToClipboard}
            className="flex items-center gap-1 px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
            title={isInlineHtml ? "Copy HTML content" : "Copy file path"}
          >
            <IconDownload size={16} />
          </button>
          
          {!isInlineHtml && (
            <button
              onClick={openInSystemBrowser}
              className="flex items-center gap-1 px-3 py-2 text-sm bg-gray-600 hover:bg-gray-700 text-white rounded-md transition-colors"
              title="Open instructions"
            >
              <IconExternalLink size={16} />
            </button>
          )}
          
          {isInlineHtml && (
            <button
              onClick={openInSystemBrowser}
              className="flex items-center gap-1 px-3 py-2 text-sm bg-gray-600 hover:bg-gray-700 text-white rounded-md transition-colors"
              title="Open in new window"
            >
              <IconExternalLink size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="p-4">
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
              <span className="ml-2 text-gray-600 dark:text-gray-400">Loading {isInlineHtml ? 'content' : 'plot'}...</span>
            </div>
          )}
          
          {error && !isInlineHtml && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
              <p className="text-red-700 dark:text-red-400 text-sm font-medium mb-2">Could not load plot inline</p>
              <p className="text-red-600 dark:text-red-500 text-sm mb-3">{error}</p>
              <div className="space-y-2">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <strong>To view this plot:</strong>
                </p>
                <ol className="text-sm text-gray-600 dark:text-gray-400 list-decimal list-inside space-y-1">
                  <li>Click the copy button above to copy the file path</li>
                  <li>Open a new browser tab</li>
                  <li>Paste the path into the address bar</li>
                  <li>Press Enter to view the interactive plot</li>
                </ol>
                <button
                  onClick={copyPathToClipboard}
                  className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md transition-colors"
                >
                  📋 Copy File Path
                </button>
              </div>
            </div>
          )}
          
          {htmlContent && !error && (
            <div className="border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
              <iframe
                srcDoc={htmlContent}
                className="w-full border-0"
                sandbox="allow-scripts allow-same-origin"
                title={title || (isInlineHtml ? 'Inline HTML Content' : 'HTML Content')}
                style={{ height: '600px', minHeight: '500px' }}
              />
            </div>
          )}
        </div>
      )}

      {/* File path info */}
      <div className="bg-gray-50 dark:bg-gray-800/50 px-4 py-2 border-t border-gray-200 dark:border-gray-700">
        <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
          {isInlineHtml ? 'Inline HTML Content' : displayPath}
        </span>
      </div>
    </div>
  );
};
