module.exports = src => {
    let lastSlash = src.lastIndexOf('/');
    return src.substring(0, lastSlash + 1);
}