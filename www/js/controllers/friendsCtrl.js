angular.module('starter.controllers')

.controller('FriendsCtrl', function($scope, $state, User, $ionicLoading, $ionicListDelegate, $ionicPopup, $q) {
  // friends is accessed from $rootScope.user
  $scope.friends = [];
  $scope.friendRequests = [];

  $scope.showList = {
    friend: true,
    pending: true,
    request: true,
  };

  $scope.toggleList = function(list) {
    $scope.showList[list] = !$scope.showList[list];
  };

  var loading = setTimeout(function(){
    $ionicLoading.show({
      template: '<p>Loading...</p><i class="icon ion-loading-c"></i>'
    });
  }, 500);

  var stopLoading = function() {
    clearTimeout(loading);
    $ionicLoading.hide();
  };

  if ($scope.user.friends.length === 0) {
    stopLoading();
  }

  for (var i=0; i<$scope.user.friends.length; i++) {
    var friend = $scope.user.friends[i];
    User.get({id: friend}, function(user){
      if (user._id) {
        $scope.friends.push(user);
        $scope.hasFriends = true;
      }
      stopLoading();
    });
  }

  if ($scope.user.friendRequests) {
    for (var i=0; i<$scope.user.friendRequests.length; i++) {
      var friendRequest = $scope.user.friendRequests[i];
      var getFriend = function(request) {
        User.get({id: friendRequest.id}, function(friend) {
          friend.requestStatus = request.status;
          $scope.friendRequests.push(friend);
        });
      };
      getFriend(friendRequest);
    }
  }

  var removeFriendRequest = function(user, friendId) {
    var index;
    for (var i=0; i<user.friendRequests.length; i++) {
      var friendRequest = user.friendRequests[i];
      if (friendRequest.id === friendId) {
        index = i;
      }
    }
    user.friendRequests.splice(index,1);
  };

  $scope.friendPrompt = function(index) {
    var friend = $scope.friendRequests[index];
    var title = 'Friend Request';
    var body = friend.username + ' wants to add you as their friend.';
    util.showPrompt($ionicPopup,title,body,'Accept','Reject',
      function(){
        $scope.acceptFriend(index);
      },
      function(){
        $scope.rejectFriend(index);
      }
    );
  };

  $scope.acceptFriend = function(index) {
    var friend = $scope.friendRequests[index];
    $scope.user.friends.push(friend._id);
    $scope.friends.push(friend);

    removeFriendRequest($scope.user, friend._id);
    $scope.friendRequests.splice(index,1);

    User.get({id: friend._id}, function(user) {
      removeFriendRequest(user, $scope.user._id);
      user.friends.push($scope.user._id);
      User.update(user);
    });
    User.update($scope.user);
  };

  $scope.rejectFriend = function(index) {
    var friend = $scope.friendRequests[index];

    removeFriendRequest($scope.user, friend._id);
    $scope.friendRequests.splice(index,1);

    User.get({id: friend._id}, function(friend) {
      removeFriendRequest(friend, $scope.user._id);
      User.update(friend);
    });
    User.update($scope.user);
  };

  $scope.hasFriends = false;
  $scope.navTo = function(location) {
    $state.go('app.' + location);
  };

  $scope.requestBattle = function(friendId) {
    var title;
    var body;
    if ($scope.user.attributes.HP === 0) {
      title = 'Unfit for Battle';
      body = 'You don\'t look so good. You need to recover some of your health before you can battle again.';
    } else {
      var battleExists = false;

      for (var i=0; i<$scope.user.missionsVersus.length; i++) {
        var mission = $scope.user.missionsVersus[i];
        if (mission.enemy === friendId) {
          battleExists = true;
        }
      }

      if (!battleExists) {
        // update $scope.battle to reflect status of pending with friend
        $scope.user.missionsVersus.push({type:'battle',enemy:friendId,status:'pending'});
        // post to database to update friends battle status
        User.update($scope.user);

        for (var i=0; i<$scope.friends.length; i++) {
          var friend = $scope.friends[i];
          if (friend['_id'] === friendId) {
            friend.missionsVersus.push({type:'battle',enemy:$scope.user['_id'],status:'request'});
            User.update(friend);
          }
        }
        title = 'Request Sent';
        body = 'Your battle request has been sent. You can still equip new weapons or train more until the battle request is accepted.';
      } else {
        title = 'Battle Pending';
        body = 'You are already have a request to do battle with this friend.';
      }
    }
    util.showAlert($ionicPopup, title, body, 'OK', function() {
      $ionicListDelegate.closeOptionButtons();
    });
  };
})

.controller('AddFriendsCtrl', function($scope, User, $ionicPopup,  $ionicLoading) {
  // friends is accessed from $rootScope.user.friends in the template
  $scope.friends = [];

  var loading = setTimeout(function(){
    $ionicLoading.show({
      template: '<p>Loading...</p><i class="icon ion-loading-c"></i>'
    });
  }, 500);

  var stopLoading = function() {
    clearTimeout(loading);
    $ionicLoading.hide();
  };

  User.query(function(users){
    for (var i=0; i<users.length; i++) {
      if ($scope.user['_id'] !== users[i]['_id']) {
        $scope.friends.push(users[i]);
      }
    }
    stopLoading();
  });

  $scope.addFriendPrompt = function(friend) {
    var title = 'Add Friend';
    var body = 'Do you want to add ' + friend.username + ' to your friends list?';

    util.showPrompt($ionicPopup, title, body, 'Add', 'Cancel', function() {
      $scope.addFriend(friend._id);
    });
  };

  $scope.addFriend = function(id) {
    var title, body;

    var friendExists = false;
    for (var i=0; i<$scope.user.friends.length; i++) {
      var friend = $scope.user.friends[i];
      if (friend === id) {
        friendExists = true;
      }
    }

    var requestExists = false;
    if ($scope.user.friendRequests) {
      for (var i=0; i<$scope.user.friendRequests.length; i++) {
        var request = $scope.user.friendRequests[i];
        if (request.id === id) {
          requestExists = true;
        }
      }
    }

    if (!friendExists && !requestExists) {
      // $scope.user.friends.push(id);
      $scope.user.friendRequests = $scope.user.friendRequests || [];
      $scope.user.friendRequests.push({status: 'pending', id: id});
      User.update($scope.user);
      User.get({id:id}, function(friend){
        friend.friendRequests = friend.friendRequests || [];
        friend.friendRequests.push({status: 'request', id: $scope.user._id});
        User.update(friend);
      });
      title = 'Friend Request Sent';
      body = 'Your friend request has been sent.';
    } else {
      if (friendExists) {
        title = 'Already Friends'
        body = 'You are already friends.'
      } else if (requestExists) {
        title = 'Request Sent'
        body = 'Your request to be friends has already been sent.'
      }
    }
    util.showAlert($ionicPopup,title,body,'OK',function(){});
  }
})