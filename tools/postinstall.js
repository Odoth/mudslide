let fs = require("fs-extra");

// To be run from package root, paths accordingly
fs.createReadStream("node_modules/xterm/css/xterm.css").pipe(fs.createWriteStream('static/xterm.css'));
