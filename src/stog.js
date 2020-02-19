const fs = require('fs');
const util = require('util');
const path = require('path');
const showdown = require('showdown');
const JSDOM = require('jsdom').JSDOM;
const fsHelper = require('./helpers/fsHelper');
const dateHelper = require('./helpers/dateHelper');
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
            post.date = (await stat(filePath)).birthtime;
            post.created = dateHelper.formatDate(post.date);
            posts.push(post);
        }
    }

    await writePosts(posts, config, outputPath);
    await writeIndexPage(posts, config, outputPath);
    await writePostList(posts, config, outputPath);
}

async function writePosts(posts, config, outputPath) {
    for(let i = 0; i < posts.length; i++) {
        const post = posts[i];
        await fsHelper.createIfNotExists(outputPath);
        let dom = new JSDOM(post.html);
        let document = dom.window.document;
        addStyle(document, config);
        writeTitle(dom, post.tabname);
        writeNav(dom, posts, config);
        wrapContents(dom);
        let date = document.createElement('p');
        date.textContent = 'Created: ' + post.created;
        let heading = document.getElementById(post.title.toLowerCase().replace(/[^\w]|_/g, ""));
        heading.parentNode.insertBefore(date, heading.nextSibling);
        await writeFile(outputPath + fsHelper.findFileName(post.filename) + '.html', dom.serialize());
    }
}

async function writePostList(posts, config, outputPath) {
    let dom = new JSDOM();
    let document = dom.window.document;
    writeNav(dom, posts, config);

    let sortedPosts = posts.sort((a, b) => {
        return a.date - b.date;
    });

    let currentYear = null;
    let currentMonth = null;

    let history = document.createElement('div');
    history.setAttribute('id', 'wrapper');

    sortedPosts.forEach(post => {
        if(currentYear != post.date.getFullYear()) {
            currentYear = post.date.getFullYear();
            let yearHeading = document.createElement('h2');
            yearHeading.textContent = currentYear;
            history.appendChild(yearHeading);
        }

        if(currentMonth != post.date.getMonth()) {
            currentMonth = post.date.getMonth();
            let monthHeading = document.createElement('h3');
            monthHeading.textContent = dateHelper.monthMap[currentMonth];
            history.appendChild(monthHeading);
        }

        let postLink = document.createElement('a');
        postLink.setAttribute('href', fsHelper.findFileName(post.filename) + '.html');
        postLink.textContent = post.title;
        history.appendChild(postLink);
        history.appendChild(document.createElement('br'));
    });

    let topLevelDiv = document.createElement('div');
    topLevelDiv.setAttribute('class', 'topLevel');
    topLevelDiv.appendChild(document.getElementById('stog-content'));
    topLevelDiv.appendChild(history);
    document.querySelector('body').appendChild(topLevelDiv);

    writeTitle(dom, 'History - ' + config.title);
    addStyle(document, config);

    await writeFile(outputPath + 'history.html', dom.serialize());
}

async function writeIndexPage(posts, config, outputPath) {
    // Write the index page
    let dom = new JSDOM();
    let document = dom.window.document;
    writeNav(dom, posts, config);

    let topLevelDiv = document.createElement('div');
    topLevelDiv.setAttribute('class', 'topLevel');
    topLevelDiv.appendChild(document.getElementById('stog-content'));

    let contentDom = new JSDOM(posts[0].html);
    let body = contentDom.window.document.querySelector('body');
    let contents = document.createElement('div');
    contents.setAttribute('id', 'wrapper');
    body.childNodes.forEach(node => {
        contents.appendChild(node);
    });
    topLevelDiv.appendChild(contents);
    document.querySelector('body').appendChild(topLevelDiv);
   
    writeTitle(dom, config.title);
    addStyle(dom.window.document, config);
    await writeFile(outputPath + 'index.html', dom.serialize());
}

function writeTitle(dom, pageTitle) {
    let document = dom.window.document;
    let title = document.createElement('title');
    title.textContent = pageTitle;
    document.querySelector('head').appendChild(title);
}

function writeNav(dom, posts, config) {
    
    let document = dom.window.document;
    let body = document.querySelector('body');
    let div = document.createElement('div');
    div.setAttribute('id', 'stog-content');
    let title = document.createElement('h1');
    title.textContent = config.title;
    let nav = document.createElement('ul');
    let home = document.createElement('li');
    let history = document.createElement('li');
    let homeLink = document.createElement('a');
    let historyLink = document.createElement('a');
    homeLink.textContent = 'Home';
    homeLink.setAttribute('href', 'index.html');
    historyLink.textContent = 'History';
    historyLink.setAttribute('href', 'history.html');

    home.appendChild(homeLink);
    history.appendChild(historyLink);
    nav.appendChild(home);
    nav.appendChild(history);
    div.appendChild(title);
    div.appendChild(nav);
    body.appendChild(div);

    let sortedPosts = posts.concat().sort((a, b) => {
        return a.date - b.date;
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

        div.appendChild(postLink);
        div.appendChild(postDate);
    }
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
    let topLevelDiv = document.createElement('div');
    topLevelDiv.setAttribute('class', 'topLevel');
    topLevelDiv.appendChild(nav);
    topLevelDiv.appendChild(wrapper);
    body.appendChild(topLevelDiv);
}

function addStyle(document, config) {
    let style = document.createElement('link');
    style.setAttribute('rel', 'stylesheet');
    style.setAttribute('href', config.css);
    document.querySelector('html').appendChild(style);
}
