/*global angular: true, google: true, _ : true */

'use strict';

angular.module('geocoder', ['ngStorage']).factory('Geocoder',['$localStorage', '$q', '$timeout', function ($localStorage, $q, $timeout) {
  var locations = $localStorage.locations ? JSON.parse($localStorage.locations) : {};

  var queue = [];

  // Amount of time (in milliseconds) to pause between each trip to the
  // Geocoding API, which places limits on frequency.
  var queryPause = 250;

  /**
   * executeNext() - execute the next function in the queue.
   *                  If a result is returned, fulfill the promise.
   *                  If we get an error, reject the promise (with message).
   *                  If we receive OVER_QUERY_LIMIT, increase interval and try again.
   */
  var executeNext = function () {
    var task = queue[0],
      geocoder = new google.maps.Geocoder();

    geocoder.geocode({ address : task.address }, function (result, status) {
      if (status === google.maps.GeocoderStatus.OK) {
        var latLng = {
          lat: result[0].geometry.location.lat(),
          lng: result[0].geometry.location.lng()
        };

        queue.shift();

        locations[task.address] = latLng;
        $localStorage.locations = JSON.stringify(locations);

        task.d.resolve(latLng);

        if (queue.length) {
          $timeout(executeNext, queryPause);
        }
      } else if (status === google.maps.GeocoderStatus.ZERO_RESULTS) {
        queue.shift();
        task.d.reject({
          type: 'zero',
          message: 'Zero results for geocoding address ' + task.address
        });
        if (queue.length) {
          $timeout(executeNext, queryPause);
        }
      } else if (status === google.maps.GeocoderStatus.OVER_QUERY_LIMIT) {
        queryPause += 250;
        $timeout(executeNext, queryPause);
      } else if (status === google.maps.GeocoderStatus.REQUEST_DENIED) {
        queue.shift();
        task.d.reject({
          type: 'denied',
          message: 'Request denied for geocoding address ' + task.address
        });
        if (queue.length) {
          $timeout(executeNext, queryPause);
        }
      } else if (status === google.maps.GeocoderStatus.INVALID_REQUEST) {
        queue.shift();
        task.d.reject({
          type: 'invalid',
          message: 'Invalid request for geocoding address ' + task.address
        });
        if (queue.length) {
          $timeout(executeNext, queryPause);
        }
      }
    });
  };

  return {
    latLngForAddress : function (address) {
      var d = $q.defer();

      if (_.has(locations, address)) {
        $timeout(function () {
          d.resolve(locations[address]);
        });
      } else {
        queue.push({
          address: address,
          d: d
        });

        if (queue.length === 1) {
          executeNext();
        }
      }

      return d.promise;
    }
  };
}]);