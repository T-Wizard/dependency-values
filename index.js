let DirectoryStructureJSON = require( "directory-structure-json" );
let dependencyTree = require( "dependency-tree" );
let fs = require( "fs" ); // you can select any filesystem as long as it implements the same functions that native fs uses.
let path = require( "path" );

let rootpath = path.resolve( process.argv[2] ).replace( /\\/g, "/" );
let basepath = path.resolve( process.argv[2] ).replace( /\\/g, "/" );

let parser = require( "gitignore-parser" );
let gitignore = parser.compile( fs.readFileSync( ".gitignore", "utf8" ) );

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

    console.log( "There are a total of: " + total.folders + " folders and " + total.files + " files" );

    let files = [];
    let maxLevel = 0;
    let cur = 0;

    structure = recursive( structure, ( item, curPath ) => {
      if ( item.type === "file" ) {
        cur++;

        //let anim = [ "..", ".:", "::", ":." ][ cur % 4 ];
        let anim = [ "⌌", "⌍", "⌏", "⌎" ][ cur % 4 ];

        process.stdout.write( "\r[" + anim + "] Progress: " + Math.floor( ( cur / total.files ) * 100 ) + "% " );

        //console.log( `basepath + curPath + "/" + item.name, ${basepath} ${curPath} ${item.name}` );
        let wholeFilePath = basepath + curPath + "/" + item.name;
        let relativePath = ( curPath + "/" + item.name ).substr( 1 );

        wholeFilePath = wholeFilePath.replace( /\\/g, "" );
        relativePath = relativePath.replace( /\\/g, "" );

        if ( gitignore.accepts( relativePath ) && relativePath.indexOf( "/." ) !== 0 ) {
          let tree = dependencyTree( {
            filename: wholeFilePath,
            directory: basepath
          } );

          let filePath = Object.keys( tree )[0];
          if( !filePath ) {
            console.log( `[warn] ${wholeFilePath} ${basepath}` ); 
            return;
          }
          
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

          //let columns = ( "/" + relativePath ).split( "/" );
            let columns = [ today, relativePath, numDep,numExt,numInt ];

          if ( columns.length > maxLevel ) {
            maxLevel = columns.length;
          }

          files.push( columns );
        }
      }
    } );

    let headerRow = [ "Date", "Path", "Number of Dependencies", "Number of external Dependencies", "Number of internal Dependencies" ];
    files.splice( 0,0, headerRow );

    let convertToCSV = function( table ) {
        let output = "";
        table.forEach( ( row ) => {
            output += row.join( "," ) + "\r\n";
        } );
        return output;
    };

    //fs.writeFile( "./output/output.json", JSON.stringify( structure ) );
    fs.writeFile( process.argv[3] || "output.csv" , convertToCSV( files ) );

    console.log( "\rDone!                                  " );
} );
