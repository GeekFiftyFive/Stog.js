let configPath = process.argv[2];
if(!configPath) {
    configPath = './stog-config.json'
}
const config = require(`./${configPath}`);