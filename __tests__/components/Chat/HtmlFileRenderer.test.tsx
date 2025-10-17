import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { HtmlFileRenderer } from '@/components/Chat/HtmlFileRenderer';

// Mock fetch
global.fetch = jest.fn();

// Mock navigator.clipboard
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: jest.fn().mockResolvedValue(undefined),
  },
  writable: true,
});

describe('HtmlFileRenderer', () => {
  beforeEach(() => {
    (fetch as jest.Mock).mockClear();
    (navigator.clipboard.writeText as jest.Mock).mockClear();
  });

  it('should render loading state initially, then render the plot when file exists', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true, // For checkFileExists
    });
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve('<html><body><h1>Test Plot</h1></body></html>'), // For loadHtmlContent
    });

    render(<HtmlFileRenderer filePath="file:///path/to/plot.html" title="My Plot" />);

    // It should initially show a loading skeleton, but that's hard to test without more specific selectors.
    // We'll wait for the content to appear.

    await waitFor(() => {
      expect(screen.getByTitle('My Plot')).toBeInTheDocument();
    });

    const iframe = screen.getByTitle('My Plot');
    expect(iframe).toHaveAttribute('srcDoc', '<html><body><h1>Test Plot</h1></body></html>');
  });

  it('should render nothing if the file does not exist', async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 404,
    });

    const { container } = render(<HtmlFileRenderer filePath="file:///path/to/nonexistent.html" />);
    
    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });

  it('should display an error message if fetching content fails', async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({ ok: true }); // file exists check
    (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error')); // content fetch fails

    render(<HtmlFileRenderer filePath="file:///path/to/plot.html" />);

    await waitFor(() => {
      expect(screen.getByText(/Could not load plot inline/i)).toBeInTheDocument();
      expect(screen.getByText(/Failed to load HTML file: Network error/i)).toBeInTheDocument();
    });
  });

  it('should render inline HTML content directly without fetching', async () => {
    const inlineContent = '<html><body><h2>Inline Content</h2></body></html>';
    render(<HtmlFileRenderer filePath="inline-1" isInlineHtml={true} htmlContent={inlineContent} />);

    await waitFor(() => {
        expect(screen.getByTitle('Inline HTML Content')).toBeInTheDocument();
    });

    const iframe = screen.getByTitle('Inline HTML Content');
    expect(iframe).toHaveAttribute('srcDoc', inlineContent);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('should toggle the visibility of the plot when show/hide button is clicked', async () => {
    (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('<html></html>'),
    });

    render(<HtmlFileRenderer filePath="file:///path/to/plot.html" />);

    await waitFor(() => {
        expect(screen.getByTitle('HTML Content')).toBeInTheDocument();
    });

    const hideButton = screen.getByRole('button', { name: /Hide Plot/i });
    fireEvent.click(hideButton);

    await waitFor(() => {
        expect(screen.queryByTitle('HTML Content')).not.toBeInTheDocument();
    });

    const showButton = screen.getByRole('button', { name: /Show Plot/i });
    fireEvent.click(showButton);

    await waitFor(() => {
        expect(screen.getByTitle('HTML Content')).toBeInTheDocument();
    });
  });

  it('should copy file path to clipboard', async () => {
    (fetch as jest.Mock).mockResolvedValue({ ok: true });
    window.alert = jest.fn();

    render(<HtmlFileRenderer filePath="file:///path/to/plot.html" />);
    
    await waitFor(() => {
      expect(screen.getByTitle('Copy file path')).toBeInTheDocument();
    });
    
    const copyButton = screen.getByTitle('Copy file path');
    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('/path/to/plot.html');
      expect(window.alert).toHaveBeenCalledWith('File path copied to clipboard! Paste it into your browser address bar to view the plot.');
    });
  });

  it('should copy inline html to clipboard', async () => {
    const inlineContent = '<html><body><h2>Inline Content</h2></body></html>';
    window.alert = jest.fn();

    render(<HtmlFileRenderer filePath="inline-1" isInlineHtml={true} htmlContent={inlineContent} />);
    
    await waitFor(() => {
      expect(screen.getByTitle('Copy HTML content')).toBeInTheDocument();
    });
    
    const copyButton = screen.getByTitle('Copy HTML content');
    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(inlineContent);
      expect(window.alert).toHaveBeenCalledWith('HTML content copied to clipboard!');
    });
  });
});
