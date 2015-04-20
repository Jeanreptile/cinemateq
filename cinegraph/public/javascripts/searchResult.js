angular.module('cinegraphApp').controller('searchResultController', function($scope, $http) {

  var vague = $('#bg').Vague({
    intensity:      30,      // Blur Intensity
    forceSVGUrl:    false,   // Force absolute path to the SVG filter,
    // default animation options
  });
  vague.blur();

  console.log("scope is : ");
  console.log($scope);
});
