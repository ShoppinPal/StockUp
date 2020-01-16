var extend = require('util')._extend;

module.exports = function (Model) {
    Model.createOptionsFromRemotingContext = function(ctx) {
        var base = this.base.createOptionsFromRemotingContext(ctx);
        return extend(base, {
            currentUserId: base.accessToken && base.accessToken.userId,
            ip: ctx.req.connection.remoteAddress,
            deviceId: ctx.req.headers['device-id']
        });
    };
};
