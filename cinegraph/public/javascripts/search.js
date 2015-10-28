angular.module('cinegraphApp').controller('TypeaheadCtrl', function($scope, $http, $window, $location, AuthService, $rootScope) {
  $scope.$watch( AuthService.isLoggedIn, function ( isLoggedIn ) {
    $scope.isLoggedIn = isLoggedIn;
    $scope.currentUser = AuthService.currentUser();
  });

  $scope.logout = function(){
    AuthService.logout();
  }

  if ($('#bg').length) {
    var vague = $('#bg').Vague({
      intensity:      0,      // Blur Intensity
      forceSVGUrl:    true,   // Force absolute path to the SVG filter,
      // default animation options
      animationOptions: {
        duration: 50,
        easing: 'linear' // here you can use also custom jQuery easing functions
      }
    });

    var blurDone = false;

    $("#searchFormControl").on("click", function () {
      if (!blurDone) {
        vague.animate(20);
      }
        blurDone = true;
    });
  }

  $scope.selectedItem = "movie";

  $scope.OnItemClick = function(event) {
    $scope.selectedItem = event;
  }

  $scope.getLocation = function(val) {
    console.log('Go Search !');
    return $http.get('/api/search/' + $scope.selectedItem, {
      params: {
        query: val
      }
    }).then(function(response){
      $scope.response = [];
      console.log("response front is: " + JSON.stringify(response));
      if (response.data.length == 0) {
        $scope.noResults = true;
        return [];
      }
      else {
        $scope.noResults = false;
        return response.data.map(function(item) {
          if ($scope.selectedItem == "movie" )
          {
            $scope.response.push({'name': item.title + ' ('+item.released + ')', 'thisId': item.id});
            return {'name': item.title + ' ('+item.released + ')', 'thisId': item.id};
          }
          else
          {
            $scope.response.push({'name': item.firstname + " " + item.lastname, 'thisId': item.id});
            return {'name': item.firstname + " " + item.lastname, 'thisId': item.id};
          }
        });
      }
    });
  };

  $scope.submitSearchQuery = function() {
    $rootScope.shouldReload = true;
    if (!$scope.noResults && !$scope.asyncSelected.thisId) {
      //console.log("asyncSelected thisId undefined: " + $scope.response[0].thisId);
      $http.get('/index', { params: $scope.response[0].thisId}).then(function() {
        $location.url('/index?id=' + $scope.response[0].thisId);
      });
    }
    else if (!$scope.noResults) {
      $http.get('/index', { params: $scope.asyncSelected.thisId}).then(function() {
        $location.url('/index?id=' + $scope.asyncSelected.thisId);
      });
    }
    else {
      // do not redirect.
    }
  }
});
