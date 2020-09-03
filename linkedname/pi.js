var log4js = require('log4js')
	, log = log4js.getLogger();

var restify = require('restify');
var config = require('./www/ui/link.json');
var cy = require('./www/ui/cytoscape-2.2.2');
var graph = cy(config);

exports.head = function(d, s) {
	var e = graph.edges(s+"[source='"+d+"']");
	return e.target().id();
}
exports.resides = function(id) {
	return graph.nodes("[id='"+id+"']").nonempty();
}

function start() {
	var server = restify.createServer();

	server.use(restify.bodyParser());
	server.use(restify.queryParser());
	//server.use(restify.CORS());
	server.get(/\/www\/.*/, restify.serveStatic({
	//   directory: __dirname + "/www",
		 directory: __dirname,
		 default: "index.html"
	}));

	server.get('/graph', function(req,res) {
		res.send(200, graph.json());
	});
	
	server.post('/link', function(req,res) {
		log.trace(JSON.stringify(req.params));
		/* need refinement */
		var proto = null;
		if (req.params.p === 'call') proto = 'sip';
		if (req.params.p === 'email') proto = 'smtp';
		if (req.params.p === 'auth') proto = 'oauth2';
		var se = graph.edges("[source = '"+req.params.ln+"'][target = '"+req.params.t+"'][label = '"+req.params.p+"']."+req.params.d);

		if (se.empty()) {
			graph.add({
				group: "edges",
				classes: req.params.d+" "+proto,
				data: {
					source: req.params.ln,
					target: req.params.t,
					label: req.params.p
				}
			});
			log.info('%s linking to %s', req.params.ln, req.params.t);
		}
		else {
			log.info('%s already linked with %s', req.params.ln, req.params.t);
		}
		res.send(200);
	});

	server.post('/unlink', function(req,res) {
		log.trace(JSON.stringify(req.params));
		var se = graph.edges("[source ='"+req.params.s+"'][target = '"+req.params.t+"'][label = '"+req.params.l+"']."+req.params.d);
		if (se.nonempty()) {
			graph.remove(se);
			log.info('%s unlink off %s.', req.params.s, req.params.t);
		}
		res.send(200);
	});

	server.get('/create', function(req,res) {
		log.trace(req.query);
		if (graph.nodes("[id='ln.org."+req.query.ownname+"']").empty()) {
			graph.add({
				group: "nodes",
				classes: "linker",
				data: {
					id: 'ln.org.'+req.query.ownname,
					name: req.query.ownname+'@org.ln'
				}
			});
			graph.add({
				group: "edges",
				classes: "inner",
				data: {
					source: "root",
					target: 'ln.org.'+req.query.ownname
				}
			});
			log.info('%s@org.ln is created', req.query.ownname);
			res.send(201,graph.json());
		}
		else {
			log.info('%s@org.ln already exists.', req.query.ownname);
			res.send(204);
		}
	});

	server.get('/pin', function(req,res) {
		log.trace(req.query);
		if(graph.nodes("[id='"+req.query.foreignid+"@"+req.query.name+"']").empty()) {
			graph.add({
				group: "nodes",
				classes: req.query.category,
				data: {
					id: req.query.foreignid+'@'+req.query.name,
					name: req.query.name,
					label: req.query.name,
					icon: 'img/'+req.query.icon
				}
			});
			log.info('%s@%s is pinned.', req.query.foreignid, req.query.name);
			res.send(201,graph.json());
		}
		else {
			log.info('%s@%s already pinned', req.query.foreignid, req.query.name);
			res.send(204);
		}
	});

	server.listen(8080, function() {
		log.info('%s listening at %s', server.name, server.url);
	});
}

exports.start = start;
