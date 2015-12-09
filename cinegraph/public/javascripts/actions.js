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

  addAction = function(array, index, resultArray, callback) {
    var action = array[index];
    var message = "";
        if (action.type == "ratingLove") {
          var actionToAdd = {};
          $http.get("/api/common/" + action.idToRate).success(function(node) {
            if (node.type == "Person") {
              message = "rated " + action.rate + " hearts " + node.fullname;
            }
            else {
              message = "rated " + action.rate + " hearts " + node.title;
            }
            actionToAdd = {
              username: action.username,
              message: message,
              id: index
            };
            resultArray.push(actionToAdd);
            if (resultArray.length == array.length) {
              callback(resultArray);
            }
          }).error(function (error) {
            console.log(error);
          });
        }
        else if (action.type == "ratingObj") {
          var actionToAdd = {};
          $http.get("/api/common/" + action.idToRate).success(function(node) {
            if (node.type == "Person") {
              message = "rated " + action.rate + " stars " + node.fullname;
            }
            else {
              message = "rated " + action.rate + " stars " + node.title;
            }
            actionToAdd = {
              username: action.username,
              message: message,
              id: index
            };
            resultArray.push(actionToAdd);
            if (resultArray.length == array.length) {
              callback(resultArray);
            }
          }).error(function (error) {
            console.log(error);
          });
        }
        else { // friendship
          message = "became friend with " + action.friend_username;
          var actionToAdd = {
            username: action.username,
            message: message,
            id: index
          };
          resultArray.push(actionToAdd);
          if (resultArray.length == array.length) {
            callback(resultArray);
          }
        }
  };

  $scope.getAllActions = function() {
    $http.get('/api/actions/' + AuthService.currentUser().username).then(function successCallback(actions) {
      var actionsArray = [];
      for (var i = actions.data.length - 1; i >= 0; i--) {
        var action = actions.data[i];
        addAction(actions.data, i, actionsArray, sortAndPushActions);
      }
  	}, function errorCallback(error) {
      // TODO: Handle errors.
	  });
  }

  sortAndPushActions = function(resultArray) {
    resultArray.sort(function(a, b) {
      return b.id - a.id;
    });
    $scope.actions = resultArray;
  }

  if (AuthService.isLoggedIn()) {
    $scope.getAllActions();
  }

}]);