'use strict';

var path = require('path');
var nunjucks = require('nunjucks');

function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

function _interopNamespace(e) {
  if (e && e.__esModule) return e;
  var n = Object.create(null);
  if (e) {
    Object.keys(e).forEach(function (k) {
      if (k !== 'default') {
        var d = Object.getOwnPropertyDescriptor(e, k);
        Object.defineProperty(n, k, d.get ? d : {
          enumerable: true,
          get: function () { return e[k]; }
        });
      }
    });
  }
  n["default"] = e;
  return n;
}

var path__default = /*#__PURE__*/_interopDefaultLegacy(path);
var nunjucks__default = /*#__PURE__*/_interopDefaultLegacy(nunjucks);

/**
 * @typedef Options
 * @property {String} templatesDir - Directory containing nunjucks templates
 * @property {String} customFilters - Path to custom nunjucks filters file
 */

const MARKER_START = '{#mdn';
const MARKER_END = '#}';

/** @type {Options} */
const defaults = {
  templatesDir: 'layouts',
  customFilters: 'nunjucks-filters.js'
};

/**
 * Normalize plugin options
 * @param {Options} [options]
 * @returns {Object}
 */
const normalizeOptions = options => {
  return {
    ...defaults,
    ...(options || {})
  };
};

/**
 * Extract MDN tags from file content
 * @param {object} fileObj - Metalsmith file object
 * @param {Function} debugFn - Debug function from metalsmith
 * @returns {Array} Array of MDN tag objects
 * @description
 *     Extracts all MDN tags from the file content to construct the mdnTagsArray.
 *     Get the name of the MDN component and find the component properties in the
 *     files frontmatter. Push the component properties to mdnTagsArray and when done
 *     return mdnTagsArray.
 */
function getMDNTags(fileObj, debugFn) {
  const mdnTagsArray = [];
  const str = fileObj.contents.toString();

  // scan for MDN tags in the file content
  const mdnTags = str.match(/\{#mdn\s*".+?"\s*#\}/g);

  // if the file content contains any MDN tags construct mdnTagsArray
  if (mdnTags != null && mdnTags.length) {
    for (const marker of mdnTags) {
      // extract the name of the MDN component
      const componentName = marker.replaceAll(' ', '').replace(`${MARKER_START}"`, '').replace(`"${MARKER_END}`, '');

      // find the component properties in the files metadata
      // `fileObj` should have a property that matches `componentName`
      if (fileObj != null && fileObj[componentName]) {
        // add the marker to the MDNTags array
        fileObj[componentName].marker = marker;

        // push the component properties to mdnTagsArray
        mdnTagsArray.push(fileObj[componentName]);
      } else {
        // Warning about missing component
        debugFn == null || debugFn(`Component named ${componentName} could not be found`);
      }
    }
  }
  return mdnTagsArray;
}

/**
 * Render a nunjucks template
 * @param {string} template - Template name
 * @param {object} context - Template context
 * @returns {Promise<string>} Rendered template
 * @description
 *  Non-blocking rendering: Nunjucks template rendering is wrapped in Promises,
 *  allowing the plugin to continue processing other tags while waiting for templates
 *  to render.
 *  This is a helper function to avoid the callback function.
 */
const renderTemplate = (template, context) => {
  return new Promise((resolve, reject) => {
    nunjucks__default["default"].render(template, context, (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
};

/**
 * Process a single MDN component
 * @param {object} mdnTagObject - MDN tag configuration
 * @param {Function} debugFn - Debug function from metalsmith
 * @returns {Promise<string>} Rendered component
 * @description
 * Wrapper for the renderTemplate function. This function returns a promise that
 * resolves to the result of the renderTemplate function.
 */
const resolveMDNComponent = async (mdnTagObject, debugFn) => {
  try {
    return await renderTemplate(mdnTagObject.layout, {
      params: mdnTagObject
    });
  } catch (err) {
    // Log error using debug function if available
    debugFn == null || debugFn(`Error rendering component ${mdnTagObject.layout}: ${err.message}`);
    throw err;
  }
};

/**
 * Process MDN components in Markdown files using Nunjucks templates.
 * Inspired by MDX - plugin to process nunjucks templates in markdown files.
 * MDN enables the use of Nunjucks in Markdown content. Nunjucks components can be
 * embedded within markdown content.
 *
 * @param {Options} options
 * @returns {import('metalsmith').Plugin}
 */
function MDN(options) {
  options = normalizeOptions(options);
  return async function MDN(files, metalsmith, done) {
    const debug = metalsmith.debug('metalsmith-mdn');
    debug('Running with options: %O', options);
    try {
      // Configure nunjucks environment
      const env = nunjucks__default["default"].configure(options.templatesDir, {
        autoescape: true
      });

      // Add custom filters
      const customFilters = await (function (t) { return Promise.resolve().then(function () { return /*#__PURE__*/_interopNamespace(require(t)); }); })(path__default["default"].join(metalsmith.directory(), options.customFilters));
      Object.entries(customFilters).forEach(([name, filter]) => {
        env.addFilter(name, filter);
      });
      const debugFn = metalsmith.debug('metalsmith-mdn');

      // Collect all files and their MDN tags
      const filesToProcess = Object.entries(files).map(([filename, file]) => {
        const MDNTags = getMDNTags(file, debugFn);
        return MDNTags.length ? {
          filename,
          MDNTags
        } : null;
      }).filter(Boolean);

      /**
       * Parallel file processing: All files containing MDN tags are processed concurrently using
       * Promise.all(). E.g., multiple Markdown files with MDN tags, are all processed at the same
       * time rather than sequentially.
       */
      const processedFiles = await Promise.all(filesToProcess.map(async ({
        filename,
        MDNTags
      }) => {
        // Process all MDN tags for this file in parallel
        const resolvedTags = await Promise.all(MDNTags.map(async mdnTagObject => {
          /**
           * Parallel tag resolution: Within each file, all MDN tags are resolved concurrently.
           * E.g., If a single Markdown file contains multiple MDN tags (like {#mdn "component1"#}
           * and {#mdn "component2"#}), they're rendered simultaneously.
           */
          const replacementString = await resolveMDNComponent(mdnTagObject, debugFn);
          return {
            marker: mdnTagObject.marker,
            replacement: replacementString.trim().replace(/\n{3,}/g, '\n\n').replace(/^\s+/gm, '').replace(/\s+$/gm, '')
          };
        }));
        return {
          filename,
          resolvedTags
        };
      }));

      // Update all file contents
      processedFiles.forEach(({
        filename,
        resolvedTags
      }) => {
        resolvedTags.forEach(({
          marker,
          replacement
        }) => {
          files[filename].contents = Buffer.from(files[filename].contents.toString().replace(marker, replacement));
        });
      });
      done();
    } catch (error) {
      done(error);
    }
  };
}

module.exports = MDN;
//# sourceMappingURL=index.cjs.map
