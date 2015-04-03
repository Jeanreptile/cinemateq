angular.module('cinegraphApp').controller('searchResultController', function($scope, $http) {

  var vague = $('#bg').Vague({
    intensity:      30,      // Blur Intensity
    forceSVGUrl:    false,   // Force absolute path to the SVG filter,
    // default animation options
  });
  vague.blur();

  console.log("scope is : ");
  console.log($scope);
  $scope.getRelations = function(movieId) {
    console.log('Go Search !');
    return $http.get('https://localhost/api/search/movie', {
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
