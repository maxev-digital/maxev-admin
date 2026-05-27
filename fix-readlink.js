// Patch fs.readlink to convert EISDIR to EINVAL on Windows
// Node.js v22 on Windows returns EISDIR instead of EINVAL for non-symlink files
// Both enhanced-resolve (webpack) and @vercel/nft handle EINVAL but not EISDIR
'use strict';
const fs = require('fs');

function makeEinval(err) {
  const e = Object.assign(new Error(err.message.replace('EISDIR', 'EINVAL')), {
    code: 'EINVAL', syscall: 'readlink', path: err.path,
  });
  return e;
}

// Patch callback-style readlink
const origRL = fs.readlink.bind(fs);
fs.readlink = function (path, options, callback) {
  if (typeof options === 'function') { callback = options; options = null; }
  const cb = (err, result) => {
    callback(err && err.code === 'EISDIR' ? makeEinval(err) : err, result);
  };
  options ? origRL(path, options, cb) : origRL(path, cb);
};

// Patch promise-style readlink
const origRLP = fs.promises.readlink.bind(fs.promises);
fs.promises.readlink = function (path, options) {
  return origRLP(path, options).catch((err) => {
    if (err && err.code === 'EISDIR') throw makeEinval(err);
    throw err;
  });
};
