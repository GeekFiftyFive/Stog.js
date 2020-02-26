let configPath = process.argv[2];
if(!configPath) {
    configPath = './stog-config.json';
}

const findBasePath = require('./src/helpers/fsHelper').findBasePath;
let config = require('./src/data/default-stog-config.json');
const userConfig = require(`./${configPath}`);
config = Object.assign(config, userConfig);
const basePath = findBasePath(configPath);
const stog = require('./src/stog');

stog(config, basePath).then(() => {console.log('Operation completed')}).catch(err => {console.error(`${err}`)});