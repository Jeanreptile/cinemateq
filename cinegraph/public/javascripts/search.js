angular.module('cinegraphApp').controller('TypeaheadCtrl', function($scope, $http) {

  var vague = $('#bg').Vague({
    intensity:      20,      // Blur Intensity
    forceSVGUrl:    true,   // Force absolute path to the SVG filter,
    // default animation options
  });
//vague.blur();

//$('#bg').addClass("blur-filter");
$("#searchFormControl").on("click",$.proxy(vague.toggleblur,vague));

//$('#searchFormControl').prop('disabled', $.proxy(vague.toggleblur,vague));


    $scope.selectedItem = "movie";

    $scope.OnItemClick = function(event) {
        $scope.selectedItem = event;
    }

    console.log($('#spanTest').val($(this).text()));
    $('#selectType li').on('click', function(){
        console.log("test");
        console.log($('#spanTest').val($(this).text()));
    });

  $scope.getLocation = function(val) {
    console.log('Go Search !');
    return $http.get('https://localhost:3000/api/search/movie', {
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
