module.exports = {
    formatDate: date => {
        return `${date.getDate()}/${date.getMonth() < 10 ? '0' : ''}${date.getMonth() + 1}/${date.getFullYear()}`;
    }
}