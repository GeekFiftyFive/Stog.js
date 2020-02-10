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
    const outputPath = basePath + config.output;
    const converter = new showdown.Converter();
    let markdown = [];

    copyCSS(config, basePath);

    if(Array.isArray(config.markdown)) {
        //TODO: Implement ability to specify files by array
    } else {
        let filenames = await readdir(basePath + config.markdown);
        filenames.forEach(async (filename) => {
            if(path.extname(filename) == '.md') {
                let contents = await readFile(basePath + config.markdown + filename, 'utf-8');
                markdown.push(contents); //Store contents for home page
                let dom = await loadContent(contents, config, converter, outputPath);
                writeNav(dom, config.title);
                wrapContents(dom);
                writeFile(outputPath + fsHelper.findFileName(filename) + '.html', dom.serialize());
            }
        })
    }

    // Write the index page
    let dom = new JSDOM();
    writeNav(dom, config.title);
    addStyle(dom.window.document, config);
    writeFile(outputPath + 'index.html', dom.serialize());
}

function writeNav(dom, pageTitle) {
    let document = dom.window.document;
    let body = document.querySelector('body');
    let div = document.createElement('div');
    let title = document.createElement('h1');
    title.textContent = pageTitle;
    let nav = document.createElement('ul');
    let home = document.createElement('li');
    let homeLink = document.createElement('a');
    homeLink.textContent = 'Home';
    homeLink.setAttribute('href', 'index.html');

    home.appendChild(homeLink);
    nav.appendChild(home);
    div.appendChild(title);
    div.appendChild(nav);
    body.appendChild(div);
}

function wrapContents(dom) {
    let document = dom.window.document;
    let wrapper = document.createElement('div');
    let body = document.querySelector('body');
    body.childNodes.forEach(node => {
        wrapper.appendChild(node);
    });
    body.appendChild(wrapper);
}

function addStyle(document, config) {
    let style = document.createElement('link');
    style.setAttribute('rel', 'stylesheet');
    style.setAttribute('href', config.css);
    document.querySelector('html').appendChild(style);
}

async function loadContent(contents, config, converter, outputPath) {
    let html = converter.makeHtml(contents);
    await fsHelper.createIfNotExists(outputPath);
    let dom = new JSDOM(html);
    let document = dom.window.document;
    let title = document.createElement('title');
    let primaryHeading = document.querySelector('h1').textContent;
    title.textContent = primaryHeading + ' - ' + config.title;
    addStyle(document, config);
    document.querySelector('head').appendChild(title);
    return dom;
}
