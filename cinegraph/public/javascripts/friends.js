cinegraphApp.controller('FriendsController', function($scope, $http, $window, $location, AuthService, $routeParams, $modal) {

    $scope.currentFriends = [];
    $scope.$watch( AuthService.isLoggedIn, function ( isLoggedIn ) {
        $scope.isLoggedIn = isLoggedIn;
        $scope.currentUser = AuthService.currentUser();
    });

    $http.get('/api/friends/' + AuthService.currentUser().id).success(function (data, status, headers, config) {
			$scope.currentFriends = data;
      $scope.$apply;
		})

    $scope.logout = function(){
      AuthService.logout();
    }

	if (AuthService.isLoggedIn()) {
		$http.get('/api/mycinegraph/all/' + AuthService.currentUser().id).success(function (data, status, headers, config) {
			$scope.mycinegraphs = data;
		})
		.error(function (data, status, headers, config) {
			// Erase the token if the user fails to log in
			console.log('error');
			// Handle login errors here
			if (data.message) {
			  //$scope.message = data.message;
			}
			else {
			  //$scope.message = 'Error: Invalid user or password';
			}
		});
	}

    $scope.getFriends = function() {
      console.log("salut la compagnie !" + $scope.currentUser.username );
    };
});
