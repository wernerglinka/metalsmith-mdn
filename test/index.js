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

describe( 'metalsmith-mdn', function () {
  it( 'should export a named plugin function matching package.json name', function () {
    const namechars = name.split( '-' )[ 1 ];
    const allUpperCase = namechars.toUpperCase();

    assert.strictEqual( plugin().name, allUpperCase );
  } );

  it( 'should not crash the metalsmith build when using default options', function ( done ) {
    Metalsmith( fixture( 'default' ) )
      .use( plugin() )
      .build( ( err ) => {
        if ( err ) done( err );
        assert.strictEqual( err, null );
        equals( fixture( 'default/build' ), fixture( 'default/expected' ) );
        done();
      } );
  } );

  it( 'should replace marker with nunjucks component', function ( done ) {
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
} );
