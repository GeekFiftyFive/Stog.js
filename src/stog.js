const fs = require('fs');
const util = require('util');
const path = require('path');
const showdown = require('showdown');
const JSDOM = require('jsdom').JSDOM;
const fsHelper = require('./helpers/fsHelper');
const readdir = util.promisify(fs.readdir);
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);
const stat = util.promisify(fs.stat);

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
            const filePath = basePath + config.markdown + filename;
            let contents = await readFile(filePath, config.encoding);
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
            post.created = (await stat(filePath)).birthtime;
            posts.push(post);
        }
    }

    await writePosts(posts, config, outputPath);
    await writeIndexPage(posts, config, outputPath);
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
        let date = document.createElement('p');
        date.textContent = 'Created: ' + post.created;
        let heading = document.getElementById(post.title.toLowerCase().replace(/[^\w]|_/g, ""));
        heading.parentNode.insertBefore(date, heading.nextSibling);
        await writeFile(outputPath + fsHelper.findFileName(post.filename) + '.html', dom.serialize());
    }
}

async function writeIndexPage(posts, config, outputPath) {
    // Write the index page
    let dom = new JSDOM();
    let document = dom.window.document;
    writeNav(dom, config.title);

    let sortedPosts = posts.sort((a, b) => {
        return a.created - b.created;
    });

    for(let i = 0; i < Math.min(config.postsOnHome, posts.length); i++) {
        let post = sortedPosts[i];
        let postLink = document.createElement('a');
        postLink.setAttribute('href', fsHelper.findFileName(post.filename) + '.html');
        let postTitle = document.createElement('h2');
        postLink.appendChild(postTitle);
        postTitle.textContent = post.title;
        let postDate = document.createElement('p');
        postDate.textContent = 'Created: ' + post.created;

        let content = document.getElementById('stog-content');
        content.appendChild(postLink);
        content.appendChild(postDate);
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
    let nav = document.getElementById('stog-content');
    let wrapper = document.createElement('div');
    wrapper.setAttribute('id', 'wrapper');
    let body = document.querySelector('body');
    body.childNodes.forEach(node => {
        wrapper.appendChild(node);
    });
    body.appendChild(nav);
    body.appendChild(wrapper);
}

function addStyle(document, config) {
    let style = document.createElement('link');
    style.setAttribute('rel', 'stylesheet');
    style.setAttribute('href', config.css);
    document.querySelector('html').appendChild(style);
}
