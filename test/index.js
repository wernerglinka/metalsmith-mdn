/* eslint-env node,mocha */
import assert from 'node:assert';
import { resolve, dirname } from 'node:path';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import equals from 'assert-dir-equal';
import Metalsmith from 'metalsmith';
import plugin from '../src/index.js';

const __dirname = dirname( fileURLToPath( import.meta.url ) );
const { name } = JSON.parse( readFileSync( resolve( __dirname, '../package.json' ), 'utf-8' ) );

function fixture( p ) {
  return resolve( __dirname, 'fixtures', p );
}

describe( 'metalsmith-mdn', function () {
  it( 'should export a named plugin function matching package.json name', function () {
    const namechars = name.split( '/' )[ 1 ];
    const camelCased = namechars.split( '' ).reduce( ( str, char, i ) => {
      str += namechars[ i - 1 ] === '-' ? char.toUpperCase() : char === '-' ? '' : char;
      return str;
    }, '' );
    assert.strictEqual( plugin().name, camelCased.replace( /~/g, '' ) );
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
} );
