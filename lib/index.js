import path from 'path';
//import getTransformer from './get-transformer.mjs';
import nunjucks from 'nunjucks';

const markerStart = "{#mdn";
const markerEnd = "#}";

const pluginCache = {};

const defaults = {
  templatesDir: 'lib/layouts',
  customFilters: "nunjucks-filters.js"
};

/**
 * @function Normalize plugin options
 * @param {Options} [options]
 * @returns {Object}
 */
function normalizeOptions( options ) {
  return Object.assign( {}, defaults, options || {} );
}

/**
 * @function getMDNTags
 * @param {object} fileObj
 * @returns mdnTagsArray
 * @description
 *     Extraxts all MDN tags from the file content to construct the mdnTagsArray.
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
      const componentName = marker.replaceAll( " ", "" ).replace( `${ markerStart }"`, "" ).replace( `"${ markerEnd }`, "" );

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
    };
  }
  return mdnTagsArray;
}

/**
 * @function renderTemplate
 * @param {string} template
 * @param {object} context
 * @returns {Promise}
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
 * @function resolveMDNComponent
 * @param {object} mdnTagObject
 * @returns {Promise}
 * @description
 * Wrapper for the renderTemplate function. This function returns a promise that
 * resolves to the result of the renderTemplate function.
 */
async function resolveMDNComponent( mdnTagObject ) {
  try {
    const output = await renderTemplate( 'sections/intro.njk', { 'params': mdnTagObject } );
    return output;
  } catch ( err ) {
    console.error( err );
  }
}

/**
 * Inspired by MDX - plugin to process nunjucks templates in markdown files
 * MDN enables the use of Nunjucks in Markdown content. Nunjucks components can be
 * embedded within markdown content.
 *
 * @param {Options} options
 * @returns {import('metalsmith').Plugin}
 */
function MDN( options ) {
  options = normalizeOptions( options );

  return async function MDN( files, metalsmith, done ) {
    setImmediate( done );

    const debug = metalsmith.debug( 'metalsmith-mdn' );

    debug( 'Running with options: %o', options );

    const fileList = Object.entries( files );

    // configure the nunjucks environment
    let env = nunjucks.configure( 'layouts', { autoescape: true } );

    // add custom filters to the nunjucks environment
    const customFilters = await import( path.join( metalsmith.directory(), options.customFilters ) );

    Object.entries( customFilters ).forEach( ( [ name, filter ] ) => {
      env.addFilter( name, filter );
    } );

    fileList.forEach( async ( [ file ] ) => {
      const fileObj = files[ file ];

      // Extracts any MDN tags from the file content
      const MDNTags = getMDNTags( fileObj );

      console.log( fileObj );

      /*
        This code is part of an asynchronous operation that processes an array of MDNTags. Each mdnTagObject in the MDNTags array is passed to the resolveMDNComponent function, which returns a promise that resolves to a string (replacementString).

        1  Promise.all is used to ensure that all promises returned by the resolveMDNComponent function are resolved before proceeding. It takes an array of promises and returns a new promise that resolves when all of the input promises have resolved.

        2 MDNTags.map is used to create a new array of promises. For each mdnTagObject in the MDNTags array, it calls the resolveMDNComponent function and waits for it to resolve using the await keyword.

        3 Once resolveMDNComponent resolves, it returns an object containing the original marker from the mdnTagObject, the replacementString (with leading and trailing whitespace removed using trim and multiple line breaks replaced with a single line break using replace(/\n+/g, '\n')), and the file.

        4 The await keyword before Promise.all ensures that the code execution will pause until Promise.all has resolved. At that point, resolveMDNTags will be an array of objects, each containing a marker, a replacement, and a file.
      */
      if ( MDNTags.length ) {
        const resolveMDNTags = await Promise.all( MDNTags.map( async ( mdnTagObject ) => {
          const replacementString = await resolveMDNComponent( mdnTagObject );
          return {
            marker: mdnTagObject.marker,
            replacement: replacementString.trim().replace( /\n{3,}/g, '\n\n' ).replace( /^\s+/gm, '' ).replace( /\s+$/gm, '' ),
            file
          };
        } ) );

        // Replace the MDN tags with the resolved content
        resolveMDNTags.forEach( ( { marker, replacement, file } ) => {
          files[ file ].contents = Buffer.from( files[ file ].contents.toString().replace( marker, replacement ) );
        } );
      }
    } );
  };

};
export default MDN;
