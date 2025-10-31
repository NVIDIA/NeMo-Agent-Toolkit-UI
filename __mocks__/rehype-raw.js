/**
 * Mock for rehype-raw plugin
 * 
 * rehype-raw is an ES module that causes issues with Jest's CommonJS environment.
 * This mock provides a no-op transformer that passes the syntax tree through unchanged.
 * 
 * In tests, we don't need actual HTML parsing since we're testing component behavior,
 * not the markdown rendering itself.
 */
module.exports = function rehypeRaw() {
  return function transformer(tree) {
    return tree;
  };
};

module.exports.default = module.exports;
