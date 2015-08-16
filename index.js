module.exports = Cache;

var fs = require('fs');
var PassThrough = require('stream').PassThrough;
var inherits = require('inherits');

/**
 * main module.exports
 * @param  {Object} opts Module and Stream options
 * @return {Stream}      Cache Stream
 */
function Cache (opts) {
  var self = this;
  if (!(self instanceof Cache)) 
    return new Cache(opts);

  opts = opts || {};
  //  options sync will default to false
  // self.sync = opts.sync === true ? opts.sync : false;
  opts.sync === true ? opts.sync : false;
  self._options = opts;
  // opts.end = false;
  
  PassThrough.call(self, opts);

  self._cache = [];
  self._initialFlush = true;

  //  if the stream has called the finish event
  //  then we know that the stream which we are consuming
  //  has ended and wel can set stream._initialFlush to false;
  self.on('finish', onFinish);

  function onFinish () {
    self._initialFlush = false;
  }
}

inherits(Cache, PassThrough);

//  set original write method to local
Cache.prototype.write_ = Cache.prototype.write;
//  monkey patch write method
Cache.prototype.write = function (data, enc, cb) {
  //  push data into cache
  //  - this may need to be reconsidered...
  //  this would work for old streams but not new
  //  as buffer would not be created......... hmmm
  this._cache.push(data);
  return this.write_(data, enc, cb);
};

//  set original pipe method to local
var pipe = Cache.prototype.pipe;
//  monkey patch pipe method
Cache.prototype.pipe = function (dest, opts) {
  if (this._initialFlush) {
    //  call original pipe 
    //  method on the stream
    pipe.call(this, dest, opts);
    //  if inital flush is true then
    //  the dest will get the data piped
    //  straight-away
    return dest;
  }
  //  if inital flush is false then
  //  the piped stream will not get any of
  //  the already passed data so we flush the
  //  cache to this destination
  flush(this, dest, this._options.sync);
  return dest;
};

/**
 * flush the streams data to the destination
 * this is necessary if the user
 * @param  {Stream} stream 
 * @param  {Stream} dest
 */
function flush (stream, dest, sync) {
  var cache = stream._cache;
  var last = cache.length - 1;
  //  if options sync has been specified then
  //  loop cache and write to dest
  cache.forEach(function (data, index) {

    sync
      ? pump(dest, data, index, last)
    //  the async way!
      : process.nextTick(function () {
          pump(dest, data, index, last);
        });
  });
}

function isStd (dest) {
  return dest === process.stdout || dest === process.stderr;
}

function pump (dest, data, index, last) {
  //  call write or end depending on if 
  //  the data is on it's last chunk
  if ((index !== last) || isStd(dest))
    dest.write(data);
  else
    dest.end(data);
}

//  add readStream method, which creates a
//  fs.createReadStream which is then piped to
//  a cache stream and returned
Cache.readStream = readStream;

function readStream (fileName, opts) {
  return fs.createReadStream(fileName, opts).pipe(cache());
}
