var lowla = new LowlaDB({datastore:"Memory"});

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

var findRandomRecords = function() {
    var id = Math.floor(Math.random() * 10000).toString();
    console.log("Finding: " + id);
    return coll.findOne({_id : id}).then(function(doc) {
        end = now();
        console.log(JSON.stringify(doc));
        results.push(end - start);
        if (results.length < 11) {
            start = now();
            return findRandomRecords();
        }
        else {
            return 0;
        }
    });
};

var body = "";
var start = now();
var results = [];
var coll = lowla.collection('lowladb', 'no_bin_data');
lowla.load("no_bin_data-dump.json")
  .then(function() {
    var end = now();
    body += "Load: " + (end - start).toString() + "<br/>";
    $("#body").html(body);
    return findRandomRecords();
  })
  .then(function() {
    results.shift(); // Remove the first element since the first seek may take longer
    var avg = results.reduce(function(a,b){return a + b;})/results.length;
    body += "Seek: " + avg.toString();
    $("#body").html(body);
  });
