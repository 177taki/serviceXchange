var util = require('util');
var log4js = require('log4js');
var log = log4js.getLogger();

var os = require('os');
var mine = os.networkInterfaces().en0[1].address;

var WebSocket = require('ws');
var url = require('url');
var ProxyAgent = require('https-proxy-agent');
var sip = require('sip');
var proxy = require('sip/proxy');

var pi = module.parent.exports;

var contacts = {};
var peers = [];

function start(wan) {
	if (wan) {
		var ws_proxy = 'PROXY SERVER';
		var opts = url.parse(ws_proxy);
		/**/
		var ws_name = 'wss://edge.sip.onsip.com';
		opts.secureEndpoint = true;
		/*/
		var ws_name = 'ws://ws1.versatica.com:10080';
		opts.secureEndpoint = false;
		//*/
		var agent = new ProxyAgent(opts);
		var ws = new WebSocket(ws_name, 'sip', { agent: agent });

		ws.on('open', function() {
			log.info('WS server '+ws_name+ ' connected.');
			//log.trace(util.inspect(ws,null,null));
		});
		ws.on('close', function(e) {
			log.error('WS disconnected (code: ' + e.code + (e.reason? '| reason: ' + e.reason : '') +')');
			ws = new WebSocket(ws_name, 'sip', { agent: agent });
		});
		ws.on('message', function(data, flags) {
			var msg = sip.parse(data);
			log.trace(util.inspect(msg,null,null));
			switch(msg.status) {
				case 100:
					log.info('response (%d:%s) from %s to %s.', msg.status,msg.reason,msg.headers.from.uri,msg.headers.to.uri);
					break;
				default:
					log.trace(util.inspect(msg,null,null));
					msg.headers.via.shift();
					proxy.forwardResponse(null,msg,null);
					log.info('response (%d:%s) from %s to %s.', msg.status,msg.reason,msg.headers.from.uri,msg.headers.to.uri);
					break;
			}
		});
	}
	else {
		log.info('No WAN access mode');
	}

	proxy.start({
		logger: {
			/*
			recv: function(m) {util.debug('recv:'+util.inspect(m,null,null)); },
			send: function(m) {util.debug('send:'+util.inspect(m,null,null)); },
			*/
			error: function(e) {util.debug(e.stack); },
			recv: function(m) {log.trace('recv:\n'+util.inspect(m,null,null)); },
			send: function(m) {log.trace('send:\n'+util.inspect(m,null,null)); }
		}
	}, function(rq) {
		switch(rq.method) {
			case 'SUBSCRIBE':
				proxy.send(sip.makeResponse(rq,202,'Accepted'));
				break;
			case 'REGISTER':
				var user = sip.parseUri(rq.headers.to.uri).user;

				contacts[user] = rq.headers.contact;
				var rs = sip.makeResponse(rq,200,'Ok');
				rs.headers.to.tag = Math.floor(Math.random()*1e6);
				proxy.send(rs);

				log.info(user+' registered.');
				break;
			case 'INVITE':
				var user = sip.parseUri(rq.uri).user;
				var host = sip.parseUri(rq.uri).host;
				var id = user+'@'+host;

				if(pi.resides(id)) {
					proxy.send(sip.makeResponse(rq, 100, 'Trying'));

					rq.headers.via.unshift({params: {branch: sip.generateBranch()}});
					rq.headers.via[0].port = 5060;
					rq.headers.via[0].host = mine;
					rq.headers.via[0].protocol = 'UDP';
					
					//rq.uri = 'sip:'+pi.head(id, '.sip');
					rq.headers['record-route'] = [];
					rq.headers['record-route'].unshift({params: {}});
					rq.headers['record-route'][0].uri = 'sip:'+mine+':5060;transport=udp;lr';
					rq.headers['record-route'].unshift({params: {}});
					rq.headers['record-route'][0].uri = 'sip:129.60.83.63:20066;transport=wss;lr';
					delete rq.headers.route;

					peers = pi.head(id, 'sip');	
					for (var i=0; i<peers.length; i++) {
						rq.uri = 'sip:'+peers[i].substr(peers[i].indexOf('@')+1);
						var m = sip.stringify(rq);
						ws.send(m, function(error) {
							if(error != undefined) {
								log.error(util.inspect(error,null,null));
							}
						});
						log.info('INVITE to %s (%s).', id,rq.uri);
						log.trace(m);
					}
					break;
				} else if(contacts[user] && Array.isArray(contacts[user]) && contacts[user].length>0) {				
					rq.uri = contacts[user][0].uri;
					delete rq.headers.route;
					proxy.send(sip.makeResponse(rq, 100, 'Trying'));
					log.info('Forwarding LOCAL INVITE to %s',rq.uri);
					proxy.send(rq);
				}
				else {
					proxy.send(sip.makeResponse(rq,404,'Not Found'));
				}
				break;

			case 'ACK':
			case 'BYE':
				var user = sip.parseUri(rq.uri).user;
				var host = sip.parseUri(rq.uri).host;

				rq.headers.route.shift();
				rq.headers.route.shift();

				rq.headers.via.unshift({params: {branch: sip.generateBranch()}});			
				rq.headers.via[0].port = 5060;
				rq.headers.via[0].host = mine;
				rq.headers.via[0].protocol = 'UDP';

				ws.send(sip.stringify(rq), function(error) {
					if (error != undefined) {
						log.error(util.inspect(error,null,null));
					}
				});
				log.info('%s to %s',rq.method,rq.uri);
				log.trace(util.inspect(rq,null,null));

				break;

			default:
				proxy.send(sip.makeResponse(rq,405,'Method not allowed'));
				break;
		}
	});
}

exports.start = start;
