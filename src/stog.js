const fs = require('fs');
const util = require('util');
const path = require('path');
const showdown = require('showdown');
const fsHelper = require('./helpers/fsHelper');

const readdir = util.promisify(fs.readdir);
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);

module.exports = async (config, basePath) => {
    let markdown = [];
    const converter = new showdown.Converter();

    if(Array.isArray(config.markdown)) {
        //TODO: Implement ability to specify files by array
    } else {
        let filenames = await readdir(basePath + config.markdown);
        const outputPath = basePath + config.output;
        filenames.forEach(async (filename) => {
            if(path.extname(filename) == '.md') {
                let contents = await readFile(basePath + config.markdown + filename, 'utf-8');
                let html = converter.makeHtml(contents);
                await fsHelper.createIfNotExists(outputPath);
                await writeFile(outputPath + fsHelper.findFileName(filename) + '.html', html);
            }
        })
    }
}