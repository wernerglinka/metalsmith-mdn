/* eslint-env node,mocha */
import assert from 'node:assert';
import { resolve, dirname } from 'node:path';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import equals from 'assert-dir-equal';
import Metalsmith from 'metalsmith';
import plugin from '../lib/index.js';

const __dirname = dirname( fileURLToPath( import.meta.url ) );
const { name } = JSON.parse( readFileSync( resolve( __dirname, '../package.json' ), 'utf-8' ) );

function fixture( p ) {
  return resolve( __dirname, 'fixtures', p );
}

/**
 * Normalize content for comparison
 * Handles common whitespace inconsistencies in HTML/Markdown mixed content
 * @param {string} content
 * @returns {string}
 */
function normalizeContent( content ) {
  return content
    .trim() // Remove leading/trailing whitespace
    .replace( /\s+/g, ' ' ) // Normalize multiple spaces to single space
    .replace( /\s+<\/p>/g, '</p>' ) // Clean spaces before closing p tags
    .replace( /\s+<\//g, '</' ) // Clean spaces before any closing tag
    .replace( />\s+</g, '><' ) // Clean spaces between tags
    .replace( /\n{3,}/g, '\n\n' ) // Normalize multiple line breaks
    .replace( /^\s+|\s+$/gm, '' ); // Trim each line
}

describe( 'metalsmith-mdn', function() {
  this.timeout( 5000 );

  it( 'should export a named plugin function matching package.json name', function() {
    const namechars = name.split( '-' )[ 1 ];
    const allUpperCase = namechars.toUpperCase();
    assert.strictEqual( plugin().name, allUpperCase );
  } );

  it( 'should handle no MDN markers', function( done ) {
    Metalsmith( fixture( 'noMarkers' ) )
      .use( plugin() )
      .build( ( err ) => {
        if ( err ) done( err );
        assert.strictEqual( err, null );
        equals( fixture( 'noMarkers/build' ), fixture( 'noMarkers/expected' ) );
        done();
      } );
  } );

  it( 'should handle invalid MDN components', function( done ) {
    Metalsmith( fixture( 'invalidComponent' ) )
      .use( plugin() )
      .build( ( err ) => {
        if ( err ) done( err );
        assert.strictEqual( err, null );
        equals( fixture( 'invalidComponent/build' ), fixture( 'invalidComponent/expected' ) );
        done();
      } );
  } );


  it( 'should not crash the metalsmith build when using default options', function( done ) {
    Metalsmith( fixture( 'default' ) )
      .use( plugin() )
      .build( ( err ) => {
        if ( err ) done( err );
        assert.strictEqual( err, null );
        equals( fixture( 'default/build' ), fixture( 'default/expected' ) );
        done();
      } );
  } );

  it( 'should replace marker with nunjucks component', function( done ) {
    Metalsmith( fixture( 'insertNunjucks' ) )
      .use( plugin( {
        templatesDir: "layouts",
        customFilters: "nunjucks-filters.js",
      } ) )
      .build( err => {
        if ( err ) done( err );
        assert.strictEqual( err, null );
        equals( fixture( 'insertNunjucks/build' ), fixture( 'insertNunjucks/expected' ) );
        done();
      } );
  } );

  it( 'should handle multiple MDN markers in a single file', function( done ) {
    Metalsmith( fixture( 'multipleMarkers' ) )
      .use( plugin( {
        templatesDir: "layouts",
        customFilters: "nunjucks-filters.js",
      } ) )
      .build( ( err ) => {
        if ( err ) done( err );
        try {
          // Read and normalize both files before comparison
          const buildContent = normalizeContent( readFileSync( fixture( 'multipleMarkers/build/index.md' ), 'utf8' ) );
          const expectedContent = normalizeContent( readFileSync( fixture( 'multipleMarkers/expected/index.md' ), 'utf8' ) );

          assert.strictEqual( buildContent, expectedContent );
          done();
        } catch ( error ) {
          done( error );
        }
      } );
  } );

  it( 'should apply custom nunjucks filters correctly', function( done ) {
    Metalsmith( fixture( 'customFilters' ) )
      .use( plugin( {
        templatesDir: "layouts",
        customFilters: "nunjucks-filters.js",
      } ) )
      .build( ( err ) => {
        if ( err ) done( err );
        try {
          const buildContent = normalizeContent( readFileSync( fixture( 'customFilters/build/index.md' ), 'utf8' ) );
          const expectedContent = normalizeContent( readFileSync( fixture( 'customFilters/expected/index.md' ), 'utf8' ) );

          // Verify specific filter applications
          assert( buildContent.includes( 'TEST STRING WITH MIXED CASE' ), 'Uppercase filter not applied' );
          assert( buildContent.includes( 'test string with mixed case' ), 'Lowercase filter not applied' );
          assert( buildContent.includes( 'Test string with mixed case' ), 'Capitalize filter not applied' );

          // Verify complete content match
          assert.strictEqual( buildContent, expectedContent );
          done();
        } catch ( error ) {
          done( error );
        }
      } );
  } );
} );

