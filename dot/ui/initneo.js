var db = require("seraph")("http://192.168.59.103:7474");

var txn = db.batch();

var dots = txn.save([
	{name: "Private", uri: "private@catena",   type: "hub", icon: "face"}
,	{name: "Public", uri: "public@catena",   type: "hub", icon: "social:public"}
,	{name: "Business", uri: "business@catena",   type: "hub", icon: "social:location-city"}
,	{name: "Docomo", uri: "tel:123456789", intent: "call",  type: "endpoint", icon: "android"}
,	{name: "GMail", uri: "mailto:mail@address", intent: "post", type: "endpoint", icon: "mail"}
,	{name: "Bizphone", uri: "tel:012345678", intent: "call", type: "endpoint", icon: "communication:phone"}
,	{name: "Twitter", uri: "mail@mail.com", intent: "post", type: "endpoint", icon: "social-post:twitter"}
,	{name: "Voicemail", uri: "Asterisk", intent: "post", type: "endpoint", icon: "communication:voicemail"}
,	{name: "Speech-to-text", uri: "api@ligo",  type: "hub", icon: "communication:textsms"}
,	{name: "Speech-api", uri: "rest:speechapiv2",  type: "endpoint", icon: "communication:textsms"}
,	{name: "Delivery Notification", uri: "notify@catena", type: "hub", icon: "maps:local-shipping"}
,	{name: "Sales Info", uri: "info@catena", type: "hub", icon: "shopping-basket"}
,	{name: "owner", uri: "onwer@ligo",  type: "root"}
]);

txn.relate(dots[0], 'subscribe', dots[3]);
txn.relate(dots[1], 'subscribe', dots[4]);
txn.relate(dots[1], 'subscribe', dots[6]);
txn.relate(dots[2], 'subscribe', dots[5]);
txn.relate(dots[2], 'subscribe', dots[7]);
txn.relate(dots[7], 'permit', dots[8]);
txn.relate(dots[8], 'subscribe', dots[0]);
txn.relate(dots[8], 'composite', dots[9]);
txn.relate(dots[12], 'own', dots[0]);
txn.relate(dots[12], 'own', dots[1]);
txn.relate(dots[12], 'own', dots[2]);
txn.relate(dots[12], 'own', dots[8]);
txn.relate(dots[12], 'own', dots[10]);
txn.relate(dots[12], 'own', dots[11]);
txn.relate(dots[12], 'signup', dots[3]);
txn.relate(dots[12], 'signup', dots[4]);
txn.relate(dots[12], 'signup', dots[5]);
txn.relate(dots[12], 'signup', dots[6]);
txn.relate(dots[12], 'signup', dots[7]);
txn.relate(dots[12], 'signup', dots[9]);

// own/signup/backend/publish/subscribe

txn.commit(function(err,results) { if (!err) { console.info("succeeded!"); } } );

