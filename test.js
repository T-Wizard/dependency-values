let DirectoryStructureJSON = require( "directory-structure-json" );
let dependencyTree = require( "dependency-tree" );
let fs = require( "fs" ); // you can select any filesystem as long as it implements the same functions that native fs uses.
let path = require( "path" );

let rootpath = path.resolve( "../picasso.js/" );
let basepath = path.resolve( "../picasso.js/src/" );

let today = ( new Date() ).toISOString().split( "T" )[0];


let recursive = function( item, callback, curPath = "" ) {
  let output = {};

  Object.keys( item ).forEach( ( key ) => {
    let subItem = item[ key ];

    let mySubPath = item.type === "folder" ? "/" + item.name : "";

    if ( typeof subItem === "object" ) {
      subItem = recursive( subItem, callback, curPath + mySubPath );
    }

    callback( subItem, curPath );

    output[ key ] = subItem;
  } );

  return output;
};

let getNumOfExternal = function( curPath, dependencies ) {
  let num = 0;

  dependencies.forEach( ( item ) => {
    let itemPath = item.replace( rootpath, "" );
    if ( /^\/?node_modules\//gui.test( itemPath ) ) {
      num++;
    }
  } );

  return num;
};

DirectoryStructureJSON.getStructure( fs, basepath, function ( err, structure, total ) {
    if ( err ) { console.log( err ); }

    console.log( "There are a total of: ", total.folders, " folders and ", total.files, " files" );

    let files = [];
    let maxLevel = 0;

    structure = recursive( structure, ( item, curPath ) => {
      process.stdout.write( "." );

      if ( item.type === "file" ) {
        let wholeFilePath = basepath + curPath + "/" + item.name;
        let relativePath = curPath + "/" + item.name;

        wholeFilePath = wholeFilePath.replace( /\\/g, "" );
        relativePath = relativePath.replace( /\\/g, "" );

        let tree = dependencyTree( {
          filename: wholeFilePath,
          directory: basepath
        } );

        let filePath = Object.keys( tree )[0];
        let dependencies = Object.keys( tree[ filePath ] );

        let numDep = dependencies.length;
        let numExt = getNumOfExternal( filePath, dependencies );
        let numInt = numDep - numExt;

        let dependencyInfo = {
          numberOfDependencies: numDep,
          numberOfExternal: numExt,
          numberOfInternal: numInt
        };

        item.dependencyInfo = dependencyInfo;

        let columns = relativePath.split( "/" );

        columns[0] = relativePath;

        if ( columns.length > maxLevel ) {
          maxLevel = columns.length;
        }

        files.push( columns );
      }
    } );

    let nfiles = [];
    let headerRow = [ "Date" ];

    // Add the level headers
    for ( let i = 1; i <= maxLevel - 1; i++ ) {
        headerRow.push( "Level " + i );
    }

    // Add the path column
    headerRow.push( "Path" );

    nfiles.push( headerRow );

    files.forEach( ( item ) => {
        let row = item,
            missingItems = maxLevel - item.length + 1;

        if ( missingItems ){
            row = item.concat( new Array( missingItems ).fill( "" ) );

            // Move the file path to the last column
            row[row.length - 1] = row[0];
            row[0] = today;
        }


        nfiles.push( row );
    } );

    let convertToCSV = function( table ) {
        let output = "";
        table.forEach( ( row ) => {
            output += row.join( "," ) + "\r\n";
        } );
        return output;
    };

    fs.writeFile( "./output/output.json", JSON.stringify( structure ) );
    fs.writeFile( "./output/files.csv", convertToCSV( nfiles ) );

    console.log( "Done!" );
} );
