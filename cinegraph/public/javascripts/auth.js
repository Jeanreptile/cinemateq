angular.module('cinegraphApp').controller('UserCtrl', function($scope, $http, $window, $location, AuthService, socket) {
  $scope.message = '';
  $scope.message2 = '';


  $scope.signin = function () {
    $http
      .post('/users/login', $scope.user)
      .success(function (data, status, headers, config) {
        $window.localStorage.token = data.token;
        $window.localStorage.user = JSON.stringify(data.user);
        AuthService.login();
        $scope.message2 = "Signed and Token created";
        $location.url('/');
      })
      .error(function (data, status, headers, config) {
        // Erase the token if the user fails to log in
        console.log('error');
        $scope.user = {};
        delete $window.localStorage.token;
        // Handle login errors here
        if (data.message)
        {
          $scope.message = data.message;
        }
        else
        {
          $scope.message = 'Error: Invalid user or password';
        }
      });

  };

  $scope.register = function () {
    $http
      .post('/users/register', $scope.user)
      .success(function (data, status, headers, config) {
        $window.localStorage.token = data.token;
        $window.localStorage.user = JSON.stringify(data.user);
        AuthService.login();
        $scope.message2 = "Signed in and Token created";
        $location.path('/');
        //$window.location.href = '/home';
      })
      .error(function (data, status, headers, config) {
        // Erase the token if the user fails to register
        console.log("osadasd : " + data.message);
        $scope.message = 'Error';
        $scope.user = {};
        delete $window.localStorage.token;
        // Handle login errors here
        if (data.message)
        {
          $scope.message = data.message;
        }
        else
        {
          $scope.message = 'Error: Invalid user or password';
        }
      });

  };

  $scope.removeJWT = function () {
    delete $window.localStorage.token;
    delete $window.localStorage.user;
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

angular.module('cinegraphApp').factory('AuthService', function($window, $location, socket, $route) {
  return {
    login: function() {
      currentUser = $window.localStorage.user;
    },
    logout: function() {
      user = JSON.parse($window.localStorage.user);
      socket.emit('unsubscribe', {channel:'notifs.' + user.username});
      delete $window.localStorage.user;
      delete $window.localStorage.token;
      $location.url('/');
    },
    isLoggedIn: function() {
      return ($window.localStorage.user != undefined);
    },
    currentUser: function() { if ($window.localStorage.user != undefined){
      return JSON.parse($window.localStorage.user);
      }
      else
      {
        return undefined;
      }
    }
  };
});

angular.module('cinegraphApp').factory('authInterceptor', function ($rootScope, $location, $q, $window) {
  return {
    request: function (config) {
      config.headers = config.headers || {};
      if ($window.localStorage.token) {
        config.headers.Authorization = 'Bearer ' + $window.localStorage.token;
      }
      else
      {
        //console.log("MAIIIIS");
        config.headers.Authorization = '';
      }
      return config;
    },
    requestError: function (rejection) {
      if (rejection.status === 401) {
        // handle the case where the user is not authenticated
        console.log("Not authenticated :/");
      }
      return $q.reject(rejection);
    },
    responseError: function (rejection) {
      if (rejection.status === 401) {
        // handle the case where the user is not authenticated
        console.log("Not authenticated :/");
        $location.url("/unauthorized");
      }
      return $q.reject(rejection);
    }
  };
});

angular.module('cinegraphApp').config(function ($httpProvider) {
  $httpProvider.interceptors.push('authInterceptor');
});
