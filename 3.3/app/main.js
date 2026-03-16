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

let timeout = null;
var svgNamespace = 'http://www.w3.org/2000/svg';
var xlinkNamespace = 'http://www.w3.org/1999/xlink';
var labelFontSize = 0.8;
var uploadedMarkerIcon = null;

function silentAlert(msg) {
	if (timeout) {
		clearTimeout(timeout);
	}
	console.log(msg);
	let input = document.getElementById('error-message');
	input.value = msg;
	input.style.display = 'block';
	timeout = setTimeout(function () {
		input.value = '';
		input.style.display = 'none';
		timeout = null;
	}
		, 5000);
}

function createSvgGroup(id) {
	var group = document.createElement('g');
	group.setAttribute('id', id);
	return group;
}

function createSvgNode(tagName) {
	return document.createElementNS(svgNamespace, tagName);
}

function loadImageDimensions(dataUrl) {
	return new Promise(function(resolve, reject) {
		var image = new Image();
		image.onload = function () {
			resolve({
				width: image.naturalWidth,
				height: image.naturalHeight
			});
		};
		image.onerror = function () {
			reject(new Error('Failed to load image'));
		};
		image.src = dataUrl;
	});
}

function readPngFile(file) {
	return new Promise(function(resolve, reject) {
		if (!file) {
			resolve(null);
			return;
		}

		if (file.type !== 'image/png') {
			reject(new Error('Only PNG files are supported'));
			return;
		}

		var reader = new FileReader();
		reader.onload = function () {
			loadImageDimensions(reader.result).then(function(dimensions) {
				resolve({
					name: file.name,
					dataUrl: reader.result,
					width: dimensions.width,
					height: dimensions.height
				});
			}).catch(reject);
		};
		reader.onerror = function () {
			reject(new Error('Failed to read PNG file'));
		};
		reader.readAsDataURL(file);
	});
}

function readFirstPngFile(fileList) {
	return readPngFile(fileList && fileList[0]);
}

function appendMarkerIcon(group, markerIcon, offset_x, offset_y, markerOuterWidth, quietZone) {
	if (!markerIcon || !markerIcon.width || !markerIcon.height) {
		return;
	}

	var iconHeight = labelFontSize;
	var maxIconWidth = Math.max(markerOuterWidth - 0.2, 0);
	var iconWidth = iconHeight * (markerIcon.width / markerIcon.height);
	if (iconWidth > maxIconWidth && iconWidth > 0) {
		var scale = maxIconWidth / iconWidth;
		iconWidth *= scale;
		iconHeight *= scale;
	}

	var image = createSvgNode('image');
	image.setAttribute('x', offset_x + (markerOuterWidth - iconWidth) / 2);
	image.setAttribute('y', offset_y);
	image.setAttribute('width', iconWidth);
	image.setAttribute('height', iconHeight);
	image.setAttribute('preserveAspectRatio', 'xMidYMid meet');
	image.setAttribute('href', markerIcon.dataUrl);
	image.setAttributeNS(xlinkNamespace, 'xlink:href', markerIcon.dataUrl);
	group.appendChild(image);
}

function generateMarkerSvg(outlineGroup, pixelGroup, width, height, bits, offset_x = 0, offset_y = 0, quiet_zone = 1, draw_border = true) {
	var outerWidth = width + 2 + quiet_zone * 2;
	var outerHeight = height + 2 + quiet_zone * 2;
	var markerOffsetX = offset_x + quiet_zone;
	var markerOffsetY = offset_y + quiet_zone;

	// Border
	if (draw_border) {
		var pixel = document.createElement('rect');
		pixel.setAttribute('x', offset_x);
		pixel.setAttribute('y', offset_y);
		pixel.setAttribute('width', outerWidth);
		pixel.setAttribute('height', outerHeight);
		pixel.setAttribute('fill', 'white');
		pixel.setAttribute('stroke', 'rgb(200,200,200)');
		pixel.setAttribute('stroke-width', 0.05);
		outlineGroup.appendChild(pixel);
	}

	// Background rect
	var rect = document.createElement('rect');
	rect.setAttribute('x', markerOffsetX);
	rect.setAttribute('y', markerOffsetY);
	rect.setAttribute('width', width + 2);
	rect.setAttribute('height', height + 2);
	rect.setAttribute('fill', 'black');
	pixelGroup.appendChild(rect);

	// "Pixels"
	for (var i = 0; i < height; i++) {
		for (var j = 0; j < width; j++) {
			var white = bits[i * height + j];
			if (!white) continue;

			var pixel = document.createElement('rect');;
			pixel.setAttribute('width', 1);
			pixel.setAttribute('height', 1);
			pixel.setAttribute('x', markerOffsetX + j + 1);
			pixel.setAttribute('y', markerOffsetY + i + 1);
			pixel.setAttribute('fill', 'white');
			pixelGroup.appendChild(pixel);

			//if (!fixPdfArtifacts) continue;

			if ((j < width - 1) && (bits[i * height + j + 1])) {
				pixel.setAttribute('width', 1.5);
			}

			if ((i < height - 1) && (bits[(i + 1) * height + j])) {
				var pixel2 = document.createElement('rect');;
				pixel2.setAttribute('width', 1);
				pixel2.setAttribute('height', 1.5);
				pixel2.setAttribute('x', markerOffsetX + j + 1);
				pixel2.setAttribute('y', markerOffsetY + i + 1);
				pixel2.setAttribute('fill', 'white');
				pixelGroup.appendChild(pixel2);
			}
		}
	}

	// 枠線
	return {
		outlineGroup: outlineGroup,
		pixelGroup: pixelGroup
	};
}

// 正規分布に従う乱数を生成
function createRandomSource(seed) {
        if (!Number.isFinite(seed) || seed === 0) {
                return Math.random;
        }

        let state = Math.trunc(seed) >>> 0;
        return function () {
                state += 0x6D2B79F5;
                let t = state;
                t = Math.imul(t ^ (t >>> 15), t | 1);
                t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
                return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
}

function rnorm(randomSource = Math.random) {
	return Math.sqrt(-2 * Math.log(1 - randomSource())) * Math.cos(2 * Math.PI * randomSource());
}

function generateRandomPattern(group, width, height, point_num, bit_size, large_side_cm, small_side_cm, contrast_strength, shape_type, randomSource) {
        // Create random centor points
        let points = [];
        for (var i = 0; i < point_num; i++) {
                var x = randomSource() * width;
                var y = randomSource() * height;
                points.push([x, y]);
        }

        // Generate random shapes
        let shapes = [];
        const long_cm = Math.max(large_side_cm, 0);
        const short_cm = Math.max(small_side_cm, 0);
        const max_radius = Math.min(width, height) / 2;
        for (let xy of points) {
                let cx = xy[0];
                let cy = xy[1];
                let is_long = randomSource() < 0.5;
                let target_length_mm = (is_long ? long_cm : short_cm) * 10;
                let target_length_viewbox = target_length_mm / bit_size;
                let base_r;
                if (shape_type === 'ellipse') {
                        base_r = target_length_viewbox / 2;
                } else {
                        base_r = target_length_viewbox / Math.sqrt(3);
                }
                let r = Math.abs(base_r * (1 + rnorm(randomSource) * 0.05));
                r = Math.min(r, max_radius);

                if (shape_type === 'ellipse') {
                        let rx = Math.max(0.1, r * (1 + rnorm(randomSource) * 0.2));
                        let ry = Math.max(0.1, r * (1 + rnorm(randomSource) * 0.2));
                        let rotation = randomSource() * 180;
                        shapes.push({
                                type: 'ellipse',
                                cx,
                                cy,
                                rx,
                                ry,
                                rotation,
                                rank: Math.max(rx, ry)
                        });
                        continue;
                }

                let poly = [];
                for (let ii = 0; ii < 3; ii++) {
                        let angle = randomSource() * 2 * Math.PI;
                        let x = cx + (r * Math.cos(angle));
                        let y = cy + (r * Math.sin(angle));
                        poly.push([x, y]);
                }
                shapes.push({
                        type: 'triangle',
                        points: poly,
                        rank: r
                });
        }

        // 面積の大きい順に描画していく
        shapes.sort((a, b) => b.rank - a.rank);
        for (let shape of shapes) {
                var elem;
                let rank = shape.rank;
                let base_gray = 0.5 + rnorm(randomSource) * 0.15;
                let centered_gray = base_gray - 0.5;
                let contrast_scaled = Math.tanh(centered_gray * Math.max(contrast_strength, 0) * 2);
                let fill_gray = Math.min(Math.max(0.5 + contrast_scaled, 0), 1);
                let fill_color = 'rgb(' + Math.floor(255 * fill_gray) + ',' + Math.floor(255 * fill_gray) + ',' + Math.floor(255 * fill_gray) + ')';
                let stroke_gray = fill_gray > 0.5 ? 0 : 1;
                let stroke_color = 'rgb(' + Math.floor(255 * stroke_gray) + ',' + Math.floor(255 * stroke_gray) + ',' + Math.floor(255 * stroke_gray) + ')';
                let stroke_width = rank / 20;

                if (shape.type === 'ellipse') {
                        elem = document.createElement('ellipse');
                        elem.setAttribute('cx', shape.cx);
                        elem.setAttribute('cy', shape.cy);
                        elem.setAttribute('rx', shape.rx);
                        elem.setAttribute('ry', shape.ry);
                        elem.setAttribute('transform', 'rotate(' + shape.rotation + ' ' + shape.cx + ' ' + shape.cy + ')');
                } else {
                        elem = document.createElement('polygon');
                        elem.setAttribute('stroke-linejoin', 'round');
                        elem.setAttribute('points', shape.points.map(function (p) {
                                return p.join(',');
                        }).join(' '));
                }

                elem.setAttribute('fill', fill_color);
                elem.setAttribute('stroke', stroke_color);
                elem.setAttribute('stroke-width', stroke_width);
                group.appendChild(elem);
        }

        return group;
}

var dict;

function selectedLayout() {
	for (let radio of document.getElementsByName('marker-layout')) {
		if (radio.checked) {
			return radio.id;
		}
	}
	return "layout-tile";
}

function generateTriOrbMarker(width, height, dictName, id, num, bit_size, field_width, field_height, polygon_num, large_side_cm, small_side_cm, contrast_strength, shape_type, marker_margin_mm, marker_quiet_zone, random_seed, markerIcon) {
        console.log('Generate ArUco marker ' + dictName + ' ' + id + ' - ' + (id + num - 1) + ' with size ' + width + 'x' + height + ' mm' + ' and layout ' + selectedLayout() + ', random seed: ' + random_seed);
        var viebox_width = (field_width / bit_size);
        var viebox_height = (field_height / bit_size);
        var markerMargin = Math.max(0, marker_margin_mm / bit_size);
        var quietZone = Math.max(0, marker_quiet_zone);
        var markerOuterWidth = width + 2 + quietZone * 2;
        var markerOuterHeight = height + 2 + quietZone * 2;
        var markerStepX = markerOuterWidth + markerMargin;
        var markerStepY = markerOuterHeight + markerMargin;
        var bitsCount = width * height;

	var svg = document.createElement('svg');
	svg.setAttribute('width', field_width + 'mm');
	svg.setAttribute('height', field_height + 'mm');
	svg.setAttribute('viewBox', '0 0 ' + viebox_width + ' ' + viebox_height);
	svg.setAttribute('xmlns', svgNamespace);
	svg.setAttribute('xmlns:xlink', xlinkNamespace);
	svg.setAttribute('shape-rendering', 'crispEdges');

        var randomShapesGroup = createSvgGroup('random-shapes');
        var markerOutlinesGroup = createSvgGroup('marker-outlines');
        var markerPixelsGroup = createSvgGroup('marker-pixels');
        var markerIconsGroup = createSvgGroup('marker-icons');
        var markerLabelsGroup = createSvgGroup('marker-labels');

        svg.appendChild(randomShapesGroup);
        svg.appendChild(markerOutlinesGroup);
        svg.appendChild(markerPixelsGroup);
        svg.appendChild(markerIconsGroup);
        svg.appendChild(markerLabelsGroup);

        var randomSource = createRandomSource(random_seed);

        // Generate Random pattern
        generateRandomPattern(randomShapesGroup, viebox_width, viebox_height, polygon_num, bit_size, large_side_cm, small_side_cm, contrast_strength, shape_type, randomSource);

        let horizontalCapacity = Math.floor((viebox_width + markerMargin) / markerStepX);
        let verticalCapacity = Math.floor((viebox_height + markerMargin) / markerStepY);
        let gridCapacity = horizontalCapacity * verticalCapacity;

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

		switch (selectedLayout()) {
			case "layout-tile":
				// 左上、右下、左下、右上、中央、左中央、右中央、上中央、下中央の順に並べる
				switch (id_offset % 9) {
					case 0:
						offset_x = 0;
						offset_y = 0;
						break;
					case 1:
						offset_x = viebox_width - markerOuterWidth;
						offset_y = viebox_height - markerOuterHeight;
						break;
					case 2:
						offset_x = 0;
						offset_y = viebox_height - markerOuterHeight;
						break;
					case 3:
						offset_x = viebox_width - markerOuterWidth;
						offset_y = 0;
						break;
					case 4:
						offset_x = (viebox_width - markerOuterWidth) / 2;
						offset_y = (viebox_height - markerOuterHeight) / 2;
						break;
					case 5:
						offset_x = 0;
						offset_y = (viebox_height - markerOuterHeight) / 2;
						break;
					case 6:
						offset_x = viebox_width - markerOuterWidth;
						offset_y = (viebox_height - markerOuterHeight) / 2;
						break;
					case 7:
						offset_x = (viebox_width - markerOuterWidth) / 2;
						offset_y = 0;
						break;
					case 8:
						offset_x = (viebox_width - markerOuterWidth) / 2;
						offset_y = viebox_height - markerOuterHeight;
						break;
					default:
						alert('Invalid offset');
						return;
				}
				break;
                        case "layout-h-stack":
                                if (horizontalCapacity < 1 || verticalCapacity < 1) {
                                        silentAlert('[ERROR] Field is too small for the current marker settings');
                                        return;
                                }
                                if (id_offset >= gridCapacity) {
                                        silentAlert('[ERROR] Number of markers exceeds the limit of ' + gridCapacity);
                                        return;
                                }
                                offset_x = (id_offset % horizontalCapacity) * markerStepX;
                                offset_y = Math.floor(id_offset / horizontalCapacity) * markerStepY;
                                break;
                        case "layout-v-stack":
                                if (horizontalCapacity < 1 || verticalCapacity < 1) {
                                        silentAlert('[ERROR] Field is too small for the current marker settings');
                                        return;
                                }
                                if (id_offset >= gridCapacity) {
                                        silentAlert('[ERROR] Number of markers exceeds the limit of ' + gridCapacity);
                                        return;
                                }
                                offset_x = Math.floor(id_offset / verticalCapacity) * markerStepX;
                                offset_y = (id_offset % verticalCapacity) * markerStepY;
                                break;
                        default:
                                alert('Invalid layout' + selectedLayout());
                                return;
		}

		var markerOutlineGroup = createSvgGroup('marker-outline-' + (id + id_offset));
		var markerPixelGroup = createSvgGroup('marker-pixels-' + (id + id_offset));
		markerOutlinesGroup.appendChild(markerOutlineGroup);
		markerPixelsGroup.appendChild(markerPixelGroup);
		generateMarkerSvg(markerOutlineGroup, markerPixelGroup, width, height, bits, offset_x, offset_y, quietZone);
		appendMarkerIcon(markerIconsGroup, markerIcon, offset_x, offset_y, markerOuterWidth, quietZone);
		// Draw ID
		var text = document.createElement('text');
		text.setAttribute('x', offset_x + 1);
		text.setAttribute('y', offset_y + markerOuterHeight - 0.1);
		text.setAttribute('fill', 'rgb(192,255,192)');
		text.setAttribute('font-size', labelFontSize);
		text.setAttribute('font-family', 'Arial');
		text.textContent = dictName + ' : ' + (id + id_offset);
		markerLabelsGroup.appendChild(text);
	}
	return svg
}

// Fetch markers dict
var loadDict = fetch('dict.json').then(function(res) {
	return res.json();
}).then(function(json) {
	dict = json;
});

var formStateStorageKey = 'triorb-marker-generator-form-state';

function loadSavedFormState() {
        try {
                var raw = localStorage.getItem(formStateStorageKey);
                return raw ? JSON.parse(raw) : {};
        } catch (error) {
                console.warn('Failed to load saved form state', error);
                return {};
        }
}

function applyFormState(setupForm, formState) {
        Object.keys(formState).forEach(function(name) {
                var field = setupForm.elements.namedItem(name);
                if (!field) {
                        return;
                }

                if (field instanceof RadioNodeList) {
                        for (var option of field) {
                                option.checked = option.value === formState[name];
                        }
                        return;
                }

                if (field.type === 'file') {
                        return;
                }

                field.value = formState[name];
        });
}

function createSerializableFormState(setupForm) {
        var formState = {};
        Array.from(setupForm.elements).forEach(function(field) {
                if (!field.name || field.disabled || field.type === 'file') {
                        return;
                }

                if ((field.type === 'radio' || field.type === 'checkbox') && !field.checked) {
                        return;
                }

                formState[field.name] = field.value;
        });
        return formState;
}

function saveFormState(setupForm) {
        try {
                var formState = createSerializableFormState(setupForm);
                localStorage.setItem(formStateStorageKey, JSON.stringify(formState));
        } catch (error) {
                console.warn('Failed to save form state', error);
        }
}

//[ref] https://qiita.com/akinov/items/26a7fc36d7c0045dd2db
function getUrlQueries() {
	var queryStr = window.location.search.slice(1);  // 文頭?を除外
	queries = {};

	// クエリがない場合は空のオブジェクトを返す
	if (!queryStr) {
		return queries;
	}

	// クエリ文字列を & で分割して処理
	queryStr.split('&').forEach(function (queryStr) {
		// = で分割してkey,valueをオブジェクトに格納
		var queryArr = queryStr.split('=');
		queries[queryArr[0]] = queryArr[1];
	});

	return queries;
}

function init() {
        var dictSelect = document.querySelector('.setup select[name=dict]');
        var markerIdInput = document.querySelector('.setup input[name=id]');
        var sizeInput = document.querySelector('.setup input[name=size]');
        var saveButton = document.querySelector('.save-button');
        var setupForm = document.querySelector('.setup');
        var fieldWidthInput = document.querySelector('.field input[name=width]');
        var fieldHeightInput = document.querySelector('.field input[name=height]');
        var markerNumInput = document.querySelector('.field input[name=num]');
        var polygonNumInput = document.querySelector('.field input[name=polygons]');
        var largeTriangleInput = document.querySelector('.field input[name=large-triangle-cm]');
        var smallTriangleInput = document.querySelector('.field input[name=small-triangle-cm]');
        var contrastInput = document.querySelector('.field input[name=contrast]');
        var shapeTypeInput = document.querySelector('.field select[name=shape-type]');
        var randomSeedInput = document.querySelector('.field input[name=random-seed]');
        var markerMarginInput = document.querySelector('.field input[name=marker-margin]');
        var markerQuietZoneInput = document.querySelector('.field input[name=marker-quiet-zone]');
        var markerDropZone = document.getElementById('marker-drop-zone');
        var markerLayout = document.getElementsByName('marker-layout');

        applyFormState(setupForm, loadSavedFormState());

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
        if (params.has('large-triangle-cm')) {
                largeTriangleInput.value = params.get('large-triangle-cm');
        }
        if (params.has('small-triangle-cm')) {
                smallTriangleInput.value = params.get('small-triangle-cm');
        }
        if (params.has('contrast')) {
                contrastInput.value = params.get('contrast');
        }
        if (params.has('shape-type')) {
                shapeTypeInput.value = params.get('shape-type');
        }
        if (params.has('random-seed')) {
                randomSeedInput.value = params.get('random-seed');
        }
        if (params.has('marker-margin')) {
                markerMarginInput.value = params.get('marker-margin');
        }
        if (params.has('marker-quiet-zone')) {
                markerQuietZoneInput.value = params.get('marker-quiet-zone');
        }
        if (params.has('marker-layout')) {
                document.getElementById('layout-' + params.get('marker-layout')).checked = true;
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
                var largeTriangleCm = Number(largeTriangleInput.value);
                var smallTriangleCm = Number(smallTriangleInput.value);
                var contrastStrength = Number(contrastInput.value);
                var shapeType = shapeTypeInput.value;
                var randomSeed = Number(randomSeedInput.value);
                var markerMargin = Number(markerMarginInput.value);
                var markerQuietZone = Number(markerQuietZoneInput.value);

		markerIdInput.setAttribute('max', maxId);

		if (markerId > maxId) {
			markerIdInput.value = maxId;
			markerId = maxId;
		}

                saveFormState(setupForm);

                // Wait until dict data is loaded
                loadDict.then(function() {
                        // Generate marker
                        var svg = generateTriOrbMarker(markerWidth, markerHeight, dictName, markerId, markerNum, bitSize, fieldWidth, fieldHeight, polygonNum, largeTriangleCm, smallTriangleCm, contrastStrength, shapeType, markerMargin, markerQuietZone, randomSeed, uploadedMarkerIcon);
			if (!svg) {
				return;
			}
			let filename;
			filename = `TriOrb_Marker_${fieldWidth}x${fieldHeight}mm`;
			if (polygonNum > 0) {
				filename += `_${polygonNum}polygons`;
			}
			if (markerNum > 0) {
				filename += `_${dictName}_${markerSize}mm_ID${markerId}`;
				if (markerNum > 1) {
					filename += `-${markerId + markerNum - 1}`;
				}
			}
			filename += '.svg';
			document.querySelector('.marker').innerHTML = svg.outerHTML;
			saveButton.setAttribute('href', 'data:image/svg;base64,' + btoa(svg.outerHTML.replace('viewbox', 'viewBox')));
			saveButton.setAttribute('download', filename);
			if (markerNum > 0) {
				if (markerNum > 1) {
					//document.querySelector('.marker-id').innerHTML = dictName + ' : ' + markerId + ' - ' + (markerId + markerNum - 1);
				} else {
					//document.querySelector('.marker-id').innerHTML = dictName + ' : ' + markerId;
				}

			}
		})
	}

        function applyMarkerIcon(fileList) {
                readFirstPngFile(fileList).then(function(icon) {
                        uploadedMarkerIcon = icon;
                        updateMarker();
                }).catch(function(error) {
                        uploadedMarkerIcon = null;
                        silentAlert('[ERROR] ' + error.message);
                        updateMarker();
                });
        }

	updateMarker();

        ['dragover', 'drop'].forEach(function(eventName) {
                window.addEventListener(eventName, function(event) {
                        if (event.dataTransfer && event.dataTransfer.types && Array.from(event.dataTransfer.types).indexOf('Files') !== -1) {
                                event.preventDefault();
                        }
                });
        });

        dictSelect.addEventListener('change', updateMarker);
        dictSelect.addEventListener('input', updateMarker);
        markerIdInput.addEventListener('input', updateMarker);
        sizeInput.addEventListener('input', updateMarker);
        fieldWidthInput.addEventListener('input', updateMarker);
        fieldHeightInput.addEventListener('input', updateMarker);
        markerNumInput.addEventListener('input', updateMarker);
        polygonNumInput.addEventListener('input', updateMarker);
        largeTriangleInput.addEventListener('input', updateMarker);
        smallTriangleInput.addEventListener('input', updateMarker);
        contrastInput.addEventListener('input', updateMarker);
        shapeTypeInput.addEventListener('change', updateMarker);
        randomSeedInput.addEventListener('input', updateMarker);
        markerMarginInput.addEventListener('input', updateMarker);
        markerQuietZoneInput.addEventListener('input', updateMarker);
        ['dragenter', 'dragover'].forEach(function(eventName) {
                markerDropZone.addEventListener(eventName, function(event) {
                        event.preventDefault();
                        event.stopPropagation();
                        markerDropZone.classList.add('is-dragover');
                });
        });
        ['dragleave', 'dragend'].forEach(function(eventName) {
                markerDropZone.addEventListener(eventName, function(event) {
                        event.preventDefault();
                        event.stopPropagation();
                        if (event.target === markerDropZone || !markerDropZone.contains(event.relatedTarget)) {
                                markerDropZone.classList.remove('is-dragover');
                        }
                });
        });
        markerDropZone.addEventListener('drop', function(event) {
                event.preventDefault();
                event.stopPropagation();
                markerDropZone.classList.remove('is-dragover');
                var files = event.dataTransfer && event.dataTransfer.files;
                if (!files || files.length === 0) {
                        return;
                }
                applyMarkerIcon(files);
        });
        markerLayout.forEach(function (radio) {
                radio.addEventListener('change', function (radio) {
                        updateMarker();
                });
        });

        setupForm.addEventListener('submit', function (event) {
                event.preventDefault();
                saveFormState(setupForm);
                var params = new URLSearchParams(createSerializableFormState(setupForm));
                var query = params.toString();
                var newUrl = window.location.pathname + (query ? '?' + query : '') + window.location.hash;
                window.history.replaceState(null, '', newUrl);
                updateMarker();
        });
}

function printFunction() {
	//var printContents = document.querySelector('.marker').innerHTML;
	//var originalContents = document.body.innerHTML;
	//document.body.innerHTML = printContents;
	window.print();
	//document.body.innerHTML = originalContents;
}

init();
