$(document).ready(function() {
	
	$('input[type=radio][name=protocol]').click(function() {
		var dir = $('input[type=radio][name=direction]:checked').val()
			, pco = $('input[type=radio][name=protocol]:checked').val()
			, ln = $('#from').text()
			, tg = $('#to').text();

		if (dir === undefined) {
			return;
		}
		else {
			graph.link(ln, tg, pco, dir);
		}
	});

	$('input[type=radio][name=direction]').change(function() {
		var dir = $('input[type=radio][name=direction]:checked').val()
			, pco = $('input[type=radio][name=protocol]:checked').val()
			, ln = $('#from').text()
			, tg = $('#to').text();

		if (pco === undefined) {
			return;
		}
		else {
		//	graph.link(ln, tg, pco, dir);
		}
	});

	$('#create').submit(function(e) {
		e.preventDefault();

		var name = $('#ownname').val();
		$.ajax({
			type: "GET",
			url: "/create",
			dataType: "json",
			async: true,
			data: {
				ownname:name
			},
			success: function(data, status, xhr) {
				if (xhr.status === 201) {
					graph.reload(data);
				} else if (xhr.status === 204) {
					alert(name+' already exists: no update.');
				}
			},
			error: function(data) {
				console.log(data);
				alert('Failed during GET /create');
			}
		});
	});

	$('#pin').submit(function(e) {
		e.preventDefault();

		var cat = $('input[type=radio][name=category]:checked').val()
			, name = $('#exname').val()
			, id = $('#foreignid').val()
			, ico = $('input[type=radio][name=icon]:checked').val()
		$.ajax({
			type: "GET",
			url: "/pin",
			dataType: "json",
			async: true,
			data: {
				category: cat,
				name: name,
				foreignid: id,
				icon: ico
			},
			success: function(data, status, xhr) {
				if (xhr.status === 201) {
					graph.reload(data);
				}
				else if (xhr.status === 204) {
					alert(name+' already pinned.');
				}
			},
			error: function(data) {
				console.log(data);
				alert('Failed during GET /pin');
			}
		});
	});
		
	function names() {
		return $.ajax({
			url: "/graph",
			dataType: "json",
			async: true,
			success: function(link_data) {
				//ajax.parseJSON(data);
			},
			error: function(data) {
				console.log(data);
				alert('Network error has occured please try again');
			}
		});
	}
	function addresses() {
		return $.ajax({
			url: "style.json",
			dataType: "json",
			async: true,
			success: function(style_data) {},
			error: function(style_data) {
				alert('Network error has occured');
			}
		});
	}

	$.when( names(), addresses() ).done(function(link_data, style_data) {
		graph.viz(link_data[2].responseJSON, style_data[2].responseJSON);
	});
});

function linking(l, t, p, d) {
	var d = { "ln": l, "t": t, "p": p, "d": d};
	$.ajax({
		type: "POST",
		url: "/link",
		data: JSON.stringify(d),
		contentType: 'application/json; charset=utf-8',
		dataType: "json"
	});
}
function removeLink(s,t,l,d) {
	var d = {"s":s, "t":t, "l":l, "d":d};
	$.ajax({
		type: "POST",
		url: "/unlink",
		data: JSON.stringify(d),
		contentType: 'application/json; charset=utf-8',
		dataType: 'json'
	});
}

var cy = null;
var graph = {
	layout:function() {
		cy.layout({
			name: 'breadthfirst',
			fit: true,
			circle: true,
			directed: true,
			roots: 'root',
			height: 500,
			width: 500,
			padding: 50
		});
		cy.fit();
	},
	reload:function(link) {
		console.log('reload');
		cy.load(link.elements);
		this.layout();
	},
	link:function(ln, tg, label, dir) {
		var trg = cy.elements("node[id = '"+tg+"']");
		var se = cy.elements("edge[source = '"+ln+"'][target = '"+tg+"'][label = '"+label+"']."+dir);
		if (se.empty()) {
			linking(ln, tg, label, dir);
			trg.lock();
			se.lock();
			cy.add({
				group: "edges",
				classes: dir,
				data: {
					source: ln,
					target: tg,
					label: label
				}
			});
			se = cy.elements("edge[source = '"+ln+"'][target = '"+tg+"'][label = '"+label+"']."+dir);
			se.lock();
		}
	},
	viz:function(link,style) {
		$('#viz').cytoscape(style);
		cy = $('#viz').cytoscape('get');
		cy.load(link.elements);
		this.layout();
		cy.userZoomingEnabled(false);

		cy.on('tap', function(e) {
			var target = e.cyTarget;
			if (target === cy) {
				$('#panel2').slideDown('fast');
			}
			else if (target.isEdge()) {
				var s = target.source().id()
					, t = target.target().id()
					, l = target.data('label')
					, d = (target.hasClass('out') ? 'out' : (target.hasClass('in') ? 'in':'undirected'));
				removeLink(s,t,l,d);
				var sorn = target.target();
				cy.remove(target);
				var oe = cy.elements("edge[source ='"+s+"'][target = '"+t+"']");
				if (oe.empty()) {
					sorn.unlock();	
				}
			}
			else if (target.isNode()) {
				if (target.hasClass('native')) {
					$('#panel').slideDown('fast');
				}
				else if (target.hasClass('linker')) {
					var se = cy.edges("edge[source = '"+target.id()+"']");
					if(!target.locked()) {
						cy.elements().unlock();
						var ts = se.targets();
						target.lock();
						ts.lock();
						se.lock();
					}
					else {
						cy.nodes().unlock();
						se.unlock();
					}
				}
				else if (target.hasClass('service')|target.hasClass('name')) {
					var ln = cy.$('.linker:locked');
					if (ln.nonempty()) {
						$('#from').text(ln.id());
						$('#to').text(target.id());
						$('#panel3').slideDown('fast');
					}
						/*
					if(target.locked()) {
						var se = cy.elements("edge[target ='"+target.id()+"']");
						se.each(function(i, ele) {
							if (ele.source().locked()) {
								linking(ele.source().id(), ele.target().id());
								cy.remove(ele);
							}
						});
						target.unlock();
					}
					else {
						var ln = cy.$('.linker:locked');
						if (ln.nonempty()) {
							var ne = 
							cy.add({
								group: "edges",
								data: {
									source: ln.id(),
									target: target.id()
								}
							});
							target.lock();
							linking(ln.id(), target.id());
						}
					}
					*/
				}
			}
		});
	}
}
				
		/*
		cy.on('tap', 'node.native', function(e) {
			console.log(e.cyTarget.styleCxts);
			$('#panel').slideDown('fast');
		});
		cy.on('tap', '.linker', function(e) {
			if(!e.cyTarget.locked()) {
				cy.nodes().unlock();
				var se = cy.edges("edge[source = '"+e.cyTarget.id()+"']");
				var ts = se.targets();
				e.cyTarget.lock();
				ts.lock();
			}
		  else {
				cy.nodes().unlock();
			}
		});
		cy.on('tap', '.terminal', function(e) {
			if(e.cyTarget.locked()) {
				var se = cy.elements("edge[target ='"+e.cyTarget.id()+"']");
				se.each(function(i, ele) {
					if (ele.source().locked()) {
						linking(ele.source().id(), ele.target().id());
						cy.remove(ele);
					}
				});
				e.cyTarget.unlock();
			}
			else {
				var ln = cy.$('.linker:locked');
				if (ln.nonempty()) {
					var ne = 
					cy.add({
						group: "edges",
						data: {
							source: ln.id(),
							target: e.cyTarget.id()
						}
					});
					e.cyTarget.lock();
					linking(ln.id(), e.cyTarget.id());
				}
			}
		});
		*/
