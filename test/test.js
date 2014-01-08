#!/usr/bin/env node

var test = require('tap').test
  , fs = require('fs')
  , stream = require('stream')
  , StringDecoder = require('string_decoder').StringDecoder
  , d = new StringDecoder('utf8')
  , path = require('path');

var cache = require('../');

test('test stream caches data', function (t) {
  var c = cache()
    , data = fs.readFileSync(path.join(__dirname, './data.txt'), 'utf8')
    , w = new stream.Transform()
    , w2 = new stream.Writable();

  w._write = function (chunk, enc, cb) {
    t.equals(d.write(chunk), data);
    cb(null);
  };

  w.on('finish', c.pipe.bind(c, w2));

  w2._write = function (chunk, enc, cb) {
    t.equals(d.write(chunk), data);
    cb(null);
  };

  w2.on('finish', t.end.bind(t));

  fs.createReadStream(path.join(__dirname, './data.txt')).pipe(c);

  c.pipe(w);

});
