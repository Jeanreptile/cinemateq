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
            var camera = new THREE.PerspectiveCamera(45, ($('#graph').width() - 20) / (window.innerHeight - $('header').height()), 1, 1000);
            var cameraControls;
            var bgScene, bgCam;
            var renderer = new THREE.WebGLRenderer({ antialias: true });
            var raycaster = new THREE.Raycaster();
            var mouse = new THREE.Vector2();
            var INTERSECTED = null;
            var spriteHover, spriteHoverContext, spriteHoverTexture, spriteHoverCanvas;
            var old = null;
            var current = null;
            var img = new Image();
            img.src = 'images/leonardo_dicaprio.jpeg';
            var img2 = new Image();
            img2.src = 'images/inception.jpg';
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
            var background;
            var currentDisplayedNodes = [];

            function init() {
                renderer.setSize($('#graph').width() - 20, window.innerHeight - $('header').height());
                renderer.setClearColor(0xf0f0f0);
                document.getElementById('graph').appendChild(renderer.domElement);
                viewWidth = $('#graph').width() - 20;
                viewHeight = $('#graph').height();

                // background scene
                var bgCanvas = generateBackgroundCanvas(viewWidth, viewHeight, img, 60);
                var bgTexture = new THREE.Texture(bgCanvas);
                background = new THREE.Mesh(
                    new THREE.PlaneBufferGeometry(2, 2, 0),
                    new THREE.MeshBasicMaterial({map: bgTexture})
                );
                background.bgCanvas = bgCanvas;
                background.bgTexture = bgTexture;
                background.bgTexture.needsUpdate = true;
                background.material.depthTest = false;
                background.material.depthWrite = false;
                bgScene = new THREE.Scene();
                bgCam = new THREE.Camera();
                bgScene.add(bgCam);
                bgScene.add(background);


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

                // hover text init
                spriteHoverCanvas = generateHoverText("testtesttesttest");
                spriteHoverContext = spriteHoverCanvas.getContext('2d');
                spriteHoverTexture = new THREE.Texture(spriteHoverCanvas);
                var material = new THREE.SpriteMaterial({ map: spriteHoverTexture, useScreenCoordinates: false });
                spriteHover = new THREE.Sprite(material);
                spriteHover.position.set(0, 0, 0);
                spriteHover.scale.set(8, 4, 1);
                //scene.add(spriteHover);

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
            
            var text = node.name ? (node.firstname + " " + node.lastname) : node.title;
            var canvas = generateTexture(text);
            var texture = new THREE.Texture(canvas);
            THREE.LinearFilter = THREE.NearestFilter = texture.minFilter;
            texture.needsUpdate = true;
            var spriteMaterial = new THREE.SpriteMaterial({ map: texture });
            var sprite = new THREE.Sprite(spriteMaterial);
            
            sprite._id = node.id;
            sprite.name = node.name ? (node.firstname + " " + node.lastname) : node.title;
            sprite.canvas = canvas;
            sprite.context = canvas.getContext('2d');
            sprite.texture = texture;
            sprite.position.set(position.x, position.y, position.z);
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
            updateTexture(canvas, text, 0.6);
            return canvas;
        }

        function updateTexture(canvas, text, opacity) {
            var context = canvas.getContext('2d');
            drawCircle(context, canvas.width / 2, canvas.height / 2, canvas.width / 2);
            context.fillStyle = "#000";
            context.fillRect(0, 0, canvas.width, canvas.height);
            context.globalAlpha = opacity;
            context.drawImage(img, 0, 0, canvas.width, canvas.height);
            context.globalAlpha = 1;
            context.fillStyle = "#000";
            context.font = "130px Moon Bold";
            context.textAlign = "center";
            wrapText(context, text, canvas.width / 2, canvas.height / 2.4, canvas.width - 10, canvas.height / 4.5);
        }

        function generateBackgroundCanvas(width, height, image, blur) {
            var bgCanvas = document.createElement('canvas');
            bgCanvas.width = width;
            bgCanvas.height = height;
            var bgContext = bgCanvas.getContext('2d');
            drawImageProp(bgContext, image, 0, 0, bgCanvas.width, bgCanvas.height);
            stackBlurCanvasRGB(bgCanvas, 0, 0, bgCanvas.width, bgCanvas.height, blur);
            return bgCanvas;
        }

        function crossFadeBackgroundCanvas(canvas, startCanvas, endCanvas, percentage) {
            var bgContext = canvas.getContext('2d');
            bgContext.fillStyle = "#000";
            bgContext.fillRect(0, 0, canvas.width, canvas.height);
            bgContext.globalAlpha = 1 - (percentage / 100);
            bgContext.drawImage(startCanvas, 0, 0, canvas.width, canvas.height);
            bgContext.globalAlpha = percentage / 100;
            bgContext.drawImage(endCanvas, 0, 0, canvas.width, canvas.height);
            bgContext.globalAlpha = 1;
        }

        function cloneCanvas(canvas) {
            var newCanvas = document.createElement('canvas');
            newCanvas.width = canvas.width;
            newCanvas.height = canvas.height;
            newCanvasContext = newCanvas.getContext('2d');
            newCanvasContext.drawImage(canvas, 0, 0, newCanvas.width, newCanvas.height);
            return newCanvas;
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
            renderer.autoClear = false;
            renderer.clear();
            renderer.render(bgScene, bgCam);
            renderer.render(scene, camera);
        }

        function onMouseHover(event) {
            event = event || window.event;
            var target = event.target || event.srcElement,
                rect = target.getBoundingClientRect(),
                offsetX = event.clientX - rect.left,
                offsetY = event.clientY - rect.top;
            mouse.x = (offsetX / viewWidth) * 2 - 1;
            mouse.y = -(offsetY / viewHeight) * 2 + 1;
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
                  .easing(TWEEN.Easing.Linear.None)
                  .onComplete(function(){
                        // getting nodes
                        $http.get('/api/common/' + id).success(function(node) {
                            scope.currentNode = node;
                            // updating background
                            var crossFade = new Object();
                            crossFade.startCanvas = cloneCanvas(background.bgCanvas);
                            if (Math.random() < 0.5)
                                crossFade.endCanvas = generateBackgroundCanvas(viewWidth, viewHeight, img, 60);
                            else
                                crossFade.endCanvas = generateBackgroundCanvas(viewWidth, viewHeight, img2, 60);
                            crossFade.percentage = 0;
                            var tween = new TWEEN.Tween(crossFade).to({percentage : 100}, 1000)
                                .easing(TWEEN.Easing.Linear.None)
                                .onUpdate(function (){
                                    crossFadeBackgroundCanvas(background.bgCanvas, crossFade.startCanvas,
                                        crossFade.endCanvas, crossFade.percentage);
                                    background.bgTexture.needsUpdate = true;
                                }).start();
                        });
                        nodePosition = intersection.object.position;
                        getNode(id, nodePosition, draw);
                  })
                  .start();
            }
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
            /*ctx.lineWidth = radius;*/
            /*ctx.strokeStyle = '#f0f0f0';
            ctx.stroke();*/
            ctx.clip();
        }

        // draw an image proportionally to fit inside a container
        function drawImageProp(ctx, img, x, y, w, h, offsetX, offsetY) {
            if (arguments.length === 2) {
                x = y = 0;
                w = ctx.canvas.width;
                h = ctx.canvas.height;
            }
            // default offset is center
            offsetX = typeof offsetX === "number" ? offsetX : 0.5;
            offsetY = typeof offsetY === "number" ? offsetY : 0.5;
            // keep bounds [0.0, 1.0]
            if (offsetX < 0) offsetX = 0;
            if (offsetY < 0) offsetY = 0;
            if (offsetX > 1) offsetX = 1;
            if (offsetY > 1) offsetY = 1;
            var iw = img.width,
                ih = img.height,
                r = Math.min(w / iw, h / ih),
                nw = iw * r,   // new prop. width
                nh = ih * r,   // new prop. height
                cx, cy, cw, ch, ar = 1;
            // decide which gap to fill
            if (nw < w) ar = w / nw;
            if (nh < h) ar = h / nh;
            nw *= ar;
            nh *= ar;
            // calc source rectangle
            cw = iw / (nw / w);
            ch = ih / (nh / h);
            cx = (iw - cw) * offsetX;
            cy = (ih - ch) * offsetY;
            // make sure source rectangle is valid
            if (cx < 0) cx = 0;
            if (cy < 0) cy = 0;
            if (cw > iw) cw = iw;
            if (ch > ih) ch = ih;
            // fill image in dest. rectangle
            ctx.drawImage(img, cx, cy, cw, ch,  x, y, w, h);
        }

        function update() {
            raycaster.setFromCamera(mouse, camera);
            var intersects = raycaster.intersectObjects(scene.children);

            // getting intersected object
            if (intersects.length > 0 && intersects[0].object != INTERSECTED){
                /*if (INTERSECTED)
                    console.log(INTERSECTED.name + " " + INTERSECTED.type + " " + INTERSECTED._id + ' | '
                        + intersects[0].object.name + " " + intersects[0].object.type + " " + intersects[0].object._id
                        + " > " + (current != null ? current.name : "null"));*/
                INTERSECTED = intersects[0].object;

                if (INTERSECTED._id !== undefined) {
                    // restoring node state when leaving it
                    if (current && (current._id != INTERSECTED._id)) {
                        //console.log('Restoring ' + current.name);
                        updateTexture(current.canvas, current.name, 0.6);
                        current.texture.needsUpdate = true;
                        old = current;
                    }
                    // updating intersected node and animating opacity
                    current = INTERSECTED;
                    //console.log('updating ' + current.name, current);
                    current.animationOpacity = 0.6;
                    var tween = new TWEEN.Tween(current).to({animationOpacity : 1}, 200)
                    .easing(TWEEN.Easing.Linear.None)
                    .onUpdate(function (){
                        updateTexture(current.canvas, current.name, current.animationOpacity);
                        current.texture.needsUpdate = true;
                    }).start();

                    // drawing selected sprite hover text
/*                    spriteHoverContext.fillStyle = "#FFF";
                    spriteHoverContext.fillRect(0, 0, spriteHoverCanvas.width, spriteHoverCanvas.height);
                    spriteHoverContext.strokeStyle = "#000";
                    spriteHoverContext.stroke();
                    spriteHoverContext.fillStyle = "#000";
                    spriteHoverContext.font = "45px Moon Light";
                    spriteHoverContext.textAlign = "center";
                    var text = intersects[0].object.name;
                    wrapText(spriteHoverContext, text, spriteHoverCanvas.width / 2, spriteHoverCanvas.height / 2, spriteHoverCanvas.width - 10, spriteHoverCanvas.height / 4);
                    spriteHover.position.set(intersects[0].object.position.x, intersects[0].object.position.y + 5, intersects[0].object.position.z + 0.5 );
                    spriteHoverTexture.needsUpdate = true;*/
                }
/*                    else {
                    spriteHoverContext.clearRect(0, 0, 500, 300);
                    spriteHoverTexture.needsUpdate = true;
                }*/
            }
/*            else
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
            }*/
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
