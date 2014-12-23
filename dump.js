// This is copied from lowladb-cli and modified slightly to remove global state since we may generate
// multiple files simultaneously.
(function(exports) {
  'use strict';

  exports.run = dumpCmd;

  var fs = require('fs');
  var http = require('http');
  var url = require('url');

  function dumpCmd(opts) {
    var options = opts;
    var outStream;
    
    var pullUrl = url.parse(options.adapter || options.server);
    var pullRequest = {
      hostname: pullUrl.hostname,
      port: pullUrl.port,
      method: 'POST',
      path: (pullUrl.pathname && pullUrl.pathname.length > 1) ? pullUrl.pathname : '/_lowla/pull',
      headers: {
        "Content-Type": "application/json"
      }
    };

    var changesUrl = url.parse(options.syncer || options.server);
    if (!changesUrl.pathname || !changesUrl.pathname.length || changesUrl.pathname === '/') {
      changesUrl.pathname = '/_lowla/changes';
    }
    changesUrl.search = '?seq=' + options.sequence;

    http
      .get(url.format(changesUrl), fetchChanges)
      .on('error', function(e) {
        console.log('Unable to fetch changes from Syncer.');
        console.log('The attempted URL was: ' + url.format(changesUrl));
        console.log('The error was: ' + e);
        process.exit(-1);
      });
      
    function fetchChanges(res) {
      var payload = '';
      res.on('data', function (data) {
        payload += data;
      });

      res.on('end', function () {
        var obj = JSON.parse(payload);
        outStream = fs.createWriteStream(options.file);
        outStream.write('{\n  "sequence": ' + obj.sequence + ',\n  "documents": [\n    ');
        fetchData(obj, 0);
      });
    }

    function fetchData(payload, offset) {
      var reqPayload = {ids: []};
      for (var i = 0; i < 10 && offset < payload.atoms.length; i++, offset++) {
        reqPayload.ids.push(payload.atoms[offset].id);
      }
      var reqPayloadStr = JSON.stringify(reqPayload);

      pullRequest.headers["Content-Length"] = Buffer.byteLength(reqPayloadStr);

      var req = http.request(pullRequest, function (res) {
        var firstChunk = true;

        res.on('data', function (chunk) {
          if (firstChunk && offset > 10) {
            outStream.write(',\n    ');
            firstChunk = false;
          }

          outStream.write(chunk);
        });

        res.on('end', function () {
          if (offset < payload.atoms.length) {
            fetchData(payload, offset);
          }
          else {
            outStream.write('\n  ]\n}\n');
          }
        });

      })
        .on('error', function(e) {
          console.log('Unable to fetch documents from Adapter.');
          console.log('The POST request was: ' + JSON.stringify(pullRequest));
          console.log('The error was: ' + e);
          process.exit(-1);
        });
      req.write(reqPayloadStr);
      req.end();
    }
  }

})(exports);
