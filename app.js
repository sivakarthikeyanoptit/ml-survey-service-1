
/**
 * Module dependencies.
 */

var express = require('express');
var routes = require('./routes');
var http = require('http');
var path = require('path');

//load customers route
var customers = require('./routes/customers');
//load cassandra route
var cassandrainfo = require('./routes/cassandrainfo');

var app = express();

var cassandra = require('cassandra-driver');

const client = new cassandra.Client({ contactPoints: ["35.200.172.221"] });

// all environments
app.set('port', process.env.PORT || 4201);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', routes.index);
app.get('/cassandrainfo', cassandrainfo.init_cassandra);
app.get('/schools', customers.list);


app.use(app.router);

http.createServer(app).listen(app.get('port'), function () {
  console.log('Express server listening on port ' + app.get('port'));
});
