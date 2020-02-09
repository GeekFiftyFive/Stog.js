const util = require('util');
const fs = require('fs');
const exists = util.promisify(fs.exists);
const mkdir = util.promisify(fs.mkdir);

module.exports = {
    findBasePath: src => {
        let lastSlash = src.lastIndexOf('/');
        return src.substring(0, lastSlash + 1);
    },

    createIfNotExists: async dir => {
        let dirExists = await exists(dir);

        if(!dirExists) {
            await mkdir(dir);
        }
    },

    findFileName: path => {
        let tokens = path.split('/');
        let fileName = tokens[tokens.length - 1];
        let [name, extension] = fileName.split('.');
        return name;
    }
}