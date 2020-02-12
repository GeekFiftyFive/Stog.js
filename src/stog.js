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
    let posts = [];

    copyCSS(config, basePath);

    let filenames = await readdir(basePath + config.markdown);
    for(let i = 0; i < filenames.length; i++) {
        const filename = filenames[i];
        if(path.extname(filename) == '.md') {
            let contents = await readFile(basePath + config.markdown + filename, config.encoding);
            let html = converter.makeHtml(contents);
            let dom = new JSDOM(html);

            let post = {
                html: html
            }

            let h1s = dom.window.document.querySelectorAll('h1');
            if(h1s.length != 1) {
                throw Error(`Error validating ${filename}, exactly 1 h1 element must exist`);
            }

            post.title = h1s[0].textContent;
            post.filename = filename;
            post.tabname = post.title + ' - ' + config.title;
            posts.push(post);
        }
    }

    await writePosts(posts, config, outputPath);
    await writeIndexPage(posts, config, outputPath, converter);
}

async function writePosts(posts, config, outputPath) {
    for(let i = 0; i < posts.length; i++) {
        const post = posts[i];
        await fsHelper.createIfNotExists(outputPath);
        let dom = new JSDOM(post.html);
        let document = dom.window.document;
        let title = document.createElement('title');
        title.textContent = post.tabname;
        addStyle(document, config);
        document.querySelector('head').appendChild(title);
        writeNav(dom, config.title);
        wrapContents(dom);
        await writeFile(outputPath + fsHelper.findFileName(post.filename) + '.html', dom.serialize());
    }
}

async function writeIndexPage(posts, config, outputPath, converter) {
    // Write the index page
    let dom = new JSDOM();
    let document = dom.window.document;
    writeNav(dom, config.title);

    for(let i = 0; i < Math.min(config.postsOnHome, posts.length); i++) {
        let post = posts[i];

        let contentDom = new JSDOM(post.html);
        let body = contentDom.window.document.querySelector('body');
        let div = document.createElement('div');
        body.childNodes.forEach(node => {
            div.appendChild(node);
        });
        document.getElementById('stog-content').appendChild(div);
    }

    let title = document.createElement('title');
    title.textContent = config.title;
    document.querySelector('head').appendChild(title);
    addStyle(dom.window.document, config);
    await writeFile(outputPath + 'index.html', dom.serialize());
}

function writeNav(dom, pageTitle) {
    let document = dom.window.document;
    let body = document.querySelector('body');
    let div = document.createElement('div');
    div.setAttribute('id', 'stog-content');
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
