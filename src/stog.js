const fs = require('fs');
const util = require('util');
const path = require('path');

const readdir = util.promisify(fs.readdir);
const readFile = util.promisify(fs.readFile);

module.exports = async (config, basePath) => {
    let markdown = [];

    if(Array.isArray(config.markdown)) {
        //TODO: Implement ability to specify files by array
    } else {
        let filenames = await readdir(basePath + config.markdown);
        filenames.forEach(async (filename) => {
            if(path.extname(filename) == '.md') {
                let contents = await readFile(basePath + config.markdown + filename, 'utf-8');
                console.log(contents);
            }
        })
    }
}