module.exports = cache;

var fs = require('fs')
  , PassThrough = require('stream').PassThrough;

/**
 * main module.exports
 * @param  {Object} opts Module and Stream options
 * @return {Stream}      Cache Stream
 */
function cache (opts) {
  opts = opts || {};
  //  options sync will default to false
  opts.sync  = opts.sync === true ? opts.sync : false;
  // opts.end = false;

  var stream = new PassThrough(opts);
  stream._cache = [];
  stream._initialFlush = true;

  //  set original write method to local
  var write = stream.write;
  //  monkey patch write method
  stream.write = function (data, enc, cb) {
    //  push data into cache
    //  - this may need to be reconsidered...
    //  this would work for old streams but not new
    //  as buffer would not be created......... hmmm
    stream._cache.push(data);
    write.call(stream, data, enc, cb);
  };

  //  set original pipe method to local
  var pipe = stream.pipe;
  //  monkey patch pipe method
  stream.pipe = function (dest, opts) {
    if (stream._initialFlush) {
      //  call original pipe 
      //  method on the stream
      pipe.call(stream, dest, opts);
      //  if inital flush is true then
      //  the dest will get the data piped
      //  straight-away
      return dest;
    }

    //  if inital flush is false then
    //  the piped stream will not get any of
    //  the already passed data
    flush(stream, dest);
    return dest;
  };

  /**
   * flush the streams data to the destination
   * this is necessary if the user
   * @param  {Stream} stream 
   * @param  {Stream} dest
   */
  function flush (stream, dest) {
      var l = stream._cache.length;
    //  if options sync has been specified then
    //  loop cache and write to dest
    stream._cache.forEach(function (data, i) {

      opts.sync
        ? pump(dest, data, i)
      //  the async way!
        : process.nextTick(pump.bind(dest, data, i));
    });

    function pump(data, i) {
      var last = i === (l-1);
      //  call write or end depending on if 
      //  the data is on it's last chunk
      this[!last ? 'write' : 'end'](data);
    }
  }

  //  if the stream has called the finish event
  //  then we know that the stream which we are consuming
  //  has ended and wel can set stream._initialFlush to false;
  stream.on('finish', function () {
    stream._initialFlush = false;
  });

  //  return the stream
  return stream;
}

//  add readStream method, which creates a
//  fs.createReadStream which is then piped to
//  a cache stream and returned
cache.readStream = readStream;

function readStream (fileName, opts) {
  return fs.createReadStream(fileName, opts).pipe(cache());
}