const fs = require('fs');
const util = require('util');
const path = require('path');
const showdown = require('showdown');
const JSDOM = require('jsdom').JSDOM;
const fsHelper = require('./helpers/fsHelper');

const readdir = util.promisify(fs.readdir);
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);

async function copyCSS(config, basePath) {
    let css = await readFile(basePath + config.css);
    await writeFile(basePath + config.output + config.css, css);
}

module.exports = async (config, basePath) => {
    const converter = new showdown.Converter();

    copyCSS(config, basePath);

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
                let dom = new JSDOM(html);
                let document = dom.window.document;
                let title = document.createElement('title');
                title.textContent = config.title;
                let style = document.createElement('link');
                style.setAttribute('rel', 'stylesheet');
                style.setAttribute('href', config.css);
                document.querySelector('html').appendChild(style);
                document.querySelector('head').appendChild(title);
                await writeFile(outputPath + fsHelper.findFileName(filename) + '.html', dom.serialize());
            }
        })
    }
}