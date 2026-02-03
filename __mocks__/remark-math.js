/**
 * Mock for remark-math plugin
 * 
 * remark-math is an ES module that causes issues with Jest's CommonJS environment.
 * This mock provides a no-op transformer that passes the syntax tree through unchanged.
 * 
 * In tests, we don't need actual LaTeX math parsing since we're testing component
 * behavior, not mathematical equation rendering.
 */
module.exports = function remarkMath() {
  return function transformer(tree) {
    return tree;
  };
};

module.exports.default = module.exports;
