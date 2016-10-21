'use strict';

angular.module('ShoppinPalApp')
    .factory('$sockets', function (socketFactory) {
        /*global io: true */
        var ioSocket = io.connect('http://localhost:3001', {
            'reconnectionAttempts': 1
        });

        return socketFactory({
            ioSocket: ioSocket
        });
    });
