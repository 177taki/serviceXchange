var express = require('express')
	, path = require('path')
	, passport = require('passport')
	, OAuth2Strategy = require('passport-oauth').OAuth2Strategy
	, InternalOAuthError = require('passport-oauth').InternalOAuthError
	, util = require('util')
	, server = express()
	, log4js = require('log4js')
	, log = log4js.getLogger();

var	provider = {
		protocol: 'http'
	,	host: 'localhost:9000'
	, authURL: '/authorize'
	, tokenURL: '/token'
};
var client = {
		protocol: 'http'
	, host: 'localhost:5000'
	, name: 'ServiceA'
	, clientID: 's1'
	, clientSecret: 'secretA'
	, callbackURL: '/callback'
};

function Strategy(opts, verify) {
	opts = opts || {};
	opts.authorizationURL = opts.authorizationURL || (provider.protocol+'://'+provider.host+provider.authURL);
	opts.tokenURL = opts.tokenURL || (provider.provider+'://'+provider.host+provider.tokenURL);

	OAuth2Strategy.call(this, opts, verify);
	this.name = 'oauthx';
}
util.inherits(Strategy, OAuth2Strategy);

Strategy.prototype.userProfile = function(accessToken, done) {
	this._oauth2.get(provider.protocol+'://'+provider.host+'/userinfo', accessToken, function(err, body) {
		log.info('Strategy.prototype.userProfile is called');
		if (err) { 
			return done(new InternalOAuthError('failed to fetch user profile', err)); }

			try {
				var json = JSON.parse(body)
					, profile = { provider: 'oauthx' };
				profile._json = json;
				log.trace(profile);
				done(null, profile);
			} catch(e) {
				done(e);
			}
	});
};

var user = {
	findOrCreate:function(profile, cb) {
		cb(null, profile);
	}
};
passport.serializeUser(function(user, done) {
	done(null, user);
});
passport.deserializeUser(function(obj,done) {
	var user = obj;
	done(null, user);
});

passport.use(new Strategy({
		clientID: client.clientID
	, clientSecret: client.clientSecret
	, callbackURL: client.protocol+'://'+client.host+client.callbackURL
	}
,	function (accessToken, refreshToken, profile, done) {
		user.findOrCreate({ profile: profile }, function(err, user) {
			log.info('user.findOrCreate is called');
			user.accessToken = accessToken;
			log.trace(user);
			return done(err, user);
		});
	}
));

server.use(express.static(__dirname+'/www/s'));
server.use(express.cookieParser());
server.use(express.bodyParser());
server.use(express.session({ secret: 'keyboard mouse' }));
server.use(passport.initialize());
server.use(passport.session());
server.use(server.router);


server.get('/account', function(req, res, next) {
	var request = require('request')
		, options = {
				url: provider.protocol+'://'+provider.host+'/userinfo'
			,	headers: {
					'Authorization': 'Bearer '+req.user.accessToken
				}
			};
	
	function callback(error, response, body) {
		if (!error && response.statusCode === 200) {
			res.send(body);
		}
		else {
			res.send('error: \n'+body);
		}
	};

	request(options, callback);
});

server.get('/oauthx', passport.authenticate('oauthx', { scope: ['email'] }));
/**/
server.get('/callback', passport.authenticate('oauthx', { failureRedirect: '/' }),
												function(req,res,next) {
													var url = 'success.html';
													log.info('GET callback url');
													log.info('redirect to %s.', url);
													res.redirect(url);
												});
/*/
server.get('/callback', function(req,res,next) {
	passport.authenticate('oauthx', { failureRedirect: '/' })
});
server.get('/callback', function(req,res,next) {
	res.redirect('success.html');
});
//*/

server.listen(5000);
