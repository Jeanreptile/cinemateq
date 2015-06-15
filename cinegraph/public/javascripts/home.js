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
            var linesCamera, camera, cameraControls, bgScene, bgCam, viewWidth, viewHeight, background, gradientBackground;
            var renderer = new THREE.WebGLRenderer({ antialias: false, alpha:true, autoClear: false });
            var raycaster = new THREE.Raycaster();
            var mouse = new THREE.Vector2();
            var mouseClickStart = new THREE.Vector2();
            var mouseIsDown = false;
            var old = null;
            var current = null;
            var defaultImg = new Image();
            defaultImg.src = 'images/default.jpg';
            var nodePosition = new THREE.Vector3(0, 0, 0);
            var randomVector = new THREE.Vector3(Math.random() * 60 - 20, Math.random() * 60 - 20, Math.random() * 60 - 20);
            var currentDisplayedNodes = [];
            var orangeColor = '#ffa827';
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
            var composerBackground, composerLines, composer, gradientComposer, blendComposer;
            var PI2 = 2 * Math.PI;
            var blurAmount = 25;

            // monitoring
            var rendererStats = new THREEx.RendererStats();
            rendererStats.domElement.style.position	= 'absolute';
            rendererStats.domElement.style.right = '0px';
            rendererStats.domElement.style.bottom = '0px';
            document.body.appendChild( rendererStats.domElement );
            var stats = new Stats();
            stats.setMode(0); // 0: fps, 1: ms, 2: mb
            stats.domElement.style.position = 'absolute';
            stats.domElement.style.right = '80px';
            stats.domElement.style.bottom = '0px';
            document.body.appendChild( stats.domElement );

            function init() {
                $('#graph').css('height','100%');
                viewWidth = $('#graph').width();
                viewHeight = $('#graph').height();
                camera = new THREE.PerspectiveCamera(45, viewWidth / viewHeight, 1, 1000);
                renderer.setSize(viewWidth, viewHeight);
                document.getElementById('graph').appendChild(renderer.domElement);

                // background scene
                var bgCanvas = generateBackgroundCanvas(viewWidth, viewHeight, defaultImg, blurAmount);
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
                camera.position.z = 55;
                cameraControls = new THREE.TrackballControls(camera, document.getElementById('graph'));
                cameraControls.rotateSpeed = 2.0;
                cameraControls.zoomSpeed = 1.2;
                cameraControls.panSpeed = 0.8;
                cameraControls.noZoom = false;
                cameraControls.noPan = false;
                cameraControls.staticMoving = true;
                cameraControls.dynamicDampingFactor = 0.3;
                cameraControls.keys = [ 65, 83, 68 ];

                // label text init
                label = $(
                    '<div id="canvasNodeLabel" style="text-align:center;"> \
                        <div class="labelText"></div>       \
                        <button type="button" onclick="alert(\'coucou\');" class="add-cinegraph-btn btn btn-rounded \
                                                                                  btn-sm btn-icon btn-dark"> \
                            <i class="fa fa-plus fa-lg"></i> \
                        </button> \
                    </div>');
                label.css({ 'position': 'absolute','z-index': '1','background-color': '#aaaaaa',
                    'color': 'white','padding':'10px','left':'-1000'
                });
                $('#graph').parent().css('position','relative');
                $('#graph').after(label);

                // over sampling for antialiasing
                var sampleRatio = 2;
                var parameters = {
                    minFilter: THREE.LinearFilter,
                    magFilter: THREE.LinearFilter,
                    format: THREE.RGBAFormat,
                    stencilBuffer: false
                };
                // background
                var renderTargetBackground = new THREE.WebGLRenderTarget(viewWidth * 0.5, viewHeight * 0.5, parameters);
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
                // main scene
                var renderTarget = new THREE.WebGLRenderTarget(viewWidth * sampleRatio, viewHeight * sampleRatio, parameters);
                var renderScene = new THREE.RenderPass(scene, camera);
                var effectCopy = new THREE.ShaderPass(THREE.CopyShader);
                composer = new THREE.EffectComposer(renderer, renderTarget);
                composer.addPass(renderScene);
                composer.addPass(effectCopy);
                //effectCopy.renderToScreen = true;
                //gradient
                var renderTargetGradient = new THREE.WebGLRenderTarget(viewWidth * sampleRatio, viewHeight * sampleRatio, parameters);
                var renderGradientScene = new THREE.RenderPass(gradientScene, gradientCam);
                var effectCopyGradient = new THREE.ShaderPass(THREE.CopyShader);
                gradientComposer = new THREE.EffectComposer(renderer, renderTargetGradient);
                gradientComposer.addPass(renderGradientScene);
                gradientComposer.addPass(effectCopyGradient);
                //effectCopyGradient.renderToScreen = true;
                // blend
                var blendPass = new THREE.ShaderPass(THREE.BlendShader);
                blendPass.uniforms['tBase'].value = composerBackground.renderTarget1;
                blendPass.uniforms['tAdd'].value = composerLines.renderTarget1;
                blendPass.uniforms['tAdd2'].value = composer.renderTarget1;
                blendPass.uniforms['tAdd3'].value = gradientComposer.renderTarget1;
                blendComposer = new THREE.EffectComposer(renderer);
                blendComposer.addPass(blendPass);
                blendPass.renderToScreen = true;

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
            stats.begin();
            rendererStats.update(renderer);
            TWEEN.update();
            cameraControls.update();
            render();
            stats.end();
        }

        // render the scene
        function render() {
            renderer.clear();
            composerBackground.render();
            composerLines.render();
            updateHoverLabelPosition();
            composer.render();
            updateGradientLayer();
            gradientComposer.render();
            blendComposer.render();
        }

        function compare(a,b) {
          if (a.distance > b.distance)
            return -1;
          if (a.distance < b.distance)
            return 1;
          return 0;
        }

        function getSpriteRadius(spritePosition, spriteScale) {
            var camDir = new THREE.Vector3();
            var camDir2 = new THREE.Vector3(0, 0, -1);
            var crossProduct = new THREE.Vector3();
            var posOffset = new THREE.Vector3();
            camDir.copy(spritePosition).sub(camera.position);
            camDir2.applyQuaternion(camera.quaternion);
            if (camDir.angleTo(camDir2) == 0)
                camDir.x += 0.00001;
            crossProduct.crossVectors(camDir, camDir2).setLength(4);
            posOffset.copy(spritePosition).add(crossProduct);
            return (toScreenPosition(posOffset).distanceTo(toScreenPosition(spritePosition)) - 0.5) * spriteScale / 8;
        }

        function getGradientLayer() {
            var canv = document.createElement('canvas');
            canv.width = viewWidth;
            canv.height = viewHeight;
            var ctx = canv.getContext('2d');
            ctx.shadowOffsetX = 1000;
            ctx.shadowOffsetY = 1000;
            ctx.shadowBlur = 40;
            // ordering objects by distance from camera
            var orderedScene = [];
            for (var i = scene.children.length - 1; i >= 0; i--)
            {
                var sprite = scene.children[i];
                if (sprite.type != "Sprite" || sprite._id == undefined)
                    continue;
                var elt = new Object();
                elt.index = i;
                elt.distance = sprite.position.distanceToSquared(camera.position);
                orderedScene.push(elt);
            }
            orderedScene.sort(compare);

            // drawing gradient circle for each node
            for (var i = 0; i < orderedScene.length; i++)
            {
                var sprite = scene.children[orderedScene[i].index];
                // calculating circle radius
                var pos = toScreenPosition(sprite.position);
                var circleRadius = getSpriteRadius(sprite.position, sprite.scale.x);
                var innerRadius = Math.abs(circleRadius * 7 / 8 - 0.75);
                // saving context
                ctx.save();
                // clipping to circle
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, circleRadius, 0, PI2, false);
                ctx.clip();
                ctx.fillStyle='rgba(255,255,255,0.1)';
                ctx.fill();
                // getting lines related to node
                for (var j = linesScene.children.length - 1; j >= 0; j--)
                {
                    var line = linesScene.children[j];
                    if (line.type != "Line")
                        continue;
                    var startIndex;
                    if (line.endNodeId == sprite._id)
                        startIndex = 0;
                    else if (line.startNodeId == sprite._id)
                        startIndex = 1;
                    else
                        continue;
                    var endIndex = startIndex == 0 ? 1 : 0;
                    var color = line.geometry.colors[startIndex];
                    var startPos = toScreenPosition(line.geometry.vertices[startIndex]);
                    var endPos = toScreenPosition(line.geometry.vertices[endIndex]);
                    // drawing radial gradient
                    var radgradPos = endPos.sub(startPos).setLength(circleRadius);
                    var c = 'rgba(' + color.r * 255 + ',' + color.g * 255 + ',' + color.b * 255 +',1)';
                    ctx.fillStyle = c;
                    ctx.shadowColor = c;
                    ctx.beginPath();
                    ctx.arc(
                        startPos.x + radgradPos.x - ctx.shadowOffsetX,
                        startPos.y + radgradPos.y - ctx.shadowOffsetY,
                        circleRadius, 0, PI2, true
                    );
                    ctx.fill();
                }
                // clearing inner circle
                ctx.beginPath();
                ctx.arc(pos.x, pos.y, innerRadius, 0, PI2, false);
                ctx.clip();
                ctx.clearRect(pos.x - innerRadius, pos.y - innerRadius, innerRadius * 2, innerRadius * 2);
                // restoring context
                ctx.restore();
            }
            return canv;
        }

        function updateGradientLayer() {
            var ctx = gradientBackground.gradientCanvas.getContext('2d');
            ctx.clearRect(0, 0, gradientBackground.gradientCanvas.width, gradientBackground.gradientCanvas.height);
            ctx.drawImage(getGradientLayer(), 0, 0);
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

        function clearScene(array, targetId)
        {
            // getting id of center node to keep
            var originId;
            for (var i = 0; i < linesScene.children.length; i++)
            {
                var line = linesScene.children[i];
                if (line.startNodeId == targetId)
                    originId = line.endNodeId;
                else if (line.endNodeId == targetId)
                    originId = line.startNodeId;
            }
            // removing lines
            var length = linesScene.children.length;
            for (var i = length - 1; i >= 0; i--)
            {
                var line = linesScene.children[i];
                if (line.type == "Line" && line.startNodeId != targetId && line.endNodeId != targetId){
                    line.geometry.dispose();
                    line.material.dispose();
                    linesScene.remove(line);
                }
            }
            // removing sprites
            length = scene.children.length;
            toRemove = [];
            for (var i = length - 1; i >= 0; i--)
            {
                var node = scene.children[i];
                var index = -1;
                $.each(array, function(j, obj) {
                    if (node._id == obj.start || node._id == obj.end) {
                        index = j;
                        return false;
                    }
                });
                if (node._id != targetId && node._id != originId && index !== -1)
                {
                    array.splice(index, 1);
                    toRemove.push(node);
                    new TWEEN.Tween(node.scale).to({x: 0, y:0, z:0}, 500)
                        .easing(TWEEN.Easing.Linear.None)
                        .onComplete(function (){
                            //console.log(toRemove[0]);
                            toRemove[0].geometry.dispose();
                            toRemove[0].material.dispose();
                            toRemove[0].texture.dispose();
                            scene.remove(toRemove[0]);
                            toRemove.splice(0,1);
                        }).start();
                }
            }
        }

        function getNode(id, nodePosition, callback) {
            if (id != scope.currentNode.id) {
                clearScene(scope.currentDisplayedNodes, id);
            }
            $http.get('/api/common/' + id).success(function(node) {
                callback(node, nodePosition);
            });
        }

        /* callback called when getting a node from the API */
        function draw(node, nodePosition) {
            var nodeSprite = drawNode(node, nodePosition);
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
                                    count.val++;
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

        function drawNode(node, position, startNodeSprite, type) {
            var text = node.name ? (node.firstname + " " + node.lastname) : node.title
            var canvas = generateTexture(defaultImg, text);
            var texture = new THREE.Texture(canvas);
            THREE.LinearFilter = THREE.NearestFilter = texture.minFilter;
            texture.needsUpdate = true;
            var sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture }));
            sprite._id = node.id;
            sprite.name = text;
            sprite.canvas = canvas;
            sprite.texture = texture;
            // image loading
            var nodeImage;
            if (node.img == undefined || node.img == false)
                nodeImage = defaultImg;
            else {
                nodeImage = new Image();
                if (node.title == undefined)
                    nodeImage.src = 'images/persons/' + sanitizeFileName(node.fullname) + '.jpg';
                else
                    nodeImage.src = 'images/movies/' + sanitizeFileName(node.title + node.released) + '/poster.jpg';
                nodeImage.onerror = function () { this.src = 'images/default.jpg'; };
                nodeImage.onload = function () {
                    updateTexture(nodeImage, sprite.canvas, sprite.name, 0.6);
                    sprite.texture.needsUpdate = true;
                };
            }
            sprite.nodeImage = nodeImage;

            var added = false;
            //if (isAlreadyDisplayed == false) {
                if (startNodeSprite !== undefined)
                    sprite.position.set(startNodeSprite.position.x, startNodeSprite.position.y, startNodeSprite.position.z);
                else
                    sprite.position.set(position.x, position.y, position.z);
                sprite.scale.set(0, 0, 0);
                scene.add(sprite);
                // animating scale
                new TWEEN.Tween(sprite.scale).to({x: 8, y: 8, z: 8}, 500).easing(TWEEN.Easing.Linear.None).start();
                // animating position
                if (startNodeSprite !== undefined) {
                    new TWEEN.Tween(sprite.position).to({x: position.x, y:position.y, z: position.z}, 500)
                        .easing(TWEEN.Easing.Linear.None).onComplete(function (){
                            // drawing line
                            var lineGeom = new THREE.Geometry();
                            var startColor, endColor;
                            lineGeom.vertices.push(sprite.position, startNodeSprite.position);
                            if (node.name) {
                                startColor = colors[type];
                                endColor = orangeColor;
                            } else {
                                startColor = orangeColor;
                                endColor = colors[type];
                            }
                            lineGeom.colors.push(new THREE.Color(startColor));
                            lineGeom.colors.push(new THREE.Color(endColor));
                            line = new THREE.Line(lineGeom, new THREE.LineBasicMaterial({ linewidth: 1, vertexColors: true }));
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
          var slice = PI2 / 10;
            var relatedNodePosition = new THREE.Vector3();
            if (limit > relatedNodes.length) {
                limit = relatedNodes.length;
            }
            for (i = index, j = 0; i < limit + index, j < limit; i++, j++) {
                var angle = slice * i;
                relatedNodePosition.x = nodePosition.x + 18 * Math.cos(angle);
                relatedNodePosition.y = nodePosition.y + 18 * Math.sin(angle);
                //relatedNodePosition.z = nodePosition.z + 18 * Math.random();
                var relatedNodeSprite = drawNode(relatedNodes[j], relatedNodePosition, startNodeSprite, type);
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

        function generateTexture(img, text) {
        	var canvas = document.createElement('canvas');
            canvas.width = 256;
            canvas.height = 256;
            updateTexture(img, canvas, text, 0.6);
            return canvas;
        }

        function updateTexture(img, canvas, text, opacity) {
            var borderThickness = canvas.width / 16;
            var halfWidth = canvas.width / 2;
            var halfHeight = canvas.height / 2;
            var context = canvas.getContext('2d');
            context.beginPath();
            context.arc(halfWidth, halfHeight, halfWidth - borderThickness, 0, PI2);
            context.clip();
            context.fillStyle = '#000000';
            context.fillRect(0, 0, canvas.width, canvas.height);
            context.globalAlpha = opacity;
            drawImageProp(context, img, borderThickness, borderThickness, canvas.width - 2 * borderThickness, canvas.height - 2 * borderThickness);
            context.fillStyle = "#ffffff";
            context.font = canvas.width / 9 + "px Moon Bold";
            context.textAlign = "center";
            context.globalAlpha = (1 / (0.6 - 1)) * (opacity - 1);
            wrapText(context, text, halfWidth, canvas.height / 2.5, canvas.width -  4 * borderThickness, canvas.height / 6);
            context.globalAlpha = 1;
        }

        function wrapText(context, text, x, y, maxWidth, lineHeight) {
            if (text.indexOf(' ') == -1) {
                context.fillText(text, x, y, maxWidth);
                return;
            }
            var words = text.split(' ');
            var line = '';
            for (var n = 0; n < words.length; n++) {
                var testLine = line + words[n] + ' ';
                var metrics = context.measureText(testLine);
                var testWidth = metrics.width;
                if (testWidth > maxWidth && n > 0) {
                    context.fillText(line, x, y, maxWidth);
                    line = words[n] + ' ';
                    y += lineHeight;
                }
                else
                    line = testLine;
            }
            context.fillText(line, x, y, maxWidth);
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
            vector.x = (vector.x * widthHalf) + widthHalf;
            vector.y = - (vector.y * heightHalf) + heightHalf;
            return new THREE.Vector3(vector.x,  vector.y, 0);
        };

        function crossFadeBackgroundCanvas(canvas, startCanvas, endCanvas, percentage) {
            var bgContext = canvas.getContext('2d');
            bgContext.fillStyle = "#000000";
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

        function updateHoverLabel(text)
        {
            $('#canvasNodeLabel .labelText').text(text);
            updateHoverLabelPosition();
        }

        function updateHoverLabelPosition()
        {
            if (current != null)
            {
                var v = toScreenPosition(current.position);
                var spriteRadius = getSpriteRadius(current.position, current.scale.x);
                var y = v.y - spriteRadius - $('#canvasNodeLabel').outerHeight();
                if (y < 0)
                    y = v.y + spriteRadius;
                $('#canvasNodeLabel').css({
                    top: y,
                    left: v.x - $('#canvasNodeLabel').outerWidth() / 2
                });
            }
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
            var intersection = intersects[0];
            if (intersection == undefined)
                return;
            var id = intersection.object._id;
            if (id != null) {

                // animating camera
                var moveX = intersection.object.position.x;
                var moveY = intersection.object.position.y;
                var moveZ = intersection.object.position.z + 55;
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
                crossFade.endCanvas = generateBackgroundCanvas(viewWidth, viewHeight, backgroundImage, blurAmount);
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
                    backgroundImage.src = 'images/persons/' + sanitizeFileName(node.fullname) + '.jpg';
                else
                    backgroundImage.src = 'images/movies/' + sanitizeFileName(node.title + node.released) + '/backdrop.jpg';
                backgroundImage.onerror = function () {
                    this.src = 'images/default.jpg';
                };
                backgroundImage.onload = function () {
                    crossFade.endCanvas = generateBackgroundCanvas(viewWidth, viewHeight, backgroundImage, blurAmount);
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
            // getting intersected object
            if (intersects.length > 0 && intersects[0].object != current){
                var INTERSECTED = intersects[0].object;
                if (INTERSECTED._id !== undefined) {
                    // restoring node state when leaving it
                    if (current && (current._id != INTERSECTED._id)) {
                        updateTexture(current.nodeImage, current.canvas, current.name, 0.6);
                        current.texture.needsUpdate = true;
                        old = current;
                    }
                    // updating intersected node and animating opacity
                    current = INTERSECTED;
                    updateHoverLabel(current.name);
                    current.animationOpacity = 0.6;
                    var tween = new TWEEN.Tween(current).to({animationOpacity : 1}, 200)
                    .easing(TWEEN.Easing.Linear.None)
                    .onUpdate(function (){
                        updateTexture(current.nodeImage, current.canvas, current.name, current.animationOpacity);
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
