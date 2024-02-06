import * as marked from 'marked';

// functions to extend Nunjucks environment
export const spaceToDash = ( string ) => string.replace( /\s+/g, '-' );
export const condenseTitle = ( string ) => string.toLowerCase().replace( /\s+/g, '' );
export const UTCdate = ( date ) => date.toUTCString( 'M d, yyyy' );
export const blogDate = ( date ) => date.toLocaleString( 'en-US', { year: 'numeric', month: 'long', day: 'numeric' } );
export const trimSlashes = ( string ) => string.replace( /(^\/)|(\/$)/g, '' );
export const mdToHTML = ( mdString ) => {
  try {
    return marked.parse( mdString );
  } catch ( e ) {
    return mdString;
  }
};
export const thisYear = () => new Date().getFullYear();

// export an objec t with all filters
export default {
  spaceToDash,
  condenseTitle,
  UTCdate,
  blogDate,
  trimSlashes,
  mdToHTML,
  thisYear
};