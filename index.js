let configPath = process.argv[2];
if(!configPath) {
    configPath = './stog-config.json';
}

const basePathHelper = require('./src/helpers/basePathHelper');
const config = require(`./${configPath}`);
const basePath = basePathHelper(configPath);