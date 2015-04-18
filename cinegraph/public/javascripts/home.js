var cinegraphApp = angular.module('cinegraphApp', ['ui.bootstrap']);

cinegraphApp.config(['$locationProvider', function($locationProvider) {
        $locationProvider.html5Mode(true);
}]);

cinegraphApp.service('ModelDataService', ['$http', function ($http) {
    this.getData = function () {
        return {
            async: function() {
                    return $http.get('/api/persons/all');
                }
            };
        }
    }]);

var cinegraphController = cinegraphApp.controller('cinegraphController', ['$scope', '$http', '$location',
    function($scope, $http, $location) {
    //ModelDataService.getData().async().then(function(d) { $scope.persons = d.data; });
    $scope.currentNode = {};
    var selectedNodeId = $location.search()['id'];
    if (selectedNodeId == undefined) {
        selectedNodeId = 466302;
    }
    $http.get('/api/common/' + selectedNodeId).success(function(node) {
        $scope.currentNode = node;
    });
    $scope.currentNode.id = selectedNodeId;
}]);

cinegraphApp.directive("cinegraph", [ 'ModelDataService', '$http', function(ModelDataService, $http) {
	return {
		link: function link(scope, element, attrs) {
			// global vars
            var scene = new THREE.Scene();
            var camera = new THREE.PerspectiveCamera(45, $('#content').width() / (window.innerHeight - $('header').height()), 1, 1000);
            var cameraControls;
            var renderer = new THREE.WebGLRenderer({ antialias: true });
            var raycaster = new THREE.Raycaster();
            var mouse = new THREE.Vector2();
            var INTERSECTED;
            var spriteHover, spriteHoverContext, spriteHoverTexture, spriteHoverCanvas;
            var old = null;
            var current = null;
            var img = new Image();
            img.src = 'images/leonardo_dicaprio.jpeg';
            //img.src = 'images/inception2.jpg';
            var radius = 50;
            var theta = 0;
            var nodeRadius = 100, nodeSegments = 64;
            var nodePosition = new THREE.Vector3(0, 0, 0);
            var nodeScale = new THREE.Vector3(2, 2, 1);
            var randomVector = new THREE.Vector3(Math.random() * 60 - 20, Math.random() * 60 - 20, Math.random() * 60 - 20);
            var typesAndLimits = [ { type: 'ACTED_IN', limit: 5},
                                    { type: 'PRODUCED', limit: 2},
                                    { type: 'DIRECTED', limit: 2},
                                    { type: 'COMPOSED_MUSIC', limit: 1},
                                    { type: 'DIRECTED_PHOTOGRAPHY', limit: 1} ];
            var viewWidth, viewHeight;
            var movieImageWidth = 990;
            var movieHeightWidth = 1485;
            var movieImageOffsetX = 20;
            var movieImageOffsetY = -450;
            var currentDisplayedNodes = [];

            function init() {
                renderer.setSize($('#content').width(), window.innerHeight - $('header').height());
                renderer.setClearColor(0xf0f0f0);
                document.getElementById('graph').appendChild(renderer.domElement);
                viewWidth = $('#graph').width();
                viewHeight = $('#graph').height();

                // camera
                camera.position.x = 0;
                camera.position.y = 0;
                camera.position.z = 50;

                cameraControls = new THREE.TrackballControls(camera);
                cameraControls.rotateSpeed = 2.0;
                cameraControls.zoomSpeed = 1.2;
                cameraControls.panSpeed = 0.8;
                cameraControls.noZoom = false;
                cameraControls.noPan = false;
                cameraControls.staticMoving = true;
                cameraControls.dynamicDampingFactor = 0.3;
                cameraControls.keys = [ 65, 83, 68 ];

                // cube
                var geometry = new THREE.BoxGeometry(1, 1, 1);
                var material = new THREE.MeshBasicMaterial({ color: 0xf0f0f0, wireframe: true });
                var cube = new THREE.Mesh(geometry, material);
                INTERSECTED = cube;
                scene.add(cube)

                // hover text init
                spriteHoverCanvas = generateHoverText("testtesttesttest");
                spriteHoverContext = spriteHoverCanvas.getContext('2d');
                spriteHoverTexture = new THREE.Texture(spriteHoverCanvas);
                var material = new THREE.SpriteMaterial({ map: spriteHoverTexture, useScreenCoordinates: false });
                spriteHover = new THREE.Sprite(material);
                spriteHover.position.set(0, 0, 0);
                spriteHover.scale.set(8, 4, 1);
                scene.add(spriteHover);

                getNode(scope.currentNode.id, nodePosition, draw);

            // listeners
            document.getElementById('graph').addEventListener('change', render, false);
            document.getElementById('graph').addEventListener('click', onClick, false);
            document.getElementById('graph').addEventListener('mousemove', onMouseHover, false);
        }

        function getNode(id, nodePostion, callback) {
            $http.get('/api/common/' + id).success(function(node) {
                callback(node, nodePosition);
            });
        }

        /* callback called when getting a node from the API */
        function draw(node, nodePosition) {
            var nodeSprite = drawNode(node, nodeRadius, nodeSegments, nodePosition);
            getRelatedNodes(node, nodeSprite.sprite, typesAndLimits, drawRelatedNodes);
        }


        function getRelatedNodes(startNode, startNodeSprite, typesAndLimits, callback) {
            var index = 0;
            for (var i = 0; i < typesAndLimits.length; i++) {
                getRelatedNodesForType(startNode, typesAndLimits[i].type, typesAndLimits[i].limit, index, startNodeSprite, callback);
                index += typesAndLimits[i].limit;
            }
        }

        function getRelatedNodesForType(startNode, type, limit, index, startNodeSprite, callback) {
            var direction = 'in';
            if (startNode.type == 'Person') {
                direction = 'out';
            }
            $http.get('/api/common/' + startNode.id + '/relationships/' + direction + '/' + type).success(function(relationships) {
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

            var text = node.name ? (node.firstname + " " + node.lastname) : node.title;
            var canvas = generateTexture(text);
            var texture = new THREE.Texture(canvas);
            THREE.LinearFilter = THREE.NearestFilter = texture.minFilter;
            texture.needsUpdate = true;
            var spriteMaterial = new THREE.SpriteMaterial({ map: texture });
            var sprite = new THREE.Sprite(spriteMaterial);
            sprite._id = node.id;
            sprite.name = node.name ? (node.firstname + " " + node.lastname) : node.title;
            sprite.context = canvas.getContext('2d');
            sprite.texture = texture;
            sprite.position.set(nodeMesh.position.x, nodeMesh.position.y, nodeMesh.position.z + 0.5);
            sprite.scale.set(8, 8, 8);
            var added = false;
            if ($.inArray(node.id, currentDisplayedNodes) == -1) {
                scene.add(sprite);
                added = true;
            }
            currentDisplayedNodes.push(node.id);
            return {sprite: sprite, added: added};
        }

        function drawRelatedNodes(startNodeSprite, relatedNodes, index, limit) {
            var slice = 2 * Math.PI / 11;
            var relatedNodePosition = new THREE.Vector3();
            if (limit > relatedNodes.length) {
                limit = relatedNodes.length;
            }
            for (i = index, j = 0; i < limit + index, j < limit; i++, j++) {
                var angle = slice * i;
                relatedNodePosition.x = nodePosition.x + 20 * Math.cos(angle);
                relatedNodePosition.y = nodePosition.y + 20 * Math.sin(angle);
                var relatedNodeSprite = drawNode(relatedNodes[j], nodeRadius, nodeSegments, relatedNodePosition);
                var endNodePosition;
                if (relatedNodeSprite.added == false) {
                    var obj = scene.getObjectByName(relatedNodes[j].name ?
                        (relatedNodes[j].firstname + " " + relatedNodes[j].lastname) : relatedNodes[j].title);
                    endNodePosition = obj.position;
                }
                else {
                    endNodePosition = relatedNodeSprite.sprite.position;
                }
                var material = new THREE.LineBasicMaterial({ color: 0x000000 });
                var geometry = new THREE.Geometry();
                geometry.vertices.push(endNodePosition, startNodeSprite.position);
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
            canvas.width = 1000;
            canvas.height = 1000;
        	var context = canvas.getContext('2d');
            context.fillStyle = "#FFF";
            drawCircle(context, canvas.width / 2, canvas.height / 2, canvas.width / 2.1);
            context.globalAlpha = 0.6;
            context.drawImage(img, 0, 0, canvas.width, canvas.height);
            context.globalAlpha = 1;
            context.fillStyle = "#000";
            context.font = "130px Moon Bold";
            context.textAlign = "center";
            wrapText(context, text, canvas.width / 2, canvas.height / 2.4, canvas.width - 10, canvas.height / 4.5);
            return canvas;
        }

        function generateHoverText(text) {
            var canvas = document.createElement('canvas');
            spriteHoverContext = canvas.getContext('2d');
            spriteHoverContext.fillStyle = "#FFF";
            spriteHoverContext.fillRect(0, 0, 1000, 250);
            spriteHoverContext.fillStyle = "#000";
            spriteHoverContext.font = "45px Moon Light";
            spriteHoverContext.textAlign = "center";
            spriteHoverContext.stroke();
            wrapText(spriteHoverContext, text, 500 / 2, 500 / 4, 500 - 5, 500 / 2);
            return canvas;
        }

        // animation loop
        function animate() {
            requestAnimationFrame(animate);
            update();
            TWEEN.update();
            cameraControls.update();
            render();
        }

        // render the scene
        function render() {
            renderer.render(scene, camera);
        }

        function onMouseHover(event) {
            mouse.x = (event.offsetX / viewWidth) * 2 - 1;
            mouse.y = -(event.offsetY / viewHeight) * 2 + 1;
        }

        function onClick(event) {
            raycaster.setFromCamera(mouse, camera);
            var intersects = raycaster.intersectObjects(scene.children);
            var intersection = intersects[0];
            if (intersection == undefined) {
                return;
            }
            var id = intersection.object._id;
            if (id != null) {
                // animating camera
                var moveX = intersection.object.position.x;
                var moveY = intersection.object.position.y;
                var moveZ = intersection.object.position.z + 50;
                var targetX = intersection.object.position.x;
                var targetY = intersection.object.position.y;
                var targetZ = intersection.object.position.z;
                var duration = 500;

                new TWEEN.Tween(camera.position).to({
                    x: moveX,
                    y: moveY,
                    z: moveZ}, duration)
                  .easing(TWEEN.Easing.Linear.None).start();
                new TWEEN.Tween(cameraControls.target).to({
                    x: targetX,
                    y: targetY,
                    z: targetZ}, duration)
                  .easing(TWEEN.Easing.Linear.None).start();

                $http.get('/api/common/' + id).success(function(node) {
                    scope.currentNode = node;
                });
                nodePosition = intersection.object.position;
                getNode(id, nodePosition, draw);
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
            ctx.lineWidth = 25;
            ctx.stroke();
            ctx.clip();
        }

        function update() {
            raycaster.setFromCamera(mouse, camera);
            var intersects = raycaster.intersectObjects(scene.children);
            if (intersects.length > 0) {
                if (intersects[0].object != INTERSECTED) {
                    if (intersects[0].object._id !== undefined) {
                        if (current && (current._id != intersects[0].object._id)) {
                            current.context.fillStyle = "#FFF";
                            drawCircle(current.context, current.context.canvas.width / 2, current.context.canvas.height / 2, current.context.canvas.width / 2);
                            current.context.globalAlpha = 0.6;
                            current.context.drawImage(img, 0, 0, current.context.canvas.width, current.context.canvas.height);
                            current.context.globalAlpha = 1;
                            current.context.fillStyle = "#000";
                            current.context.font = "130px Moon Bold";
                            var text = current.name;
                            current.context.textAlign = "center";
                            wrapText(current.context, text, current.context.canvas.width / 2, current.context.canvas.height / 2, current.context.canvas.width - 10, current.context.canvas.height / 3);
                            old = current;
                            current = intersects[0].object;
                        }
                        else {
                            current = intersects[0].object;
                        }
                        //console.log("old : " + JSON.stringify(old));
                        //console.log("current : " + JSON.stringify(current));
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
                        spriteHoverContext.stroke();
                        spriteHoverContext.fillStyle = "#000";
                        spriteHoverContext.font = "45px Moon Light";
                        spriteHoverContext.textAlign = "center";
                        var text = intersects[0].object.name;
                        wrapText(spriteHoverContext, text, spriteHoverCanvas.width / 2, spriteHoverCanvas.height / 2, spriteHoverCanvas.width - 10, spriteHoverCanvas.height / 4);
                        spriteHover.position.set(intersects[0].object.position.x, intersects[0].object.position.y + 5, intersects[0].object.position.z + 0.5 );
                        spriteHoverTexture.needsUpdate = true;
                    }
                    else {
                        //console.log("OUT");
                        spriteHoverContext.clearRect(0, 0, 500, 300);
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
                    if (current) {
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
                }
                old = null;
                spriteHoverContext.clearRect(0, 0, 800, 300);
                spriteHoverTexture.needsUpdate = true;
            }
        }

        init();
        animate();
    }
}
}]);

cinegraphApp.factory('authInterceptor', function ($rootScope, $q, $window) {
  return {
    request: function (config) {
      console.log("alo");
      config.headers = config.headers || {};
      if ($window.sessionStorage.token) {
        config.headers.Authorization = 'Bearer ' + $window.sessionStorage.token;
      }
      return config;
    },
    responseError: function (rejection) {
      if (rejection.status === 401) {
        // handle the case where the user is not authenticated
      }
      return $q.reject(rejection);
    }
  };
});

cinegraphApp.config(function ($httpProvider) {
  $httpProvider.interceptors.push('authInterceptor');
});
