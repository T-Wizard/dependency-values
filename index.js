"use strict";

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var DirectoryStructureJSON = require("directory-structure-json");
var dependencyTree = require("dependency-tree");
var fs = require("fs"); // you can select any filesystem as long as it implements the same functions that native fs uses.
var path = require("path");

var rootpath = path.resolve(process.argv[2]).replace(/\\/g, "/");
var basepath = rootpath;

var parser = require("gitignore-parser");
var gitignore = parser.compile(fs.readFileSync(".gitignore", "utf8"));

var today = new Date().toISOString().split("T")[0];

var recursive = function recursive(item, callback) {
    var curPath = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : "";

    var output = {};

    Object.keys(item).forEach(function (key) {
        var subItem = item[key];

        var mySubPath = item.type === "folder" ? "/" + item.name : "";

        if ((typeof subItem === "undefined" ? "undefined" : _typeof(subItem)) === "object") {
            subItem = recursive(subItem, callback, curPath + mySubPath);
        }

        callback(subItem, curPath);

        output[key] = subItem;
    });

    return output;
};

var getNumOfExternal = function getNumOfExternal(curPath, dependencies) {
    var num = 0;

    dependencies.forEach(function (item) {
        var itemPath = item.replace(rootpath, "");
        if ( /^\/?node_modules\//gui.test( itemPath ) ) {
                num++;
    }
});

return num;
};

DirectoryStructureJSON.getStructure(fs, basepath, function (err, structure, total) {
    if (err) {
        console.log(err);
    }

    console.log("There are a total of: " + total.folders + " folders and " + total.files + " files");

    var files = [];
    var maxLevel = 0;
    var cur = 0;

    structure = recursive(structure, function (item, curPath) {
        if (item.type === "file") {
            cur++;

            //let anim = [ "..", ".:", "::", ":." ][ cur % 4 ];
            var anim = ["⌌", "⌍", "⌏", "⌎"][cur % 4];

            process.stdout.write("\r[" + anim + "] Progress: " + Math.floor(cur / total.files * 100) + "% ");

            var wholeFilePath = basepath + curPath + "/" + item.name;
            var relativePath = (curPath + "/" + item.name).substr(1);

            wholeFilePath = wholeFilePath.replace(/\\/g, "");
            relativePath = relativePath.replace(/\\/g, "");

            if (gitignore.accepts(relativePath) && relativePath.indexOf("/.") !== 0) {
                var tree = dependencyTree({
                    filename: wholeFilePath,
                    directory: basepath
                });

                var filePath = Object.keys(tree)[0];
                var dependencies = Object.keys(tree[filePath]);

                var numDep = dependencies.length;
                var numExt = getNumOfExternal(filePath, dependencies);
                var numInt = numDep - numExt;

                var dependencyInfo = {
                    numberOfDependencies: numDep,
                    numberOfExternal: numExt,
                    numberOfInternal: numInt
                };

                item.dependencyInfo = dependencyInfo;

                //let columns = ( "/" + relativePath ).split( "/" );
                var columns = [today, relativePath, numDep, numExt, numInt];

                if (columns.length > maxLevel) {
                    maxLevel = columns.length;
                }

                files.push(columns);
            }
        }
    });

    var headerRow = ["Date", "Path", "Number of Dependencies", "Number of external Dependencies", "Number of internal Dependencies"];
    files.splice(0, 0, headerRow);

    var convertToCSV = function convertToCSV(table) {
        var output = "";
        table.forEach(function (row) {
            output += row.join(",") + "\r\n";
        });
        return output;
    };

    //fs.writeFile( "./output/output.json", JSON.stringify( structure ) );
    fs.writeFile(process.argv[3] || "output.csv", convertToCSV(files));

    console.log("\rDone!                                  ");
});