cinegraphApp.controller('FriendsController', function($scope, $http, $window, $location, AuthService, $routeParams, $modal) {

    $scope.loading = true;
    $scope.searchBool = false;
    $scope.currentFriends = [];
    $scope.$watch( AuthService.isLoggedIn, function ( isLoggedIn ) {
        $scope.isLoggedIn = isLoggedIn;
        $scope.currentUser = AuthService.currentUser();
    });

    $scope.alerts = [];
    $scope.usersToAdd = [];


    $http.get('/api/friends/' + AuthService.currentUser().id).success(function (data, status, headers, config) {
			$scope.currentFriends = data;
      $scope.loading = false;
      $scope.$apply;
		})

    $scope.logout = function(){
      AuthService.logout();
    }

    $scope.addFriend = function(friendUsername){
      $http.post('/api/friends/friend_request', { userName: $scope.currentUser.username, friendName: friendUsername }).success(function(res) {
          if(res == true)
            $scope.alerts.push({success: 'true', msg:'You sent a friend request to' + friendUsername + '!'});
          else
            $scope.alerts.push({error: 'true', msg:'You are already friend with ' + friendUsername + '!'});
      });
    }

    $scope.searchUser = function() {
      $scope.usersToAdd = [];
      $scope.searchBool = true;
      $scope.loading = true;
      var userToSearch = $scope.userToFind.username.replace(/[&\/\\#,+()$~%.'":*?<>{}]/g, '');
      $http.get('/api/friends/find/' + userToSearch).success(function (data, status, headers, config) {
        data.forEach(function(user, index)
        {
          $http.get('/api/friends/isFriend?userName=' + AuthService.currentUser().username + "&friendName="+ data[0].username).success(function (data, status, headers, config) {
            user["isFriend"] = (data == true);
            $scope.usersToAdd.push(user);
    		  })
    		  .error(function (data, status, headers, config) {
    		 	console.log('error');
    		  });
        })
        $scope.loading = false;
      })
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

});
