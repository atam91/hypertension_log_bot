
const sum = (list) => list.reduce((acc, cur) => acc + cur, 0);

const getAverage = (list) => list.length
    ? sum(list) / list.length
    : 0;


module.exports = {
    getAverage,
};