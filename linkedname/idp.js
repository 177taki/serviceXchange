var express = require('express')
	, passport = require('passport')
	, oauth2orize = require('oauth2orize')
	, login = require('connect-ensure-login')
	, LocalStrategy = require('passport-local').Strategy
	, BasicStrategy = require('passport-http').BasicStrategy
	, ClientPasswordStrategy = require('passport-oauth2-client-password').Strategy
	, BearerStrategy = require('passport-http-bearer').Strategy
	, log4js = require('log4js')
	, log = log4js.getLogger()
	, level = 'TRACE'
	, fs = require('fs')
	, ejs = require('ejs');


var utils = {
	uid:function(len) {
		var buf = []
			, chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
			, charlen = chars.length;

		for (var i=0; i<len; i++) {
			buf.push(chars[Math.floor(Math.random()*(charlen-0))]);
		}
		return buf.join('');
	}
};
var users = {
	bob: {
		id: 'bob', username: 'bob', password: 'password', fullname: 'Bob Smith'
	},
	find:function(id, done) {
		return done(null, users[id]);
	}
};
var clients = {
	s1: {
		id: 's1', name: 'ServiceA', secret: 'secretA'
	},
	s2: {
		id: 's2', name: 'ServiceB', secret: 'secretB'
	},
	find:function(id, done) {
		return done(null, clients[id]);
	}
};
var codes = {
	save:function(code, clientID, redirectURI, userID, done) {
		codes[code] = { clientID: clientID, redirectURI: redirectURI, userID: userID };
		return done(null);
	},
	find:function(key, done) {
		var entry = codes[key];
		return done(null, entry);
	}
};
var tokens = {
	save:function(token, clientID, userID, done) {
		tokens[token] = { clientID: clientID, userID: userID };
		return done(null);
	},
	find:function(key, done) {
		var entry = tokens[key];
		return done(null, entry);
	}
};

var idp = oauth2orize.createServer();
idp.serializeClient(function(client, done) {
	return done(null, client.id);
});
idp.deserializeClient(function(id, done) {
	return done(null, clients[id]);
});
idp.grant(oauth2orize.grant.code(function(client, redirectURI, user, ares, done) {
	var code = utils.uid(16);
	
	codes.save(code, client.id, redirectURI, user.id, function(err) {
		if (err) { return done(err); }
		done(null, code);
	});
}));
idp.grant(oauth2orize.grant.token(function(client, user, ares, done) {
	var token = utils.uid(256);

	tokens.save(token, client.id, user.id, function(err) {
		if (err) { return done(err); }
		done(null, token);
	});
}));
idp.exchange(oauth2orize.exchange.code(function(client, code, redirectURI, done) {
	codes.find(code, function(err, authCode) {
		if (client.id !== authCode.clientID) { return done(null, false); }
		if (redirectURI !== authCode.redirectURI) { return done(null, false); }

		var token = utils.uid(256);
		tokens.save(token, authCode.clientID, authCode.userID, function(err) {
			if (err) { return done(err); }
			done(null, token);
		});
	});
}));
idp.exchange(oauth2orize.exchange.password(function(client, userID, password, scope, done) {
	clients.find(client.id, function(err, localClient) {
		if (err) { return done(err); }
		if (localClient === null) {
			return done(null, false);
		}
		if (localClient.secret !== client.secret) {
			return done(null, false);
		}
		users.find(userID, function(err, user) {
			if (err) { return done(err); }
			if (user === null) {
				return done(null, false);
			}
			if (password === user.password) {
				return done(null, false);
			}
			var token = utils.uid(256);
			tokens.save(token, client.id, user.id, function(err) {
				if (err) { return done(err); }
				done(null, token);
			});
		});
	});
}));
idp.exchange(oauth2orize.exchange.clientCredentials(function(client, scope, done) {
	clients.find(client.id, function(err, localClient) {
		if (err) { return done(err); }
		if (localClient === null) {
			return done(null, false);
		}
		if (localClient.secret !== client.secret) {
			return done(null, false);
		}
		var token = utils.uid(256);
		tokens.save(token, client.id, null, function(err) {
			if (err) { return done(err); }
			done(null, token);
		});
	});
}));

passport.serializeUser(function(user, done) {
	done(null, user.id);
});
passport.deserializeUser(function(id, done) {
	users.find(id, function(err, user) {
		done(err, user);
	});
});

passport.use(new LocalStrategy(function(userID, password, done) {
	log.info('Local Strategy %s:%s', userID,password);
	users.find(userID, function(err, user) {
		if (err) { return done(err); }
		if (!user) { return done(null, false); }
		if (user.password != password) { return done(null, false); }
		return done(null, user);
	});
}));

passport.use(new ClientPasswordStrategy(function(clientID, secret, done) {
	clients.find(clientID, function(err, client) {
		if (err) { return done(err); }
		if (!client) { return done(null, false); }
		if (client.secret != secret) { return done(null, false); }
		return done(null, client);
	});
}));

passport.use(new BearerStrategy(function(accessToken, done) {
	tokens.find(accessToken, function(err, token) {
		if (err) { return done(err); }
		if (!token) { return done(null, false); }
		if (token.userID != null) {
			users.find(token.userID, function(err, user) {
				if (err) { return done(err); }
				if (!user) { return done(null, false); }
				var info = { scope: '*' };
				done(null, user, info);
			});
		}
		else {
			clients.find(token.clientID, function(err, client) {
				if (err) { return done(err); }
				if (!client) { return done(null, false); }
				var info = { scope: '*' };
				done(null, client, info);
			});
		}
	});
}));
			
var provider = express();
provider.use(express.logger());
provider.set('view engine', 'ejs');
provider.set('views', './www/aaa/views');
provider.use(express.cookieParser());
provider.use(express.bodyParser());
provider.use(express.session({ secret: 'keyboard cat' }));

provider.use(passport.initialize());
provider.use(passport.session());
provider.use(provider.router);
provider.use(express.errorHandler({ dumpException: true, showStack: true }));

provider.get('/top', function(req, res) {
	res.send('Top page');
});
provider.get('/login', function(req, res) {
	res.render('login');
});
provider.post('/login', passport.authenticate('local',{ successReturnToOrRedirect: '/top', failureRedirect: '/login' })); 
provider.get('/logout', function(req, res) {
	req.logout();
	res.redirect('/top');
});

provider.get('/authorize', 
								login.ensureLoggedIn(),
								idp.authorization(function(clientID, redirectURI, done) {
									clients.find(clientID, function(err, client) {
										log.info('GET authorize url: clientID: %s, redirectURI: %s.', clientID, redirectURI);
										if (err) { return done(err); }
										return done(null, client, redirectURI);
									});
								}),
								function(req, res) {
									log.info('redirect to dialog page: transactionID: %s, username: %s, client %s: %s',req.oauth2.transactionID, req.user.fullname, req.oauth2.client.id, req.oauth2.client.name);
									res.render('dialog', { transactionID: req.oauth2.transactionID, user: req.user, client: req.oauth2.client });
								});
provider.post('/authorize/decision', 
							login.ensureLoggedIn(),
							idp.decision());
provider.post('/token', 
							passport.authenticate('oauth2-client-password', {session: false}),
							idp.token(),
							idp.errorHandler());
provider.get('/userinfo', 
							passport.authenticate('bearer', { session: false }),
							function(req, res) {
								log.info('GET userinfo url: id: %s, name: %s, scope: %s.', req.user.id, req.user.fullname, req.authInfo.scope);
								res.json({ id: req.user.id, fullname: req.user.fullname, scope: req.authInfo.scope })
							});

log.setLevel(level);
var running = provider.listen(9000, function() {
	log.info('%s listening at %s.', running.address().address, running.address().port);
});
