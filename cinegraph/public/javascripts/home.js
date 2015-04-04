var cinegraphApp = angular.module('cinegraphApp', []);

cinegraphApp.service('ModelDataService', ['$http', function ($http) {
    this.getData = function () {
        return {
            async: function() {
                    return $http.get('/api/persons/all');
                }
            };
        }
    }]);

var cinegraphController = cinegraphApp.controller('cinegraphController', ['ModelDataService', '$scope', '$http', function(ModelDataService, $scope, $http) {
    //ModelDataService.getData().async().then(function(d) { $scope.persons = d.data; });
    $scope.currentNode = {};
    $scope.currentNode.movie = {};
    $scope.currentNode.movie.name = "Inception";
    $scope.currentNode.movie.date = "2010";
    $scope.currentNode.movie.plot = "LA thief who steals corporate secrets through use of dream-sharing technology is given the inverse task of planting an idea into the mind of a CEO."
    $scope.currentNode.movie.genres = [ "Action", "Adventure", "Sci-Fi", "Thriller"];
    $scope.currentNode.movie.thumbnail = "images/inception.jpg";
}]);

cinegraphApp.directive("cinegraph", [ 'ModelDataService', '$http', function(ModelDataService, $http) {
	return {
		link: function link(scope, element, attrs) {
			// global vars            
            var scene = new THREE.Scene();
            var camera = new THREE.PerspectiveCamera(45, document.getElementById('content').offsetWidth / document.getElementById('content').offsetHeight, 0.1, 1000);
            var renderer = new THREE.WebGLRenderer({ antialias: true });
            var raycaster = new THREE.Raycaster();
            var mouse = new THREE.Vector2();
            var INTERSECTED;
            var spriteHover, spriteHoverContext, spriteHoverTexture, spriteHoverCanvas;
            var old = null;
            var current = null;
            var img = new Image();
            img.src = 'images/leonardo_dicaprio.jpeg';
            var radius = 50;
            var theta = 0;
            var nodeRadius = 0.70, nodeSegments = 64;
            var nodePosition = new THREE.Vector3(0, 1, 0);
            var nodeScale = new THREE.Vector3(2, 2, 1);
            var randomVector = new THREE.Vector3(Math.random() * 60 - 20, Math.random() * 60 - 20, Math.random() * 60 - 20);
            var typesAndLimits = [ { type: 'ACTED_IN', limit: 5},
                                    { type: 'PRODUCED', limit: 2},
                                    { type: 'DIRECTED', limit: 2},
                                    { type: 'COMPOSED_MUSIC', limit: 1},
                                    { type: 'DIRECTED_PHOTOGRAPHY', limit: 1} ];

            function init() {
                renderer.setSize(document.getElementById('content').offsetWidth, document.getElementById('content').offsetHeight);
                renderer.setClearColor(0xf0f0f0);
                document.getElementById('graph').appendChild(renderer.domElement);
                camera.position.z = 1;

                // cube
                var geometry = new THREE.BoxGeometry(1, 1, 1);
                var material = new THREE.MeshBasicMaterial({ color: 0xf0f0f0, wireframe: true });
                var cube = new THREE.Mesh(geometry, material);
                INTERSECTED = cube;
                scene.add(cube)

                // hover text init
                spriteHoverCanvas = generateHoverText("test");
                spriteHoverContext = spriteHoverCanvas.getContext('2d');
                spriteHoverTexture = new THREE.Texture(spriteHoverCanvas);
                var material = new THREE.SpriteMaterial({ map: spriteHoverTexture, useScreenCoordinates: true });
                spriteHover = new THREE.Sprite(material);
                spriteHover.position.set(0, 0, 0);
                spriteHover.scale.set(6, 2, 1);
                scene.add(spriteHover);

                getNode(311902, draw);

            // listeners
            document.getElementById('graph').addEventListener('click', onClick, false);
            document.getElementById('graph').addEventListener('mousemove', onMouseHover, false);
        }

        /* callback called when getting a node from the API */
        function draw(node) {
            var nodeSprite = drawNode(node, nodeRadius, nodeSegments, nodePosition);
            getRelatedNodes(node, nodeSprite, typesAndLimits, drawRelatedNodes);
        }

        function getNode(id, callback) {
            $http.get('/api/common/' + id).success(function(node) {
                callback(node);
            });
        }

        function getRelatedNodes(startNode, startNodeSprite, typesAndLimits, callback) {
            var index = 0;
            for (var i = 0; i < typesAndLimits.length; i++) {
                getRelatedNodesForType(startNode.id, typesAndLimits[i].type, typesAndLimits[i].limit, index, startNodeSprite, callback);
                index += typesAndLimits[i].limit;
            }
        }

        function getRelatedNodesForType(id, type, limit, index, startNodeSprite, callback) {
            var direction = 'in';
            $http.get('/api/common/' + id + '/relationships/' + direction + '/' + type).success(function(relationships) {
                    if (relationships != null) {
                        callback(startNodeSprite, relationships, index, limit);
                    }
                });
        }

        /* draws a node
        param node : JSON object returned from request to DB
        param radius : radius of the circle
        param segments
        param position : THREE.Vector3 object for the position of the node
        */
        function drawNode(node, radius, segments, position) {
            var material = new THREE.MeshBasicMaterial();
            var circleGeometry = new THREE.CircleGeometry(radius, segments);
            var nodeMesh = new THREE.Mesh(circleGeometry, material);
            nodeMesh.position.x = position.x;
            nodeMesh.position.y = position.y;
            nodeMesh.position.z = position.z;
            
            var text = node.name ? node.name : node.title;
            var canvas = generateTexture(text);
            var texture = new THREE.Texture(canvas);
            texture.needsUpdate = true;
            var spriteMaterial = new THREE.SpriteMaterial({ map: texture });
            var sprite = new THREE.Sprite(spriteMaterial);
            sprite._id = node.id;
            sprite.name = node.name ? node.name : node.title;
            sprite.context = canvas.getContext('2d');
            sprite.texture = texture;
            sprite.position.set(nodeMesh.position.x, nodeMesh.position.y, nodeMesh.position.z + 0.5);
            sprite.scale.set(6, 6, 6);
            scene.add(sprite);
            return sprite;
        }

        function drawRelatedNodes(startNodeSprite, relatedNodes, index, limit) {
            console.log("limit : " + limit + ", index : " + index);
            var slice = 2 * Math.PI / 11;
            var relatedNodePosition = new THREE.Vector3();
            if (limit > relatedNodes.length) {
                limit = relatedNodes.length;
            }

            for (i = index, j = 0; i < limit + index, j < limit; i++, j++) {
                var angle = slice * i;
                relatedNodePosition.x = nodePosition.x + 20 * Math.cos(angle);
                relatedNodePosition.y = nodePosition.x + 20 * Math.sin(angle);
                var relatedNodeSprite = drawNode(relatedNodes[j], nodeRadius, nodeSegments, relatedNodePosition);
                var material = new THREE.LineBasicMaterial({ color: 0x000000 });
                var geometry = new THREE.Geometry();
                geometry.vertices.push(relatedNodeSprite.position, startNodeSprite.position);
                var line = new THREE.Line(geometry, material);
                scene.add(line);
            }
        }

        function wrapText(context, text, x, y, maxWidth, lineHeight) {
            if (text.indexOf(' ') == -1) {
                context.fillText(text, x, y);
                return;
            }

            var words = text.split(' ');
            var line = '';
            for (var n = 0; n < words.length; n++) {
                var testLine = line + words[n] + ' ';
                var metrics = context.measureText(testLine);
                var testWidth = metrics.width;
                if (testWidth > maxWidth && n > 0) {
                    context.fillText(line, x, y);
                    line = words[n] + ' ';
                    y += lineHeight;
                }
                else {
                    line = testLine;
                }
            }
            context.fillText(line, x, y);
        }

        function generateTexture(text) {
        	var canvas = document.createElement('canvas');
            canvas.width = 800;
            canvas.height = 800;
        	var context = canvas.getContext('2d');
            context.fillStyle = "#FFF";
            drawCircle(context, canvas.width / 2, canvas.height / 2, canvas.width / 2);
            context.globalAlpha = 0.6;
            context.drawImage(img, 0, 0, canvas.width, canvas.height);
            context.globalAlpha = 1;
            context.fillStyle = "#000";
            context.font = "bold 160px Open Sans";
            context.textAlign = "center";
            wrapText(context, text, canvas.width / 2, canvas.height / 2, canvas.width - 10, canvas.height / 3);
            return canvas;
        }

        function generateHoverText(text) {
            var canvas = document.createElement('canvas');
            canvas.width = 800;
            canvas.height = 300;
            spriteHoverContext = canvas.getContext('2d');
            spriteHoverContext.fillStyle = "#FFF";
            spriteHoverContext.fillRect(0, 0, canvas.width, canvas.height);
            spriteHoverContext.fillStyle = "#000";
            spriteHoverContext.font = "bold 90px Open Sans";
            spriteHoverContext.textAlign = "center";
            spriteHoverContext.lineWidth = 10;
            spriteHoverContext.stroke();
            wrapText(spriteHoverContext, text, canvas.width / 2, canvas.height / 2, canvas.width - 10, canvas.height / 5);
            return canvas;
        }

        function render() {
        	requestAnimationFrame(render);

        	theta += 0.0;
        	camera.position.x = radius * Math.sin(THREE.Math.degToRad(theta));
        	camera.position.y = radius * Math.sin(THREE.Math.degToRad(theta));
        	camera.position.z = radius * Math.cos(THREE.Math.degToRad(theta));
        	camera.lookAt(scene.position);

        	renderer.render(scene, camera);
        }

        function onMouseHover(event) {
            mouse.x = (event.offsetX / window.innerWidth) * 2 - 1;
            mouse.y = -(event.offsetY / window.innerHeight) * 2 + 1;
            update();
        }

        function onMouseMove(event) {
        	mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        	mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        	raycaster.setFromCamera(mouse, camera);
        	var intersects = raycaster.intersectObjects(scene.children);
        	for (var intersect in intersects) {
        		intersects[0].object.material.color.setHex(Math.random() * 0xffffff);
        	}
        }

        function onClick(event) {
            mouse.x = (event.offsetX / window.innerWidth) * 2 - 1;
            mouse.y = -(event.offsetY / window.innerHeight) * 2 + 1;
            
            raycaster.setFromCamera(mouse, camera);
            var intersects = raycaster.intersectObjects(scene.children);
            var intersection = intersects[0];
            var id = intersection.object._id;
            if (id != null) {
                $http.get('/api/common/' + id).success(function(person) {
                    scope.currentNode = {};
                    scope.currentNode.person = person;
                    scope.currentNode.rolesAndMovies = [];
                    $http.get('/api/common/' + id + '/relationships/out').success(function(relationships) {
                        scope.currentNode.movies = relationships;
                    });
                });
            }
        }

        function makeTextSprite(message, parameters) {
        	if (parameters === undefined) parameters = {};
        	var fontface = parameters.hasOwnProperty("fontface") ? parameters["fontface"] : "Arial";
        	var fontsize = parameters.hasOwnProperty("fontsize") ? parameters["fontsize"] : 18;
        	var borderThickness = parameters.hasOwnProperty("borderThickness") ? parameters["borderThickness"] : 4;
        	var borderColor = parameters.hasOwnProperty("borderColor") ? parameters["borderColor"] : { r: 0, g: 0, b: 0, a: 1.0 };
        	var backgroundColor = parameters.hasOwnProperty("backgroundColor") ? parameters["backgroundColor"] : { r: 255, g: 255, b: 255, a: 1.0 };
        	var textColor = parameters.hasOwnProperty("textColor") ? parameters["textColor"] : { r: 0, g: 0, b: 0, a: 1.0 };

        	var canvas = document.createElement('canvas');
        	var context = canvas.getContext('2d');
        	context.font = "Bold " + fontsize + "px " + fontface;
        	var metrics = context.measureText(message);
        	var textWidth = metrics.width;

            //context.fillStyle = "rgba(" + backgroundColor.r + "," + backgroundColor.g + "," + backgroundColor.b + "," + backgroundColor.a + ")";
            //context.strokeStyle = "rgba(" + borderColor.r + "," + borderColor.g + "," + borderColor.b + "," + borderColor.a + ")";

            //context.lineWidth = borderThickness;
            //roundRect(context, borderThickness / 2, borderThickness / 2, (textWidth + borderThickness) * 1.1, fontsize * 1.4 + borderThickness, 8);

            context.fillStyle = "rgba(" + textColor.r + ", " + textColor.g + ", " + textColor.b + ", 1.0)";
            context.fillText(message, borderThickness, fontsize + borderThickness);

            var texture = new THREE.Texture(canvas)
            texture.needsUpdate = true;

            var spriteMaterial = new THREE.SpriteMaterial({ map: texture, useScreenCoordinates: false });
            var sprite = new THREE.Sprite(spriteMaterial);
            sprite.scale.set(0.5 * fontsize, 0.25 * fontsize, 0.75 * fontsize);
            return sprite;
        }

        // function for drawing rounded rectangles
        function roundRect(ctx, x, y, w, h, r) {
        	ctx.beginPath();
        	ctx.moveTo(x + r, y);
        	ctx.lineTo(x + w - r, y);
        	ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        	ctx.lineTo(x + w, y + h - r);
        	ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        	ctx.lineTo(x + r, y + h);
        	ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        	ctx.lineTo(x, y + r);
        	ctx.quadraticCurveTo(x, y, x + r, y);
        	ctx.closePath();
        	ctx.fill();
        	ctx.stroke();
        }

        function drawCircle(ctx, x, y, radius) {
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, 2 * Math.PI);
            ctx.lineWidth=25;
            ctx.stroke();
            ctx.clip();
        }

        function update() {
            raycaster.setFromCamera(mouse, camera);
            var intersects = raycaster.intersectObjects(scene.children);
            if (intersects.length > 0) {
                if (intersects[ 0 ].object != INTERSECTED) {
                    if (intersects[0].object._id !== undefined) {
                        if (current && (current._id != intersects[0].object._id)) {
                            current.context.fillStyle = "#FFF";
                            drawCircle(current.context, current.context.canvas.width / 2, current.context.canvas.height / 2, current.context.canvas.width / 2);
                            current.context.globalAlpha = 0.6;
                            current.context.drawImage(img, 0, 0, current.context.canvas.width, current.context.canvas.height);
                            current.context.globalAlpha = 1;
                            current.context.fillStyle = "#000";
                            current.context.font = "bcurrent 160px Open Sans";
                            var text = current.name;
                            current.context.textAlign = "center";
                            wrapText(current.context, text, current.context.canvas.width / 2, current.context.canvas.height / 2, current.context.canvas.width - 10, current.context.canvas.height / 3);
                            old = current;
                            current = intersects[0].object;
                        }
                        else {
                            current = intersects[0].object;
                        }
                        console.log("old : " + JSON.stringify(old));
                        console.log("current : " + JSON.stringify(current));
                        var context = current.context;
                        context.clearRect(0, 0, context.canvas.width, context.canvas.height);
                        context.fillStyle = "#FFF";
                        drawCircle(context, context.canvas.width / 2, context.canvas.height / 2, context.canvas.width / 2);
                        context.globalAlpha = 1;
                        context.drawImage(img, 0, 0, context.canvas.width, context.canvas.height);
                        current.texture.needsUpdate = true;

                        spriteHoverContext.fillStyle = "#FFF";
                        spriteHoverContext.fillRect(0, 0, spriteHoverCanvas.width, spriteHoverCanvas.height);
                        spriteHoverContext.strokeStyle = "#000";
                        spriteHoverContext.lineWidth = 100;
                        spriteHoverContext.stroke();
                        spriteHoverContext.fillStyle = "#000";
                        spriteHoverContext.font = "90px Open Sans";
                        spriteHoverContext.textAlign = "center";
                        var text = intersects[0].object.name;
                        wrapText(spriteHoverContext, text, spriteHoverCanvas.width / 2, spriteHoverCanvas.height / 2, spriteHoverCanvas.width - 10, spriteHoverCanvas.height / 5);
                        spriteHover.position.set(intersects[0].object.position.x, intersects[0].object.position.y + 3, intersects[0].object.position.z + 0.5 );
                        spriteHoverTexture.needsUpdate = true;
                    }
                    else {
                        console.log("OUT");
                        spriteHoverContext.clearRect(0, 0, 800, 300);
                        spriteHoverTexture.needsUpdate = true;
                    }
                }
            }
            else
            {
                if (old) {
                    old.context.fillStyle = "#FFF";
                    drawCircle(old.context, old.context.canvas.width / 2, old.context.canvas.height / 2, old.context.canvas.width / 2);
                    old.context.globalAlpha = 0.6;
                    old.context.drawImage(img, 0, 0, old.context.canvas.width, old.context.canvas.height);
                    old.context.globalAlpha = 1;
                    old.context.fillStyle = "#000";
                    old.context.font = "Bold 160px Open Sans";
                    var text = old.name;
                    old.context.textAlign = "center";
                    wrapText(old.context, text, old.context.canvas.width / 2, old.context.canvas.height / 2, old.context.canvas.width - 10, old.context.canvas.height / 3);
                }
                else {
                    current.context.fillStyle = "#FFF";
                    drawCircle(current.context, current.context.canvas.width / 2, current.context.canvas.height / 2, current.context.canvas.width / 2);
                    current.context.globalAlpha = 0.6;
                    current.context.drawImage(img, 0, 0, current.context.canvas.width, current.context.canvas.height);
                    current.context.globalAlpha = 1;
                    current.context.fillStyle = "#000";
                    current.context.font = "Bold 160px Open Sans";
                    var text = current.name;
                    current.context.textAlign = "center";
                    wrapText(current.context, text, current.context.canvas.width / 2, current.context.canvas.height / 2, current.context.canvas.width - 10, current.context.canvas.height / 3);
                }
                old = null;
                spriteHoverContext.clearRect(0, 0, 800, 300);
                spriteHoverTexture.needsUpdate = true;
            }
        }

/*        img.onload = function(e) { */        
            init();
        	render();
            update();
        /*}*/
    }
}
}]);