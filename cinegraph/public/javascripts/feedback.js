cinegraphApp.controller('FeedbackCtrl', function($scope, $http, AuthService, $modalInstance) {

  $scope.feedbackText = "";

  $scope.sendFeedback = function() {
    $http.post( "/users/sendMail", {feedbackText: $scope.feedbackText})
      .success(function(res) {
        $modalInstance.dismiss("close");
    }).
      error(function() {
    });
  }

  $scope.close = function () {
		$modalInstance.dismiss("close");
	};

});
