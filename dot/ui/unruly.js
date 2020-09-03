var koa = require('koa')
	, app = koa()
	, parse = require('co-body')
	, logger = require('koa-logger')
	, route = require('koa-route')
	, serve = require('koa-static')
//	, neo4j = require('neo4j')
//	, db = new neo4j.GraphDatabase("http://192.168.59.103:7474")
	,	db = require('seraph')("http://192.168.59.103:7474")
	, thunkify = require('thunkify')
	;

var args = require('node-getopt').create([
	['w', '', 'Enable WAN'],
	['l', '=', 'Log level'],
	['h', 'help', 'Display help']
	])
	.bindHelp()
	.parseSystem();

//app.use(logger());
//app.use(body());
/*
app.use(function* () {
	this.body = this.request.body;
});
*/
app.use(route.get('/graph', fetch));
app.use(route.post('/update', function *(){console.log('sync');}));
app.use(route.delete('/edge/:id', unlink));
app.use(route.put('/subscribe', link));
app.use(route.post('/hub', create));
app.use(serve(__dirname));

/*
db.getIndexedNodes("node_auto_index", 'type', 'hub', function (err, res) {console.log(res);});
db.getNodeIndexes(function(e,r){console.log(r);});
db.getNodeIndexes = thunkify(db.getNodeIndexes);
//tno.delete(function(e,r){if(e) throw e;});
//db.getIndexedNodes = thunkify(db.getIndexedNodes);
db.getNodeById = thunkify(db.getNodeById);
*/

db.read = thunkify(db.read);
db.find = thunkify(db.find);
db.relationships = thunkify(db.relationships);
db.rel.create = thunkify(db.rel.create);
db.save = thunkify(db.save);
var fs = require('fs');
function *fetch() {
	var owner = yield db.find({type: 'root'});
	var owns = yield db.relationships(owner, 'out', 'own');
	owns = Array.prototype.concat.apply([],owns);
	var nodes = yield owns.map(function(own) {
		return db.read(own.end);
	});
	var signups = yield db.relationships(owner, 'out', 'signup');
	signups = Array.prototype.concat.apply([],signups);
	var services = yield signups.map(function(signup) {
		return db.read(signup.end);
	});
	var links = yield nodes.map(function (node) {
		return db.relationships(node, 'all');
	});
	var obj = {};
	obj.dots = nodes;
	obj.services = services;
	obj.links = Array.prototype.concat.apply([],links);
	fs.writeFile("data.json", JSON.stringify(obj));
	this.body = obj;
};

function *link() {
	var edge = yield parse(this);
	this.body = yield db.rel.create(edge.start, 'subscribe', edge.end);
	this.status = 200;
};
function *unlink(id) {
	db.rel.delete(id, function(err) {
							 if (err) {
							 	console.log('Unable to delete edge');
							 }
	});
	this.status = 200;
};
function *create() {
	var node = yield parse(this);
	var owner = yield db.find({type: 'root'});
	var hub = yield db.save(node);
	var r = yield db.rel.create(owner[0].id, 'own', hub.id);
	this.body = hub;
	this.status = 200;
};

app.listen(8888);
console.log('UI listening on 8888');
