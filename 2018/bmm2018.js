
let date, time=[];
const d0 = new Date('01-Jan-2018Z');
jQuery.getJSON('/2018/date.json', function(data){
	date=data;
	var d = new Date(d0);
	for (var i = 0; i < date.length; i += 1) {
		d.setMinutes(d.getMinutes() + 15);
		if (date[i]>0){
			time.push(d.toISOString().slice(0,16).replace('T',' '));
		}
	}
})

mapboxgl.accessToken = 'pk.eyJ1IjoicmFmbnVzcyIsImEiOiIzMVE1dnc0In0.3FNMKIlQ_afYktqki-6m0g';
const map = new mapboxgl.Map({
	container: 'map',
	style: 'mapbox://styles/mapbox/satellite-v9',
	center: [4.5, 49],
	zoom: 4,
});


/*
DRAW PLUGIN
var draw_poly = new MapboxDraw();
map.addControl(draw_poly);
map.on('draw.create', function(e){
	if (e.features[0].geometry.type == 'Point'){
		console.log('Point')
		oReq_ll.open("GET", "/2018/bin/ll_" + findNearest(e.features[0].geometry.coordinates) + ".bin", true);
		oReq_ll.send(null);
	} else if (e.features[0].geometry.type == 'Polygon') {
		
	} else if (e.features[0].geometry.type == 'Polyline') {
		
	}
});
map.on('draw.delete', function(e){
	
});
map.on('draw.update', function(e){
	
});



var findNearest = function(latlng){
	var est_grid = quiver_geojson.features.map( (x) => x.geometry.coordinates);
	var acc = est_grid.reduce(function(acc, curr, id_curr) {
		val = Math.pow((est_grid[id_curr][0] - latlng[0]),2) + Math.pow((est_grid[id_curr][1] - latlng[1]),2);
		return val < acc[0] ? [val, id_curr] : acc;
	},[20,-1]);
	return acc[1]
}
*/



























let grid_geojson, quiver_geojson, timer, speed, resolution, skip, logscale, color, gauge;
var loaded_count=0;
map.on('load', function() {
	
	color = jQuery('input[name="radio-bar"]:checked').val();
	jQuery.getJSON('/2018/grid.geojson', function(geojson){
		grid_geojson = geojson;
		map.addSource('grid_source', { 
			type: 'geojson', 
			data: grid_geojson
		});
		
		map.addLayer({
			id: 'grid_layer',
			type: 'fill',
			source: 'grid_source',
			paint: {
				"fill-color": getFillColor(color),
				"fill-opacity": parseFloat(jQuery('#opacity').val()),
			},
			"filter": ["!=", "value", 0]
		})
		loaded_count +=1;
		if (loaded_count==3){
			jQuery('#modal-loading').hide()
			animate()
		}
	})
	
	jQuery.getJSON('/2018/quiver.geojson', function(geojson){
		
		map.loadImage('/2018/right-arrow.png', function(error, image) {
			map.addImage('arrow', image);
			
			quiver_geojson = geojson;
			map.addSource('quiver_source', { 
				type: 'geojson', 
				data: quiver_geojson,
				/*"cluster": false,
				"clusterRadius": 80,
				"clusterProperties": {
					//"angle": ["get", "angle"],//["/", ["+", ["get", "angle"]] , ["+", ["accumulated"], 1] ],
					//"size": [["+", ["accumulated"], ["get", "size"]], ["get", "size"]]
					//["+", ["case", [">",["get", "size"],0], 1, 0]],
					"size": "point_count_abbreviated"//["+", ["get", "size"]]
				}*/
			});
			
			map.addLayer({
				id: 'quiver_layer',
				type: 'symbol',
				source: 'quiver_source',
				"layout": {
					"icon-image": "arrow",
					"icon-rotate": ['get', 'angle'],
					"icon-size": ['get', 'size'],
				},
				"filter":  ["all", ["!=", "angle", 0], ["!=", "size", 0]]
			})

			loaded_count +=1;
			if (loaded_count==3){
				jQuery('#modal-loading').hide()
				animate()
			}
		})
	})
	
	jQuery('input[name="radio-bar"]').each( function(i, e){
		jQuery(e).after("<div class='h18 bar' style='background: linear-gradient(to right, "+colorbrewer[jQuery(e).attr('value')][9].join(',')+"'></div>")
	})
	jQuery('.bar').hover( ()=> {jQuery('.bar').show()} , ()=> {jQuery('.bar').hide()} )
	jQuery('.bar').on('click', function(e){
		jQuery('.bar').hide()
		color = this.previousElementSibling.value;
		map.setPaintProperty('grid_layer','fill-color',getFillColor(color))
	})

	resolution = parseInt(jQuery('#resolution').val());

	jQuery('#speed').on('change', function() {
		speed=parseInt(this.value);
		jQuery('#speed-toltip').html(this.value+' frames/sec')
	});
	speed=parseInt(jQuery('#speed').val());
	skip = jQuery('#neeButton').hasClass('active');
	jQuery('#speed-div').hover(
		() => { jQuery('#speed').animate({width: 'toggle'});},
		() => { jQuery('#speed').animate({width: 'toggle'});}
		); 
		
		logscale=jQuery('#logscale').prop("checked");
		jQuery('#logscale').on('change', function() {
			logscale=jQuery('#logscale').prop("checked");
			map.setPaintProperty('grid_layer','fill-color',getFillColor(color))
		});
				
		jQuery('#opacity').on('change', function() {
			map.setPaintProperty('grid_layer','fill-opacity', parseFloat(jQuery('#opacity').val())) 
		})
		
	});
	
	
	let gd_density;//, gd_sum, gd_mtr;
	const s = document.getElementById("slider");
	jQuery(document).ready(function() {
		
		gauge = new JustGage({
			id: "gauge",
			value: 0,
			min: 0,
			max: 90,
			valueFontColor: '#F7F5C5',
			label: "Millions of birds",
		});
		
		jQuery('#gauge > svg > text').css('font-family','inherit');
		jQuery('#gauge > svg > text:nth-child(5)').css('font-size','50px');
		jQuery('#gauge > svg > text:nth-child(6)').css('font-size','14px');
		jQuery('#gauge > svg > text:nth-child(7)').css('font-size','12px');
		jQuery('#gauge > svg > text:nth-child(8)').css('font-size','12px');
		
		jQuery('#tlButton').on('click', function(){
			jQuery("#timelinediv").toggle();
			jQuery('#tlButton').toggleClass('active')
			Plotly.Plots.resize(gd_density);
		})
		
		d3colors = Plotly.d3.scale.category10();
		col=[]
		for (var i = 0; i < 11; i += 1) {
			col.push(d3colors(i));
		}
		
		jQuery.getJSON('/2018/MTR.json',function(MTR){
			
			gd_style ={
				width: '100%',
				'margin-left': '0px',
				height: '290px',
				'max-height': 'calc( 100vh - 105px )',
				'margin-top': '0px'
			};
			
			gd_density = document.getElementById('plot_density');
			//gd_sum = document.getElementById('plot_sum'); 
			//gd_mtr = document.getElementById('plot_mtr'); 
			// Plotly.d3.select(gd_density).style(gd_style).node();
			//Plotly.d3.select(gd_sum).style(gd_style).node();
			//Plotly.d3.select(gd_mtr).style(gd_style).node();
			
			var layout = {
				autosize:true,
				margin: {
					l: 35,
					r: 35,
					b: 15,
					t: 0,
				},
				showlegend: true,
				legend: {"orientation": "h", x: 0,y: 1},
				xaxis: {
					range: ['2018-01-01 00:00:00', '2019-01-01 00:00:00'],
					rangeselector: {buttons: [
						{
							count: 1,
							label: '1d',
							step: 'day',
							stepmode: 'backward'
						},
						{
							count: 7,
							label: '1w',
							step: 'day',
							stepmode: 'backward'
						},
						{step: 'all'}
					]
				},
				type: 'date'
			},
			yaxis: {
				title: 'Bird Movement (Distance traveled by all birds in 15min) [bird*km]',
				autorange: true,
				type: 'linear',
			},
			shapes: [  {
				type: "line",
				x0: '2018-01-01 00:00:00',
				x1: '2018-01-01 00:00:00',
				y0: 0,
				y1: 1,
				yref: "paper",
				line: {
					color: '#7F7F7F',
					width: 2,
					dash: 'dot'
				},
			}]
		};
		
		var data = {
			x: time, 
			y: MTR.map(x => x*1000000), 
			mode: "lines", 
			//name: name,
			type: "scatter",
			//legendgroup: 'group'+gd.i_group,
			hoverinfo:'none'
		};
		Plotly.newPlot(gd_density, [data], layout,  {modeBarButtonsToRemove: ['toImage','sendDataToCloud','hoverCompareCartesian','hoverClosestCartesian','hoverCompareCartesian','resetScale2d','zoomIn2d','zoomOut2d']});
		//Plotly.newPlot(gd_sum, [], layout,  {modeBarButtonsToRemove: ['toImage','sendDataToCloud','hoverCompareCartesian','hoverClosestCartesian','hoverCompareCartesian','resetScale2d','zoomIn2d','zoomOut2d']});
		//Plotly.newPlot(gd_mtr, [], layout,  {modeBarButtonsToRemove: ['toImage','sendDataToCloud','hoverCompareCartesian','hoverClosestCartesian','hoverCompareCartesian','resetScale2d','zoomIn2d','zoomOut2d']});
		
		setTimeout(function (){
			jQuery('[data-title="Toggle Spike Lines"]').remove();
			jQuery('[data-title="Produced with Plotly"]').remove()
			jQuery('[data-title="Lasso Select"]').remove()
			jQuery('[data-title="Box Select"]').remove()
		}, 2000);
		
	})
})






var oReq = new XMLHttpRequest();
oReq.responseType = "arraybuffer";
let dens, u, v;
oReq.onload = function (oEvent) {
	if (oReq.response) {
		var byteArray = new Int16Array(oReq.response);
		for (var i = 1; i < byteArray.length; i++) {
			byteArray[i] = byteArray[i-1] + byteArray[i];//+ ( ( byteArray[i] >> 1 ) ^ -( byteArray[i] & 0x1 ) );
		}
		const chunk = 2025;
		var data = new Array( Math.ceil(byteArray.length/chunk) );
		var j = 0
		for (let i=0; i<byteArray.length; i+=chunk) { 
			data[j] = byteArray.slice(i,i+chunk);
			j += 1;
		}
		dens = data.slice(0,data.length/3);
		u = data.slice(data.length/3,data.length/3*2)
		v = data.slice(data.length/3*2,data.length)
		
		
		loaded_count +=1;
		if (loaded_count==3){
			jQuery('#modal-loading').hide()
			animate()
		}
	}
};
oReq.onprogress = function(oEvent) {
	if (oEvent.lengthComputable) {
		var percentComplete = Math.round((oEvent.loaded / oEvent.total) * 100);
		jQuery('#progressbar').css('width',percentComplete+'%')
	} else {
		var percentComplete = Math.round((oEvent.loaded / 182104200) * 100);
		jQuery('#progressbar').css('width',percentComplete+'%')
	}
};
oReq.open("GET", "/2018/density.bin", true);
oReq.send(null);






const sliderchange = function(){
	if (date[s.value]>0){
		map.setLayoutProperty('grid_layer', 'visibility', 'visible');
		map.setLayoutProperty('quiver_layer', 'visibility', 'visible');
		//oReq.open("GET", "/2018/bin/density_" + String(date[s.value]) + ".bin", true);
		//oReq.send(null);
		
		let dt = dens[date[s.value]]
		let ut = u[date[s.value]]
		let vt = v[date[s.value]]
		
		gauge.refresh(dt.reduce( (a,i) => {return a+i})/100*500/1000000);

		for (var i = 0, len = grid_geojson.features.length; i < len; i++) {
			/*if (logscale) {
				grid_geojson.features[i].properties.value = dt[i]==0 ? 0 : Math.log(dt[i]);
			} else {
				
			}*/
			grid_geojson.features[i].properties.value = dt[i];
			const x = ut[i]==0 ? 0 : ut[i]/100-30;
			const y = vt[i]==0 ? 0 : vt[i]/100-30;
			quiver_geojson.features[i].properties.angle = Math.atan2(y,x) * (180/Math.PI) -90;
			quiver_geojson.features[i].properties.size =  Math.min(1, Math.sqrt(x*x + y*y)/20);
		}
		map.getSource('grid_source').setData(grid_geojson);
		map.getSource('quiver_source').setData(quiver_geojson);
		
		
		
		jQuery('#tt-nb-div').removeClass('day').addClass('night')
		jQuery('#tt-sun').removeClass('fa-sun').addClass('fa-moon')
		jQuery('#gauge > svg > text:nth-child(5) > tspan').removeClass('day').addClass('night')
	} else if (skip) {
		i=0
		while (date[parseFloat(s.value)+i] == 0){
			i++
		}
		s.stepUp(i);
		sliderchange()
	} else {
		map.setLayoutProperty('grid_layer', 'visibility', 'none');
		map.setLayoutProperty('quiver_layer', 'visibility', 'none');
		jQuery('#tt-nb-div').removeClass('night').addClass('day')
		jQuery('#tt-sun').removeClass('fa-moon').addClass('fa-sun')		
		jQuery('#gauge > svg > text:nth-child(5) > tspan').removeClass('night').addClass('day')
	}
	let d = new Date(d0.getTime() + s.value*15*60000);
	const d_s = d.toISOString().slice(0,16).replace('T',' ');
	jQuery('#date').html(d_s.replace(' ','&nbsp;'))
	
	Plotly.relayout(gd_density, {'shapes[0].x0':d_s,'shapes[0].x1':d_s})
	//Plotly.relayout(gd_sum, {'shapes[0].x0':d_s,'shapes[0].x1':d_s})
	//Plotly.relayout(gd_mtr, {'shapes[0].x0':d_s,'shapes[0].x1':d_s})
};


const animate = () => {
	s.stepUp(resolution);
	sliderchange()
	timer = setTimeout(animate, 1000/speed)
}

const getFillColor = (color) => {
	var max = parseFloat(jQuery('#caxismax').val());
	var min = parseFloat(jQuery('#caxismin').val());

	var c = ['interpolate',	['linear'],	['get', 'value']];

	if (logscale){

		max = Math.log(max)
		min = Math.log(min);

		var step = (max - min) / (9 - 1);
		for (var i = 0; i < 9; i++) {
			c.push( Math.exp( min + (step * i)))
			c.push(colorbrewer[color][9][i])
		}
	} else {
		var step = (max - min) / (9 - 1);
		for (var i = 0; i < 9; i++) {
			c.push(min + (step * i))
			c.push(colorbrewer[color][9][i])
		}
	}
	console.log(c)
	return c
	
}

const ppeButton = () => {
	if (jQuery('#ppeButton-i').hasClass('fa-play')) {
		animate();
	} else {
		clearTimeout(timer)
	}
	jQuery('#ppeButton-i').toggleClass('fa-play fa-pause');
}
const bweButton = () => {
	s.stepDown(resolution);
	sliderchange()
};

const fweButton = () => {
	s.stepUp(resolution);
	sliderchange()
};
const neeButton = () => {
	jQuery('#neeButton').toggleClass('active')
	skip = jQuery('#neeButton').hasClass('active')
};


document.addEventListener("keydown", function(event){
	if (event.which == '32'){
		ppeButton()
	} else if (event.which == '39'){
		event.preventDefault();
		fweButton()
	} else if (event.which == '37'){
		event.preventDefault();
		bweButton()
	}
});




/*function openTab(evt, cityName) {
	jQuery(".tabcontent").hide();
	jQuery("#"+cityName).show();
	jQuery(".tablinks").removeClass("is-active");
	jQuery(evt.target).addClass("is-active");
	Plotly.Plots.resize(jQuery("#"+cityName)[0]);
}


var oReq_ll = new XMLHttpRequest();
oReq_ll.responseType = "arraybuffer";

oReq_ll.onload = function (oEvent) {
	if (oReq_ll.response) {
		const byteArray = new Uint16Array(oReq_ll.response);
		const chunk = 2207;
		let dens=[]
		for (let i=0; i<byteArray.length; i+=chunk) { 
			dens = [...dens, byteArray.slice(i,i+chunk)];
		} 
		
		Plotly.addTraces(gd_density,{
			x: time, 
			y: dens[0], 
			mode: "lines", 
			name: name,
			type: "scatter",
			//legendgroup: 'group'+gd.i_group,
			hoverinfo:'none'
		});
		
	}
};
*/




















