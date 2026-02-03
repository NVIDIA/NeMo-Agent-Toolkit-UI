import { detectHtmlFileLinks, removeHtmlFileLinksFromContent } from '@/utils/app/htmlFileDetector';

describe('htmlFileDetector', () => {
  describe('detectHtmlFileLinks', () => {
    describe('basic detection', () => {
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
      });

      it('should detect inline HTML content', () => {
        const content = '<html><head><title>My Plot</title></head><body>...</body></html>';
        const links = detectHtmlFileLinks(content);
        expect(links).toHaveLength(1);
        expect(links[0].isInlineHtml).toBe(true);
        expect(links[0].htmlContent).toBe(content);
        expect(links[0].title).toBe('My Plot');
      });
    });

    describe('edge cases', () => {
      it('should handle multiple HTML files in one message', () => {
        const content = `
          First: file:///plot1.html
          Second: /path/to/plot2.html
          Third: [plot3](file:///plot3.html)
        `;
        const links = detectHtmlFileLinks(content);
        expect(links.length).toBeGreaterThanOrEqual(3);
        expect(links.filter(l => !l.isInlineHtml)).toHaveLength(3);
      });

      it('should remove duplicates when same file referenced multiple times', () => {
        const content = `
          <a href="file:///path/to/plot.html">View Plot</a>
          Another link: [plot](file:///path/to/plot.html)
        `;
        const links = detectHtmlFileLinks(content);
        expect(links).toHaveLength(1);
        expect(links[0].filePath).toBe('file:///path/to/plot.html');
      });

      it('should handle paths with hyphens and underscores', () => {
        const content = 'file:///my-awesome_plot-2024.html';
        const links = detectHtmlFileLinks(content);
        expect(links).toHaveLength(1);
        expect(links[0].filePath).toContain('my-awesome_plot-2024.html');
      });

      it('should not detect http/https links', () => {
        const content = 'Visit <a href="https://example.com/plot.html">site</a> or http://test.com/page.html';
        const links = detectHtmlFileLinks(content);
        expect(links).toHaveLength(0);
      });

      it('should return empty array for content with no HTML links', () => {
        const content = 'This is a regular message with no plots.';
        const links = detectHtmlFileLinks(content);
        expect(links).toHaveLength(0);
      });
    });
  });

  describe('removeHtmlFileLinksFromContent', () => {
    it('should remove HTML file links but preserve surrounding text', () => {
      const content = 'Please <a href="file:///path/to/plot.html">View Plot</a> when you can.';
      const cleaned = removeHtmlFileLinksFromContent(content);
      expect(cleaned).toContain('Please');
      expect(cleaned).toContain('when you can');
      expect(cleaned).not.toContain('file://');
      expect(cleaned).not.toContain('<a href');
    });

    it('should remove Markdown links to HTML files', () => {
      const content = 'Here is the [plot](file:///path/to/plot.html) for you.';
      const cleaned = removeHtmlFileLinksFromContent(content);
      expect(cleaned).toContain('Here is the');
      expect(cleaned).toContain('for you');
      expect(cleaned).not.toContain('[plot]');
      expect(cleaned).not.toContain('file://');
    });

    it('should remove standalone file:// URLs', () => {
      const content = 'Find it at file:///path/to/plot.html.';
      const cleaned = removeHtmlFileLinksFromContent(content);
      expect(cleaned).toMatch(/Find it at\.?/);
      expect(cleaned).not.toContain('file://');
      expect(cleaned).not.toContain('.html');
    });

    it('should remove inline HTML blocks', () => {
      const content = 'Here is the plot: <html>...</html>. What do you think?';
      const cleaned = removeHtmlFileLinksFromContent(content);
      expect(cleaned).toContain('Here is the plot:');
      expect(cleaned).toContain('What do you think?');
      expect(cleaned).not.toContain('<html>');
    });

    it('should remove all HTML file references from complex content', () => {
      const content = `
        <a href="file:///path/to/plot.html">View Plot</a>
        [plot](file:///path/to/plot.html)
        file:///path/to/plot.html
        /path/to/plot.html
        <html><body>Inline</body></html>
      `;
      const cleaned = removeHtmlFileLinksFromContent(content);
      expect(cleaned).not.toContain('file://');
      expect(cleaned).not.toContain('.html');
      expect(cleaned).not.toContain('<html>');
      expect(cleaned.trim().length).toBeLessThan(10); // Should be mostly empty
    });

    it('should preserve non-HTML content', () => {
      const content = 'This is regular text with numbers 123 and symbols @#$';
      const cleaned = removeHtmlFileLinksFromContent(content);
      expect(cleaned).toBe(content);
    });
  });
});
