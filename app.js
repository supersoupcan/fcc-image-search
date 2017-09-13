var express = require('express');
var mongodb = require('mongodb');
var MongoClient = mongodb.MongoClient;
var https = require("https");
var app = express();
var mongoURL = 'mongodb://' + process.env.MLAB_USER+ ':'+ process.env.MLAB_PASS + '@ds131854.mlab.com:31854/image-search';


function format(info){
  var formatedOutput = {};
  Object.keys(info).map(function(key){
    formatedOutput[key] = {
      altText : info[key].name,
      url : info[key].webSearchUrl,
      hostURL : info[key].hostPageUrl,
      resolution : {
        width : info[key].width,
        height : info[key].height
      },
    }
  })
  return formatedOutput;
}


app.get("/", function (req, res) {
  res.sendFile(__dirname + '/views/index.html');
});

app.get("/search", function(req, res){
  var formatedSearch = req.query.q.split(' ').join('+');
  var offset = req.query.off ? req.query.off : 0;
  
  MongoClient.connect(mongoURL, function(err, db){
    if (err) throw err;
    var collection = db.collection('list');
    collection.count({}, function(err, count){
      if (err) throw err;
      var newLog = {
        search : req.query.q,
        count : count,
      };
      collection.insert(newLog);
      db.close();
    });
  });

  const options = {
    hostname : 'api.cognitive.microsoft.com',
    path: '/bing/v5.0/images/search?q=' + formatedSearch + '&count=10&offset=' + offset,
    headers : {
      "Ocp-Apim-Subscription-Key" : process.env.AZURE_1
    }
  }
  
  var getReq = https.get(options, function(response){
    console.log('statusCode:', res.statusCode);
    var info = '';
    response.on('data', function(data) {
      info += data;
    });
    response.on('end', function(){
      res.json(format(JSON.parse(info).value));
    });
  });
});

app.get("/list", function(req, res){
    MongoClient.connect(mongoURL, function(err, db){
    if (err) throw err;
    var collection = db.collection('list');
    collection.count({}, function(err, count){
      if (err) throw err;
      collection.find({count : {$gt : count - 10}},{_id : 0, search : 1}).toArray(function(err, recent){
        if (err) throw err;
        res.json(recent);
        db.close();
      })
    })
  })
})

app.listen(process.env.PORT);