angular.module('cinegraphApp').controller('MyCinegraphCtrl', function($scope, $http, $window, $location, AuthService) {


  $scope.getCinegraph = function(cineId){
    console.log("allo ui le cine " + cineId);
    $http
        .get('/api/mycinegraph/' + cineId)
        .success(function (data, status, headers, config) {
          $scope.cineData = data.data;
        });
  }

  if(AuthService.isLoggedIn())
  {
  $http
      .get('/api/mycinegraph/all/' + AuthService.currentUser().id)
      .success(function (data, status, headers, config) {
        $scope.mycinegraphs = data;
      })
      .error(function (data, status, headers, config) {
        // Erase the token if the user fails to log in
        console.log('error');
        // Handle login errors here
        if (data.message)
        {
          //$scope.message = data.message;
        }
        else
        {
          //$scope.message = 'Error: Invalid user or password';
        }
      });
    }
});
