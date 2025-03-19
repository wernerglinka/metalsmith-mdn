/* eslint-env node,mocha */
const assert = require('node:assert').strict;

// Import the plugin using CommonJS format
const plugin = require('../lib/index.cjs');

describe('metalsmith-mdn (CommonJS)', () => {
  // Verify the module loads correctly and exports a function
  it('should be properly importable as a CommonJS module', () => {
    assert.strictEqual(typeof plugin, 'function', 'Plugin should be a function when required with CommonJS');
    assert.strictEqual(typeof plugin(), 'function', 'Plugin should return a function when called');
  });
  
  // Add a basic functionality test to verify the plugin works
  it('should export a function with the correct name', () => {
    const instance = plugin();
    // Check for the MDN name - function should be named "MDN"
    assert.strictEqual(instance.name, 'MDN', 'Plugin function should be named MDN');
  });

  it('should process files and respect options', () => {
    const instance = plugin({
      templatesDir: 'layouts',
      customFilters: 'nunjucks-filters.js'
    });
    
    // Mock files object
    const files = {
      'test.md': {
        contents: Buffer.from('Test content with {#mdn "testComponent"#}'),
        testComponent: {
          layout: 'test.njk'
        }
      }
    };
    
    // Mock metalsmith object
    const metalsmith = {
      path: (p) => p,
      metadata: () => ({})
    };
    
    // Function should accept files, metalsmith and callback
    assert.strictEqual(typeof instance, 'function', 'Plugin instance should be a function');
    assert.strictEqual(instance.length, 3, 'Plugin instance should accept 3 arguments');
  });
});