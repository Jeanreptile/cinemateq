var cinegraphApp = angular.module('cinegraphApp', ['ui.bootstrap', 'ngRoute']);

cinegraphApp.config(['$locationProvider', '$routeProvider', function($locationProvider, $routeProvider) {
      console.log('oui ??');
      $locationProvider.html5Mode(true);
      $routeProvider
            .when('/', {
              templateUrl: 'partials/index', controller: 'cinegraphController'
            })
            .when('/signin', {
                templateUrl: 'partials/signin', controller: "UserCtrl"
            })
            .when('/register', {
                templateUrl: 'partials/register', controller: "UserCtrl"
            })
            .when('/home', {
                templateUrl: 'partials/home', controller: 'UserCtrl'
            })
            .when('/restricted', {
              templateUrl: '/partials/restricted'
            })
            .when('/mycinegraph', {
              templateUrl: '/partials/mycinegraph', controller: 'cinegraphController',
              access: { requiredAuthentication: true }
            })
            .when('/error', {
              templateUrl: '/partials/error'
            })
            .when('/search', {
              templateUrl: '/partials/search', controller: 'TypeaheadCtrl'
            })
            .when('/unauthorized', {
              templateUrl: '/partials/unauthorized', controller: 'restrictedController'
            })
            .when('/signout', {
                redirectTo: '/',
                resolve: {
                  "deleteSession": function( $q, $window, AuthService ) {
                    AuthService.logout();
                  }
                }
              })
            .otherwise({
                redirectTo: '/'
            }
        );
}]);

function getParameterByName(name) {
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
        results = regex.exec(location.search);
    return results === null ? null : decodeURIComponent(results[1].replace(/\+/g, " "));
}

cinegraphApp.run(function($rootScope, $location, $window, AuthService) {
    $rootScope.$on("$routeChangeStart", function(event, nextRoute, currentRoute) {
        //redirect only if both isAuthenticated is false and no token is set
        if (nextRoute != null && nextRoute.access != null && nextRoute.access.requiredAuthentication
            && !AuthService.isLoggedIn() && !$window.sessionStorage.token) {
            $location.path("/unauthorized");
        }
    });
});

cinegraphApp.service('ModelDataService', ['$http', function ($http) {
    this.getData = function () {
        return {
            async: function() {
                    return $http.get('/api/persons/all');
            }
        };
    }
}]);

var cinegraphController = cinegraphApp.controller('restrictedController',
    function($scope, $http, $window, $location, AuthService) {
    $(document).ready(function(){
      console.log('alo ui le BG auuuth');
      var randombgs=["multipass", "gandalf", "matrix"];
      number = Math.floor(Math.random() * randombgs.length);
      $('#unauthorizedpage').css({'background-image': 'url(/images/' + randombgs[number] + '.jpg)'});
    });
});

var cinegraphController = cinegraphApp.controller('cinegraphController',
    function($scope, $http, $window, $location, AuthService) {
    $scope.$watch( AuthService.isLoggedIn, function ( isLoggedIn ) {
      $scope.isLoggedIn = isLoggedIn;
      $scope.currentUser = AuthService.currentUser();
    });

    $scope.logout = function(){
      console.log("allo ui");
      AuthService.logout();
    }
    //ModelDataService.getData().async().then(function(d) { $scope.persons = d.data; });
    $scope.currentNode = {};
    var selectedNodeId = getParameterByName('id');
    if (selectedNodeId == undefined) {
        selectedNodeId = 466302;
    }
    $http.get('/api/common/' + selectedNodeId).success(function(node) {
        $scope.currentNode = node;
    });
    $scope.currentNode.id = selectedNodeId;

    $scope.currentDisplayedNodes = [];

    $scope.typesAndLimits = [ { type: 'ACTED_IN', limit: 5},
                            { type: 'PRODUCED', limit: 2},
                            { type: 'DIRECTED', limit: 2},
                            { type: 'COMPOSED_MUSIC', limit: 1},
                            { type: 'DIRECTED_PHOTOGRAPHY', limit: 1},
                            { type: 'WROTE', limit: 5},
                            { type: 'EDITED', limit: 3},
                            { type: 'DESIGNED_PRODUCTION', limit: 3},
                            { type: 'DESIGNED_COSTUMES', limit: 2} ];

    $scope.findLimitForJob = function(type) {
        for (var i = 0 ; i < $scope.typesAndLimits.length; i++) {
            if ($scope.typesAndLimits[i].type == type) {
                return $scope.typesAndLimits[i].limit;
            }
        }
    }

    $scope.filterByActor = function() {
        if ($scope.selectedJobs.actor) {
            $scope.getRelatedNodesForType($scope.currentNode, 'ACTED_IN', $scope.findLimitForJob('ACTED_IN'),
                $scope.currentDisplayedNodes.length, $scope.currentNode.sprite, $scope.drawRelatedNodes);
        }
        else {
            // remove
        }
    };

    $scope.filterByDirector = function() {
        if ($scope.selectedJobs.director) {
            $scope.getRelatedNodesForType($scope.currentNode, 'DIRECTED', $scope.findLimitForJob('DIRECTED'),
                $scope.currentDisplayedNodes.length, $scope.currentNode.sprite, $scope.drawRelatedNodes);
        }
        else {
            // remove
        }
    };

    $scope.filterByProducer = function() {
        if ($scope.selectedJobs.producer) {
            $scope.getRelatedNodesForType($scope.currentNode, 'PRODUCED', $scope.findLimitForJob('PRODUCED'),
                $scope.currentDisplayedNodes.length, $scope.currentNode.sprite, $scope.drawRelatedNodes);
        }
        else {
            // remove
        }
    };

    $scope.filterByWriter = function() {
        if ($scope.selectedJobs.writer) {
            $scope.getRelatedNodesForType($scope.currentNode, 'WROTE', $scope.findLimitForJob('WROTE'),
                $scope.currentDisplayedNodes.length, $scope.currentNode.sprite, $scope.drawRelatedNodes);
        }
        else {
            // remove
        }
    };

    $scope.filterByEditor = function() {
        if ($scope.selectedJobs.writer) {
            $scope.getRelatedNodesForType($scope.currentNode, 'EDITED', $scope.findLimitForJob('EDITED'),
                $scope.currentDisplayedNodes.length, $scope.currentNode.sprite, $scope.drawRelatedNodes);
        }
        else {
            // remove
        }
    };

    $scope.filterByDirPhotography = function() {
        if ($scope.selectedJobs.dirphotography) {
            $scope.getRelatedNodesForType($scope.currentNode, 'DIRECTED_PHOTOGRAPHY', $scope.findLimitForJob('DIRECTED_PHOTOGRAPHY'),
                $scope.currentDisplayedNodes.length, $scope.currentNode.sprite, $scope.drawRelatedNodes);
        }
        else {
            // remove
        }
    };

    $scope.filterByMusicComposer = function() {
        if ($scope.selectedJobs.musiccomposer) {
            $scope.getRelatedNodesForType($scope.currentNode, 'COMPOSED_MUSIC', $scope.findLimitForJob('COMPOSED_MUSIC'),
                $scope.currentDisplayedNodes.length, $scope.currentNode.sprite, $scope.drawRelatedNodes);
        }
        else {
            // remove
        }
    };

    $scope.filterByCosDesigner = function() {
        if ($scope.selectedJobs.cosdesigner) {
            $scope.getRelatedNodesForType($scope.currentNode, 'DESIGNED_COSTUMES', $scope.findLimitForJob('DESIGNED_COSTUMES'),
                $scope.currentDisplayedNodes.length, $scope.currentNode.sprite, $scope.drawRelatedNodes);
        }
        else {
            // remove
        }
    };

    $scope.filterByProdDesigner = function() {
        if ($scope.selectedJobs.proddesigner) {
            $scope.getRelatedNodesForType($scope.currentNode, 'DESIGNED_PRODUCTION', $scope.findLimitForJob('DESIGNED_PRODUCTION'),
                $scope.currentDisplayedNodes.length, $scope.currentNode.sprite, $scope.drawRelatedNodes);
        }
        else {
            // remove
        }
    };
});

cinegraphApp.directive("cinegraph", [ 'ModelDataService', '$http', function(ModelDataService, $http) {
	return {
		link: function link(scope, element, attrs) {
			// global vars
            var scene = new THREE.Scene();
            var linesScene, linesCamera;
            var camera;
            var cameraControls;
            var bgScene, bgCam;
            var renderer = new THREE.WebGLRenderer({ antialias: false, alpha:true, autoClear: false });
            var raycaster = new THREE.Raycaster();
            var mouse = new THREE.Vector2();
            var mouseClickStart = new THREE.Vector2();
            var mouseIsDown = false;
            var INTERSECTED = null;
            var spriteHover;
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
            var viewWidth, viewHeight;
            var movieImageWidth = 990;
            var movieHeightWidth = 1485;
            var movieImageOffsetX = 20;
            var movieImageOffsetY = -450;
            var background;
            var currentDisplayedNodes = [];
            var orangeColor = '#ffa827';
            var blueColor = '#319ef1';
            var composer, composerBackground, composerLines,
                blendIntermediateComposer, blendComposer;

            function init() {
                $('#graph').css('height','100%');
                viewWidth = $('#graph').width();
                viewHeight = $('#graph').height();
                camera = new THREE.PerspectiveCamera(45, viewWidth / viewHeight, 1, 1000);
                renderer.setSize(viewWidth, viewHeight);
                document.getElementById('graph').appendChild(renderer.domElement);

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

                // lines scene
                linesScene = new THREE.Scene();
                linesCamera = new THREE.Camera();
                linesScene.add(camera);

                // camera
                camera.position.x = 0;
                camera.position.y = 0;
                camera.position.z = 50;
                cameraControls = new THREE.TrackballControls(camera, document.getElementById('graph'));
                cameraControls.rotateSpeed = 2.0;
                cameraControls.zoomSpeed = 1.2;
                cameraControls.panSpeed = 0.8;
                cameraControls.noZoom = false;
                cameraControls.noPan = false;
                cameraControls.staticMoving = true;
                cameraControls.dynamicDampingFactor = 0.3;
                cameraControls.keys = [ 65, 83, 68 ];

                // hover text init
                var spriteHoverCanvas = generateHoverText();
                var spriteHoverTexture = new THREE.Texture(spriteHoverCanvas);
                var material = new THREE.SpriteMaterial({ map: spriteHoverTexture });
                spriteHover = new THREE.Sprite(material);
                spriteHoverTexture.needsUpdate = true;
                spriteHover.position.set(0, 0, 0);
                spriteHover.scale.set(12, 12, 12);
                spriteHover.ignoreClick = true;
                spriteHover.canvas = spriteHoverCanvas;
                spriteHover.texture = spriteHoverTexture;
                scene.add(spriteHover);

                // over sampling for antialiasing
                var sampleRatio = 2;
                var parameters = {
                    minFilter: THREE.LinearFilter,
                    magFilter: THREE.LinearFilter,
                    format: THREE.RGBAFormat,
                    stencilBuffer: false
                };
                // background
                var renderTargetBackground = new THREE.WebGLRenderTarget(viewWidth, viewHeight, parameters);
                var renderBackgroundScene = new THREE.RenderPass(bgScene, bgCam);
                var effectCopyBackground = new THREE.ShaderPass(THREE.CopyShader);
                composerBackground = new THREE.EffectComposer(renderer, renderTargetBackground);
                composerBackground.addPass(renderBackgroundScene);
                composerBackground.addPass(effectCopyBackground);
                // lines
                var renderLinesTarget = new THREE.WebGLRenderTarget(viewWidth, viewHeight, parameters);
                var renderLinesScene = new THREE.RenderPass(linesScene, camera);
                var lineShader = new THREE.ShaderPass(THREE.ThickLineShader);
                lineShader.uniforms.totalWidth.value = viewWidth;
                lineShader.uniforms.totalHeight.value = viewHeight;
                lineShader.uniforms['edgeWidth'].value = 6;
                composerLines = new THREE.EffectComposer(renderer, renderLinesTarget);
                composerLines.addPass(renderLinesScene);
                composerLines.addPass(lineShader);
                // intermediate composite
                var blendIntermediatePass = new THREE.ShaderPass(THREE.TransparencyBlendShader);
                blendIntermediatePass.uniforms['tBase'].value = composerBackground.renderTarget1;
                blendIntermediatePass.uniforms['tAdd'].value = composerLines.renderTarget1;
                blendIntermediateComposer = new THREE.EffectComposer(renderer);
                blendIntermediateComposer.addPass(blendIntermediatePass);
                // main scene
                var renderTarget = new THREE.WebGLRenderTarget(viewWidth * sampleRatio, viewHeight * sampleRatio, parameters);
                var renderScene = new THREE.RenderPass(scene, camera);
                var effectCopy = new THREE.ShaderPass(THREE.CopyShader);
                composer = new THREE.EffectComposer(renderer, renderTarget);
                composer.addPass(renderScene);
                composer.addPass(effectCopy);
                // composite
                var blendPass = new THREE.ShaderPass(THREE.TransparencyBlendShader);
                blendPass.uniforms['tBase'].value = blendIntermediateComposer.renderTarget1;
                blendPass.uniforms['tAdd'].value = composer.renderTarget1;
                blendComposer = new THREE.EffectComposer(renderer);
                blendComposer.addPass(blendPass);
                blendPass.renderToScreen = true;

                getNode(scope.currentNode.id, nodePosition, draw);

                // listeners
                document.getElementById('graph').addEventListener('change', render, false);
                $('#graph').mousedown(onMouseDown);
                $('#graph').mouseup(onMouseUp);
                document.getElementById('graph').addEventListener('mousemove', onMouseHover, false);
        }

        // animation loop
        function animate() {
            requestAnimationFrame(animate);
            TWEEN.update();
            cameraControls.update();
            render();
        }

        // render the scene
        function render() {
            renderer.clear();
            composerBackground.render();
            composerLines.render();
            blendIntermediateComposer.render();
            composer.render();
            blendComposer.render();
        }

        function removeFromScene(array, excludedId)
        {
        /*// getting center node to keep
            var excludedPosition;
            for (var i = 0 ; i < linesScene.length; i++)
            {
                var line = linesScene.children[i];
                if (line.relatedNodeId == excludedId)
                    excludedPosition = line.originPosition;
            }
            console.log('EXCLUDED ', excludedPosition);*/
            // removing sprites
            var length = scene.children.length;
            for (var i = 0 ; i < length; i++)
            {
                var node = scene.children[i];
                if (node._id != excludedId && array.indexOf(node._id) !== -1)
                {
                    scene.remove(node);
                }
            }
            // removing lines
            length = linesScene.children.length;
            for (var i = 0 ; i < length; i++)
            {
                var line = linesScene.children[i];
                if (array.indexOf(line.relatedNodeId) !== -1)
                {
                    linesScene.remove(line);
                }
            }
        }

        function getNode(id, nodePostion, callback) {
            removeFromScene(currentDisplayedNodes, id);
            currentDisplayedNodes = [];
            $http.get('/api/common/' + id).success(function(node) {
                callback(node, nodePosition);
            });
        }

        /* callback called when getting a node from the API */
        function draw(node, nodePosition) {
            var nodeSprite = drawNode(node, nodeRadius, nodeSegments, nodePosition);
            getRelatedNodes(node, nodeSprite.sprite, scope.typesAndLimits, drawRelatedNodes);
        }


        function getRelatedNodes(startNode, startNodeSprite, typesAndLimits, callback) {
            var index = 0;
                var limit;
                var job;
                if (startNode.type == "Person") {
                    job = startNode.jobs[0].name;
                    limit = scope.findLimitForJob(job);
                    getRelatedNodesForType(startNode, job, limit, index, startNodeSprite, callback);
                }
                else {
                    for (var i = 0; i < typesAndLimits.length; i++) {
                        job = typesAndLimits[i].type;
                        limit = typesAndLimits[i].limit;
                        getRelatedNodesForType(startNode, job, limit, index, startNodeSprite, callback);
                        index += limit;
                    }
                }
        }

        function pushRelations(index, direction, relationships, rels, callback) {
            scope.currentDisplayedNodes.push(relationships[index]);
            var endpoint = relationships[index].start;
            if (direction == "out") {
                endpoint = relationships[index].end;
            }
            $http.get('/api/common/' + endpoint).success(function(node) {
                rels.push(node);
                if (index == relationships.length - 1) {
                    callback(rels);
                }
            });
        }

        function getRelatedNodesForType(startNode, type, limit, index, startNodeSprite, callback) {
            var direction = 'in';
            if (startNode.type == 'Person') {
                direction = 'out';
            }
            $http.get('/api/common/' + startNode.id + '/relationshipsRaw/' + direction + '/' + type + '/' + limit)
                .success(function(relationships) {
                    if (relationships.length > 0) {
                        var rels = [];
                        for (var i = 0; i < relationships.length; i++) {
                            var found = false;
                            $.each(scope.currentDisplayedNodes, function(j, obj) {
                                if (relationships[i].id === obj.id) {
                                    found = true;
                                    return false;
                                }
                            });
                            if (found == false) {
                                pushRelations(i, direction, relationships, rels, function(relsResult) {
                                    callback(startNodeSprite, relsResult, index, limit);
                                });
                            }
                        }
                    }
            });
        }
        scope.getRelatedNodesForType = getRelatedNodesForType;

        /* draws a node
        param node : JSON object returned from request to DB
        param radius : radius of the circle
        param segments
        param position : THREE.Vector3 object for the position of the node
        */

        function drawNode(node, radius, segments, position, originPosition) {
            var text = node.name ? (node.firstname + " " + node.lastname) : node.title;
            var circleColor = node.name ? blueColor : orangeColor;
            var canvas = generateTexture(text, circleColor);
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

            if (originPosition !== undefined)
                sprite.position.set(originPosition.x, originPosition.y, originPosition.z);
            else
                sprite.position.set(position.x, position.y, position.z);
            sprite.circleColor = circleColor;
            sprite.scale.set(0, 0, 0);

            var added = false;

            //if (isAlreadyDisplayed == false) {
                scene.add(sprite);
                // animating scale
                new TWEEN.Tween(sprite.scale).to({x: 8, y: 8, z: 8}, 500)
                    .easing(TWEEN.Easing.Linear.None)
                    .onUpdate(function (){
                        //updateTexture(current.canvas, current.name, current.animationOpacity);
                        //current.texture.needsUpdate = true;
                    }).start();
                // animating position
                if (originPosition !== undefined) {
                    new TWEEN.Tween(sprite.position).to({x: position.x, y:position.y, z: position.z}, 500)
                        .easing(TWEEN.Easing.Linear.None)
                        .onComplete(function (){
                            // drawing line
                            var lineGeom = new THREE.Geometry();
                            lineGeom.vertices.push(sprite.position, originPosition);
                            lineGeom.colors.push(new THREE.Color(sprite.circleColor));
                            lineGeom.colors.push(new THREE.Color(sprite.circleColor == orangeColor ? blueColor : orangeColor));
                            var lineMat = new THREE.LineBasicMaterial({
                                linewidth: 1,
                                vertexColors: true
                            });
                            line = new THREE.Line(lineGeom, lineMat);
                            line.relatedNodeId = sprite._id;
                            line.originPosition = originPosition;
                            linesScene.add(line);
                        }).start();
                }
                added = true;
                //scope.currentDisplayedNodes.push(node.id);
            //}
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
                relatedNodePosition.x = nodePosition.x + 18 * Math.cos(angle);
                relatedNodePosition.y = nodePosition.y + 18 * Math.sin(angle);
                //relatedNodePosition.z = nodePosition.z + 18 * Math.random();
                var relatedNodeSprite = drawNode(relatedNodes[j], nodeRadius, nodeSegments, relatedNodePosition, nodePosition);
                var endNodePosition;
                if (relatedNodeSprite.added == false) {
                    var obj = scene.getObjectByName(relatedNodes[j].name ?
                        (relatedNodes[j].firstname + " " + relatedNodes[j].lastname) : relatedNodes[j].title);
                    endNodePosition = obj.position;
                }
                else {
                    endNodePosition = relatedNodeSprite.sprite.position;
                }
            }
        }
        scope.drawRelatedNodes = drawRelatedNodes;

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

        function generateTexture(text, circleColor) {
        	var canvas = document.createElement('canvas');
            canvas.width = 1000;
            canvas.height = 1000;
            updateTexture(canvas, text, 0.6, circleColor);
            return canvas;
        }

        function updateTexture(canvas, text, opacity, circleColor) {
            var borderThickness = canvas.width / 11;
            drawCircle(canvas, borderThickness, circleColor);
            var context = canvas.getContext('2d');
            context.fillStyle = "#000";
            context.fillRect(0, 0, canvas.width, canvas.height);
            context.globalAlpha = opacity;
            context.drawImage(img, borderThickness, borderThickness,
                canvas.width - 2 * borderThickness, canvas.height - 2 * borderThickness);
            var a = (1 / (0.6 - 1));
            context.globalAlpha = a * (opacity - 1);
            context.fillStyle = "#FFF";
            context.font = "120px Moon Bold";
            context.textAlign = "center";
            wrapText(context, text, canvas.width / 2, canvas.height / 2.4,
                canvas.width -  3 * borderThickness, canvas.height / 4.5);
            context.globalAlpha = 1;
        }

        function drawCircle(canvas, thickness, color) {
            var ctx = canvas.getContext('2d');
            ctx.beginPath();
            ctx.arc(canvas.width / 2, canvas.height / 2, canvas.width / 2 - thickness, 0, 2 * Math.PI);
            ctx.lineWidth = thickness;
            ctx.strokeStyle = color;
            ctx.stroke();
            ctx.clip();
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

        function generateHoverText() {
            var canvas = document.createElement('canvas');
            canvas.width = 1500;
            canvas.height = 1500;
            return canvas;
        }

        function updateHoverText(canvas, text)
        {
            var context = canvas.getContext('2d');
            context.clearRect(0, 0, canvas.width, canvas.height);
            context.fillStyle = "#aaaaaa";
            context.fillRect(0, 0, canvas.width, 300);
            context.fillStyle = "#000";
            context.font = "110px Moon Bold";
            context.textAlign = "center";
            wrapText(context, text, canvas.width / 2, 300 / 2.4, canvas.width, 110);
        }

        function setMousePosition(event)
        {
            event = event || window.event;
            var target = event.target || event.srcElement,
                rect = target.getBoundingClientRect(),
                offsetX = event.clientX - rect.left,
                offsetY = event.clientY - rect.top;
            mouse.x = (offsetX / viewWidth) * 2 - 1;
            mouse.y = -(offsetY / viewHeight) * 2 + 1;
        }

        function onMouseHover(event) {
            setMousePosition(event);
            if (!mouseIsDown)
                updateIntersection();
        }

        function onMouseDown(event) {
            setMousePosition(event);
            mouseClickStart.x = mouse.x;
            mouseClickStart.y = mouse.y;
            mouseIsDown = true;
        }

        function onMouseUp(event) {
            mouseIsDown = false;
            if (mouse.x != mouseClickStart.x || mouse.y != mouseClickStart.y)
                return;

            raycaster.setFromCamera(mouse, camera);
            var intersects = raycaster.intersectObjects(scene.children);
            // removing unwanted objects
            while (intersects.length > 0 && intersects[0].object.ignoreClick == true)
                intersects = intersects.slice(1);
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
                  .onComplete(function() {
                        // getting nodes
                        $http.get('/api/common/' + id).success(function(node) {
                            scope.currentNode = node;
                            scope.currentNode.sprite = intersection.object;
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

        function updateIntersection() {
            raycaster.setFromCamera(mouse, camera);
            var intersects = raycaster.intersectObjects(scene.children);
            // removing unwanted objects
            while (intersects.length > 0 && intersects[0].object.ignoreClick == true)
                intersects = intersects.slice(1);
            // getting intersected object
            if (intersects.length > 0 && intersects[0].object != INTERSECTED){
                INTERSECTED = intersects[0].object;
                if (INTERSECTED._id !== undefined) {
                    // restoring node state when leaving it
                    if (current && (current._id != INTERSECTED._id)) {
                        updateTexture(current.canvas, current.name, 0.6, current.circleColor);
                        current.texture.needsUpdate = true;
                        old = current;
                    }
                    // updating intersected node and animating opacity
                    current = INTERSECTED;
                    updateHoverText(spriteHover.canvas, current.name);
                    spriteHover.texture.needsUpdate = true;
                    spriteHover.position.set(current.position.x, current.position.y, current.position.z);
                    current.animationOpacity = 0.6;
                    var tween = new TWEEN.Tween(current).to({animationOpacity : 1}, 200)
                    .easing(TWEEN.Easing.Linear.None)
                    .onUpdate(function (){
                        updateTexture(current.canvas, current.name, current.animationOpacity, current.circleColor);
                        current.texture.needsUpdate = true;
                    }).start();
                }
            }
        }

        init();
        animate();
    }
}
}]);
