var cinegraphApp = angular.module('cinegraphApp', ['ui.bootstrap', 'ngRoute']);

cinegraphApp.config(['$locationProvider', '$routeProvider', function($locationProvider, $routeProvider) {
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
            .when('/cinegraph/:id', {
              templateUrl: '/partials/mycinegraphSingle', controller: 'MyCinegraphCtrl',
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

cinegraphApp.filter('JobNameFormatter', function() {
    return function(input) {
        var out = "";
        if (input == "PRODUCED") {
            out = "Producer";
        }
        else if (input == "DIRECTED") {
            out = "Director"
        }
        else if (input == "ACTED_IN") {
            out = "Actor"
        }
        else if (input == "DESIGNED_PRODUCTION") {
            out = "Production Designer"
        }
        else if (input == "WROTE") {
            out = "Writer"
        }
        else if (input == "DESIGNED_COSTUMES") {
            out = "Costume Designer"
        }
        else if (input == "EDITED") {
            out = "Editor"
        }
        else if (input == "COMPOSED_MUSIC") {
            out = "Music Composer"
        }
        else {
            out = input;
        }
        return out;
    };
});

var cinegraphController = cinegraphApp.controller('restrictedController',
	function($scope, $http, $window, $location, AuthService) {
	$(document).ready(function(){
	  var randombgs=["multipass", "gandalf", "matrix"];
	  number = Math.floor(Math.random() * randombgs.length);
	  $('#unauthorizedpage').css({'background-image': 'url(/images/' + randombgs[number] + '.jpg)'});
	});
});

var cinegraphController = cinegraphApp.controller('cinegraphController',
	function($scope, $http, $window, $location, AuthService, $modal) {
	$scope.$watch( AuthService.isLoggedIn, function ( isLoggedIn ) {
	  $scope.isLoggedIn = isLoggedIn;
	  $scope.currentUser = AuthService.currentUser();
	});

    $scope.logout = function(){
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
        if ($scope.currentNode.type == "Person")
        {
            $scope.typesAndLimits = [ { type: 'ACTED_IN', limit: 5},
                                    { type: 'PRODUCED', limit: 2},
                                    { type: 'DIRECTED', limit: 2},
                                    { type: 'COMPOSED_MUSIC', limit: 1},
                                    { type: 'DIRECTED_PHOTOGRAPHY', limit: 1},
                                    { type: 'WROTE', limit: 5},
                                    { type: 'EDITED', limit: 3},
                                    { type: 'DESIGNED_PRODUCTION', limit: 3},
                                    { type: 'DESIGNED_COSTUMES', limit: 2} ];
            $scope.selectedJobs = {
                actor: $scope.currentNode.jobs[0].name == 'ACTED_IN',
                writer: $scope.currentNode.jobs[0].name == 'WROTE',
                producer: $scope.currentNode.jobs[0].name == 'PRODUCED',
                director: $scope.currentNode.jobs[0].name == 'DIRECTED',
                editor: $scope.currentNode.jobs[0].name == 'EDITED',
                dirphotography: $scope.currentNode.jobs[0].name == 'DIRECTED_PHOTOGRAPHY',
                musiccomposer: $scope.currentNode.jobs[0].name == 'COMPOSED_MUSIC',
                cosdesigner: $scope.currentNode.jobs[0].name == 'DESIGNED_COSTUMES',
                proddesigner: $scope.currentNode.jobs[0].name == 'DESIGNED_PRODUCTION' };
        }
        else
        {
            $scope.typesAndLimits = [ { type: 'ACTED_IN', limit: 4},
                                    { type: 'PRODUCED', limit: 1},
                                    { type: 'DIRECTED', limit: 1},
                                    { type: 'COMPOSED_MUSIC', limit: 1},
                                    { type: 'DIRECTED_PHOTOGRAPHY', limit: 1},
                                    { type: 'WROTE', limit: 1},
                                    { type: 'EDITED', limit: 1}];
                                    /*
                                    { type: 'DESIGNED_PRODUCTION', limit: 1},
                                    { type: 'DESIGNED_COSTUMES', limit: 1} ];*/
        }


    });


    $scope.currentNode.id = selectedNodeId;

	$scope.currentDisplayedNodes = [];

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
            for (var i = $scope.currentDisplayedNodes.length - 1; i >= 0; i--) {
                var obj = $scope.currentDisplayedNodes[i];
                var endpoint = obj.start;
                if ($scope.currentNode.id === endpoint && obj.type == "ACTED_IN") {
                    $scope.removeOneFromScene($scope.currentDisplayedNodes, obj.end, $scope.currentNode.id);
                }
            };
        }
    };

    $scope.filterByDirector = function() {
        if ($scope.selectedJobs.director) {
            $scope.getRelatedNodesForType($scope.currentNode, 'DIRECTED', $scope.findLimitForJob('DIRECTED'),
                $scope.currentDisplayedNodes.length, $scope.currentNode.sprite, $scope.drawRelatedNodes);
        }
        else {
            for (var i = $scope.currentDisplayedNodes.length - 1; i >= 0; i--) {
                var obj = $scope.currentDisplayedNodes[i];
                var endpoint = obj.start;
                if ($scope.currentNode.id === endpoint && obj.type == "DIRECTED") {
                    $scope.removeOneFromScene($scope.currentDisplayedNodes, obj.end, $scope.currentNode.id);
                }
            };
		}
	};

	$scope.filterByProducer = function() {
        if ($scope.selectedJobs.producer) {
            $scope.getRelatedNodesForType($scope.currentNode, 'PRODUCED', $scope.findLimitForJob('PRODUCED'),
                $scope.currentDisplayedNodes.length, $scope.currentNode.sprite, $scope.drawRelatedNodes);
        }
        else {
            for (var i = $scope.currentDisplayedNodes.length - 1; i >= 0; i--) {
                var obj = $scope.currentDisplayedNodes[i];
                var endpoint = obj.start;
                if ($scope.currentNode.id === endpoint && obj.type == "PRODUCED") {
                    $scope.removeOneFromScene($scope.currentDisplayedNodes, obj.end, $scope.currentNode.id);
                }
            };
        }
    };

    $scope.filterByWriter = function() {
		if ($scope.selectedJobs.writer) {
			$scope.getRelatedNodesForType($scope.currentNode, 'WROTE', $scope.findLimitForJob('WROTE'),
				$scope.currentDisplayedNodes.length, $scope.currentNode.sprite, $scope.drawRelatedNodes);
		}
		else {
            for (var i = $scope.currentDisplayedNodes.length - 1; i >= 0; i--) {
                var obj = $scope.currentDisplayedNodes[i];
                var endpoint = obj.start;
                if ($scope.currentNode.id === endpoint && obj.type == "WROTE") {
                    $scope.removeOneFromScene($scope.currentDisplayedNodes, obj.end, $scope.currentNode.id);
                }
            };
		}
	};

	$scope.filterByEditor = function() {
		if ($scope.selectedJobs.editor) {
			$scope.getRelatedNodesForType($scope.currentNode, 'EDITED', $scope.findLimitForJob('EDITED'),
				$scope.currentDisplayedNodes.length, $scope.currentNode.sprite, $scope.drawRelatedNodes);
		}
		else {
            for (var i = $scope.currentDisplayedNodes.length - 1; i >= 0; i--) {
                var obj = $scope.currentDisplayedNodes[i];
    			var endpoint = obj.start;
                if ($scope.currentNode.id === endpoint && obj.type == "EDITED") {
                    $scope.removeOneFromScene($scope.currentDisplayedNodes, obj.end, $scope.currentNode.id);
                }
            };
		}
	};

	$scope.filterByDirPhotography = function() {
		if ($scope.selectedJobs.dirphotography) {
			$scope.getRelatedNodesForType($scope.currentNode, 'DIRECTED_PHOTOGRAPHY', $scope.findLimitForJob('DIRECTED_PHOTOGRAPHY'),
				$scope.currentDisplayedNodes.length, $scope.currentNode.sprite, $scope.drawRelatedNodes);
		}
		else {
            for (var i = $scope.currentDisplayedNodes.length - 1; i >= 0; i--) {
                var obj = $scope.currentDisplayedNodes[i];
    			var endpoint = obj.start;
                if ($scope.currentNode.id === endpoint && obj.type == "DIRECTED_PHOTOGRAPHY") {
                    $scope.removeOneFromScene($scope.currentDisplayedNodes, obj.end, $scope.currentNode.id);
                }
            };
		}
	};

	$scope.filterByMusicComposer = function() {
		if ($scope.selectedJobs.musiccomposer) {
			$scope.getRelatedNodesForType($scope.currentNode, 'COMPOSED_MUSIC', $scope.findLimitForJob('COMPOSED_MUSIC'),
				$scope.currentDisplayedNodes.length, $scope.currentNode.sprite, $scope.drawRelatedNodes);
		}
		else {
            for (var i = $scope.currentDisplayedNodes.length - 1; i >= 0; i--) {
                var obj = $scope.currentDisplayedNodes[i];
    			var endpoint = obj.start;
                if ($scope.currentNode.id === endpoint && obj.type == "COMPOSED_MUSIC") {
                    $scope.removeOneFromScene($scope.currentDisplayedNodes, obj.end, $scope.currentNode.id);
                }
            };
		}
	};

	$scope.filterByCosDesigner = function() {
		if ($scope.selectedJobs.cosdesigner) {
			$scope.getRelatedNodesForType($scope.currentNode, 'DESIGNED_COSTUMES', $scope.findLimitForJob('DESIGNED_COSTUMES'),
				$scope.currentDisplayedNodes.length, $scope.currentNode.sprite, $scope.drawRelatedNodes);
		}
		else {
            for (var i = $scope.currentDisplayedNodes.length - 1; i >= 0; i--) {
                var obj = $scope.currentDisplayedNodes[i];
    			var endpoint = obj.start;
                if ($scope.currentNode.id === endpoint && obj.type == "DESIGNED_COSTUMES") {
                    $scope.removeOneFromScene($scope.currentDisplayedNodes, obj.end, $scope.currentNode.id);
                }
            };
		}
	};

	$scope.filterByProdDesigner = function() {
		if ($scope.selectedJobs.proddesigner) {
			$scope.getRelatedNodesForType($scope.currentNode, 'DESIGNED_PRODUCTION', $scope.findLimitForJob('DESIGNED_PRODUCTION'),
				$scope.currentDisplayedNodes.length, $scope.currentNode.sprite, $scope.drawRelatedNodes);
		}
		else {
            for (var i = $scope.currentDisplayedNodes.length - 1; i >= 0; i--) {
                var obj = $scope.currentDisplayedNodes[i];
    			var endpoint = obj.start;
                if ($scope.currentNode.id === endpoint && obj.type == "WROTE") {
                    $scope.removeOneFromScene($scope.currentDisplayedNodes, obj.end, $scope.currentNode.id);
                }
            };
		}
	};

	$scope.open = function (size) {
		var modalInstance = $modal.open({
			animation: $scope.animationsEnabled,
			templateUrl: 'partials/detailed-sheet',
			controller: 'ModalInstanceCtrl',
			size: size,
			resolve: {
				currentNode: function() {
					return $scope.currentNode;
				}
			}
		});
	};
});

cinegraphApp.controller('ModalInstanceCtrl', function($scope, $modalInstance, currentNode) {

	$scope.currentNode = currentNode;

	$scope.close = function () {
		$modalInstance.dismiss("close");
	};
});

cinegraphApp.directive("cinegraph", [ 'ModelDataService', '$http', function(ModelDataService, $http) {
	return {
		link: function link(scope, element, attrs) {
			// global vars
            var scene = new THREE.Scene();
            var linesScene = new THREE.Scene();
            var linesCamera;
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
            var defaultImg = new Image();
            defaultImg.src = 'images/default.jpg';
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
            var colors = [];
            colors['ACTED_IN'] = '#319ef1';
            colors['PRODUCED'] = '#1AAE88';
            colors['DIRECTED'] = '#177BBB';
            colors['WROTE'] = '#FCC633';
            colors['EDITED'] = '#E33244';
            colors['DIRECTED_PHOTOGRAPHY'] = '#F9D269';
            colors['COMPOSED_MUSIC'] = '#27D4A8';
            colors['DESIGNED_COSTUMES'] = '#E56371';
            colors['DESIGNED_PRODUCTION'] = '#3DDCDE';
            var composer, composerBackground, composerLines,
                blendIntermediateComposer, blendComposer, gradientComposer, testComposer;
            var gradientBackground;

            function init() {
                $('#graph').css('height','100%');
                viewWidth = $('#graph').width();
                viewHeight = $('#graph').height();
                camera = new THREE.PerspectiveCamera(45, viewWidth / viewHeight, 1, 1000);
                renderer.setSize(viewWidth, viewHeight);
                document.getElementById('graph').appendChild(renderer.domElement);

                // background scene
                var bgCanvas = generateBackgroundCanvas(viewWidth, viewHeight, defaultImg, 60);
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

                //gradient scene
                var gradientCanvas = getGradientLayer();
                var gradientTexture = new THREE.Texture(gradientCanvas);
                gradientBackground = new THREE.Mesh(
                    new THREE.PlaneBufferGeometry(2, 2, 0),
                    new THREE.MeshBasicMaterial({map: gradientTexture})
                );
                gradientBackground.gradientCanvas = gradientCanvas;
                gradientBackground.gradientTexture = gradientTexture;
                gradientBackground.gradientTexture.needsUpdate = true;
                gradientBackground.material.depthTest = false;
                gradientBackground.material.depthWrite = false;
                var gradientScene = new THREE.Scene();
                var gradientCam = new THREE.Camera();
                gradientScene.add(gradientCam);
                gradientScene.add(gradientBackground);

                // lines scene
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
                var renderLinesTarget = new THREE.WebGLRenderTarget(viewWidth * 1, viewHeight * 1, parameters);
                var renderLinesScene = new THREE.RenderPass(linesScene, camera);
                var lineShader = new THREE.ShaderPass(THREE.ThickLineShader);
                lineShader.uniforms.totalWidth.value = viewWidth * 1;
                lineShader.uniforms.totalHeight.value = viewHeight * 1;
                lineShader.uniforms['edgeWidth'].value = 8 * 1;
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
                //blendPass.renderToScreen = true;

                //gradient
                var renderTargetGradient = new THREE.WebGLRenderTarget(viewWidth * sampleRatio, viewHeight * sampleRatio, parameters);
                var renderGradientScene = new THREE.RenderPass(gradientScene, gradientCam);
                var effectCopyGradient = new THREE.ShaderPass(THREE.CopyShader);
                gradientComposer = new THREE.EffectComposer(renderer, renderTargetGradient);
                gradientComposer.addPass(renderGradientScene);
                gradientComposer.addPass(effectCopyGradient);
                //effectCopyGradient.renderToScreen = true;
                // test
                var testPass = new THREE.ShaderPass(THREE.TransparencyBlendShader);
                testPass.uniforms['tBase'].value = blendComposer.renderTarget1;
                testPass.uniforms['tAdd'].value = gradientComposer.renderTarget1;
                testComposer = new THREE.EffectComposer(renderer);
                testComposer.addPass(testPass);
                testPass.renderToScreen = true;

                getNode(scope.currentNode.id, nodePosition, draw);
                updateBackground(scope.currentNode);

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
            updateGradientLayer();
            gradientComposer.render();
            testComposer.render();
        }

        function compare(a,b) {
          if (a.distance > b.distance)
            return -1;
          if (a.distance < b.distance)
            return 1;
          return 0;
        }

        function getGradientLayer() {
            var canv = document.createElement('canvas');
            canv = background.bgCanvas;
            canv.width = viewWidth;
            canv.height = viewHeight;
            var ctx = canv.getContext('2d');
            ctx.clearRect(0,0,canv.width, canv.height);
            // ordering objects by distance from camera
            var orderedScene = [];
            var length = scene.children.length;
            for (var i = length - 1; i >= 0; i--)
            {
                var sprite = scene.children[i];
                if (sprite.type != "Sprite" || sprite._id == undefined)
                    continue;
                var dx = sprite.position.x - camera.position.x;
                var dy = sprite.position.y - camera.position.y;
                var dz = sprite.position.z - camera.position.z;
                var distToCam = Math.sqrt(dx*dx+dy*dy+dz*dz);
                var elt = new Object();
                elt.index = i;
                elt.distance = distToCam;
                orderedScene.push(elt);
            }
            orderedScene.sort(compare);
            // drawing gardient circle for each node
            var length = orderedScene.length;
            for (var i = 0; i < length; i++)
            {
                var elt = orderedScene[i];
                var sprite = scene.children[elt.index];
                if (sprite.type != 'Sprite')
                    continue;
                var pos = toScreenPosition(sprite.position);
                var distToCam = elt.distance;
                // calculating circle radius
                var camDir = new THREE.Vector3();
                var camDir2 = new THREE.Vector3(0,0,-1);
                var crossProduct = new THREE.Vector3();
                var posOffset = new THREE.Vector3();
                camDir.copy(sprite.position).sub(camera.position).normalize();
                camDir2.applyQuaternion(camera.quaternion).normalize();
                if (camDir.equals(camDir2))
                    camDir.x += 0.001;
                crossProduct.crossVectors(camDir, camDir2).setLength(4);
                posOffset.set(
                    sprite.position.x + crossProduct.x,
                    sprite.position.y + crossProduct.y,
                    sprite.position.z + crossProduct.z
                );
                var circleRadius = (toScreenPosition(posOffset).distanceTo(pos) + 0.5) * sprite.scale.x / 8;
                var innerRadius = Math.abs(circleRadius * 7 / 8 - 0.75);
                // saving context
                ctx.save();
                // clipping to circle
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, circleRadius, 0, 2 * Math.PI, false);
                ctx.fillStyle='rgba(255,255,255,0)';
                ctx.fill();
                ctx.clip();
                // getting lines related to node
                var linesLength = linesScene.children.length;
                for (var j = linesLength - 1; j >= 0; j--)
                {
                    var line = linesScene.children[j];
                    if (line.type != "Line" || sprite._id == undefined)
                        continue;
                    var startColor,endColor,startPos,endPos;
                    if (line.endNodeId == sprite._id){
                        startColor = line.geometry.colors[0];
                        endColor = line.geometry.colors[1];
                        startPos = toScreenPosition(line.geometry.vertices[0]);
                        endPos = toScreenPosition(line.geometry.vertices[1]);
                    }
                    else if (line.startNodeId == sprite._id){
                        startColor = line.geometry.colors[1];
                        endColor = line.geometry.colors[0];
                        startPos = toScreenPosition(line.geometry.vertices[1]);
                        endPos = toScreenPosition(line.geometry.vertices[0]);
                    }
                    else
                        continue;
                    // drawing radial gradient
                    var radgradPos = endPos.sub(startPos).setLength(circleRadius);
                    ctx.shadowOffsetX = 1000; // (default 0)
                    ctx.shadowOffsetY = 1000; // (default 0)
                    ctx.shadowBlur = 40; // (default 0)
                    var r = startColor.r * 255;
                    var g = startColor.g * 255;
                    var b = startColor.b * 255;
                    ctx.fillStyle = 'rgba('+r+','+g+','+b+',1)';
                    ctx.shadowColor = 'rgba('+r+','+g+','+b+',1)';
                    ctx.beginPath();
                    ctx.arc(
                        startPos.x + radgradPos.x - 1000,
                        startPos.y + radgradPos.y - 1000,
                        circleRadius * 1, 0, Math.PI * 2, true
                    );
                    ctx.fill();
                }
                // clearing inner circle
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, innerRadius, 0, 2 * Math.PI, false);
                ctx.clip();
                ctx.clearRect(0,0,canv.width,canv.height);
                // restoring context
                ctx.restore();
            }
            return canv;
        }

        function updateGradientLayer() {
            var ctx = gradientBackground.gradientCanvas.getContext('2d');
            ctx.drawImage(getGradientLayer(),0,0);
            gradientBackground.gradientTexture.needsUpdate = true;
        }

        function removeOneFromScene(array, idToRemove, excludedId) {
            var length = linesScene.children.length;
            for (var i = length - 1; i >= 0; i--)
            {
                var line = linesScene.children[i];
                if (line.endNodeId == idToRemove) {
                    linesScene.remove(line);
                }
            }

            length = scene.children.length;
            for (var i = length - 1; i >= 0; i--)
            {
                var node = scene.children[i];
                var index = -1;
                $.each(scope.currentDisplayedNodes, function(j, obj) {
                    var endpoint = obj.start;
                    if (scope.currentNode.type == "Person") {
                        endpoint = obj.end;
                    }
                    if (node._id === idToRemove && endpoint == idToRemove) {
                        index = j;
                        return false;
                    }
                });
                if (node._id != excludedId && index !== -1)
                {
                    array.splice(index, 1);
                    var n = node;
                    new TWEEN.Tween(n.scale).to({x: 0, y:0, z:0}, 500)
                        .easing(TWEEN.Easing.Linear.None)
                        .onComplete(function (){
                            scene.remove(n);
                        }).start();
                }
            }
        }
        scope.removeOneFromScene = removeOneFromScene;

        function removeFromScene(array, excludedId)
        {
            // getting id of center node to keep
            var centerId;
            for (var i = 0; i < linesScene.children.length; i++)
            {
                var line = linesScene.children[i];
                if (line.startNodeId == excludedId)
                    centerId = line.endNodeId;
                else if (line.endNodeId == excludedId)
                    centerId = line.startNodeId;
            }
            // removing lines
            var length = linesScene.children.length;
            for (var i = length - 1; i >= 0; i--)
            {
                var line = linesScene.children[i];
                if (line.startNodeId != excludedId && line.endNodeId != excludedId)
                    linesScene.remove(line);
            }
            // removing sprites
            length = scene.children.length;
            toRemove = [];
            for (var i = length - 1; i >= 0; i--)
            {
                var node = scene.children[i];
                var index = -1;
                $.each(scope.currentDisplayedNodes, function(j, obj) {
                    var endpoint = obj.start;
                    if (scope.currentNode.type == "Person") {
                        endpoint = obj.end;
                    }
                    if (node._id === endpoint) {
                        index = j;
                        return false;
                    }
                });
                if (node._id != excludedId && node._id != centerId && index !== -1)
                {
                    array.splice(index, 1);
                    toRemove.push(node);
                    new TWEEN.Tween(node.scale).to({x: 0, y:0, z:0}, 500)
                        .easing(TWEEN.Easing.Linear.None)
                        .onComplete(function (){
                            scene.remove(toRemove[0]);
                            toRemove.splice(0,1);
                        }).start();
                }
            }
        }

        function getNode(id, nodePostion, callback) {
            if (id != scope.currentNode.id) {
                removeFromScene(scope.currentDisplayedNodes, id);
            }
            $http.get('/api/common/' + id).success(function(node) {
                callback(node, nodePosition);
            });
        }

        /* callback called when getting a node from the API */
        function draw(node, nodePosition) {
            var nodeSprite = drawNode(node, nodeRadius, nodeSegments, nodePosition);
            if (node.id == scope.currentNode.id && scope.currentNode.sprite == null) {
                scope.currentNode.sprite = nodeSprite.sprite;
            }
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

        function pushRelations(index, count, direction, relationships, rels, callback) {
            var endpoint = relationships[index].start;
            if (direction == "out") {
                endpoint = relationships[index].end;
            }
            $http.get('/api/common/' + endpoint).success(function(node) {
                var found = false;
                $.each(scope.currentDisplayedNodes, function(j, obj) {
                    var endpoint2 = obj.start;
                    if (direction == "out") {
                        endpoint2 = obj.end;
                    }
                    if (endpoint === endpoint2) {
                        found = true;
                        return false;
                    }
                });
                if (!found) {
                    rels.push(node);
                    scope.currentDisplayedNodes.push(relationships[index]);
                }
                count.val++;
                if (count.val == relationships.length) {
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
                        var count = { val: 0 };
                        for (var i = 0; i < relationships.length; i++) {
                            var found = false;
                            $.each(scope.currentDisplayedNodes, function(j, obj) {
                                if (relationships[i].id === obj.id) {
                                    found = true;
                                    return false;
                                }
                            });
                            if (found == false) {
                                pushRelations(i, count, direction, relationships, rels, function(relsResult) {
                                    callback(startNodeSprite, relsResult, index, limit, type);
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


        var sanitizeFileName = function(filename)
        {
        	// The replaceChar should be either a space
        	// or an underscore.
        	var replaceChar = "_";
        	var regEx = new RegExp('[,/\:*?""<>|]', 'g');
        	var Filename = filename.replace(regEx, replaceChar);

        	// Show me the new file name.
          return Filename;
        }


        function drawNode(node, radius, segments, position, startNodeSprite, type) {
            var text = node.name ? (node.firstname + " " + node.lastname) : node.title;
            var circleColor = node.name ? blueColor : orangeColor;
            var nodeImage;

            if (node.img == undefined || node.img == false)
                nodeImage = defaultImg;
            else {
                nodeImage = new Image();
                if (node.title == undefined)
                {
                  nodeImage.src = 'images/persons/' + sanitizeFileName(node.fullname) + '.jpg';
                }
                else {
                  nodeImage.src = 'images/movies/' + sanitizeFileName(node.title + node.released) + '/poster.jpg';
                }
            }
            var canvas = generateTexture(defaultImg, text, circleColor, node.id);
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
            sprite.nodeImage = nodeImage;

            if (node.img != undefined && node.img == true)
            {
                nodeImage.onerror = function () {
                    this.src = 'images/default.jpg';
                };
                nodeImage.onload = function () {
                    console.log("Node IMAGE is : " + nodeImage);
                    updateTexture(nodeImage, sprite.canvas, text, 0.6, circleColor, sprite._id);
                    sprite.texture.needsUpdate = true;
                };
            }

            if (startNodeSprite !== undefined)
                sprite.position.set(startNodeSprite.position.x, startNodeSprite.position.y, startNodeSprite.position.z);
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
                    .start();
                // animating position
                if (startNodeSprite !== undefined) {
                    new TWEEN.Tween(sprite.position).to({x: position.x, y:position.y, z: position.z}, 500)
                        .easing(TWEEN.Easing.Linear.None)
                        .onComplete(function (){
                            // drawing line
                            var lineGeom = new THREE.Geometry();
                            lineGeom.vertices.push(sprite.position, startNodeSprite.position);
                            var startColor, endColor;
                            if (node.name) {
                                startColor = colors[type];
                                endColor = orangeColor;
                            } else {
                                startColor = orangeColor;
                                endColor = colors[type];
                            }
                            lineGeom.colors.push(new THREE.Color(startColor));
                            lineGeom.colors.push(new THREE.Color(endColor));
                            var lineMat = new THREE.LineBasicMaterial({
                                linewidth: 1,
                                vertexColors: true
                            });
                            line = new THREE.Line(lineGeom, lineMat);
                            line.endNodeId = sprite._id;
                            line.startNodeId = startNodeSprite._id;
                            linesScene.add(line);
                        }).start();
                }
                added = true;
                //scope.currentDisplayedNodes.push(node.id);
            //}
            return {sprite: sprite, added: added};
        }


        function drawRelatedNodes(startNodeSprite, relatedNodes, index, limit, type) {
          var slice = 2 * Math.PI / 10;
            var relatedNodePosition = new THREE.Vector3();
            if (limit > relatedNodes.length) {
                limit = relatedNodes.length;
            }
            for (i = index, j = 0; i < limit + index, j < limit; i++, j++) {
                var angle = slice * i;
                relatedNodePosition.x = nodePosition.x + 18 * Math.cos(angle);
                relatedNodePosition.y = nodePosition.y + 18 * Math.sin(angle);
                //relatedNodePosition.z = nodePosition.z + 18 * Math.random();
                var relatedNodeSprite = drawNode(relatedNodes[j], nodeRadius, nodeSegments, relatedNodePosition, startNodeSprite, type);
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

        function generateTexture(img, text, circleColor, spriteId) {
        	var canvas = document.createElement('canvas');
            canvas.width = 1000;
            canvas.height = 1000;
            updateTexture(img, canvas, text, 0.6, circleColor);
            return canvas;
        }

        function updateTexture(img, canvas, text, opacity, circleColor, spriteId) {
            var borderThickness = canvas.width / 16;
            drawCircle(canvas, borderThickness, circleColor, spriteId);
            var context = canvas.getContext('2d');
            context.beginPath();
            context.arc(canvas.width / 2, canvas.height / 2, canvas.width / 2 - borderThickness, 0, 2 * Math.PI);
            context.clip();
            context.fillStyle = '#000000';
            context.fillRect(0,0,canvas.width, canvas.height);
            context.globalAlpha = opacity;
            drawImageProp(context, img, borderThickness, borderThickness,
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

        function drawCircle(canvas, thickness, color, spriteId) {
            var ctx = canvas.getContext('2d');
            ctx.save();
            ctx.beginPath();
            ctx.arc(canvas.width / 2, canvas.height / 2, canvas.width / 2, 0, 2 * Math.PI);
            ctx.clip();
            ctx.globalAlpha = 1;
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0,0,canvas.width,canvas.height);
            ctx.restore();
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

        function toScreenPosition(v)
        {
            var vector = new THREE.Vector3();
            vector.copy(v);
            var widthHalf = 0.5 * renderer.context.canvas.width;
            var heightHalf = 0.5 * renderer.context.canvas.height;
            vector.project(camera);
            vector.x = ( vector.x * widthHalf ) + widthHalf;
            vector.y = - ( vector.y * heightHalf ) + heightHalf;
            return new THREE.Vector3(vector.x,  vector.y, 0);
        };

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
                            updateBackground(node);
                        });
                        nodePosition = intersection.object.position;
                        getNode(id, nodePosition, draw);
                  })
                  .start();
            }
        }

        function updateBackground(node) {
            var crossFade = new Object();
            var backgroundImage;
            crossFade.startCanvas = cloneCanvas(background.bgCanvas);
            if (node.img == undefined || node.img == false) {
                backgroundImage = defaultImg;
                crossFade.endCanvas = generateBackgroundCanvas(viewWidth, viewHeight, backgroundImage, 25);
                crossFade.percentage = 0;
                var tween = new TWEEN.Tween(crossFade).to({percentage : 100}, 500)
                    .easing(TWEEN.Easing.Linear.None)
                    .onUpdate(function (){
                        crossFadeBackgroundCanvas(background.bgCanvas, crossFade.startCanvas,
                            crossFade.endCanvas, crossFade.percentage);
                        background.bgTexture.needsUpdate = true;
                    }).start();
            }
            else {
                backgroundImage = new Image();
                if (node.title == undefined)
                    backgroundImage.src = 'images/persons/' + node.fullname + '.jpg';
                else
                    backgroundImage.src = 'images/movies/' + node.title + node.released + '/backdrop.jpg';
                backgroundImage.onerror = function () {
                    this.src = 'images/default.jpg';
                };
                backgroundImage.onload = function () {
                    crossFade.endCanvas = generateBackgroundCanvas(viewWidth, viewHeight, backgroundImage, 25);
                    crossFade.percentage = 0;
                    var tween = new TWEEN.Tween(crossFade).to({percentage : 100}, 500)
                        .easing(TWEEN.Easing.Linear.None)
                        .onUpdate(function (){
                            crossFadeBackgroundCanvas(background.bgCanvas, crossFade.startCanvas,
                                crossFade.endCanvas, crossFade.percentage);
                            background.bgTexture.needsUpdate = true;
                        }).start();
                };
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
                        updateTexture(current.nodeImage, current.canvas, current.name, 0.6, current.circleColor, current._id);
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
                        updateTexture(current.nodeImage, current.canvas, current.name, current.animationOpacity, current.circleColor, current._id);
                        current.texture.needsUpdate = true;
                    }).start();
                }
            }
        }

        defaultImg.onload = function () {
            init();
            animate();
        }
    }
}
}]);
