const fs = require('fs');
const { imageSize } = require('image-size-v2');

// image-size 2 only accepts bytes; 1.x also accepted a file path.
module.exports = (input) => imageSize(typeof input === 'string' ? fs.readFileSync(input) : input);
