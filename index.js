let configPath = process.argv[2];
if(!configPath) {
    configPath = './stog-config.json';
}

const findBasePath = require('./src/helpers/fsHelper').findBasePath;
const config = require(`./${configPath}`);
const basePath = findBasePath(configPath);
const stog = require('./src/stog');

stog(config, basePath).then(() => {console.log('Operation completed')}).catch(err => {console.error(`${err}`)});