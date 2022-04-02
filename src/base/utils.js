
const sum = (list) => list.reduce((acc, cur) => acc + cur, 0);

const getAverage = (list) => list.length
    ? sum(list) / list.length
    : 0;

const getLast = (list) => list && list.length && list[list.length - 1];

module.exports = {
    getAverage,
    getLast,
};
