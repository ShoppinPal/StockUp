'use strict';

var path = require('path');
var fileName = path.basename(__filename, '.js'); // gives the filename without the .js extension
var log = require('debug')('common:models:'+fileName);

module.exports = function(Container) {

  Container.beforeRemote('upload', function(ctx, unused, next) {
    log('Container > beforeRemote > upload');
    var userId = ctx.req.params.container; // TODO: validate userId basedon accessToken
    log('Container > beforeRemote > upload > userId', userId);
    Container.getContainer(userId, function(err1, container1){
      if (err1) {
        if (err1.code === 'ENOENT') {
          log('Container > beforeRemote > upload > Container does not exist > let us create a new one');
          Container.createContainer({name: userId}, function(err2, container2) {
            if(err2){
              log('Container > beforeRemote > upload > Could not create a new container > unexpected error', err2);
              console.error(err2);
              next(err2);
            }
            else {
              log('Container > beforeRemote > upload > Created a new container', container2.name);
              next();
            }
          });
        }
        else {
          log('Container > beforeRemote > upload > Container does not exist > unexpected error', err1);
          console.error(err1);
          next(err1);
        }
      }
      else {
        log('Container > beforeRemote > upload > Container already exists', container1.name);
        next();
      }
    });
  });

  Container.afterRemote('upload', function(ctx, unused, next) {
    log('Container > afterRemote > upload');
    var files = ctx.result.result.files.file;
    log('Container > afterRemote > upload',
        ' > FILE(S) UPLOADED: %j', files);

    // ASSUMPTION #1 we only get one file at a time
    // ASSUMPTION #2 user only uploads a valid CSV file
    var item = files[0];
    var stream = Container.downloadStream(item.container, item.name);

    //TODO: csv parsing
    stream.pipe(process.stdout);
    stream.on('end', function() { next(); });
    stream.on('error', next);
  });

};
