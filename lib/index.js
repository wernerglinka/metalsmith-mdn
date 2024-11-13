import path from 'path';
import nunjucks from 'nunjucks';

/**
 * @typedef Options
 * @property {String} templatesDir - Directory containing nunjucks templates
 * @property {String} customFilters - Path to custom nunjucks filters file
 */

const MARKER_START = "{#mdn";
const MARKER_END = "#}";

/** @type {Options} */
const defaults = {
  templatesDir: 'layouts',
  customFilters: "nunjucks-filters.js"
};

/**
 * Normalize plugin options
 * @param {Options} [options]
 * @returns {Object}
 */
function normalizeOptions( options ) {
  return Object.assign( {}, defaults, options || {} );
}

/**
 * Extract MDN tags from file content
 * @param {object} fileObj - Metalsmith file object
 * @returns {Array} Array of MDN tag objects
 * @description
 *     Extracts all MDN tags from the file content to construct the mdnTagsArray.
 *     Get the name of the MDN component and find the component properties in the
 *     files frontmatter. Push the component properties to mdnTagsArray and when done
 *     return mdnTagsArray.
 */
function getMDNTags( fileObj ) {
  const mdnTagsArray = [];
  const str = fileObj.contents.toString();

  // scan for MDN tags in the file content
  const mdnTags = str.match( /\{#mdn\s*".+?"\s*#\}/g );

  // if the file content contains any MDN tags construct mdnTagsArray
  if ( mdnTags && mdnTags.length ) {
    for ( let i = 0; mdnTags.length > i; i++ ) {
      // get the marker from the file content
      const marker = str.match( /\{#mdn\s*"(.+?)"\s*#\}/g )[ i ];

      // extract the name of the MDN component
      const componentName = marker
        .replaceAll( " ", "" )
        .replace( `${ MARKER_START }"`, "" )
        .replace( `"${ MARKER_END }`, "" );

      // find the component properties in the files metadata
      // `fileObj` should have a property that matches `componentName`
      if ( fileObj && fileObj.hasOwnProperty( componentName ) ) {
        // add the marker to the MDNTags array
        fileObj[ componentName ].marker = marker;

        // push the component properties to mdnTagsArray
        mdnTagsArray.push( fileObj[ componentName ] );
      } else {
        console.log( `A component named ${ componentName } could not be found` );
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
 *  Render the template with the context and return a promise that resolves to the result.
 *  This is a helper function to avoid the callback function.
 */
function renderTemplate( template, context ) {
  return new Promise( ( resolve, reject ) => {
    nunjucks.render( template, context, ( err, result ) => {
      if ( err ) {
        reject( err );
      } else {
        resolve( result );
      }
    } );
  } );
}

/**
 * Process a single MDN component
 * @param {object} mdnTagObject - MDN tag configuration
 * @returns {Promise<string>} Rendered component
 * @description
 * Wrapper for the renderTemplate function. This function returns a promise that
 * resolves to the result of the renderTemplate function.
 */
async function resolveMDNComponent( mdnTagObject ) {
  try {
    const output = await renderTemplate( mdnTagObject.layout, { params: mdnTagObject } );
    return output;
  } catch ( err ) {
    console.error( err );
    throw err;
  }
}

/**
 * Process MDN components in Markdown files using Nunjucks templates.
 * Inspired by MDX - plugin to process nunjucks templates in markdown files.
 * MDN enables the use of Nunjucks in Markdown content. Nunjucks components can be
 * embedded within markdown content.
 *
 * @param {Options} options
 * @returns {import('metalsmith').Plugin}
 */
function MDN( options ) {
  options = normalizeOptions( options );

  return async function MDN( files, metalsmith, done ) {
    const debug = metalsmith.debug( 'metalsmith-mdn' );
    debug( 'Running with options: %O', options );

    try {
      // Configure nunjucks environment
      const env = nunjucks.configure( options.templatesDir, { autoescape: true } );

      // Add custom filters
      const customFilters = await import( path.join( metalsmith.directory(), options.customFilters ) );
      Object.entries( customFilters ).forEach( ( [ name, filter ] ) => {
        env.addFilter( name, filter );
      } );

      // Process each file
      for ( const [ filename, file ] of Object.entries( files ) ) {
        const MDNTags = getMDNTags( file );

        if ( MDNTags.length ) {
          // Process all MDN tags in parallel
          const resolveMDNTags = await Promise.all(
            MDNTags.map( async ( mdnTagObject ) => {
              const replacementString = await resolveMDNComponent( mdnTagObject );
              return {
                marker: mdnTagObject.marker,
                replacement: replacementString
                  .trim()
                  .replace( /\n{3,}/g, '\n\n' )
                  .replace( /^\s+/gm, '' )
                  .replace( /\s+$/gm, '' ),
                filename
              };
            } )
          );

          // Replace markers with rendered content
          resolveMDNTags.forEach( ( { marker, replacement } ) => {
            files[ filename ].contents = Buffer.from(
              files[ filename ].contents.toString().replace( marker, replacement )
            );
          } );
        }
      }

      done();
    } catch ( error ) {
      done( error );
    }
  };
}

export default MDN;
