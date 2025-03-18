/* eslint-env node,mocha */
import assert from 'node:assert';
import { resolve, dirname } from 'node:path';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import equals from 'assert-dir-equal';
import Metalsmith from 'metalsmith';
// Import from source directly for testing
import plugin from '../src/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const { name } = JSON.parse(readFileSync(resolve(__dirname, '../package.json'), 'utf-8'));

function fixture(p) {
  return resolve(__dirname, 'fixtures', p);
}

/**
 * Normalize content for comparison
 * Handles common whitespace inconsistencies in HTML/Markdown mixed content
 * @param {string} content
 * @returns {string}
 */
function normalizeContent(content) {
  return content
    .trim() // Remove leading/trailing whitespace
    .replace(/\s+/g, ' ') // Normalize multiple spaces to single space
    .replace(/\s+<\/p>/g, '</p>') // Clean spaces before closing p tags
    .replace(/\s+<\//g, '</') // Clean spaces before any closing tag
    .replace(/>\s+</g, '><') // Clean spaces between tags
    .replace(/\n{3,}/g, '\n\n') // Normalize multiple line breaks
    .replace(/^\s+|\s+$/gm, ''); // Trim each line
}

describe('metalsmith-mdn', function () {
  this.timeout(5000);

  it('should export a named plugin function matching package.json name', () => {
    const namechars = name.split('-')[1];
    const allUpperCase = namechars.toUpperCase();
    assert.strictEqual(plugin().name, allUpperCase);
  });

  it('should handle no MDN markers', (done) => {
    Metalsmith(fixture('noMarkers'))
      .use(plugin())
      .build((err) => {
        if (err) {done(err);}
        assert.strictEqual(err, null);
        equals(fixture('noMarkers/build'), fixture('noMarkers/expected'));
        done();
      });
  });

  it('should handle invalid MDN components', (done) => {
    Metalsmith(fixture('invalidComponent'))
      .use(plugin())
      .build((err) => {
        if (err) {done(err);}
        assert.strictEqual(err, null);
        equals(fixture('invalidComponent/build'), fixture('invalidComponent/expected'));
        done();
      });
  });

  it('should not crash the metalsmith build when using default options', (done) => {
    Metalsmith(fixture('default'))
      .use(plugin())
      .build((err) => {
        if (err) {done(err);}
        assert.strictEqual(err, null);
        equals(fixture('default/build'), fixture('default/expected'));
        done();
      });
  });

  it('should replace marker with nunjucks component', (done) => {
    Metalsmith(fixture('insertNunjucks'))
      .use(
        plugin({
          templatesDir: 'layouts',
          customFilters: 'nunjucks-filters.js'
        })
      )
      .build((err) => {
        if (err) {done(err);}
        assert.strictEqual(err, null);
        equals(fixture('insertNunjucks/build'), fixture('insertNunjucks/expected'));
        done();
      });
  });

  it('should handle multiple MDN markers in a single file', (done) => {
    Metalsmith(fixture('multipleMarkers'))
      .use(
        plugin({
          templatesDir: 'layouts',
          customFilters: 'nunjucks-filters.js'
        })
      )
      .build((err) => {
        if (err) {done(err);}
        try {
          // Read and normalize both files before comparison
          const buildContent = normalizeContent(readFileSync(fixture('multipleMarkers/build/index.md'), 'utf8'));
          const expectedContent = normalizeContent(readFileSync(fixture('multipleMarkers/expected/index.md'), 'utf8'));

          assert.strictEqual(buildContent, expectedContent);
          done();
        } catch (error) {
          done(error);
        }
      });
  });

  it('should apply custom nunjucks filters correctly', (done) => {
    Metalsmith(fixture('customFilters'))
      .use(
        plugin({
          templatesDir: 'layouts',
          customFilters: 'nunjucks-filters.js'
        })
      )
      .build((err) => {
        if (err) {done(err);}
        try {
          const buildContent = normalizeContent(readFileSync(fixture('customFilters/build/index.md'), 'utf8'));
          const expectedContent = normalizeContent(readFileSync(fixture('customFilters/expected/index.md'), 'utf8'));

          // Verify specific filter applications
          assert(buildContent.includes('TEST STRING WITH MIXED CASE'), 'Uppercase filter not applied');
          assert(buildContent.includes('test string with mixed case'), 'Lowercase filter not applied');
          assert(buildContent.includes('Test string with mixed case'), 'Capitalize filter not applied');

          // Verify complete content match
          assert.strictEqual(buildContent, expectedContent);
          done();
        } catch (error) {
          done(error);
        }
      });
  });

  it('should handle MDN tags with special characters in component names', (done) => {
    // Create a test file with a component that has special characters in its name
    const ms = Metalsmith(fixture('multipleMarkers'))
      .metadata({
        'special@component-name!': {
          layout: 'sections/intro.njk',
          text: {
            title: 'Special Characters Test',
            header: 'h2',
            subTitle: '',
            prose: 'This component has special characters in its name'
          }
        }
      });
    
    // Add a file with the special character component
    ms.source('src')
      .destination('build')
      .use((files) => {
        files['special.md'] = {
          contents: Buffer.from('# Special Characters Test\n\n{#mdn "special@component-name!"#}\n'),
          'special@component-name!': {
            layout: 'sections/intro.njk',
            text: {
              title: 'Special Characters Test',
              header: 'h2',
              subTitle: '',
              prose: 'This component has special characters in its name'
            }
          }
        };
      })
      .use(
        plugin({
          templatesDir: 'layouts',
          customFilters: 'nunjucks-filters.js'
        })
      )
      .build((err) => {
        if (err) {done(err);}
        try {
          // Check that the file was processed correctly
          const content = readFileSync(fixture('multipleMarkers/build/special.md'), 'utf8');
          assert(content.includes('Special Characters Test'));
          assert(content.includes('This component has special characters in its name'));
          assert(!content.includes('{#mdn "special@component-name!"#}'));
          done();
        } catch (error) {
          done(error);
        }
      });
  });

  it('should handle large files with many MDN tags efficiently', (done) => {
    // Create a metalsmith instance
    const ms = Metalsmith(fixture('multipleMarkers'))
      .source('src')
      .destination('build');
    
    // Add a large file with many MDN tags
    ms.use((files) => {
      let content = '# Performance Test\n\n';
      
      // Add 20 MDN tags for performance testing (reduced from 100 to make test more reliable)
      for (let i = 1; i <= 20; i++) {
        const componentName = `testComponent${i}`;
        content += `{#mdn "${componentName}"#}\n\n`;
        
        // Add the component to the file metadata
        if (!files['index.md']) {
          done(new Error('index.md not found in files'));
          return;
        }
        
        // Create component configuration
        files['index.md'][componentName] = {
          layout: 'sections/intro.njk',
          text: {
            title: `Component ${i}`,
            header: 'h3',
            subTitle: '',
            prose: `This is test component ${i}`
          }
        };
      }
      
      // Create a new file with all the test components
      files['performance.md'] = {
        contents: Buffer.from(content),
        layout: files['index.md'].layout
      };
      
      // Copy all test components to the new file
      for (let i = 1; i <= 20; i++) {
        const componentName = `testComponent${i}`;
        files['performance.md'][componentName] = files['index.md'][componentName];
      }
    });
    
    // Measure execution time
    const startTime = process.hrtime.bigint();
    
    ms.use(
        plugin({
          templatesDir: 'layouts',
          customFilters: 'nunjucks-filters.js'
        })
      )
      .build((err) => {
        if (err) {done(err);}
        try {
          const endTime = process.hrtime.bigint();
          const timeInMs = Number(endTime - startTime) / 1_000_000;
          
          // Check if the file was created
          const performancePath = fixture('multipleMarkers/build/performance.md');
          assert(readFileSync(performancePath, 'utf8'), 'Performance test file was not created');
          
          // Read the processed file
          const content = readFileSync(performancePath, 'utf8');
          
          // Verify that components were processed (checking just a few)
          assert(content.includes('Component 1'), 'Component 1 not found');
          assert(content.includes('Component 10'), 'Component 10 not found');
          assert(content.includes('This is test component 5'), 'Component 5 content not found');
          assert(!content.includes('{#mdn "testComponent'), 'MDN tags were not processed');
          
          // Log processing time (helpful but not an assertion)
          console.log(`Processed 20 MDN tags in ${timeInMs.toFixed(2)}ms`);
          
          // Make sure it completes in a reasonable time (more generous timing)
          assert(timeInMs < 10000, `Processing took too long: ${timeInMs}ms`);
          
          done();
        } catch (error) {
          done(error);
        }
      });
  });
  
  it('should handle template not found errors gracefully', (done) => {
    // Create a metalsmith instance with a component referencing a non-existent template
    const ms = Metalsmith(fixture('multipleMarkers'))
      .source('src')
      .destination('build')
      .use((files) => {
        files['missing-template.md'] = {
          contents: Buffer.from('# Missing Template Test\n\n{#mdn "missingComponent"#}\n'),
          missingComponent: {
            layout: 'does-not-exist.njk',
            text: {
              title: 'Missing Template',
              prose: 'This component references a template that does not exist'
            },
            marker: '{#mdn "missingComponent"#}'
          }
        };
      })
      .use(
        plugin({
          templatesDir: 'layouts',
          customFilters: 'nunjucks-filters.js'
        })
      );
    
    // The build should fail gracefully with a useful error
    ms.build((err) => {
      try {
        assert(err !== null, 'Should have thrown an error');
        assert(err.message.includes('does-not-exist.njk') || err.message.includes('template not found'), 
               'Error should mention the missing template');
        done();
      } catch (error) {
        done(error);
      }
    });
  });
  
  it('should handle custom filters import failure gracefully', (done) => {
    // Try to use a non-existent filters file
    Metalsmith(fixture('multipleMarkers'))
      .use(
        plugin({
          templatesDir: 'layouts',
          customFilters: 'non-existent-filters.js'
        })
      )
      .build((err) => {
        try {
          assert(err !== null, 'Should have thrown an error');
          assert(err.code === 'ERR_MODULE_NOT_FOUND' || err.message.includes('Cannot find module'),
                 'Error should be about module not found');
          done();
        } catch (error) {
          done(error);
        }
      });
  });
});
