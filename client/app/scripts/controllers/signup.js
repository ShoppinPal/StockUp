'use strict';

angular.module('ShoppinPalApp')
  .controller('SignupCtrl', [
    '$scope', '$sessionStorage', '$state', /* angular's modules/services/factories etc. */
    '$spAlerts', /* shoppinpal's custom modules/services/factories etc. */
    'UserModel', /* loopback models */
    function ($scope, $sessionStorage, $state,
              $spAlerts,
              UserModel)
    {
      $scope.headerImg = 'ShoppinPal Logo hi-res rgb.jpg';
      $scope.signup = {};

      //code for signup form
      $scope.signupSubmit = function(){
        // Reference: http://docs.strongloop.com/display/public/LB/Logging+in+users
        UserModel.create({
          realm: 'portal', // TODO: based on the realm, the role should be auto-assigned by loopback
          firstName: $scope.signup.firstname,
          lastName: $scope.signup.lastname,
          username: $scope.signup.username,
          email: $scope.signup.username,
          password: $scope.signup.password
        })
          .$promise.then(function(user){
            console.log('user', user);
            UserModel.login({
              realm: 'portal',
              username: $scope.signup.username,
              password: $scope.signup.password
            })
              .$promise.then(function(accessToken){
                console.log('accessToken', accessToken);
                $sessionStorage.currentUser = accessToken;
                $state.go('onboarding');
                // TODO: implement promoteToRetailer in loopback?
                /*return Users.promoteToRetailer({'userId':user.objectId})
                 .$promise.then(function(role){
                 console.log('applied role: ' + role.name);
                 $state.go('onboarding');
                 },
                 function(error){
                 console.log('Error:'+ error);
                 if (error && error.data && error.data.error) {
                 $spAlerts.addAlert(error.data.error, 'danger');
                 }
                 });*/
              });
          },
          function(error){
            console.log('Error:'+ error);
            if (error && error.data && error.data.error) {
              $spAlerts.addAlert(error.data.error, 'danger');
            }
          });
      };

      //Code for login form
      $scope.closeAlert = $spAlerts.closeAlert;

      $scope.credentials = {};
      $scope.login = function(){
        //TODO: Implement one of the directives from here: http://stackoverflow.com/questions/14965968/angularjs-browser-autofill-workaround-by-using-a-directive
        //      because angularjs model doesn't get updated when a browser fills in the form fields from remembered passwords.

        UserModel.login({
          realm: 'portal',
          username: $scope.credentials.username,
          password: $scope.credentials.password
        })
          .$promise.then(function(accessToken){
            console.log('accessToken', accessToken);
            $sessionStorage.currentUser = accessToken;
            console.log('sessiontoken:', $sessionStorage.currentUser.id);
            $state.go('mystores');
          },
          function(error){
            console.log('login() failed');
            console.log(error);
            console.log($spAlerts.getMessage(error));
            if (error && error.data && error.data.error) {
              $spAlerts.addAlert(error.data.error, 'danger');
            }
          });
      };

      $scope.resetPassword = function(){
        // TODO: http://docs.strongloop.com/display/public/LB/User+REST+API#UserRESTAPI-Resetpassword
        //       MUST handle the 'resetPasswordRequest' event on the server to send a reset email
        //       containing an access token to the correct user.
        UserModel.resetPassword({
          email: $scope.credentials.username
        })
          .$promise.then(function(){
            console.log('ready to change password');
            $spAlerts.addAlert('Password reset email has been sent to your '+ '"'+ $scope.credentials.username + '"'+ ' email address.', 'info');
            $state.go('signup');
          },
          function(error){
            console.log('Error: '+ error);
            if (error && error.data && error.data.error){
              $spAlerts.addAlert(error.data.error, 'danger');
            }
          });
      };
    }
  ]
);
