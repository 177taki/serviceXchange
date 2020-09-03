var smtp = require('simplesmtp');
var mc = require('mailcomposer').MailComposer;
var util = require('util');
var MailParser = require('mailparser').MailParser;

mail = new mc();

function sendmail(msg) {
	var pool = smtp.createClientPool(25,'mailserver', {debug: true});
	pool.sendMail(msg, function(error, responseObj) {
		if (error) {
			console.log(util.inspect(error,null,null));
		}
		console.log(util.inspect(responseObj,null,null));
	});
	pool.close();
}

var str = '';
var server = smtp.createSimpleServer( {SMTPBanner: 'SMTP linked', debug: false}, function(req) {
	req.on('data', function(chunk) {
		str += chunk;
	});
	req.on('end', function() {
		parser.write(str);
		parser.end();
		str = '';
	});	
	req.accept();
});
server.listen(2500, function(err) {
	if (err) {
		console.log(err.message);
	} else {
		console.log('SMTP server listening on port 2500');
	}
});

var parser = new MailParser();
parser.on('end', function(mail_object) {
	//console.log(util.inspect(mail_object,null,null));
	mail._init();
	mail.setMessageOption({
        	from: mail_object.headers.from,
        	to: mail_object.headers.to,
        	subject: 'test',
        	body: mail_object.text,
        	envelope: {
               		from: mail_object.from,
                	to: 'mail@address'
        	}
	});
	sendmail(mail);
});
