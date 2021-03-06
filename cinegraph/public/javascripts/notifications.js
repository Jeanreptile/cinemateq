angular.module('cinegraphApp').controller('notificationsController', function($scope, $http, $compile, socket, AuthService, $location) {

  //Auth Service
  $scope.$watch( AuthService.isLoggedIn, function ( isLoggedIn ) {
      $scope.isLoggedIn = isLoggedIn;
      $scope.currentUser = AuthService.currentUser();
  });

  $scope.logout = function(){
    AuthService.logout();
  }

  if (AuthService.isLoggedIn()) {
    //TODO hide notif if not logged in
  }


  // Notifications management
  //Add one notif
  $scope.addNotif = function($msg){
		var $el = $('.nav-user'), $n = $('.count:first', $el), $v = parseInt($n.text());
		$('.count', $el).fadeOut().fadeIn().text($v+1);
		$($msg).hide().prependTo($el.find('.list-group')).slideDown().css('display','block');
	}

  // Add all notif on startup
  $scope.addAllNotifs = function(allNotifs){
		var $el = $('.nav-user'), $n = $('.count:first', $el)
		$('.count', $el).text(allNotifs.length);
    allNotifs.forEach(function(notif)
    {
      $(notif).hide().prependTo($el.find('.list-group')).slideDown().css('display','block');
    })
	}

  $scope.getNotif = function(notif)
  {
    if (notif.type === "friend_request")
    {
      var msg = $compile(angular.element('<span id="notif' + AuthService.currentUser().username + ":" + notif.id +'"  class="list-group-item">'+
            '<span class="pull-left thumb-sm text-center">'+
              '<i class="fa fa-user fa-2x text-success"></i>'+
            '</span>'+
            '<span class="media-body block m-b-none">'+
              notif.friend_name + ' wants to be friend with you !<br>'+
              '<a href="#" ng-click="removeNotif(\'notif' + AuthService.currentUser().username + ":" + notif.id + '\')" class="pull-right btn btn-sm btn-rounded btn-danger"><i class="i i-cross2">Nope.</i></a>' +
              '<a href="#" ng-click="addFriend(\'notif' + AuthService.currentUser().username + ":" + notif.id + '\', \'' + notif.friend_name + '\')" class="pull-right btn btn-sm btn-rounded btn-success"><i class="i i-checkmark2">Sure!</i></a>' +
            '</span>'+
          '</span>'))($scope);
      return msg;
    }
    else if (notif.type === "invite_to_rate")
    {
      var msg = $compile(angular.element('<span id="notif' + AuthService.currentUser().username + ":" + notif.id +'"  class="list-group-item">'+
            '<span class="pull-left thumb-sm text-center">'+
              '<i class="fa fa-star-half-o fa-2x text-success"></i>'+
            '</span>'+
            '<span class="media-body block m-b-none">'+
              'Your buddy ' + notif.friend_name + ' wants you to rate ' + notif.dataOfNode +'!<br>'+
              '<a href="#" ng-click="removeNotif(\'notif' + AuthService.currentUser().username + ":" + notif.id + '\')" class="pull-right btn btn-sm btn-rounded btn-danger"><i class="i i-cross2">Nope.</i></a>' +
              '<a href="#" ng-click="goToNode(\'notif' + AuthService.currentUser().username + ":" + notif.id + '\', \'' + notif.idToRate + '\')" class="pull-right btn btn-sm btn-rounded btn-success"><i class="i i-checkmark2">Sure!</i></a>' +
            '</span>'+
          '</span>'))($scope);
      return msg;
    }
    else
    {
      return $compile(angular.element('<a>Problem with the notification.</a>'))($scope);
    }
  }


  if (AuthService.isLoggedIn()) {
    //new message arrival -- you are going to append into some HTML div
  socket.emit('subscribe', {channel:'notifs.' + AuthService.currentUser().username});
  
  socket.on('message', function (data) {
    notif = JSON.parse(data);
    $scope.addNotif($scope.getNotif(notif));
  });

  $http.get("/api/notif/" + AuthService.currentUser().username)
      .success(function(payload){
        allNotifs= [];
        if (payload && payload.length){
          payload.forEach(function(notif)
          {
            allNotifs.push($scope.getNotif(notif));
            if (allNotifs.length === payload.length)
              $scope.addAllNotifs(allNotifs);
          });
        }
      }).
      error(function(){
  })
}

	var msg = $compile(angular.element('<a id="toto124" ng-click="removeNotif(\'toto124\')" class="media list-group-item">'+
                  '<span class="pull-left thumb-sm text-center">'+
                    '<i class="fa fa-envelope-o fa-2x text-success"></i>'+
                  '</span>'+
                  '<span class="media-body block m-b-none">'+
                    'Sophi sent you a email<br>'+
                    '<small class="text-muted">1 minutes ago</small>'+
                  '</span>'+
                '</a>'))($scope);
    //setTimeout(function(){$scope.addNotif(msg);}, 1500);

    $scope.goToNode = function(data, idToRate){
      $location.path('/index').search({id: idToRate, type: 'on'});
      $scope.removeNotif(data);
    }

    $scope.addFriend = function(data, friendName){
      $http.post('/api/friends/add', { user: AuthService.currentUser().username, friend: friendName}).success(function(res) {
        $http.post("/api/actions/", { actionType: 'friendship', username: $scope.currentUser.username,
            friendUsername: friendName }).success(function() {
              console.log("success! action added!");
              $http.post("/api/actions/", { actionType: 'friendship', username: friendName,
                friendUsername: $scope.currentUser.username }).success(function() {
                  console.log("success! action added!");

              }).error(function() {

              });
        }).error(function() {

        });
      });
      $scope.removeNotif(data);
    }

    $scope.removeNotif = function(msg) {
      var idNotif = msg.substr(msg.indexOf(':') + 1);
      $http.delete('/api/notif?idNotif=' + idNotif + '&userName=' + AuthService.currentUser().username).success(function(res) {
        console.log("notification deleted !")
      });
      var $el = $('.nav-user'), $n = $('.count:first', $el), $v = parseInt($n.text());
		  $('.count', $el).fadeOut().fadeIn().text($v-1);
      var elNotif = document.getElementById(msg);
      elNotif.remove();
    }

});

angular.module('cinegraphApp').directive('removeOnClick', function() {
    return {
        link: function(scope, elt, attrs) {
            scope.remove = function() {
                elt.html('');
            };
        }
    }
});
