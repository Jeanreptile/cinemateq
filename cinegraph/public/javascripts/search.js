angular.module('cinegraphApp').controller('TypeaheadCtrl', function($scope, $http, $window) {

  var vague = $('#bg').Vague({
    intensity:      0,      // Blur Intensity
    forceSVGUrl:    true,   // Force absolute path to the SVG filter,
    // default animation options
    animationOptions: {
      duration: 50,
      easing: 'linear' // here you can use also custom jQuery easing functions
    }
  });
//vague.animate();

var blurDone = false;

$("#searchFormControl").on("click", function () {if (!blurDone) {vague.animate(20);}; blurDone = true});

    $scope.selectedItem = "movie";

    $scope.OnItemClick = function(event) {
        $scope.selectedItem = event;
    }

/*
    console.log($('#spanTest').val($(this).text()));
    $('#selectType li').on('click', function(){
        console.log("test");
        console.log($('#spanTest').val($(this).text()));
    });
*/




  $scope.getLocation = function(val) {
    console.log('Go Search !');
    return $http.get('https://localhost/api/search/' + $scope.selectedItem, {
      params: {
        query: val
      }
    }).then(function(response){
        return response.data.map(function(item){
          if ($scope.selectedItem == "movie" )
          {
            return {'name': item.title + ' ('+item.released + ')', 'thisId': item.id};
          }
          else
          {
            return {'name': item.name, 'personId': item.id};
          }
        });
    });
  };
});
