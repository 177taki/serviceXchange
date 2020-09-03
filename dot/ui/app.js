angular.module('App', ['ngAnimate', 'ngTouch'])
.controller('Ctrl', function($scope,$http,$q,$window) {
	var gj = $http.get('/www/pixy/graph');
	var sj = $http.get('gstyle.json');

	var g = null;
	$q.all([gj, sj]).then(function(results) {
		g = new Graph(results[0].data, results[1].data);
		$scope.names = g.names();
		$scope.services = g.services();
		$scope.name = {selected: $scope.names[0]};
	});

	$scope.see = false;
	$scope.direction = "out";
	//$scope.uri = $scope.label = $scope.service = "";

	$scope.submit = function() { 
		if (!($scope.uri !== "" && $scope.label !== "")) {
			$window.alert('please fill in both URI and its Label');
		}
		else if ($scope.service === 'my') {
			var nJson = g.addName($scope.uri, $scope.label);
			if (nJson) {
				$scope.names.push(nJson);
				$http.post('/www/pixy/update', g.getJsonById($scope.uri)).error(function(data, status) {
					$window.alert(status);
				});
			}
			else { 
				$window.alert('Such a name already exists');
			}
		}
		else {
			$window.alert('sorry: Nothing implemented onward');
		}
		$scope.see = false;
	}
	$scope.encode = function(n) {
		var i = base64url.encode(n.id);
		console.log(i);
		return i;
	}
	$scope.reverse = function() {
		$scope.direction = $scope.direction === 'out' ? 'in' : 'out';
	}
	$scope.toggle = function(i) {
		var edge = new Array(2);
		edge[0] = $scope.name.selected;
		edge[1] = $scope.services[i];
		if ($scope.direction === 'in') 
			edge.reverse();

		var eJson = g.update(edge[0],edge[1]);
		$http.post('/www/pixy/update', eJson).error(function(data, status) {
			$window.alert(status);
		});
	}
	$scope.on = function(i) {
		if ( ($scope.direction === 'out' && g.hasEdge($scope.name.selected,$scope.services[i])) ||
		     ($scope.direction === 'in' && g.hasEdge($scope.services[i],$scope.name.selected)) ) {
			return 'on';
		}
	}
});

function Graph(graph, gstyle) {
	$('#view').cytoscape(gstyle);
	cy = $('#view').cytoscape('get');
	cy.load(graph.elements);
	cy.layout({
		name: 'breadthfirst',
		fit: true,
		circle: true,
		directed: true,
		roots: '.root',
	});
	cy.fit();

	this.styleNo = 4;
	//cy.userZoomingEnabled(false);
	this.redraw = function() {
		cy.fit();
		cy.forceRender();
	}
	this.target = function(index) {
		return Array.apply(null, cy.nodes('.name'))[index].data();
	}
	this.names = function() {
		var ns = [];
		cy.nodes('.name').each(function(i, el) {
			ns.push(el.data());
		});
		return ns;
		//return Array.apply(null, cy.nodes('.name'));
	}
	this.services = function() {
		var ss = [];
		cy.nodes('.service').each( function(i, el) {
			ss.push(el.data());
		});
		return ss;
		//return Array.apply(null, cy.nodes('.service'));
	}
	this.edges = function() {
		return cy.edges().each(function(i, el) {
			el.data();
		});
		//return cy.edges();
	}
	this.hasEdge = function(n,s) {
		return cy.edges("[source='"+n.id+"'][target='"+s.id+"']").nonempty();
	}
	this.update = function(n, s) {
		var e = cy.edges("[source='"+n.id+"'][target='"+s.id+"']");
		var eJson;
		if (e.empty()) {
			eJson = cy.add({
				group: "edges"
			, data: { source: n.id, target: s.id }
			}).json();
		}
		else {
			eJson = e.json();
			cy.remove(e);
		}
		return eJson;
	}
	this.addName = function(name, label) {
		 var n = cy.nodes("[id='"+name+"']");
		 if (n.empty()) {
			 cy.add({
				 group: "nodes"
				,classes: "name"
				,data: { id: name, label: label, out: 'out'+this.styleNo, in:'in'+this.styleNo }
			 });
			 this.styleNo = this.styleNo + 1;
		 	 return cy.nodes("[id='"+name+"']").data();
		 }
		 return false;
	}
	this.getJsonById = function(id) {
		return cy.getElementById(id).json();
	}
}

var base64url = {
	fromBase64:function (base64string) {
		  return (
			   base64string
				 .replace(/=/g, '')
				 .replace(/\+/g, '-')
				 .replace(/\//g, '_')
				);
	}
,	toBase64:function (base64UrlString) {
	  if (Buffer.isBuffer(base64UrlString))
		  base64UrlString = base64UrlString.toString()

	  const b64str = this.padString(base64UrlString)
							    .replace(/\-/g, '+')
							    .replace(/_/g, '/');
	  return b64str;
	}
, padString:function (string) {
	  const segmentLength = 4;
	  const stringLength = string.length;
	  const diff = string.length % segmentLength;
	  if (!diff)
	    return string;
	  var position = stringLength;
	  var padLength = segmentLength - diff;
	  const paddedStringLength = stringLength + padLength;
	  const buffer = Buffer(paddedStringLength);
	  buffer.write(string);
	  while (padLength--)
	    buffer.write('=', position++);
	 return buffer.toString();
	}
, decode:function (base64UrlString, encoding) {
		  return Buffer(this.toBase64(base64UrlString), 'base64').toString(encoding);
	}
,	encode:function (stringOrBuffer) {
		  return this.fromBase64(Buffer(stringOrBuffer).toString('base64'));
	}
}	
