var cinegraphApp = angular.module('cinegraphApp', ['ui.bootstrap', 'ngRoute']);

cinegraphApp.factory('socket', function ($rootScope) {
  var socket = io.connect();
  return {
    on: function (eventName, callback) {
      socket.on(eventName, function () {
        var args = arguments;
        $rootScope.$apply(function () {
          callback.apply(socket, args);
        });
      });
    },
    emit: function (eventName, data, callback) {
      socket.emit(eventName, data, function () {
        var args = arguments;
        $rootScope.$apply(function () {
          if (callback) {
            callback.apply(socket, args);
          }
        });
      })
    }
  };
});

cinegraphApp.config(['$locationProvider', '$routeProvider', function($locationProvider, $routeProvider) {
    $locationProvider.html5Mode(true);
    $routeProvider
        .when('/', { templateUrl: 'partials/search', controller: 'TypeaheadCtrl' })
        .when('/signin', { templateUrl: 'partials/signin', controller: "UserCtrl" })
        .when('/register', { templateUrl: 'partials/register', controller: "UserCtrl" })
        .when('/profile', { templateUrl: 'partials/profile', controller: 'cinegraphController' })
        .when('/home', { templateUrl: 'partials/home', controller: 'UserCtrl' })
        .when('/light', { templateUrl: 'partials/light', controller: 'cinegraphController' })
        .when('/light/cinegraph/:testId', { templateUrl: 'partials/light', controller: 'MyCinegraphCtrl' })
        .when('/restricted', { templateUrl: '/partials/restricted' })
        .when('/mycinegraph', { templateUrl: '/partials/mycinegraph', controller: 'MyCinegraphCtrl',
            access: { requiredAuthentication: true }})
        .when('/cinegraph/:testId', {
          templateUrl: '/partials/mycinegraphSingle', controller: 'MyCinegraphCtrl',
          access: { requiredAuthentication: true }
        })
        .when('/error', { templateUrl: '/partials/error' })
        .when('/index', { templateUrl: '/partials/index', controller: 'cinegraphController', reloadOnSearch: false })
        .when('/friends', { templateUrl: '/partials/friends', controller: 'cinegraphController' })
        .when('/unauthorized', { templateUrl: '/partials/unauthorized', controller: 'restrictedController' })
        .when('/signout', {
            redirectTo: '/',
            resolve: {
              "deleteSession": function( $q, $window, AuthService ) {
                AuthService.logout();
              }
            }
          })
        .otherwise({ redirectTo: '/'}
    );
}]);

function getParameterByName(name) {
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
        results = regex.exec(location.search);
    return results === null ? null : decodeURIComponent(results[1].replace(/\+/g, " "));
}

cinegraphApp.run(function($rootScope, $location, $window, AuthService, $route) {
    $rootScope.shouldReload = false;
    $rootScope.$on("$routeChangeStart", function(event, nextRoute, currentRoute) {
        //redirect only if both isAuthenticated is false and no token is set
        if (nextRoute != null && nextRoute.access != null && nextRoute.access.requiredAuthentication
            && !AuthService.isLoggedIn() && !$window.sessionStorage.token) {
            $location.path("/unauthorized");
        }
    });
    $rootScope.$on("$routeUpdate", function() {
        if ($rootScope.shouldReload) {
            $rootScope.shouldReload = false;
            $route.reload();
        }
    });
});

cinegraphApp.filter('JobNameFormatter', function() {
    return function(input) {
        var out = "";
        if (input == "ACTED_IN")
            out = "Actor";
        else if (input == "PRODUCED")
            out = "Producer";
        else if (input == "DIRECTED")
            out = "Director";
        else if (input == "WROTE")
            out = "Writer";
        else if (input == "EDITED")
            out = "Editor";
        else if (input == "DIRECTED_PHOTOGRAPHY")
            out = "Director of photography";
        else if (input == "COMPOSED_MUSIC")
            out = "Music composer";
        else if (input == "DESIGNED_COSTUMES")
            out = "Costume designer";
        else if (input == "DESIGNED_PRODUCTION")
            out = "Production designer";
        else
            out = input;
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
    function($scope, $http, $window, $location, AuthService, $modal, socket) {

      /* Variables initialization */

      $scope.friendsTastes = [];
      $scope.currentNode = {};
      $scope.alerts = [];
      /*var selectedNodeId = getParameterByName('id');
      if (selectedNodeId == undefined) {
          selectedNodeId = 719772;
      }
      $http.get('/api/common/' + selectedNodeId).success(function(node) {
          $scope.currentNode = node;
          $scope.updateSelectedJobs();
          $scope.updateTypesAndLimits();
      });
      */

    $scope.$watch(AuthService.isLoggedIn, function (isLoggedIn) {
        $scope.isLoggedIn = isLoggedIn;
        $scope.currentUser = AuthService.currentUser();
        $scope.currentUserToEdit = angular.copy($scope.currentUser);
    });

    $scope.sendInvitationToRate = function(friendName) {
      var dataOfNode = $scope.currentNode.type == 'Person' ? $scope.currentNode.firstname + " " + $scope.currentNode.lastname : $scope.currentNode.title;
      $http.post( "/api/notif/inviteToRate", {userName: $scope.currentUser.username , friendName: friendName, idToRate: $scope.currentNode.id, dataOfNode: dataOfNode})
        .success(function(res) {
          if (res == true)
            $scope.alerts.push({success: 'true', msg:'You sent ' + friendName + ' an invitation to rate ' + dataOfNode + '!'});
          else
            $scope.alerts.push({error: 'true', msg:'An error occurred. Please try again.'});
          console.log("Notif to rate sent to friend " + friendName);
      }).
        error(function() {
      });
    }


    $scope.updateProfile = function(user) {
        var currentUser = angular.copy(user);
        $http.put('/users/updateUser', currentUser).success(function (res) {
            $window.localStorage.user = JSON.stringify(res.user);
            $scope.currentUser = AuthService.currentUser();
            $location.path('/profile');
        });
    }

    $scope.logout = function(){
      AuthService.logout();
    }

    $scope.updateTypesAndLimits = function() {
    $http.get("/api/user/rating/" + $scope.currentNode.id)
        .success(function(payload){
          $('#noteObj').rating('rate', 0);
          $('#noteLove').rating('rate', 0);
          if (payload.message != "no rate"){
            $('#noteObj').rating('rate', payload.obj);
            $('#noteLove').rating('rate', payload.love);
          }
          $scope.rates = 3;
        }).
        error(function(){
            $('#noteObj').rating('rate', 0);
            $('#noteLove').rating('rate', 0);
        });

        var craziness = 1;
        if ($scope.currentNode.type == "Person")
        {
            $scope.typesAndLimits = [];
            for (var i = 0; i < $scope.currentNode.jobs.length; i++) {
                var obj = {
                    type: $scope.currentNode.jobs[i].name,
                    limit: (i == 0 ? 10 : 0)
                };
                $scope.typesAndLimits.push(obj);
            };
        }
        else
        {
            // $scope.typesAndLimits = [ { type: 'ACTED_IN', limit: 10 * craziness},
            //                         { type: 'DIRECTED', limit: 0 * craziness},
            //                         { type: 'PRODUCED', limit: 0 * craziness},
            //                         { type: 'COMPOSED_MUSIC', limit: 0 * craziness},
            //                         { type: 'DIRECTED_PHOTOGRAPHY', limit: 0 * craziness},
            //                         { type: 'WROTE', limit: 0 * craziness},
            //                         { type: 'EDITED', limit: 0 * craziness},
            //                         { type: 'DESIGNED_PRODUCTION', limit: 0 * craziness},
            //                         { type: 'DESIGNED_COSTUMES', limit: 0 * craziness} ];
             $scope.typesAndLimits = [ { type: 'ACTED_IN', limit: 4 * craziness},
                                    { type: 'DIRECTED', limit: 1 * craziness},
                                    { type: 'PRODUCED', limit: 1 * craziness},
                                    { type: 'COMPOSED_MUSIC', limit: 1 * craziness},
                                    { type: 'DIRECTED_PHOTOGRAPHY', limit: 1 * craziness},
                                    { type: 'WROTE', limit: 1 * craziness},
                                    { type: 'EDITED', limit: 1 * craziness},
                                    { type: 'DESIGNED_PRODUCTION', limit: 1 * craziness},
                                    { type: 'DESIGNED_COSTUMES', limit: 1 * craziness} ];
        }
    };

    $scope.updateTypesAndLimitsFromFilter = function() {
        $scope.typesAndLimits = [];
        var max = 10;
        var numberOfSelectedJobs = 0;
        for (var job in $scope.selectedJobs) {
            if ($scope.selectedJobs[job]) {
                numberOfSelectedJobs++;
            }
        }

        for (var job in $scope.selectedJobs) {
            if ($scope.selectedJobs[job]) {
                if ($scope.currentNode.type == "Person") {
                    var obj = {
                        type: $scope.jobsRelationships[job],
                        limit: ($scope.jobsRelationships[job] == $scope.currentNode.jobs[0].name ?
                            Math.round(max / numberOfSelectedJobs) : Math.floor(max / numberOfSelectedJobs))
                    };
                }
                else {
                    var obj = {
                        type: $scope.jobsRelationships[job],
                        limit: ($scope.jobsRelationships[job] == "ACTED_IN" ?
                            Math.round(max / numberOfSelectedJobs) : Math.floor(max / numberOfSelectedJobs))
                    };
                }
                $scope.typesAndLimits.push(obj);
            }
        }
    };

    $scope.updateSelectedJobs = function() {
        if ($scope.currentNode.type == 'Person') {
            $scope.selectedJobs = {
                actor: $scope.currentNode.jobs[0].name == 'ACTED_IN',
                director: $scope.currentNode.jobs[0].name == 'DIRECTED',
                producer: $scope.currentNode.jobs[0].name == 'PRODUCED',
                writer: $scope.currentNode.jobs[0].name == 'WROTE',
                dirphotography: $scope.currentNode.jobs[0].name == 'DIRECTED_PHOTOGRAPHY',
                editor: $scope.currentNode.jobs[0].name == 'EDITED',
                musiccomposer: $scope.currentNode.jobs[0].name == 'COMPOSED_MUSIC',
                cosdesigner: $scope.currentNode.jobs[0].name == 'DESIGNED_COSTUMES',
                proddesigner: $scope.currentNode.jobs[0].name == 'DESIGNED_PRODUCTION'
            };
        }
        else {
            $scope.selectedJobs = {
                actor: false,
                director: false,
                producer: false,
                writer: false,
                dirphotography: false,
                editor: false,
                musiccomposer: false,
                cosdesigner: false,
                proddesigner: false
            };
        }
        for (var i = 0; i < $scope.currentDisplayedNodes.length; i++) {
            for (var job in $scope.selectedJobs) {
                if ($scope.jobsRelationships[job] == $scope.currentDisplayedNodes[i].type) {
                    $scope.selectedJobs[job] = true;
                }
            }
        };
    };

    $scope.findLimitForJob = function(type) {
        for (var i = 0 ; i < $scope.typesAndLimits.length; i++) {
            if ($scope.typesAndLimits[i].type == type) {
                return $scope.typesAndLimits[i].limit;
            }
        }
    };

    $scope.open = function (size) {
        var modalInstance = $modal.open({
            animation: $scope.animationsEnabled,
            templateUrl: '/partials/detailed-sheet',
            controller: 'ModalInstanceCtrl',
            size: size,
            resolve: {
                currentNode: function() {
                    return $scope.currentNode;
                },
                rates: function(){
                  var noteObj = $('#noteObj').rating('rate');
                  var noteLove = $('#noteLove').rating('rate');
                  return ({noteObj: noteObj, noteLove: noteLove});
                }
            }
        });
    };

    $('#noteObj').on('change', function () {
      var noteObj = $(this).val();
      $http.post( "/api/user/rateObj", {movieId: $scope.currentNode.id, noteObj: noteObj})
        .success(function(updatedNode) {
        $scope.currentNode.globalObjScore = updatedNode.globalObjScore;

        $http.post("/api/actions/", { actionType: 'ratingObj', username:$scope.currentUser.username,
            idToRate: $scope.currentNode.id, rate: noteObj }).success(function() {
        }).
          error(function() {

        });
      }).
        error(function() {
      });
    });


    $('#noteLove').on('change', function () {
      var noteLove = $(this).val();
      $http.post( "/api/user/rateLove", {movieId: $scope.currentNode.id, noteLove: noteLove})
        .success(function(updatedNode) {
        $scope.currentNode.globalLoveScore = updatedNode.globalLoveScore;

        $http.post("/api/actions/", { actionType: 'ratingLove', username:$scope.currentUser.username,
            idToRate: $scope.currentNode.id, rate: noteLove }).success(function() {
        }).
          error(function() {

        });
      }).
        error(function() {
      });
    });

});

cinegraphApp.controller('ModalRatingCtrl', function($scope, $http) {
  $('#noteLove2').rating('rate', $('#noteLove').rating('rate'));
  $('#noteObj2').rating('rate', $('#noteObj').rating('rate'));

  $('#noteObj2').on('change', function () {
    var noteObj = $(this).val();
    $http.post( "/api/user/rateObj", {movieId: $scope.currentNode.id, noteObj: noteObj})
      .success(function() {
        $('#noteObj').rating('rate', noteObj);
      }).
      error(function() {
    });
  });


  $('#noteLove2').on('change', function () {
    var noteLove = $(this).val();
    $http.post( "/api/user/rateLove", {movieId: $scope.currentNode.id, noteLove : noteLove})
      .success(function() {
        $('#noteLove').rating('rate', noteLove);
      }).
      error(function() {
    });
  });
});

cinegraphApp.controller('ModalInstanceCtrl', function($scope, $modalInstance, currentNode, rates) {

    $scope.currentNode = currentNode;

    var sanitizeFileName = function(filename)
    {
        if (filename == undefined) {
            return filename;
        }
        // The replaceChar should be either a space
        // or an underscore.
        var replaceChar = "_";
        var regEx = new RegExp('[,/\:*?""<>|]', 'g');
        var Filename = filename.replace(regEx, replaceChar);

        // Show me the new file name.
      return Filename;
    }
    $scope.sanitizeFileName = sanitizeFileName;

    $scope.close = function () {
        $modalInstance.dismiss("close");
    };
});

cinegraphApp.directive("cinegraph", [ '$http', '$location', function($http, $location) {
	return {
		link: function link(scope, element, attrs) {
            //scope
            scope.jobsNames = {
                actor: 'Actor',
                writer: 'Writer',
                producer: 'Producer',
                director: 'Director',
                editor: 'Editor',
                dirphotography: 'Director of photography',
                musiccomposer: 'Music composer',
                cosdesigner: 'Costume designer',
                proddesigner: 'Production designer'
            };
            scope.jobsRelationships = {
                actor: 'ACTED_IN',
                writer: 'WROTE',
                producer: 'PRODUCED',
                director: 'DIRECTED',
                editor: 'EDITED',
                dirphotography: 'DIRECTED_PHOTOGRAPHY',
                musiccomposer: 'COMPOSED_MUSIC',
                cosdesigner: 'DESIGNED_COSTUMES',
                proddesigner: 'DESIGNED_PRODUCTION'
            };
            scope.jobsOffset = {
                actor: 0,
                writer: 0,
                producer: 0,
                director: 0,
                dirphotography: 0,
                editor: 0,
                musiccomposer: 0,
                cosdesigner: 0,
                proddesigner: 0
            };
            scope.clearOffsets = function () {
                for (var job in scope.jobsOffset)
                    scope.jobsOffset[job] = 0;
            };

            scope.currentDisplayedNodes = [];
            scope.suggestedNodes = [];

            scope.paginateBy = function(job, relationship, direction) {
                console.log('paginateBy');
                var nodes = scope.cinegraphId != undefined ? scope.suggestedNodes : scope.currentDisplayedNodes;
                if (scope.selectedJobs[job]) {
                    // removing old nodes
                    for (var i = nodes.length - 1; i >= 0; i--) {
                        var obj = nodes[i];
                        var startpoint = obj.start, endpoint = obj.end;
                        if (scope.currentNode.type != 'Person') {
                            startpoint = obj.end;
                            endpoint = obj.start;
                        }
                        if (scope.currentNode.id === startpoint && obj.type == relationship)
                            scope.removeOneFromScene(nodes, endpoint, scope.currentNode.id);
                    }
                    // getting new offset
                    var limit = scope.findLimitForJob(relationship);
                    if (direction == 'Right')
                        scope.jobsOffset[job] += limit;
                    else {
                        scope.jobsOffset[job] -= limit;
                        scope.jobsOffset[job] = Math.max(scope.jobsOffset[job], 0);
                    }
                    // getting new nodes
                    //console.log(job, relationship, direction, scope.jobsOffset);
                    scope.getRelatedNodesForType(scope.currentNode, relationship, scope.findLimitForJob(relationship),
                        scope.jobsOffset[job], nodes.length, scope.currentNode.sprite, scope.drawRelatedNodes);
                }
            };

            scope.filterBy = function filterBy(job, relationship) {
                var nodes = scope.cinegraphId != undefined ? scope.suggestedNodes : scope.currentDisplayedNodes;
                if (scope.selectedJobs[job]) {
                    if (scope.currentNode.type == "Person") {
                      scope.updateTypesAndLimitsFromFilter();
                    }
                    removeByJobType(scope.currentDisplayedNodes);
                    scope.getRelatedNodesForType(scope.currentNode, relationship, scope.findLimitForJob(relationship), 0,
                        nodes.length, scope.currentNode.sprite, scope.drawRelatedNodes);
                }
                else {
                    for (var i = nodes.length - 1; i >= 0; i--) {
                        var obj = nodes[i];
                        var startpoint = obj.start, endpoint = obj.end;
                        if (scope.currentNode.type != 'Person') {
                            startpoint = obj.end;
                            endpoint = obj.start;
                        }
                        if (scope.currentNode.id === startpoint && obj.type == relationship)
                            scope.removeOneFromScene(nodes, endpoint, scope.currentNode.id);
                    }
                }
            };
            scope.filterByActor = function() { scope.filterBy("actor", "ACTED_IN"); };
            scope.filterByDirector = function() { scope.filterBy("director", "DIRECTED"); };
            scope.filterByProducer = function() { scope.filterBy("producer", "PRODUCED"); };
            scope.filterByWriter = function() { scope.filterBy("writer", "WROTE"); };
            scope.filterByEditor = function() { scope.filterBy("editor", "EDITED"); };
            scope.filterByDirPhotography = function() { scope.filterBy("dirphotography", "DIRECTED_PHOTOGRAPHY"); };
            scope.filterByMusicComposer = function() { scope.filterBy("musiccomposer", "COMPOSED_MUSIC"); };
            scope.filterByCosDesigner = function() { scope.filterBy("cosdesigner", "DESIGNED_COSTUMES"); };
            scope.filterByProdDesigner = function() { scope.filterBy("proddesigner", "DESIGNED_PRODUCTION"); };


			// global vars
            var scene, linesScene, camera, cameraControls, bgScene, bgCam, viewWidth, viewHeight, background, gradientBackground;
            var renderer, raycaster;
            var mouse = new THREE.Vector2();
            var mouseClickStart = new Object();
            var mouseIsDown = false;
            var old = null;
            var current = null;
            var defaultImg = new Image();
            defaultImg.src = 'images/default_bg2.jpg';
            var nodePosition = new THREE.Vector3(0, 0, 0);
            var randomVector = new THREE.Vector3(Math.random() * 60 - 20, Math.random() * 60 - 20, Math.random() * 60 - 20);
            var orangeColor = '#ffa226';
            var colors = [];
            colors['ACTED_IN'] = '#319ef1'; colors['PRODUCED'] = '#27ae60'; colors['DIRECTED'] = '#8e44ad';
            colors['WROTE'] = '#f1c40f'; colors['EDITED'] = '#e33244'; colors['DIRECTED_PHOTOGRAPHY'] = '#fc6e51';
            colors['COMPOSED_MUSIC'] = '#00d6ce'; colors['DESIGNED_COSTUMES'] = '#ec87c0'; colors['DESIGNED_PRODUCTION'] = '#ac92ec';
            var composerBackground, composerLines, composer, gradientComposer, blendComposer;
            const PI2 = 2 * Math.PI;
            const blurAmount = 25;
            const borderFraction = 24;
            var gradients = [];
            var blackCircle;
            var idAnimationFrame = 0;
            var renderNeedsUpdate = false;
            var tweenCount = 0;
            const nodeSpacing = 200, nodeOpacity = 0.6, nodeSuggestionOpacity = 0.5;
            var renderMode = 0;
            const nearDistance = 1;
            const sampleRatio = 1;
            var qualityScale = 1;
            const lineThickness = 5;
            var pathPanel = new Object();

            // monitoring panels
            var rendererStats = new THREEx.RendererStats();
            rendererStats.domElement.style.position = 'absolute';
            rendererStats.domElement.style.right = '0px';
            rendererStats.domElement.style.bottom = '0px';
            rendererStats.domElement.style.display = "none";
            rendererStats.domElement.id = "rendererStats";
            document.body.appendChild(rendererStats.domElement);
            var stats = new Stats();
            stats.setMode(0); // 0: fps, 1: ms, 2: mb
            stats.domElement.style.position = 'absolute';
            stats.domElement.style.right = '80px';
            stats.domElement.style.bottom = '0px';
            stats.domElement.style.display = "none";
            document.body.appendChild(stats.domElement);

            // Clean everything
            scope.$on('$destroy', function(){
                cancelAnimationFrame(idAnimationFrame);
                scene = null;
                linesScene = null;
                cameraControls = null;
                //renderer = null;
                raycaster = null;
                mouse = null;
                document.body.removeChild(stats.domElement);
                document.body.removeChild(rendererStats.domElement)
                //composer = null;
                stats = null;
                rendererStats = null;
                $(document).unbind("keyup", switchRenderMode);
            })

            function onWindowResize() {
                viewWidth = $('#graph').find('canvas').width(0).parent().width();
                viewHeight = $('#graph').find('canvas').height(0).parent().height();
                camera.aspect = viewWidth / viewHeight;
                camera.updateProjectionMatrix();
                renderer.setSize(viewWidth, viewHeight);
                var vW = viewWidth * sampleRatio * qualityScale, vH = viewHeight * sampleRatio * qualityScale;

                composerBackground.setSize(vW / 4, vH / 4);
                background.bgCanvas.width = vW / 4;
                background.bgCanvas.height = vH / 4;
                composerLines.setSize(vW, vH);
                var lineShader = composerLines.passes[1];
                lineShader.uniforms.totalWidth.value = vW;
                lineShader.uniforms.totalHeight.value = vH;
                lineShader.uniforms['edgeWidth'].value = lineThickness * sampleRatio * qualityScale;
                composer.setSize(vW, vH);
                gradientComposer.setSize(vW / sampleRatio, vH / sampleRatio);
                blendComposer.setSize(vW / sampleRatio, vH / sampleRatio);

                var blendPass = blendComposer.passes[0];
                blendPass.uniforms['tBase'].value = composerBackground.renderTarget1;
                blendPass.uniforms['tAdd'].value = composerLines.renderTarget1;
                blendPass.uniforms['tAdd2'].value = composer.renderTarget1;
                blendPass.uniforms['tAdd3'].value = gradientComposer.renderTarget1;

                renderNeedsUpdate = true;
            }

            function switchRenderMode(e) {
                switch(e.which) {
                    case 112: // F1
                        renderMode = (renderMode + 1) % 5;
                        composerBackground.passes[composerBackground.passes.length - 1].renderToScreen = (renderMode == 1);
                        composerLines.passes[composerLines.passes.length - 1].renderToScreen = (renderMode == 2);
                        composer.passes[composer.passes.length - 1].renderToScreen = (renderMode == 3);
                        gradientComposer.passes[gradientComposer.passes.length - 1].renderToScreen = (renderMode == 4);
                        blendComposer.passes[blendComposer.passes.length - 1].renderToScreen = (renderMode == 0);
                        renderNeedsUpdate = true;
                        break;
                    case 113: // F2
                        $('#stats, #rendererStats').toggle();
                        break;
                    default: return;
                }
                e.preventDefault();
            }

            function init() {
                // global variables init
                scene = new THREE.Scene();
                linesScene = new THREE.Scene();
                renderer = new THREE.WebGLRenderer({ antialias: false, alpha:true, autoClear: false });
                raycaster = new THREE.Raycaster();

                $('#graph').css('height','100%');
                viewWidth = $('#graph').width();
                viewHeight = $('#graph').height();
                camera = new THREE.PerspectiveCamera(45, viewWidth / viewHeight, nearDistance, 1000);
                renderer.setSize(viewWidth, viewHeight);
                document.getElementById('graph').appendChild(renderer.domElement);

                // background scene
                var bgCanvas = generateBackgroundCanvas(viewWidth, viewHeight, defaultImg, blurAmount);
                var bgTexture = new THREE.Texture(bgCanvas);
                bgTexture.minFilter = THREE.LinearFilter;
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
                gradientTexture.minFilter = THREE.LinearFilter;
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
                blackCircle = document.createElement('canvas');
                blackCircle.width = 128;
                blackCircle.height = blackCircle.width;
                var blackCircleHalf = blackCircle.width / 2;
                var blackCircleCtx = blackCircle.getContext('2d');
                blackCircleCtx.beginPath();
                blackCircleCtx.arc(blackCircleHalf, blackCircleHalf, blackCircleHalf, 0, PI2, false);
                blackCircleCtx.fillStyle = 'black';
                blackCircleCtx.fill();

                // lines scene
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
                    '<div id="canvasNodeLabel" style="text-align:center;">\
                        <div class="labelText"></div>\
                    </div>');
                label.css({ 'position': 'absolute','z-index': '1','background-color': '#aaaaaa',
                    'color': 'white','padding':'10px','left':'-1000'
                });
                $('#graph').parent().css('position','relative');
                $('#graph').after(label);

                // over sampling for antialiasing
                var parameters = {
                    minFilter: THREE.LinearFilter,
                    magFilter: THREE.LinearFilter,
                    format: THREE.RGBAFormat,
                    stencilBuffer: false
                };
                //console.log(sampleRatio, viewWidth, viewHeight);
                // background
                var renderTargetBackground = new THREE.WebGLRenderTarget(viewWidth * sampleRatio / 4, viewHeight * sampleRatio / 4, parameters);
                var renderBackgroundScene = new THREE.RenderPass(bgScene, bgCam);
                var effectCopyBackground = new THREE.ShaderPass(THREE.CopyShader);
                composerBackground = new THREE.EffectComposer(renderer, renderTargetBackground);
                composerBackground.addPass(renderBackgroundScene);
                composerBackground.addPass(effectCopyBackground);
                // lines
                var renderLinesTarget = new THREE.WebGLRenderTarget(viewWidth * sampleRatio, viewHeight * sampleRatio, parameters);
                var renderLinesScene = new THREE.RenderPass(linesScene, camera);
                var lineShader = new THREE.ShaderPass(THREE.ThickLineShader);
                lineShader.uniforms.totalWidth.value = viewWidth * sampleRatio;
                lineShader.uniforms.totalHeight.value = viewHeight * sampleRatio;
                lineShader.uniforms['edgeWidth'].value = lineThickness * sampleRatio;
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
                //gradient
                var renderTargetGradient = new THREE.WebGLRenderTarget(viewWidth, viewHeight, parameters);
                var renderGradientScene = new THREE.RenderPass(gradientScene, gradientCam);
                var effectCopyGradient = new THREE.ShaderPass(THREE.CopyShader);
                gradientComposer = new THREE.EffectComposer(renderer, renderTargetGradient);
                gradientComposer.addPass(renderGradientScene);
                gradientComposer.addPass(effectCopyGradient);
                // blend
                var blendPass = new THREE.ShaderPass(THREE.BlendShader);
                blendPass.uniforms['tBase'].value = composerBackground.renderTarget1;
                blendPass.uniforms['tAdd'].value = composerLines.renderTarget1;
                blendPass.uniforms['tAdd2'].value = composer.renderTarget1;
                blendPass.uniforms['tAdd3'].value = gradientComposer.renderTarget1;
                blendComposer = new THREE.EffectComposer(renderer);
                blendComposer.addPass(blendPass);
                blendPass.renderToScreen = true;

                // listeners
                document.getElementById('graph').addEventListener('change', render, false);
                $('#graph').mousedown(onMouseDown);
                $('#graph').mouseup(onMouseUp);
                $('#graph').mousemove(onMouseMove);
                cameraControls.addEventListener('change', function() {renderNeedsUpdate = true;});
                $(document).keyup(switchRenderMode);
                window.addEventListener('resize', onWindowResize, false);

                // first node or cinegraph init
                if (scope.cinegraphId != undefined) {
                    $http.get('/api/mycinegraph/' + scope.cinegraphId).success(function (cinegraph) {
                        cinegraph.nodes = JSON.parse(cinegraph.nodes);
                        scope.currentCinegraph = cinegraph;
                        displayCinegraphNodes(scope.currentCinegraph.nodes, false);
                    });
                }
                else
                    getNode(getParameterByName('id'), nodePosition, draw);
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
            return (toScreenPosition(posOffset).distanceTo(toScreenPosition(spritePosition))) * spriteScale / 8;
        }

        function generateGradient(c) {
            var gradientCanv = document.createElement('canvas');
            gradientCanv.width = 64;
            gradientCanv.height = 64;
            var hw = gradientCanv.width / 2;
            var gradientCtx = gradientCanv.getContext('2d');
            gradientCtx.shadowOffsetX = 1000;
            gradientCtx.shadowOffsetY = 1000;
            gradientCtx.shadowBlur = hw / 3.2;
            gradientCtx.fillStyle = c;
            gradientCtx.shadowColor = c;
            gradientCtx.beginPath();
            gradientCtx.arc(
                hw - gradientCtx.shadowOffsetX,
                hw - gradientCtx.shadowOffsetY,
                hw - gradientCtx.shadowBlur * 2,
                0, PI2, true
            );
            gradientCtx.fill();
            gradients[c] = gradientCanv;
        }

        function getGradientLayer() {
            //console.time('getGradientLayer');
            var canv = document.createElement('canvas');
            canv.width = viewWidth;
            canv.height = viewHeight;
            var ctx = canv.getContext('2d');

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
                var orientation = new THREE.Vector3().copy(sprite.position)
                    .sub(camera.position).dot(camera.getWorldDirection());
                // checking that the node is not too close or behind the camera
                if (orientation > 0 && elt.distance > nearDistance * nearDistance)
                    orderedScene.push(elt);
            }
            orderedScene.sort(compare);

            // drawing gradient circle for each node
            var orderedSceneLength = orderedScene.length;
            for (var i = 0; i < orderedSceneLength; i++)
            {
                var sprite = scene.children[orderedScene[i].index];
                // calculating circle radius
                var circleRadius = getSpriteRadius(sprite.position, sprite.scale.x);
                if (circleRadius <= 2)
                    continue;
                // if node is out the screen, skip
                var pos = toScreenPosition(sprite.position);
                if (pos.x + circleRadius < 0 || pos.x - circleRadius > canv.width
                    || pos.y + circleRadius < 0 || pos.y - circleRadius > canv.height)
                    continue;
                var circleDiameter = circleRadius * 2;
                var innerRadius = Math.abs(circleRadius * ((borderFraction - 2) / borderFraction));
                var spriteCanv = document.createElement('canvas');
                spriteCanv.width = circleDiameter;
                spriteCanv.height = circleDiameter;
                var spriteCtx = spriteCanv.getContext('2d');

                // getting lines related to node
                var drawCount = 0;
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
                    // if line is to small to be seen anyway, skip
                    if (line.geometry.vertices[startIndex].distanceToSquared(line.geometry.vertices[endIndex]) <= 16)
                        continue;
                    // if line and node have same color, skip
                    var c = '#' + line.geometry.colors[startIndex].getHexString();
                    if (sprite.mainJob == undefined && c == orangeColor || c == colors[sprite.mainJob])
                        continue;
                    if (gradients[c] == undefined)
                        generateGradient(c);
                    // drawing radial gradient
                    var startPos = toScreenPosition(line.geometry.vertices[startIndex]);
                    var endPos = toScreenPosition(line.geometry.vertices[endIndex]);
                    var radgradPos = endPos.sub(startPos).setLength(circleRadius);
                    var rad = circleRadius * 2.5;
                    spriteCtx.drawImage(
                        gradients[c],
                        circleRadius + radgradPos.x - rad / 2,
                        circleRadius + radgradPos.y - rad / 2,
                        rad, rad
                    );
                    drawCount++;
                }
                // clearing outer circle
                if (ctx.globalCompositeOperation != 'destination-out')
                    ctx.globalCompositeOperation = 'destination-out';
                ctx.drawImage(blackCircle, pos.x - circleRadius, pos.y - circleRadius, circleDiameter, circleDiameter);
                if (drawCount > 0) {
                    // outer circle mask
                    spriteCtx.globalCompositeOperation = 'destination-in';
                    spriteCtx.drawImage(blackCircle, 0, 0, circleDiameter, circleDiameter);
                    // inner circle mask
                    var r = innerRadius - 0.75, r2 = r * 2;
                    spriteCtx.globalCompositeOperation = 'destination-out';
                    spriteCtx.drawImage(blackCircle, circleRadius - r, circleRadius - r, r2, r2);
                    // drawing sprite
                    ctx.globalCompositeOperation = 'source-over';
                    ctx.drawImage(spriteCanv, pos.x - circleRadius, pos.y - circleRadius, circleDiameter, circleDiameter);
                }
            }
            //console.timeEnd('getGradientLayer');
            return canv;
        }

        function updateGradientLayer() {
            var c = gradientBackground.gradientCanvas;
            var ctx = c.getContext('2d');
            if (c.width != viewWidth || c.height != viewHeight){
                c.width = viewWidth;
                c.height = viewHeight;
            }
            ctx.clearRect(0, 0, viewWidth, viewHeight);
            var newLayer = getGradientLayer();
            if (newLayer != null)
                ctx.drawImage(newLayer, 0, 0);
            gradientBackground.gradientTexture.needsUpdate = true;
        }

        function removeByJobType(array) {
            var jobs = {
                'ACTED_IN': [],
                'WROTE': [],
                'PRODUCED': [],
                'DIRECTED': [],
                'EDITED': [],
                'DIRECTED_PHOTOGRAPHY': [],
                'COMPOSED_MUSIC': [],
                'DESIGNED_COSTUMES': [],
                'DESIGNED_PRODUCTION': []
            }
            for (var i = 0; i < array.length; i++) {
                jobs[array[i].type].push(array[i]);
            };
            for (var job in jobs) {
                if (scope.findLimitForJob(job) < jobs[job].length) {
                    for (var i = scope.findLimitForJob(job); i < jobs[job].length; i++) {
                        var endpoint = jobs[job][i].end;
                        if (scope.currentNode.type != 'Person') {
                            endpoint = jobs[job][i].start;
                        }
                        removeOneFromScene(scope.currentDisplayedNodes, endpoint, scope.currentNode.id);
                    };
                }
            }
        }

        function removeOneFromScene(array, idToRemove, excludedId) {
            var length = linesScene.children.length;
            for (var i = length - 1; i >= 0; i--)
            {
                var line = linesScene.children[i];
                if (line.endNodeId == idToRemove || line.startNodeId == idToRemove) {
                    linesScene.remove(line);
                }
            }

            length = scene.children.length;
            for (var i = length - 1; i >= 0; i--)
            {
                var node = scene.children[i];
                var index = -1;
                $.each(array, function(j, obj) {
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
                            toRemove[0].geometry.dispose();
                            toRemove[0].material.dispose();
                            toRemove[0].texture.dispose();
                            scene.remove(toRemove[0]);
                            toRemove.splice(0,1);
                        }).start();
                }
            }
        }

        function getFriendsRatings(friends, index, node, currentUserRating) {
            $http.get('/api/user/'+ friends[index].id + '/rating/' + node.id).success(function (rating) {
              $http.get('community-sentences.json').success(function(data) {
                var nodeName = (node.type == 'Person' ? node.name : node.title);
                var friendName = friends[index].username;
                var nodeType = node.type.toLowerCase();

                var sentences;
                if (rating.message) { // Friend did not rate the node.
                  sentences = data.friendHasNotRated;
                }
                else {
                  if (rating.love >= 4 && currentUserRating.love >= 4) { // bothWellRated
                    sentences = data.bothWellRated;
                  }
                  else if (rating.love >= 4 && currentUserRating.love <= 1) { // oppositeRates
                    sentences = data.oppositeRates;
                  }
                  else if (rating.love <= 1 && currentUserRating.love >= 3) { // friendHasNotWellRated
                    sentences = data.friendHasNotWellRated;
                  }
                }
                pushCommunitySentences(sentences, friendName, nodeName, nodeType);
              });
            });
        }

        function pushCommunitySentences(sentences, friendName, nodeName, nodeType) {
          var JSONsentence = sentences[Math.floor(Math.random() * sentences.length)];
          var sentence = JSONsentence.sentence;
          var sentenceParameters = JSONsentence.parameters;
          var showButton = false;

          for (var i = 0; i < sentenceParameters.length; i++) {
            var parameter = sentenceParameters[i];
            var parameterKey = "parameter" + (i+1);
            var completedSentence = null;
            if (parameter[parameterKey] == "friendName") {
                sentence = sentence.replace("{" + parameterKey + "}", friendName);
            }
            else if (parameter[parameterKey] == "nodeName") {
                sentence = sentence.replace("{" + parameterKey + "}", nodeName);
            }
            else if (parameter[parameterKey] == "showButton") {
                showButton = true;
            }
            else if (parameter[parameterKey] == "nodeType") {
                sentence = sentence.replace("{" + parameterKey + "}", nodeType);
            }
            else {

            }

            var sentenceObj = {
              showButton: showButton,
              sentence: sentence,
              friendName: friendName
            }

          };
          scope.friendsTastes.push(sentenceObj);
        }

        function displayFriendsTastes() {
            $http.get('/api/user/rating/' + scope.currentNode.id).success(function (rating) {
                if (!rating.message) {
                    $http.get('/api/friends/' + scope.currentUser.id).success(function (friends) {
                        for (var i = 0; i < friends.length; i++) {
                             getFriendsRatings(friends, i, scope.currentNode, rating);
                        };
                    });
                }
                else {
                    scope.friendsTastes = [];
                    scope.friendsTastes.push("Hey buddy, rate this movie to compare it with your friends.");
                }
            });
        }

        function getNode(id, nodePosition, callback) {
            if (id != scope.currentNode.id) {
                clearScene(scope.currentDisplayedNodes, id);
                $http.get('/api/common/' + id).success(function(node) {
                    $location.search('id', id);
                    var sprite = scope.currentNode.sprite;
                    scope.currentNode = node;
                    scope.currentNode.sprite = sprite;
                    scope.updateTypesAndLimits();
                    updateBackground(node);
                    displayFriendsTastes();
                    callback(node, nodePosition);
                });
            }
        }

        function getNodeCinegraphMode(id, nodePosition, callback, shouldDrawRelatedNodes) {
            $http.get('/api/common/' + id).success(function(node) {
                var sprite = scope.currentNode.sprite;
                scope.currentNode = node;
                scope.currentNode.sprite = sprite;
                scope.updateTypesAndLimits();
                updateBackground(node);
                if (!scope.lightMode)
                  callback(node, nodePosition, shouldDrawRelatedNodes);
                scope.updateSelectedJobs();
            });
        }

        /* callback called when getting a node from the API */
        function draw(node, nodePosition) {
            var nodeSprite;
            if (node.id == scope.currentNode.id) {
                if (scope.currentNode.sprite == null)
                    scope.currentNode.sprite = drawNode(node, nodePosition).sprite;
                nodeSprite = scope.currentNode.sprite;
            }
            else
                nodeSprite = drawNode(node, nodePosition).sprite;
            getRelatedNodes(node, nodeSprite, scope.typesAndLimits, drawRelatedNodes);
        }

        function drawCinegraphMode(node, nodePosition, shouldDrawRelatedNodes) {
            var nodeSprite = drawNode(node, nodePosition);
            if (shouldDrawRelatedNodes) {
                getRelatedNodes(node, nodeSprite.sprite, scope.typesAndLimits, drawRelatedNodes);
            }
        }

        function getRelatedNodes(startNode, startNodeSprite, typesAndLimits, callback) {
            var index = 0;
            var limit, job;
            if (startNode.type == "Person") {
                job = startNode.jobs[0].name;
                limit = scope.findLimitForJob(job);
                getRelatedNodesForType(startNode, job, limit, 0, index, startNodeSprite, callback);
            }
            else {
                for (var i = 0; i < 2; i++) {
                    job = typesAndLimits[i].type;
                    limit = typesAndLimits[i].limit;
                    getRelatedNodesForType(startNode, job, limit, 0, index, startNodeSprite, callback);
                    index += limit;
                }
            }
        }

        function pushRelations(array, index, count, direction, relationships, rels, callback) {
            var endpoint = relationships[index].start;
            if (direction == "out") {
                endpoint = relationships[index].end;
            }
            $http.get('/api/common/' + endpoint).success(function(node) {
                var found = false;
                $.each(array, function(j, obj) {
                    var endpoint2 = obj.start;
                    if (direction == "out") {
                        endpoint2 = obj.end;
                    }
                    if (endpoint === endpoint2) {
                        found = true;
                        return false;
                    }
                });
                if (scope.cinegraphId != undefined) {
                    $.each(scope.suggestedNodes, function(j, obj) {
                        var endpoint2 = obj.start;
                        if (direction == "out") {
                            endpoint2 = obj.end;
                        }
                        if (endpoint === endpoint2) {
                            found = true;
                            return false;
                        }
                    });
                }

                if (!found) {
                    rels.push(node);
                    if (scope.cinegraphId != undefined)
                        scope.suggestedNodes.push(relationships[index]);
                    else
                        scope.currentDisplayedNodes.push(relationships[index]);
                }
                count.val++;
                if (count.val == relationships.length) {
                    callback(rels);
                }
            });
        }

        function getRelatedNodesForType(startNode, type, limit, offset, index, startNodeSprite, callback) {
            var direction = 'in';
            if (startNode.type == 'Person') {
                direction = 'out';
            }
            $http.get('/api/common/' + startNode.id + '/relationshipsRaw/' + direction + '/' + type + '/' + limit + '/' + offset)
                .success(function(relationships) {
                    if (relationships.length > 0) {
                        var rels = [];
                        if (scope.suggestedNodes == undefined || scope.suggestedNodes.length == 0) {
                            scope.suggestedNodes = [];
                        }
                        var count = { val: 0 };
                        for (var i = 0; i < relationships.length; i++) {
                            var found = false;
                            var array = null;
                            if (scope.cinegraphId != undefined) {
                                array = scope.currentCinegraph.nodes;
                            }
                            else {
                                array = scope.currentDisplayedNodes;
                            }
                            $.each(array, function(j, obj) {
                                if (relationships[i].id === obj.id) {
                                    found = true;
                                    count.val++;
                                    return false;
                                }
                            });
                            if (found == false) {
                                pushRelations(array, i, count, direction, relationships, rels, function(relsResult) {
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
            if (filename == undefined)
                return filename;
            // The replaceChar should be either a space or an underscore.
            var replaceChar = "_";
            var regEx = new RegExp('[,/\:*?""<>|]', 'g');
            var Filename = filename.replace(regEx, replaceChar);
            return Filename;
        }
        scope.sanitizeFileName = sanitizeFileName;

        function drawNode(node, position, startNodeSprite, type) {
            var text = node.name ? (node.firstname + " " + node.lastname) : node.title
            var canvas = generateTexture(node.jobs != undefined ? node.jobs[0].name : undefined, defaultImg, text);
            var texture = new THREE.Texture(canvas);
            texture.minFilter = THREE.LinearFilter;
            texture.needsUpdate = true;
            var sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture }));
            sprite._id = node.id;
            sprite.name = text;
            sprite.canvas = canvas;
            sprite.texture = texture;
            sprite.mainJob = node.jobs != undefined ? node.jobs[0].name : undefined;
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
                    updateTexture(sprite.mainJob, nodeImage, sprite.canvas, sprite.name, nodeOpacity);
                    sprite.texture.needsUpdate = true;
                };
            }
            sprite.nodeImage = nodeImage;
            sprite.scale.set(0, 0, 0);
            scene.add(sprite);
            // animating scale, position and line
            if (startNodeSprite !== undefined)
            {
                sprite.position.set(startNodeSprite.position.x, startNodeSprite.position.y, startNodeSprite.position.z);
                if (scope.cinegraphId != undefined)
                    setNodeAsSuggestion(sprite._id);
            } else
                sprite.position.set(position.x, position.y, position.z);

            new TWEEN.Tween(sprite.scale).to({x: 8, y: 8, z: 8}, 200)
                .delay(800).easing(TWEEN.Easing.Linear.None).start();

            if (startNodeSprite !== undefined) {
                // drawing line
                var lineGeom = new THREE.Geometry();
                lineGeom.vertices.push(sprite.position, startNodeSprite.position);
                var startColor, endColor;
                if (node.name)
                    startColor = colors[type], endColor = orangeColor;
                else
                    startColor = orangeColor, endColor = colors[type];
                lineGeom.colors.push(new THREE.Color(startColor));
                lineGeom.colors.push(new THREE.Color(endColor));
                var lineMat = new THREE.LineBasicMaterial({ linewidth: 1, vertexColors: true });
                if (scope.cinegraphId != undefined)
                    lineMat.opacity = 0.3;
                line = new THREE.Line(lineGeom, lineMat);
                line.endNodeId = sprite._id;
                line.startNodeId = startNodeSprite._id;
                linesScene.add(line);
                // animation object
                var animObj = new Object();
                animObj.sprite = sprite;
                animObj.line = lineGeom;
                new TWEEN.Tween(animObj.sprite.position).to({x: position.x, y:position.y, z: position.z}, 2000)
                    .easing(TWEEN.Easing.Elastic.InOut)
                    .onUpdate(function () {
                        animObj.line.vertices[0].set(sprite.position.x, sprite.position.y, sprite.position.z);
                        animObj.line.verticesNeedUpdate = true;
                    }).start();
            }
            return {sprite: sprite};
        }

        function drawRelatedNodes(startNodeSprite, relatedNodes, index, limit, type) {
            if (limit > relatedNodes.length)
                limit = relatedNodes.length;
            var occupiedPositions = getOccupiedPositions();
            for (i = index, j = 0; i < limit + index, j < limit; i++, j++) {
                var relatedNodePosition = getNextPosition(occupiedPositions, startNodeSprite.position);
                occupiedPositions.push(relatedNodePosition);
                var relatedNodeSprite = drawNode(relatedNodes[j], relatedNodePosition, startNodeSprite, type);
            }
            scope.updateSelectedJobs();
        }
        scope.drawRelatedNodes = drawRelatedNodes;


        /* ----------- */
        /* POSITIONING */
        /* ----------- */

        function positionIsValid(array, vector)
        {
            var index;
            for (index = 0; index < array.length; ++index)
                if (array[index].distanceToSquared(vector) <= nodeSpacing)
                    return false;
            return true;
        }

        function getOccupiedPositions()
        {
            var positions = [];
            // sprites already on the scene
            for (var i = scene.children.length - 1; i >= 0; i--)
                if (scene.children[i].type == "Sprite")
                    positions.push(scene.children[i].position);
            // sprites to be added
            for (var i = TWEEN.getAll().length - 1; i >= 0; i--){
                var targetPos = TWEEN.getAll()[i].getValuesEnd();
                if (targetPos.x != undefined && targetPos.y != undefined && targetPos.z != undefined)
                    positions.push(new THREE.Vector3(targetPos.x,targetPos.y,targetPos.z));
            }
            return positions;
        }

        function getNextPosition(occupiedPositions, centerNodePosition)
        {
            var slice = PI2 / 10;
            var sphereRadius = 18;
            var nextPosition = centerNodePosition.clone();
            var i = 0;
            do {
                if (i < 10 && scope.cinegraphId == undefined){
                    nextPosition.x = Math.round(centerNodePosition.x + sphereRadius * Math.cos(slice * i));
                    nextPosition.y = Math.round(centerNodePosition.y + sphereRadius * Math.sin(slice * i));
                    nextPosition.z = 0;
                }
                else {
                    nextPosition.x = Math.random() * 2 - 1;
                    nextPosition.y = Math.random() * 2 - 1;
                    nextPosition.z = Math.random() * 2 - 1;
                    nextPosition.setLength(sphereRadius).round().add(centerNodePosition);
                }
                i++;
                if (i % 50 == 0)
                    sphereRadius = 18 * (1 + i / 50);
            } while (!positionIsValid(occupiedPositions, nextPosition))
            return nextPosition;
        }

        function handleRelation(relation, positions, occupiedPositions, refreshScene)
        {
            var start = relation.start, end = relation.end;
            if (start != null && positions[start] == undefined){
                var centerPos = positions[end] != undefined ? positions[end] : new THREE.Vector3(0,0,0);
                var n = findNode(start);
                positions[start] = (n != undefined && !refreshScene) ?
                    n.position : getNextPosition(occupiedPositions, centerPos);
                occupiedPositions.push(positions[start]);
            }
            if (end != null && positions[end] == undefined) {
                var centerPos = positions[start] != undefined ? positions[start] : new THREE.Vector3(0,0,0);
                var n = findNode(end);
                positions[end] = (n != undefined && !refreshScene) ?
                    n.position : getNextPosition(occupiedPositions, centerPos);
                occupiedPositions.push(positions[end]);
            }
        }

        function getCinegraphPositions(cinegraphNodes, refreshScene)
        {
            positions = [];
            var occupiedPositions = refreshScene == true ? [] : getOccupiedPositions();
            for (var i = 0; i < cinegraphNodes.length; i++)
            {
                handleRelation(cinegraphNodes[i], positions, occupiedPositions, refreshScene);
                var start = cinegraphNodes[i].start, end = cinegraphNodes[i].end;
                // exploring relations containing start node
                for (var j = i + 1; j < cinegraphNodes.length; j++)
                    if (cinegraphNodes[j].start == start || cinegraphNodes[j].end == start)
                        handleRelation(cinegraphNodes[j], positions, occupiedPositions, refreshScene);
                // exploring relations containing end node
                for (var j = i + 1; j < cinegraphNodes.length; j++)
                    if (cinegraphNodes[j].start == end || cinegraphNodes[j].end == end)
                        handleRelation(cinegraphNodes[j], positions, occupiedPositions, refreshScene);
            }
            return positions;
        }


        /* ----------- */
        /*   DISPLAY   */
        /* ----------- */

        function displayLines(i, cinegraphNodes, lineGeom) {
            var relation = cinegraphNodes[i], type = relation.type;
            $http.get('/api/common/' + relation.end).success(function(endNode) {
                if (findRelationship(relation.start, relation.end) != undefined)
                    return;
                if (endNode.name)
                    var startColor = colors[type], endColor = orangeColor;
                else
                    var startColor = orangeColor, endColor = colors[type];
                lineGeom.colors.push(new THREE.Color(startColor));
                lineGeom.colors.push(new THREE.Color(endColor));
                var lineMat = new THREE.LineBasicMaterial({ linewidth: 1, vertexColors: true });
                line = new THREE.Line(lineGeom, lineMat);
                line.endNodeId = relation.end;
                line.startNodeId = relation.start;
                linesScene.add(line);
            });
        }

        function displayCinegraphNodes(cinegraphNodes, refreshScene) {
            var focusOnPath = refreshScene && cinegraphNodes.length > 0;
            if (focusOnPath){
                // getting path's nodes id to tag them later
                var originalPathNodes = [];
                for (var i = 0; i < cinegraphNodes.length; i++){
                    var r = cinegraphNodes[i];
                    if (r.start != null && originalPathNodes.indexOf(r.start) == -1)
                        originalPathNodes.push(r.start);
                    if (r.end != null && originalPathNodes.indexOf(r.end) == -1)
                        originalPathNodes.push(r.end);
                }
            }
            // if refreshScene current nodes positions will be recalculated
            if (refreshScene && scope.currentCinegraph.nodes != undefined)
                cinegraphNodes = cinegraphNodes.concat(scope.currentCinegraph.nodes);
            var positions = getCinegraphPositions(cinegraphNodes, refreshScene);
            // drawing nodes
            for (var i in positions){
                var n = findNode(i);
                if (n == undefined || n.IsSuggested) {
                    (function (i) {
                        $http.get('/api/common/' + i).success(function(node) {
                            if (i == Object.keys(positions)[0]) {
                                scope.currentNode = node;
                                scope.updateTypesAndLimits();
                                updateBackground(node);
                                scope.currentNode.sprite = drawNode(node, positions[i]).sprite;
                                scope.updateSelectedJobs();
                            }
                            else
                                drawNode(node, positions[i]);
                            // tagging the node as suggestion
                            if (focusOnPath && originalPathNodes.indexOf(parseInt(i)) != -1)
                                setTimeout(function() {setNodeAsSuggestion(i);}, 800);
                        });
                    })(i);
                } else if (refreshScene)
                    new TWEEN.Tween(n.position).to({x: positions[i].x, y: positions[i].y, z: positions[i].z}, 1000)
                        .easing(TWEEN.Easing.Linear.None).start();
            }
            // drawing lines
            for (var i = 0; i < cinegraphNodes.length; i++){
                var relation = cinegraphNodes[i];
                if (relation.start != null && relation.end != null) {
                    var line = findRelationship(relation.start, relation.end);
                    if (line == undefined) { // create line if not present
                        var lineGeom = new THREE.Geometry();
                        lineGeom.vertices.push(positions[relation.end], positions[relation.start]);
                        displayLines(i, cinegraphNodes, lineGeom);
                    } else if (refreshScene) { // update line position if present
                        (function (line) {
                            var pStart = positions[relation.start];
                            new TWEEN.Tween(line.geometry.vertices[1]).to({x:pStart.x, y:pStart.y, z:pStart.z}, 1000)
                                .easing(TWEEN.Easing.Linear.None).onUpdate(function(){
                                    line.geometry.verticesNeedUpdate = true;
                                }).start();
                            var pEnd = positions[relation.end];
                            new TWEEN.Tween(line.geometry.vertices[0]).to({x:pEnd.x, y:pEnd.y, z:pEnd.z}, 1000)
                                .easing(TWEEN.Easing.Linear.None).onUpdate(function(){
                                    line.geometry.verticesNeedUpdate = true;
                                }).start();
                        })(line);
                    }
                }
            }
            // getting camera new position (path barycenter)
            var barycenter = new THREE.Vector3(0,0,0);
            if (focusOnPath)
            {
                for (var i = 0; i < originalPathNodes.length; i++)
                    barycenter.add(positions[originalPathNodes[i]]);
                barycenter.divideScalar(originalPathNodes.length > 0 ? originalPathNodes.length : 1);
            } else {
                for (var id in positions)
                    barycenter.add(positions[id]);
                barycenter.divideScalar(Object.keys(positions).length);
            }
            cameraLookAtPosition(barycenter);
        }

        function refreshGraph() {
            removeSuggestions();
            displayCinegraphNodes([], true);
        }
        scope.refreshGraph = refreshGraph;


        function generateTexture(job, img, text) {
            var canvas = document.createElement('canvas');
            canvas.width = 256;
            canvas.height = 256;
            updateTexture(job, img, canvas, text, nodeOpacity);
            return canvas;
        }

        function updateTexture(job, img, canvas, text, opacity) {
            var borderThickness = canvas.width / borderFraction;
            var halfWidth = canvas.width / 2;
            var halfHeight = canvas.height / 2;
            var context = canvas.getContext('2d');
            // outer circle
            context.beginPath();
            context.arc(halfWidth, halfHeight, halfWidth, 0, PI2);
            context.clip();
            context.fillStyle = job != undefined ? colors[job] : orangeColor;
            context.fillRect(0, 0, canvas.width, canvas.height);
            // clipping to inner circle
            context.beginPath();
            context.arc(halfWidth, halfHeight, halfWidth - borderThickness, 0, PI2);
            context.clip();
            // black background for opacity
            context.fillStyle = '#000000';
            context.fillRect(0, 0, canvas.width, canvas.height);
            // drawing image
            context.globalAlpha = opacity;
            drawImageProp(context, img, borderThickness, borderThickness,
                canvas.width - 2 * borderThickness, canvas.height - 2 * borderThickness);
            // drawing text
            context.fillStyle = "#ffffff";
            context.font = "bold " + (canvas.width / 9) + "px Arial";
            context.textAlign = "center";
            context.globalAlpha = (1 / (nodeOpacity - 1)) * (opacity - 1);
            wrapText(context, text.toUpperCase(), halfWidth, canvas.height / 2.5,
                canvas.width -  5 * borderThickness, canvas.height / 6);
            context.globalAlpha = 1;
        }

        function wrapText(context, text, x, y, maxWidth, lineHeight) {
            if (text.indexOf(' ') == -1) {
                context.fillText(text, x, y, maxWidth);
                return;
            }
            var words = text.split(' ');
            var line = '';
            var lineCount = 0;
            for (var n = 0; n < words.length; n++) {
                var testLine = line + words[n] + ' ';
                var metrics = context.measureText(testLine);
                var testWidth = metrics.width;
                if (testWidth > maxWidth && n > 0) {
                    lineCount++;
                    if (lineCount == 3)
                    {
                        context.fillText(line.slice(0, -1) + "...", x, y, maxWidth);
                        return;
                    }
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


        /* --------------------- */
        /* NODE BUTTONS HANDLING */
        /* --------------------- */

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

        function filterCallback(job) {
            scope.selectedJobs[job] = !scope.selectedJobs[job];
            scope.filterBy(job, scope.jobsRelationships[job]);
            var f = $('.canvasNodeFilter.' + job);
            f.toggleClass('selected');
            var btn = $('.canvasNodeFilter.' + job).find('.canvasNodeFilterLeft, .canvasNodeFilterRight');
            if (btn.length > 0){
                if (f.hasClass('selected'))
                    btn.animate({"background-color": colors[scope.jobsRelationships[job]],"color": "#555555" }, 200);
                else
                    btn.animate({"background-color": "#555555","color": colors[scope.jobsRelationships[job]] }, 200);
            }
        }

        function paginateCallback(job, direction){
            console.log('paginateCallback', job, direction);
            if (direction == 'Left' && scope.jobsOffset[job] == 0
                || !$('.canvasNodeFilter.' + job).hasClass('selected'))
                return;
            var btn = $('.canvasNodeFilter.' + job).find('.canvasNodeFilter' + direction);
            var bgColor = btn.css('background-color');
            var c = btn.css('background-color').replace(/[^0-9,]+/g, "");
            var r = Math.min(parseInt(c.split(",")[0],10) + 25, 255),
                g = Math.min(parseInt(c.split(",")[1],10) + 25, 255),
                b = Math.min(parseInt(c.split(",")[2],10) + 25, 255);
            var lighterBg = 'rgb('+ r +','+ g +','+ b +')';
            // animating button color when paginating
            btn.animate({ 'background-color': lighterBg }, 250, function() {
                setTimeout((function(b, c) { return function() {
                    b.animate({ 'background-color': c }, 250);
                }; })($(this), bgColor), 1000);
            });
            scope.paginateBy(job, scope.jobsRelationships[job], direction);
        }

        function updateFilters() {
            if (current == null || current._id != scope.currentNode.id)
                $('.canvasNodeFilter').fadeOut(300, function(){ $(this).remove(); });
            else {
                var i = -2;
                var slice = PI2 / 12;
                for (f in scope.selectedJobs){
                    i++;
                    var filter = $('.canvasNodeFilter.' + f);
                    if (filter.length <= 0) {
                        // create element if not existing
                        filter = $('<div class="canvasNodeFilter ' + f + '" title="' + scope.jobsNames[f] + '"> \
                            <div class="canvasNodeFilterLeft">◄</div><div class="canvasNodeFilterRight">►</div></div>');
                        filter.find('.canvasNodeFilterLeft, .canvasNodeFilterRight').css({
                            "background-color": scope.selectedJobs[f] ? colors[scope.jobsRelationships[f]] : "#555555",
                            "color": !scope.selectedJobs[f] ? colors[scope.jobsRelationships[f]] : "#555555",
                        });
                        if (scope.selectedJobs[f])
                            filter.toggleClass('selected');
                        filter.data('job', f);
                        // binding mouse events
                        filter.mousedown(function(){
                            $(this).data('pressed', 'true');
                            setTimeout((function(f) { return function() {
                                if (f.data('pressed')) {
                                    filterCallback(f.data('job'));
                                    f.data('pressed', false);
                                }
                            }; })($(this)), 500);
                        }).on('mouseup', function(e){
                            if ($(this).data('pressed')) {
                                if(e.target == $(this).find('.canvasNodeFilterLeft')[0])
                                    paginateCallback($(this).data('job'), 'Left');
                                else
                                    paginateCallback($(this).data('job'), 'Right');
                            }
                            $(this).data('pressed', false);
                        }).on('mouseleave', function(){ $(this).data('pressed', false); });
                        // adding
                        $('#graph').after(filter.hide().fadeIn(300));
                    }
                    // calculating position
                    var p = toScreenPosition(current.position);
                    var radius = getSpriteRadius(current.position, current.scale.x);
                    var r = filter.outerWidth() / 2;
                    radius += r * 1.2;
                    var x = p.x + radius * Math.cos(slice * i) - r;
                    var y = p.y + radius * Math.sin(slice * i) - r;
                    filter.css({ top: y, left: x });
                    if (filter.hasClass('selected'))
                        filter.find('.canvasNodeFilterLeft').css("color", scope.jobsOffset[f] == 0 ?
                            jQuery.Color(colors[scope.jobsRelationships[f]]).darkenColor(20) : '#55555');
                }
            }
        }

        jQuery.Color.fn.darkenColor = function(amount) {
            var r = Math.max(this._rgba[0] - amount, 0),
                g = Math.max(this._rgba[1] - amount, 0),
                b = Math.max(this._rgba[2] - amount, 0);
            return 'rgb('+ r +','+ g +','+ b +')';
        };


        /* -------------- */
        /* INPUT HANDLING */
        /* -------------- */

        function setMousePosition(event) {
            event = event || window.event;
            var target = event.target || event.srcElement, rect = target.getBoundingClientRect(),
                offsetX = event.clientX - rect.left, offsetY = event.clientY - rect.top;
            mouse.x = (offsetX / viewWidth) * 2 - 1;
            mouse.y = -(offsetY / viewHeight) * 2 + 1;
            mouse.clientX = offsetX;
            mouse.clientY = offsetY;
        }

        function linedraw(x1,y1,x2,y2) {
            if (x2 < x1){
                var temp = x1;
                x1 = x2;
                x2 = temp;
                temp = y1;
                y1 = y2;
                y2 = temp;
            }
            var line;
            if ($('#line').length <= 0)
            {
                line = document.createElement("div");
                line.style.borderBottom = "8px solid";
                line.style.borderColor = "red";
                line.style.position = "absolute";
                line.style.zIndex = "99999";
                line.id = 'line';
                $("#graph").before(line);
                $('#line').mouseup(function () {
                    $('#graph').trigger('mouseup');
                });
            }
            else
                line = $('#line')[0];
            var length = Math.sqrt((x1-x2)*(x1-x2) + (y1-y2)*(y1-y2));
            line.style.width = length + "px";
            if(navigator.userAgent.indexOf("MSIE") > -1){
                line.style.top = (y2 > y1) ? y1 + "px" : y2 + "px";
                line.style.left = x1 + "px";
                var nCos = (x2-x1)/length;
                var nSin = (y2-y1)/length;
                line.style.filter = "progid:DXImageTransform.Microsoft.Matrix(sizingMethod='auto expand', M11=" + nCos + ", M12=" + -1*nSin + ", M21=" + nSin + ", M22=" + nCos + ")";
            } else {
                var angle = Math.atan((y2-y1)/(x2-x1));
                line.style.top = y1 + 0.5*length*Math.sin(angle) + "px";
                line.style.left = x1 - 0.5*length*(1 - Math.cos(angle)) + "px";
                line.style.transform = line.style.MozTransform = line.style.WebkitTransform = line.style.msTransform = line.style.OTransform= "rotate(" + angle + "rad)";
            }
        }

        function onMouseMove(event) {
            setMousePosition(event);
            if (!mouseIsDown)
                updateIntersection();
            else if (scope.cinegraphId != undefined && mouseClickStart.onNode)
            {
                var intersected = getIntersection();
                if (intersected.length > 0)
                {
                    var id = intersected[0].object._id;
                    if ($.inArray(id, mouseClickStart.cinegraphPath) == -1)
                        mouseClickStart.cinegraphPath.push(id);
                }
                linedraw(mouseClickStart.clientX, mouseClickStart.clientY, mouse.clientX, mouse.clientY);
            }
        }

        function onMouseDown(event) {
            setMousePosition(event);
            mouseClickStart.x = mouse.x;
            mouseClickStart.y = mouse.y;
            mouseClickStart.clientX = mouse.clientX;
            mouseClickStart.clientY = mouse.clientY;
            mouseClickStart.onNode = false;
            mouseClickStart.cinegraphPath = [];
            if (scope.cinegraphId != undefined) { // cinegraph mode
                if (event.which == 1) { // left click
                    var intersected = getIntersection();
                    if (intersected.length > 0) {
                        mouseClickStart.onNode = true;
                        cameraControls.enabled = false;
                    }
                    mouseIsDown = true;
                } else if (event.which == 3) // right click
                    onRightClick(event);
            } else // explore mode
                mouseIsDown = true;
        }

        function onMouseUp(event) {
            setMousePosition(event);
            mouseIsDown = false;
            cameraControls.enabled = true;
            // cinegraph path handling
            $('#line').remove();
            if (mouseClickStart.onNode && mouseClickStart.cinegraphPath.length > 1)
                findCinegraphPath();
            mouseClickStart.onNode = false;
            if (mouse.x != mouseClickStart.x || mouse.y != mouseClickStart.y)
                return;
            // no intersection
            var intersection = getIntersection()[0];
            if (intersection == undefined){
                removeSuggestions();
                return;
            }
            // intersection with a node
            var id = intersection.object._id;
            if (id != null) {
                if (scope.cinegraphId != undefined) {
                    var alreadySuggestedNodes = false;
                    $.each(scope.suggestedNodes, function (i, obj) {
                        if (id == obj.start || id == obj.end) {
                            alreadySuggestedNodes = true;
                            return false;
                        }
                    });
                    if (alreadySuggestedNodes)
                        return;
                    else
                        removeSuggestions();
                }
                scope.clearOffsets(); // clearing pagination offsets
                cameraLookAtNode(id); // animating camera
                // updating current node
                scope.currentNode.sprite = intersection.object;
                nodePosition = intersection.object.position;
                if (scope.cinegraphId != undefined)
                    getNodeCinegraphMode(id, nodePosition, draw, true);
                else
                    getNode(id, nodePosition, draw);
            }
        }

        function onRightClick(event) {
            setMousePosition(event);
            var intersection = getIntersection()[0];
            if (intersection == undefined)
                return;
            var id = intersection.object._id;
            if (id != null && id != scope.currentNode.id) {
                var relationship = null;
                $.each(scope.suggestedNodes, function(i, obj) {
                    if (id == obj.start || id == obj.end) {
                        relationship = obj;
                        return false;
                    }
                });
                if (relationship != null) {
                    var nodeToRemoveIndex = null;
                    var cinegraphNodes = scope.currentCinegraph.nodes;
                    $.each(cinegraphNodes, function(i, obj) {
                        if (obj.id == null && (relationship.start == obj.start || relationship.end == obj.end)) {
                            nodeToRemoveIndex = i;
                            return false;
                        }
                    });
                    if (nodeToRemoveIndex != null)
                        cinegraphNodes.splice(nodeToRemoveIndex, 1);
                    cinegraphNodes.push(relationship);
                    // saving updated cinegraph
                    $http.put('/api/mycinegraph/' + scope.currentCinegraph.id, {
                        titleCinegraph: scope.currentCinegraph.title,
                        cinegraphNodes: JSON.stringify(cinegraphNodes)
                    }).success(function(res) {
                        for (var i = scope.suggestedNodes.length - 1; i >= 0; i--) {
                            var point = scope.suggestedNodes[i].start;
                            if (scope.currentNode.type == 'Person')
                                point = scope.suggestedNodes[i].end;
                            if (scope.suggestedNodes[i].id != relationship.id)
                                removeOneFromScene(scope.suggestedNodes, point, scope.currentNode.id);
                            else {
                                // setting line opacity to 1
                                for (var k = linesScene.children.length - 1; k >= 0; k--)
                                    if(linesScene.children[k].startNodeId == point || linesScene.children[k].endNodeId == point)
                                        linesScene.children[k].material.opacity = 1;
                                // removing suggestion style
                                unsetNodeAsSuggestion(id);
                            }
                        };
                        scope.suggestedNodes = [];
                        $http.get('/api/mycinegraph/' + scope.cinegraphId).success(function (cinegraph) {
                            cinegraph.nodes = JSON.parse(cinegraph.nodes);
                            scope.currentCinegraph = cinegraph;
                        });
                        $location.path('/cinegraph/' + scope.currentCinegraph.id);
                    });
                }
            }
        }

        function removeSuggestions() {
            if (scope.suggestedNodes.length > 0) {
                for (var i = scope.suggestedNodes.length - 1; i >= 0; i--) {
                    var point = scope.suggestedNodes[i].start;
                    if (scope.currentNode.type == 'Person')
                        point = scope.suggestedNodes[i].end;
                    removeOneFromScene(scope.suggestedNodes, point, scope.currentNode.id);
                }
            }
        }

        function getIntersection() {
            raycaster.setFromCamera(mouse, camera);
            return raycaster.intersectObjects(scene.children);
        }

        function updateIntersection() {
            // getting intersected object
            var intersects = getIntersection();
            if (intersects.length > 0 && intersects[0].object != current){
                var intersected = intersects[0].object;
                if (intersected._id !== undefined) {
                    // restoring node state when leaving it
                    if (current && (current._id != intersected._id)) {
                        updateTexture(current.mainJob, current.nodeImage, current.canvas, current.name, nodeOpacity);
                        current.texture.needsUpdate = true;
                        old = current;
                    }
                    // updating intersected node and animating opacity
                    current = intersected;
                    updateHoverLabel(current.name);
                    current.animationOpacity = nodeOpacity;
                    var tween = new TWEEN.Tween(current).to({animationOpacity : 1}, 200)
                    .easing(TWEEN.Easing.Linear.None)
                    .onUpdate(function (){
                        updateTexture(current.mainJob, current.nodeImage, current.canvas, current.name, current.animationOpacity);
                        current.texture.needsUpdate = true;
                    }).start();
                }
            }
        }

        /* ----------------------- */
        /*        SUGGESTIONS      */
        /* ----------------------- */


        function setNodeAsSuggestion(id) {
            var n = findNode(id);
            if (n != undefined){
                var material = new THREE.MeshBasicMaterial({
                    color: new THREE.Color(n.mainJob != undefined ? colors[n.mainJob] : orangeColor),
                    transparent: true,
                    opacity: 0.5,
                    depthWrite: false
                });
                var c = new THREE.Mesh(new THREE.CircleGeometry(0.65, 32), material);
                c.scale.set(0.9,0.9,0.9);
                c.tween = new TWEEN.Tween(c.scale).to({x: 1, y:1, z:1}, 1300)
                    .easing(TWEEN.Easing.Quartic.InOut).onComplete(function (){
                }).yoyo(true).repeat(Infinity);
                c.tween.start();
                n.IsSuggested = true;
                n.add(c);
            }
        }

        function unsetNodeAsSuggestion(id) {
            var n = findNode(id);
            if (n != undefined){
                var c = n.children[0];
                c.tween.stop();
                new TWEEN.Tween(c.scale).to({x: 0, y:0, z:0}, 500)
                    .easing(TWEEN.Easing.Linear.None).onComplete(function (){
                        c.geometry.dispose();
                        c.material.dispose();
                        n.remove(c);
                    }).start();
                n.IsSuggested = false;
            }
        }

        /* ----------------------- */
        /* CINEGRAPH PATH HANDLING */
        /* ----------------------- */

        function findNode(id)
        {
            for (var i = 0; i < scene.children.length; i++)
                if (scene.children[i]._id == id)
                    return scene.children[i];
            return undefined;
        }

        function findRelationship(start, end)
        {
            for (var i = 0; i < linesScene.children.length; i++) {
                var line = linesScene.children[i];
                if (line.type == "Line")
                    if (start == line.startNodeId && end == line.endNodeId
                        || end == line.startNodeId && start == line.endNodeId)
                        return line;
            }
            return undefined;
        }

        function removeRelationship(start, end)
        {
            var r = findRelationship(start, end);
            if (r != undefined) {
                r.geometry.dispose();
                r.material.dispose();
                linesScene.remove(r);
            }
        }

        function removeNode(id)
        {
            var n = findNode(id);
            if (n != undefined) {
                new TWEEN.Tween(n.scale).to({x: 0, y:0, z:0}, 500)
                    .easing(TWEEN.Easing.Linear.None).onComplete(function (){
                        n.geometry.dispose();
                        n.material.dispose();
                        n.texture.dispose();
                        scene.remove(n);
                    }).start();
            }
        }

        function removePath(array) {
            for (var i = 0; i < array.length; i++){
                var r1 = array[i];
                var removeLine = true, removeStartNode = true, removeEndNode = true;
                for (var j = 0; j < scope.currentCinegraph.nodes.length; j++) {
                    var r2 = scope.currentCinegraph.nodes[j];
                    if (r1.start == r2.start && r1.end == r2.end)
                        removeLine = false;
                    if (r1.start == r2.start || r1.start == r2.end)
                        removeStartNode = false;
                    if (r1.end == r2.start || r1.end == r2.end)
                        removeEndNode = false;
                }
                if (removeLine)
                    removeRelationship(r1.start, r1.end);
                if (removeStartNode)
                    removeNode(r1.start);
                if (removeEndNode)
                    removeNode(r1.end);
            }
        }

        function mergePathWithCinegraph(array) {
            // merging relationships
            for (var i = 0; i < array.length; i++) {
                var r1 = array[i];
                var add = true;
                for (var j = 0; j < scope.currentCinegraph.nodes.length; j++) {
                    var r2 = scope.currentCinegraph.nodes[j];
                    if (r1.start == r2.start && r1.end == r2.end) {
                        add = false;
                        break;
                    }
                }
                if (add)
                    scope.currentCinegraph.nodes.push(r1);
            }
            // removing single node relationships when duplicate is found
            for (var i = scope.currentCinegraph.nodes.length - 1; i >= 0; i--){
                var r1 = scope.currentCinegraph.nodes[i];
                if (r1.start == null || r1.end == null) {
                    var rId = r1.start != null ? r1.start : r1.end;
                    // searching if node is already present in another relationship
                    for (var j = 0; j < scope.currentCinegraph.nodes.length; j++) {
                        if (j == i)
                            continue;
                        var r2 = scope.currentCinegraph.nodes[j];
                        if (r2.start == rId || r2.end == rId) {
                            scope.currentCinegraph.nodes.splice(i, 1);
                            break;
                        }
                    }
                }
            }
        }

        function findCinegraphPath()
        {
            // displaying commands panel
            var pathPanel = $('<div id="canvasPathPanel"><h3 class="inline">Searching for paths...</h3></div>');
            $('#graph').after(pathPanel.hide().slideDown(500));
            // getting paths
            var startNode = findNode(mouseClickStart.cinegraphPath[0]);
            var endNode = findNode(mouseClickStart.cinegraphPath[mouseClickStart.cinegraphPath.length - 1]);
            $http.get('/api/mycinegraph/path/' + startNode._id + "/" + endNode._id).success(function(paths) {
                for (var i = 0; i < paths.length; i++) {
                    var path = paths[i];
                    for (var j = 0; j < path.length; j++)
                        path[j] = JSON.parse(path[j]);
                }
                pathPanel.paths = paths;
                pathPanel.current = 0;
                // displaying first path
                pathPanel.find('h3').text('Path 1 of ' + paths.length + ":");
                displayCinegraphNodes(pathPanel.paths[pathPanel.current], true);
                // updating and binding command panel
                pathPanel.append('<a href="#" class="btn btn-s-md btn-success canvasPathPanelAdd m-l m-t v-top">Add</a>\
                    <a href="#" class="btn btn-s-md btn-default canvasPathPanelPrevious m-t v-top">Previous</a>\
                    <a href="#" class="btn btn-s-md btn-default canvasPathPanelNext m-t v-top">Next</a>\
                    <a href="#" class="btn btn-s-md btn-default canvasPathPanelCancel m-t v-top">Cancel</a>');
                // cancel
                $('.canvasPathPanelCancel').click(function() {
                    $('#canvasPathPanel').slideUp().remove();
                    removePath(pathPanel.paths[pathPanel.current]);
                });
                // next
                $('.canvasPathPanelNext').click(function() {
                    var length = pathPanel.paths.length;
                    if (pathPanel.current < length - 1) {
                        removePath(pathPanel.paths[pathPanel.current]);
                        pathPanel.current++;
                        pathPanel.find('h3').text('Path ' + (pathPanel.current + 1) +' of ' + paths.length + ":");
                        displayCinegraphNodes(pathPanel.paths[pathPanel.current], true);
                    }
                });
                // previous
                $('.canvasPathPanelPrevious').click(function() {
                    var length = pathPanel.paths.length;
                    if (pathPanel.current > 0) {
                        removePath(pathPanel.paths[pathPanel.current]);
                        pathPanel.current--;
                        pathPanel.find('h3').text('Path ' + (pathPanel.current + 1) +' of ' + paths.length + ":");
                        displayCinegraphNodes(pathPanel.paths[pathPanel.current], true);
                    }
                });
                // add
                $('.canvasPathPanelAdd').click(function() {
                    mergePathWithCinegraph(pathPanel.paths[pathPanel.current]);
                    $http.put('/api/mycinegraph/' + scope.currentCinegraph.id, {
                        titleCinegraph: scope.currentCinegraph.title,
                        cinegraphNodes: JSON.stringify(scope.currentCinegraph.nodes)
                    });
                    $('#canvasPathPanel').slideUp(500).remove();
                });
            });
        }


        /* ------------------- */
        /* BACKGROUND HANDLING */
        /* ------------------- */


        function cloneCanvas(canvas) {
            var newCanvas = document.createElement('canvas');
            newCanvas.width = canvas.width;
            newCanvas.height = canvas.height;
            newCanvasContext = newCanvas.getContext('2d');
            newCanvasContext.drawImage(canvas, 0, 0, newCanvas.width, newCanvas.height);
            return newCanvas;
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
                    // fallback if no backdrop
                    this.src = 'images/movies/' + sanitizeFileName(node.title + node.released) + '/poster.jpg';
                    backgroundImage.onerror = function () { this.src = 'images/default.jpg'; };
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
                nw = Math.round(iw * r),   // new prop. width
                nh = Math.round(ih * r),   // new prop. height
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

        /* ---------- */
        /*   CAMERA   */
        /* ---------- */

        function cameraLookAtPosition(pos){
            var p = new THREE.Vector3().copy(camera.position).sub(pos).setLength(55).add(pos);
            new TWEEN.Tween(camera.position).to({x: p.x, y: p.y, z: p.z}, 1000)
                .easing(TWEEN.Easing.Exponential.Out).start();
            new TWEEN.Tween(cameraControls.target).to({x: pos.x, y: pos.y, z: pos.z}, 1000)
                .easing(TWEEN.Easing.Exponential.Out).start();
        }

        function cameraLookAtNode(id){
            var n = findNode(id);
            if (n != undefined)
                cameraLookAtPosition(n.position);
        }


        /* ---------- */
        /* MAIN LOOPS */
        /* ---------- */

        var performanceTotal = 0;
        var performanceSampleCount = 0;

        function animate() {
            idAnimationFrame = requestAnimationFrame(animate);
            stats.begin();
            rendererStats.update(renderer);
            var startTime = new Date().getTime();
            TWEEN.update();
            cameraControls.update();
            var oldTweenCount = tweenCount;
            tweenCount = TWEEN.getAll().length;
            if (renderNeedsUpdate || tweenCount > 0 || oldTweenCount > 0 && tweenCount == 0){
                for (var i = 0; i < scene.children.length; i++)
                {
                    if (scene.children[i].type == 'Sprite')
                        scene.children[i].lookAt(camera.position);
                }
                render();
                renderNeedsUpdate = false;
                // getting average frame render time to dynamically adjust quality
                var endTime = new Date().getTime();
                if (performanceSampleCount < 120) { // 120-frame sample
                    performanceSampleCount++;
                    performanceTotal += (endTime - startTime);
                }
                else {
                    var avg = performanceTotal / 120;
                    //console.log("average is: ", avg);
                    if (avg > 33.33 && qualityScale > 0.5) { // < 30 fps
                        qualityScale = Math.max(0.5, qualityScale * 0.75);
                        onWindowResize();
                        //console.log('decreasing quality: ', qualityScale);
                    }
                    else if (avg < 20 && qualityScale < 1){ // > 50 fps
                        qualityScale = Math.min(1, qualityScale * 1.25);
                        onWindowResize();
                        //console.log('increasing quality: ', qualityScale);
                    }
                    performanceTotal = 0;
                    performanceSampleCount = 0;
                }
            }
            stats.end();
        }

        function render() {
            renderer.clear();
            composerBackground.render();
            composerLines.render();
            updateHoverLabelPosition();
            updateFilters();
            composer.render();
            updateGradientLayer();
            gradientComposer.render();
            blendComposer.render();
        }

        $('#graph').css('opacity', 0);
        defaultImg.onload = function () {
            init();
            animate();
            $('#graph').animate({"opacity":1}, 2000);
        }
    }
}
}]);
