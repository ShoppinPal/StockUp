'use strict';

angular.module('ShoppinPalApp')
  .factory('$sockets', function (socketFactory, notificationUrl) {
    /*global io: true */
    var ioSocket = io.connect(notificationUrl, {
        'reconnectionAttempts': 1
    });

    return socketFactory({
        ioSocket: ioSocket
    });
  });
