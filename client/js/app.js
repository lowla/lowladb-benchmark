var now = (function() {
    var performance = window.performance || {};
    performance.now = (function() {
        return performance.now    ||
        performance.webkitNow     ||
        performance.msNow         ||
        performance.oNow          ||
        performance.mozNow        ||
        function() { return new Date().getTime(); };
    })();
    return performance.now();
}); 

var deleteDatabase = function() {
    return new Promise(function(resolve, reject) {
      console.log("Attempting to delete database");
      var req = indexedDB.deleteDatabase("lowla");
      req.onsuccess = function () {
        console.log("Deleted database");
        resolve();
      };

      req.onerror = function () {
        reject('failed to delete db');
      };
    });
}

var findRandomRecords = function(results, coll, count, key) {
    var id = Math.floor(Math.random() * count).toString();
    console.log("Finding: " + id);
    var query = {};
    query[key] = id;
    return coll.findOne(query).then(function(doc) {
        end = now();
        console.log(JSON.stringify(doc));
        results.push(end - start);
        if (results.length < 11) {
            start = now();
            return findRandomRecords(results, coll, count, key);
        }
        else {
            return 0;
        }
    });
};

var measure = function(datastore, dataSet) {
  var lowla = new LowlaDB({datastore: datastore});
  
  start = now();
  var results = [];
  var count;
  
  var coll = lowla.collection('lowladb', dataSet);
  $('#mytable > tbody:last').append("<tr><td>Test</td><td>" + dataSet + " using " + datastore + "</td></tr>");  
  return deleteDatabase()
    .then(function() {
      return lowla.load("data/" + dataSet + "-dump.json");
    })
    .then(function() {
      var end = now();
      $('#mytable > tbody:last').append("<tr><td>Load</td><td>" + (end - start).toFixed(2) + "</td></tr>");  
      start = now();
      return coll.count();
    })
    .then(function(countResult) {
      count = countResult;
      console.log("Count: " + count);
      var end = now();
      $('#mytable > tbody:last').append("<tr><td>Count</td><td>" + (end - start).toFixed(2) + "</td></tr>");
      return findRandomRecords(results, coll, count, "_id");
    })
    .then(function() {
      results.shift(); // Remove the first element since the first seek may take longer
      var avg = results.reduce(function(a,b){return a + b;})/results.length;
      $('#mytable > tbody:last').append("<tr><td>Seek (_id)</td><td>" + avg.toFixed(2) + "</td></tr>");
      results.length = 0;
      return findRandomRecords(results, coll, count, "id");
    })
    .then(function() {
      results.shift(); // Remove the first element since the first seek may take longer
      var avg = results.reduce(function(a,b){return a + b;})/results.length;
      $('#mytable > tbody:last').append("<tr><td>Seek (id)</td><td>" + avg.toFixed(2) + "</td></tr>");
      lowla.close();
    });
}

var start;

measure('Memory', 'no_bin_data')
  .then(function() {
    return measure('IndexedDB', 'no_bin_data');
  })
  .then(function() {
    return measure('Memory', 'bin_thumb');
  })
  .then(function() {
    return measure('IndexedDB', 'bin_thumb');
  })
  .then(function() {
    return measure('Memory', 'bin_1mb');
  })
  .then(function() {
    return measure('IndexedDB', 'bin_1mb');
  });
