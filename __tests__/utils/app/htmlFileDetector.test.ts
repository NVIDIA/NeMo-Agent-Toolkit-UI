import { detectHtmlFileLinks, removeHtmlFileLinksFromContent } from '@/utils/app/htmlFileDetector';

describe('htmlFileDetector', () => {
  describe('detectHtmlFileLinks', () => {
    it('should detect an HTML anchor tag link', () => {
      const content = '<a href="file:///path/to/plot.html">View Plot</a>';
      const links = detectHtmlFileLinks(content);
      expect(links).toHaveLength(1);
      expect(links[0].filePath).toBe('file:///path/to/plot.html');
      expect(links[0].linkText).toBe('View Plot');
      expect(links[0].isInlineHtml).toBe(false);
    });

    it('should detect a Markdown link', () => {
      const content = 'Here is the [plot](file:///path/to/plot.html)';
      const links = detectHtmlFileLinks(content);
      expect(links).toHaveLength(1);
      expect(links[0].filePath).toBe('file:///path/to/plot.html');
      expect(links[0].linkText).toBe('plot');
    });

    it('should detect a direct file:// URL', () => {
      const content = 'You can find the plot at file:///path/to/plot.html.';
      const links = detectHtmlFileLinks(content);
      expect(links).toHaveLength(1);
      expect(links[0].filePath).toBe('file:///path/to/plot.html');
      expect(links[0].linkText).toBe('plot.html');
    });

    it('should detect a plain file path ending in .html', () => {
      const content = 'The plot is located at /path/to/plot.html.';
      const links = detectHtmlFileLinks(content);
      expect(links).toHaveLength(1);
      expect(links[0].filePath).toBe('file:///path/to/plot.html');
    });

    it('should detect a file path in backticks', () => {
      const content = 'Check out `/path/to/plot.html`.';
      const links = detectHtmlFileLinks(content);
      expect(links).toHaveLength(1);
      expect(links[0].filePath).toBe('file:///path/to/plot.html');
    });

    it('should detect a file path in double quotes', () => {
        const content = 'The file is "/path/to/plot.html"';
        const links = detectHtmlFileLinks(content);
        expect(links).toHaveLength(1);
        expect(links[0].filePath).toBe('file:///path/to/plot.html');
    });

    it('should detect a file path in single quotes', () => {
        const content = "The file is '/path/to/plot.html'";
        const links = detectHtmlFileLinks(content);
        expect(links).toHaveLength(1);
        expect(links[0].filePath).toBe('file:///path/to/plot.html');
    });

    it('should detect inline HTML content', () => {
      const content = '<html><head><title>My Plot</title></head><body>...</body></html>';
      const links = detectHtmlFileLinks(content);
      expect(links).toHaveLength(1);
      expect(links[0].isInlineHtml).toBe(true);
      expect(links[0].htmlContent).toBe(content);
      expect(links[0].title).toBe('My Plot');
    });

    it('should handle multiple different link types and remove duplicates', () => {
      const content = `
        <a href="file:///path/to/plot.html">View Plot</a>
        Another link to the same plot: [plot](file:///path/to/plot.html)
        And an inline plot: <html><body><h1>Inline Plot</h1></body></html>
      `;
      const links = detectHtmlFileLinks(content);
      expect(links).toHaveLength(2);
      expect(links.find(l => !l.isInlineHtml)?.filePath).toBe('file:///path/to/plot.html');
      expect(links.find(l => l.isInlineHtml)?.title).toBe('Inline Plot');
    });

    it('should not detect http links', () => {
        const content = 'Visit <a href="https://example.com/plot.html">this site</a>.';
        const links = detectHtmlFileLinks(content);
        expect(links).toHaveLength(0);
    });

    it('should return an empty array for content with no HTML links', () => {
        const content = 'This is a regular message with no plots.';
        const links = detectHtmlFileLinks(content);
        expect(links).toHaveLength(0);
    });
  });

  describe('removeHtmlFileLinksFromContent', () => {
    it('should remove an HTML anchor tag link', () => {
      const content = 'Please <a href="file:///path/to/plot.html">View Plot</a> when you can.';
      const cleaned = removeHtmlFileLinksFromContent(content);
      expect(cleaned).toBe('Please  when you can.');
    });

    it('should remove a Markdown link', () => {
      const content = 'Here is the [plot](file:///path/to/plot.html) for you.';
      const cleaned = removeHtmlFileLinksFromContent(content);
      expect(cleaned).toBe('Here is the  for you.');
    });

    it('should remove a direct file:// URL', () => {
      const content = 'Find it at file:///path/to/plot.html.';
      const cleaned = removeHtmlFileLinksFromContent(content);
      expect(cleaned).toBe('Find it at.');
    });

    it('should remove a plain file path', () => {
      const content = 'The plot is at /path/to/plot.html.';
      const cleaned = removeHtmlFileLinksFromContent(content);
      expect(cleaned).toBe('The plot is at.');
    });

    it('should remove inline HTML content', () => {
      const content = 'Here is the plot: <html>...</html>. What do you think?';
      const cleaned = removeHtmlFileLinksFromContent(content);
      expect(cleaned).toBe('Here is the plot: . What do you think?');
    });

    it('should remove all link types from content', () => {
      const content = `
        <a href="file:///path/to/plot.html">View Plot</a>
        [plot](file:///path/to/plot.html)
        file:///path/to/plot.html
        /path/to/plot.html
        <html><body>Inline</body></html>
      `;
      const cleaned = removeHtmlFileLinksFromContent(content);
      expect(cleaned.trim()).toBe('');
    });
  });
});
