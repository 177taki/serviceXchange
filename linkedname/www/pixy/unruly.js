var config = require('./graph.json')
	, graph = require('./cytoscape-2.2.7')(config)
	, express = require('express')
	, bodyParser = require('body-parser')
	, app = express()
	, log4js = require('log4js')
	, log = log4js.getLogger()
	, sipx = require('../../sipx');

var args = require('node-getopt').create([
	['w', '', 'Enable WAN'],
	['l', '=', 'Log level'],
	['h', 'help', 'Display help']
	])
	.bindHelp()
	.parseSystem();
log.setLevel( args.options.l || 'INFO' );

exports.head = function(d, s) {
	var e = graph.edges("[source='"+d+"']");
	var peers = [];
	e.targets().each( function(i, el) {
		if (el.hasClass(s))
			peers.push(el.id());
	});
	return peers;
}
exports.resides = function(id) {
	return graph.nodes("[id='"+id+"']").nonempty();
}

app.use(bodyParser());
app.use(bodyParser.json({type: 'application/json' }));
app.use('/www/pixy', express.static(__dirname));
app.get('/www/pixy/graph', function(req,res) {
	res.send(200, graph.json());
});
app.post('/www/pixy/update',  function(req,res) {
	res.send(200);

	var el = graph.getElementById(req.body.data.id);
	if (el.empty()) {
		graph.add(req.body);
		log.info('ADD:  %s %s', graph.getElementById(req.body.data.id).json().group, JSON.stringify(req.body.data));
	}
	else {
		graph.remove(el);
		log.info('REMOVE:  %s %s', req.body.group, JSON.stringify(req.body.data));
	}

});

app.listen(8888);

/* protocol actors */
sipx.start(args.options.w || false);
