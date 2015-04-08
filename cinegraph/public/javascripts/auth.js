angular.module('cinegraphApp').controller('UserCtrl', function($scope, $http, $window) {
  $scope.message = '';
  $scope.message2 = '';

  $scope.submit = function () {
    $http
      .post('/login', $scope.user)
      .success(function (data, status, headers, config) {
        console.log("token is : ");
        console.log(data.token);
        $window.sessionStorage.token = data.token;
        $scope.message2 = "Signed and Token created";
      })
      .error(function (data, status, headers, config) {
        // Erase the token if the user fails to log in
        delete $window.sessionStorage.token;
        // Handle login errors here
        $scope.message = 'Error: Invalid user or password';
      });
  };

  $scope.removeJWT = function () {
    delete $window.sessionStorage.token;
    $scope.message2 = "Token was removed";
  };

  $scope.callRestricted = function () {
    $http({url: '/restricted', method: 'GET'})
    .success(function (data, status, headers, config) {
      console.log(data);
      $scope.message = ' ' +data.name; // Should log 'foo'
    })
    .error(function (data, status, headers, config) {
      $scope.message = "/!\\ You are not allowed here !";
    });
  };
});

angular.module('cinegraphApp').factory('authInterceptor', function ($rootScope, $q, $window) {
  return {
    request: function (config) {
      config.headers = config.headers || {};
      if ($window.sessionStorage.token) {
        config.headers.Authorization = 'Bearer ' + $window.sessionStorage.token;
      }
      return config;
    },
    responseError: function (rejection) {
      if (rejection.status === 401) {
        // handle the case where the user is not authenticated
      }
      return $q.reject(rejection);
    }
  };
});

angular.module('cinegraphApp').config(function ($httpProvider) {
  $httpProvider.interceptors.push('authInterceptor');
});
