#!/usr/bin/env node
var util = require('util');
var log4js = require('log4js');
var log = log4js.getLogger();

var argv = require('argv');
argv.option({
	name: 'log',
	short: 'l',
	type: 'string',
});
var args = argv.run();

var d = {all: true, 'local': false, 'call': false, 'mail': false, 'auth': false};
if (!args.targets.length) {
	d.all = false;
	d[args.targets[0]] = true;
}
log.setLevel('INFO');
var ll = args.options.log || 'INFO';
log.setLevel(ll);


var pi = require('./pi');
var sipx = require('./sipx');

pi.start();
sipx.start(d['local']);
