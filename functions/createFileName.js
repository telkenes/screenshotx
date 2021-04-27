module.exports = function createFileName(date) {
  return `Screen Shot ${date.getDate()}-${date.getMonth()}-${date.getFullYear()} (${date.getHours()}.${date.getMinutes()}.${date.getSeconds()}).png`;
}