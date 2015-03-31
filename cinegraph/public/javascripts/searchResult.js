angular.module('cinegraphApp').controller('searchResultController', function($scope, $http) {

  var vague = $('#bg').Vague({
    intensity:      30,      // Blur Intensity
    forceSVGUrl:    false,   // Force absolute path to the SVG filter,
    // default animation options
  });
  vague.blur();

  console.log("scope is : ");
  console.log($scope);
  $scope.getLocation = function(val) {
    console.log('Go Search !');
    return $http.get('http://localhost:3000/api/search/movie', {
      params: {
        query: val
      }
    }).then(function(response){
        return response.data.map(function(item){
            return {'name': item.title + ' ('+item.released + ')', 'movieId': item.id};
        });
    });
  };

});
