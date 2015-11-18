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

  addAction = function(array, index) {
    var action = array[index];
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
              console.log("scope.actions2: " + JSON.stringify($scope.actions));
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
  };

  $scope.getAllActions = function() {
    $http.get('/api/actions/' + AuthService.currentUser().username).then(function successCallback(actions) {
      console.log("actions: " + JSON.stringify(actions.data));
      var actionsArray = [];
      for (var i = actions.data.length - 1; i >= 0; i--) {
        var action = actions.data[i];
        console.log("action: " + JSON.stringify(action));
        console.log("scope.actions: " + JSON.stringify($scope.actions));
        addAction(actions.data, i);
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