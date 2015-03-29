angular.module('cinegraphApp').controller('TypeaheadCtrl', function($scope, $http) {


  var vague = $('#bg').Vague({
    intensity:      20,      // Blur Intensity
    forceSVGUrl:    false,   // Force absolute path to the SVG filter,
    // default animation options
  });
//vague.blur();

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
        $scope.test23 = "merde";
    });

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
  };;
});
