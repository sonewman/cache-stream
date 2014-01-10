# Cache-Stream

Simple streaming module implementing the Stream2 interface for Node.js v0.10+

Install:
`$ npm i cache-stream`

```javascript
  var cacheStream = require('cache-stream')
    , cache = cacheStream();

  fs.createReadStream(path.join(__dirname, './my-file.txt')).pipe(cache);
```

from here you can do anything streamy you like:

```javascript
  var through = new require('stream').Passthrough;
  cache.pipe(through);
  through.on('finish', function () {
    cache.pipe(process.stdout);
  });
```