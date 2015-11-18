cinegraphApp.controller('ActionsController', ['$scope', '$http', 'AuthService', '$location',
	function($scope, $http, AuthService, $location) {

    $scope.actions = [];

	//Auth Service
  $scope.$watch( AuthService.isLoggedIn, function ( isLoggedIn ) {
      $scope.isLoggedIn = isLoggedIn;
      $scope.currentUser = AuthService.currentUser();
  });

  $scope.logout = function(){
    AuthService.logout();
  }

  $scope.getAllActions = function() {
  	$http.get('/api/actions/' + AuthService.currentUser().username).then(function successCallback(actions) {
      console.log("actions: " + actions.data);
      for (var i = 0; i < actions.data.length; i++) {
        var action = actions.data[i];
        var message = "";
        if (action.type == "ratingLove") {
          $http.get("/api/common/" + action.idToRate).success(function(node) {
            if (node.type == "Person") {
              message = "rated " + action.rate + " hearts " + node.fullname;
              var actionToAdd = {
                username: action.username,
                message: message
              };
              $scope.actions.push(actionToAdd);
            }
            else {
              message = "rated " + action.rate + " hearts " + node.title;
              var actionToAdd = {
                username: action.username,
                message: message
              };
              $scope.actions.push(actionToAdd);
            }
          }).error(function (error) {
            console.log(error);
          });
        }
        else if (action.type == "ratingObj") {
          $http.get("/api/common/" + action.idToRate).success(function(node) {
            if (node.type == "Person") {
              message = "rated " + action.rate + " stars " + node.fullname;
              var actionToAdd = {
                username: action.username,
                message: message
              };
              $scope.actions.push(actionToAdd);
            }
            else {
              message = "rated " + action.rate + " stars " + node.title;
              var actionToAdd = {
                username: action.username,
                message: message
              };
              $scope.actions.push(actionToAdd);
            }
          }).error(function (error) {
            console.log(error);
          });
        }
        else { // friendship
          message = "became friend with " + action.friend_username;
          var actionToAdd = {
            username: action.username,
            message: message
          };
          $scope.actions.push(actionToAdd);
        }
      }
  	}, function errorCallback(error) {
    // called asynchronously if an error occurs
    // or server returns response with an error status.
	  });
  }

  if (AuthService.isLoggedIn()) {
    $scope.getAllActions();
  }

}]);