/**
 * Mock for remark-gfm (GitHub Flavored Markdown) plugin
 * 
 * remark-gfm is an ES module that causes issues with Jest's CommonJS environment.
 * This mock provides a no-op transformer that passes the syntax tree through unchanged.
 * 
 * In tests, we don't need actual GFM parsing (tables, strikethrough, etc.) since
 * we're testing component behavior, not markdown rendering.
 */
module.exports = function remarkGfm() {
  return function transformer(tree) {
    return tree;
  };
};

module.exports.default = module.exports;
