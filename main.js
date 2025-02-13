/**
 * Copyright 2023 TriOrb Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * 
 * Based on original work Copyright (c) 2018 Oleg Kalachev
 * 
 */

function generateMarkerSvg(svg, width, height, bits, offset_x = 0, offset_y = 0, draw_border = true) {
	// Border
	if (draw_border) {
		var pixel = document.createElement('rect');
		pixel.setAttribute('x', offset_x - 1);
		pixel.setAttribute('y', offset_y - 1);
		pixel.setAttribute('width', width + 4);
		pixel.setAttribute('height', height + 4);
		pixel.setAttribute('fill', 'white');
		svg.appendChild(pixel);
	}

	// Background rect
	var rect = document.createElement('rect');
	rect.setAttribute('x', offset_x);
	rect.setAttribute('y', offset_y);
	rect.setAttribute('width', width + 2);
	rect.setAttribute('height', height + 2);
	rect.setAttribute('fill', 'black');
	svg.appendChild(rect);

	// "Pixels"
	for (var i = 0; i < height; i++) {
		for (var j = 0; j < width; j++) {
			var white = bits[i * height + j];
			if (!white) continue;

			var pixel = document.createElement('rect');;
			pixel.setAttribute('width', 1);
			pixel.setAttribute('height', 1);
			pixel.setAttribute('x', offset_x + j + 1);
			pixel.setAttribute('y', offset_y + i + 1);
			pixel.setAttribute('fill', 'white');
			svg.appendChild(pixel);

			//if (!fixPdfArtifacts) continue;

			if ((j < width - 1) && (bits[i * height + j + 1])) {
				pixel.setAttribute('width', 1.5);
			}

			if ((i < height - 1) && (bits[(i + 1) * height + j])) {
				var pixel2 = document.createElement('rect');;
				pixel2.setAttribute('width', 1);
				pixel2.setAttribute('height', 1.5);
				pixel2.setAttribute('x', offset_x + j + 1);
				pixel2.setAttribute('y', offset_y + i + 1);
				pixel2.setAttribute('fill', 'white');
				svg.appendChild(pixel2);
			}
		}
	}

	return svg;
}

// 正規分布に従う乱数を生成
function rnorm() {
	return Math.sqrt(-2 * Math.log(1 - Math.random())) * Math.cos(2 * Math.PI * Math.random());
}

function generateRandomPattern(svg, width, height, point_num) {
	// Create random centor points
	let points = [];
	for (var i = 0; i < point_num; i++) {
		var x = Math.random() * width;
		var y = Math.random() * height;
		points.push([x, y]);
	}

	// Generate polygon
	let polygons = new Map();
	for (let xy of points) {
		let cx = xy[0];
		let cy = xy[1];
		let r = Math.abs(rnorm()) * Math.min(width, height) / 2;
		let poly = [];
		for (let ii = 0; ii < (4 - Math.round(Math.random())); ii++) {
			let angle = Math.random() * 2 * Math.PI;
			let x = cx + (r * Math.cos(angle));
			let y = cy + (r * Math.sin(angle));
			poly.push([x, y]);
		}
		polygons.set(r, poly);
	}

	// 面積の大きい順に描画していく
	for (let r of Array.from(polygons.keys()).sort((a, b) => b - a)) {
		var polygon = document.createElement('polygon');
		let fill_norm = rnorm() / 1.5;
		let fill_gray = fill_norm > 0 ? 1 - fill_norm : 1 + fill_norm;
		let fill_color = 'rgb(' + Math.floor(255 * fill_gray) + ',' + Math.floor(255 * fill_gray) + ',' + Math.floor(255 * fill_gray) + ')';
		let stroke_gray = fill_gray > 0.5 ? 0 : 1;
		let stroke_color = 'rgb(' + Math.floor(255 * stroke_gray) + ',' + Math.floor(255 * stroke_gray) + ',' + Math.floor(255 * stroke_gray) + ')';
		let stroke_width = r / 20;
		polygon.setAttribute('fill', fill_color);
		polygon.setAttribute('stroke', stroke_color);
		polygon.setAttribute('stroke-width', stroke_width);
		polygon.setAttribute('stroke-linejoin', 'round');
		polygon.setAttribute('points', polygons.get(r).map(function (p) {
			return p.join(',');
		}).join(' '));
		svg.appendChild(polygon);
	}

	return svg;
}

var dict;

function generateTriOrbMarker(width, height, dictName, id, num, bit_size, field_width, field_height, polygon_num) {
	console.log('Generate ArUco marker ' + dictName + ' ' + id);
	var viebox_width = (field_width / bit_size);
	var viebox_height = (field_height / bit_size);
	var bitsCount = width * height;

	var svg = document.createElement('svg');
	svg.setAttribute('width', field_width + 'mm');
	svg.setAttribute('height', field_height + 'mm');
	svg.setAttribute('viewBox', '0 0 ' + viebox_width + ' ' + viebox_height);
	svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
	svg.setAttribute('shape-rendering', 'crispEdges');

	// Generate Random pattern
	svg = generateRandomPattern(svg, viebox_width, viebox_height, polygon_num);

	// Generate markers
	for (let id_offset = 0; id_offset < num; id_offset++) {
		var bytes = dict[dictName][id + id_offset];
		var bits = [];

		// Parse marker's bytes
		for (var byte of bytes) {
			var start = bitsCount - bits.length;
			for (var i = Math.min(7, start - 1); i >= 0; i--) {
				bits.push((byte >> i) & 1);
			}
		}

		// 左上、右下、左下、右上、中央、左中央、右中央、上中央、下中央の順に並べる
		switch (id_offset) {
			case 0:
				offset_x = 0;
				offset_y = 0;
				break;
			case 1:
				offset_x = viebox_width - width - 4;
				offset_y = viebox_height - height - 4;
				break;
			case 2:
				offset_x = 0;
				offset_y = viebox_height - height - 4;
				break;
			case 3:
				offset_x = viebox_width - width - 4;
				offset_y = 0;
				break;
			case 4:
				offset_x = (viebox_width - width - 4) / 2;
				offset_y = (viebox_height - height - 4) / 2;
				break;
			case 5:
				offset_x = 0;
				offset_y = (viebox_height - height - 4) / 2;
				break;
			case 6:
				offset_x = viebox_width - width - 4;
				offset_y = (viebox_height - height - 4) / 2;
				break;
			case 7:
				offset_x = (viebox_width - width - 4) / 2;
				offset_y = 0;
				break;
			case 8:
				offset_x = (viebox_width - width - 4) / 2;
				offset_y = viebox_height - height - 4;
				break;
			default:
				alert('id_offset is invalid');
				break;
		}

		svg = generateMarkerSvg(svg, width, height, bits, offset_x + 1, offset_y + 1);
		// Draw ID
		var text = document.createElement('text');
		text.setAttribute('x', offset_x + 1);
		text.setAttribute('y', offset_y + height + 4);
		text.setAttribute('fill', 'rgb(192,255,192)');
		text.setAttribute('font-size', 0.8);
		text.setAttribute('font-family', 'Arial');
		text.textContent = id + id_offset;
		svg.appendChild(text);
	}
	return svg
}

// Fetch markers dict
var loadDict = fetch('dict.json').then(function(res) {
	return res.json();
}).then(function(json) {
	dict = json;
});

function init() {
	var dictSelect = document.querySelector('.setup select[name=dict]');
	var markerIdInput = document.querySelector('.setup input[name=id]');
	var sizeInput = document.querySelector('.setup input[name=size]');
	var saveButton = document.querySelector('.save-button');
	var fieldWidthInput = document.querySelector('.field input[name=width]');
	var fieldHeightInput = document.querySelector('.field input[name=height]');
	var markerNumInput = document.querySelector('.field input[name=num]');
	var polygonNumInput = document.querySelector('.field input[name=polygons]');

	const params = new URLSearchParams(location.search);
	if (params.has('dict')) {
		dictSelect.value = params.get('dict');
	}
	if (params.has('id')) {
		markerIdInput.value = params.get('id');
	}
	if (params.has('size')) {
		sizeInput.value = params.get('size');
	}
	if (params.has('width')) {
		fieldWidthInput.value = params.get('width');
	}
	if (params.has('height')) {
		fieldHeightInput.value = params.get('height');
	}
	if (params.has('num')) {
		markerNumInput.value = params.get('num');
	}
	if (params.has('polygons')) {
		polygonNumInput.value = params.get('polygons');
	}

	function updateMarker() {
		var markerId = Number(markerIdInput.value);
		var markerSize = Number(sizeInput.value);
		var option = dictSelect.options[dictSelect.selectedIndex];
		var dictName = option.value;
		var markerWidth = Number(option.getAttribute('data-width'));
		var markerHeight = Number(option.getAttribute('data-height'));
		var maxId = (Number(option.getAttribute('data-number')) || 1000) - 1;
		var fieldWidth = Number(fieldWidthInput.value);
		var fieldHeight = Number(fieldHeightInput.value);
		var markerNum = Number(markerNumInput.value);
		var bitSize = markerSize / (markerWidth + 2);
		var polygonNum = Number(polygonNumInput.value);

		markerIdInput.setAttribute('max', maxId);

		if (markerId > maxId) {
			markerIdInput.value = maxId;
			markerId = maxId;
		}

		// Wait until dict data is loaded
		loadDict.then(function() {
			// Generate marker
			var svg = generateTriOrbMarker(markerWidth, markerHeight, dictName, markerId, markerNum, bitSize, fieldWidth, fieldHeight, polygonNum);
			document.querySelector('.marker').innerHTML = svg.outerHTML;
			saveButton.setAttribute('href', 'data:image/svg;base64,' + btoa(svg.outerHTML.replace('viewbox', 'viewBox')));
			saveButton.setAttribute('download', dictName + '-' + markerId + '.svg');
			if (markerNum > 0) {
				if (markerNum > 1) {
					//document.querySelector('.marker-id').innerHTML = dictName + ' : ' + markerId + ' - ' + (markerId + markerNum - 1);
				} else {
					//document.querySelector('.marker-id').innerHTML = dictName + ' : ' + markerId;
				}

			}
		})
	}

	updateMarker();

	dictSelect.addEventListener('change', updateMarker);
	dictSelect.addEventListener('input', updateMarker);
	markerIdInput.addEventListener('input', updateMarker);
	sizeInput.addEventListener('input', updateMarker);
	fieldWidthInput.addEventListener('input', updateMarker);
	fieldHeightInput.addEventListener('input', updateMarker);
	markerNumInput.addEventListener('input', updateMarker);
	polygonNumInput.addEventListener('input', updateMarker);
}

init();
