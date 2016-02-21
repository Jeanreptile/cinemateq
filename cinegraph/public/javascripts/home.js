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
        .when('/light', { templateUrl: 'partials/light', controller: 'cinegraphController', reloadOnSearch: false })
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
        if ($window.ga)
            $window.ga('send', 'pageview', { page: $location.path() });
        //redirect only if both isAuthenticated is false and no token is set
        if (nextRoute != null && nextRoute.access != null && nextRoute.access.requiredAuthentication
            && !AuthService.isLoggedIn() && !$window.sessionStorage.token) {
            $location.path("/unauthorized");
        }

        if ($rootScope.shouldReload) {
            $rootScope.shouldReload = false;
            $route.reload();
        }
    });

    $rootScope.$on("$routeUpdate", function() {
        if ($window.ga)
            $window.ga('send', 'pageview', { page: $location.path() });
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


cinegraphApp.service('fileUpload', ['$http', function ($http) {
    this.uploadFileToUrl = function(file, uploadUrl){
        var fd = new FormData();
        fd.append('image', file);
        $http.post(uploadUrl, fd, {
            transformRequest: angular.identity,
            headers: {'Content-Type': undefined}
        })
        .success(function(){
        })
        .error(function(ee){
          console.log("err is "  + JSON.stringify(ee));
        });
    }
}]);
var cinegraphController = cinegraphApp.controller('restrictedController',
    function($scope, $http, $window, $location, AuthService) {
    $(document).ready(function(){
        var randombgs=["multipass", "gandalf", "matrix"];
        number = Math.floor(Math.random() * randombgs.length);
        $('#unauthorizedpage').css({'background-image': 'url(/images/' + randombgs[number] + '.jpg)'});
    });
});

var cinegraphController = cinegraphApp.controller('cinegraphController',
    function($scope, $http, $window, $location, AuthService, $modal, socket, fileUpload) {


      /* Variables initialization */

      $scope.friendsTastes = [];
      $scope.currentNode = {};
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


	$scope.openSendFeedbackModal = function() {
		var sendFeedbackModal = $modal.open({
			animation: $scope.animationsEnabled,
			templateUrl: 'partials/feedback',
			controller: 'FeedbackCtrl',
			size: 'md',
			resolve: {
				currentNode: function() {
					return $scope.currentNode;
				}
			}
		});

		sendFeedbackModal.result.then(function(newCinegraph) {
      //console.log("ok" + newCinegraph);
      //$scope.mycinegraphs.push(newCinegraph);
		}, function () {
			console.log("Error");
		});
	};

    $scope.sendInvitationToRate = function(sentence) {
      var friendsTastesIndex = 0;
      for (var i = 0; i < $scope.friendsTastes.length; i++) {
        if ($scope.friendsTastes[i] == sentence) {
          $scope.friendsTastes[i].alerts = [];
          friendsTastesIndex = i;
        }
      };
      var friendName = sentence.friendName;
      var dataOfNode = $scope.currentNode.type == 'Person' ? $scope.currentNode.firstname + " " + $scope.currentNode.lastname : $scope.currentNode.title;
      $http.post( "/api/notif/inviteToRate", {userName: $scope.currentUser.username , friendName: friendName, idToRate: $scope.currentNode.id, dataOfNode: dataOfNode})
        .success(function(res) {
          if (res == true)
            $scope.friendsTastes[friendsTastesIndex].alerts.push({success: 'true', msg:'You sent ' + friendName + ' an invitation to rate ' + dataOfNode + '!'});
          else
            $scope.friendsTastes[friendsTastesIndex].alerts.push({error: 'true', msg:'An error occurred. Please try again.'});
          //console.log("Notif to rate sent to friend " + friendName);
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

    $scope.uploadFile = function(userName){
        var file = $scope.myFile;
        var uploadUrl = "/users/upload/" + userName;
        fileUpload.uploadFileToUrl(file, uploadUrl);
    };

    $scope.logout = function(){
      AuthService.logout();
    }

    $scope.updateTypesAndLimits = function() {
    $http.get("/api/user/rating/" + $scope.currentNode.id)
        .success(function(payload){
          $('#noteObj').rating('rate', 0);
          $('#noteLove').rating('rate', 0);
          if (payload.message != "no rate") {
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
        var nodes = $scope.cinegraphId != undefined ? $scope.suggestedNodes : $scope.currentDisplayedNodes;
        for (var i = 0; i < nodes.length; i++) {
            for (var job in $scope.selectedJobs) {
                if ($scope.jobsRelationships[job] == nodes[i].type) {
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

cinegraphApp.directive('fileModel', ['$parse', function ($parse) {
    return {
        restrict: 'A',
        link: function(scope, element, attrs) {
            var model = $parse(attrs.fileModel);
            var modelSetter = model.assign;

            element.bind('change', function(){
                scope.$apply(function(){
                    modelSetter(scope, element[0].files[0]);
                });
            });
        }
    };
}]);


cinegraphApp.directive("cinegraph", [ '$http', '$location', function($http, $location) {
	return {
		link: function link(scope, element, attrs) {
            var c = CINEGRAPH, id = parseInt(getParameterByName('id'));
            c.init(scope, $http, $location);
            c.addNode(id);
            setTimeout(function() {
                c.moveToNode(id);
            }, 1500);
        }
    }
}]);
