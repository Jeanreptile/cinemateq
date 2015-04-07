angular.module('cinegraphApp').controller('UserCtrl', function($scope, $http, $window) {

  console.log("test");
  $scope.submit = function () {
    $http
      .post('/login', $scope.user)
      .success(function (data, status, headers, config) {
        console.log("data is : ");
        console.log(data.token);
        $window.sessionStorage.token = data.token;
      })
      .error(function (data, status, headers, config) {
        // Erase the token if the user fails to log in
        console.log("non?");
        delete $window.sessionStorage.token;

        // Handle login errors here
        $scope.message = 'Error: Invalid user or password';
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
