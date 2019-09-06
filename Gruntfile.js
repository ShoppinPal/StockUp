'use strict';

module.exports = function (grunt) {
    grunt.option('stack', true);

    grunt.file.expand('./node_modules/grunt-*/tasks').forEach(grunt.loadTasks);
    require('matchdep').filterDev('grunt-*').forEach(grunt.loadNpmTasks);

    // Time how long tasks take. Can help when optimizing build times
    require('time-grunt')(grunt);

    grunt.initConfig({
        connect: { // only utilizing these settings and NOT the "grunt-contrib-connect": "^0.8.0" task ... right now
            options: {
                port: 3000,
                // Change this to '0.0.0.0' to access the server from outside.
                hostname: 'localhost',
                livereload: 35729
            }
        },
        /* jshint ignore:start */
        mustache_render: {
            all: {
                files: [{
                    data: "server/config-data.json",
                    template: "server/config.mustache",
                    dest: "server/config." + process.env.NODE_ENV + ".js"
                }]
            }
        },
        /* jshint ignore:end */
        open: {
            server: {
                url: 'http://localhost:<%= connect.options.port %>'
            }
        },
        watch: {
            scripts: {
                files: [
                    './server/*.js',
                    './common/*.js',
                    './warehouse-workers/**/*.js'
                ],
                //tasks: ['jshint'],
                options: {
                    livereload: true,
                    spawn: false,
                }
            }
        },
        autoprefixer: {
            options: ['last 1 version'],
            dist: {
                files: [{
                    expand: true,
                    cwd: '.tmp/styles/',
                    src: '{,*/}*.css',
                    dest: '.tmp/styles/'
                }]
            }
        },
        jshint: {
            server: {
                options: {
                    jshintrc: '.jshintrc',
                    reporter: require('jshint-stylish')
                },
                files: {
                    src: [
                        'Gruntfile.js',
                        'server.js'
                    ]
                }
            }
        },
        protractor: {
            options: {
                keepAlive: false, // If false, the grunt process stops when the test fails.
                configFile: './test/protractor.conf.js'
            },
            singlerun: {},
            debug: {
                options: {
                    debug: true
                }
            }
        },
        karma: {
            unit: {
                configFile: 'karma.conf.js',
                singleRun: true
            },
            e2e: {
                configFile: 'karma-e2e.conf.js',
                singleRun: true
            }
        },
        env: {
            options: {},
            development: {
                'site:baseUrl': '<%= buildProperties.site.baseUrl %>'
            },
            staging: {
                'site:baseUrl': '<%= buildProperties.site.baseUrl %>'
            },
            production: {}
        },
        replace: {
            all: {
                options: {
                    patterns: [
                        {
                            json: {
                                apiKey: '<%= buildProperties.prestashop.apiKey %>',
                                baseUrl: '<%= buildProperties.site.baseUrl %>',
                                loopbackApiRoot: '<%= buildProperties.restApiRoot %>',
                                proxyUrl: '<%= buildProperties.site.proxyUrl %>',
                                vendAuthEndpoint: '<%= buildProperties.integrations.vend.auth_endpoint %>',
                                vendClientId: '<%= buildProperties.integrations.vend.client_id %>'
                            }
                        }
                    ]
                }
            }
        },
        localtunnel: {
            anyEnv: {
                options: {
                    subdomain: grunt.option('subdomain') || 'pleaseSetSubDomain',
                    port: '<%= connect.options.port %>',
                    open: true,
                    keepalive: false,
                    handleTunnelSuccess: function (tunnel) {
                        grunt.config('buildProperties.site.baseUrl', tunnel.url);
                        grunt.log.ok('updated buildProperties.site.baseUrl: ' + grunt.config('buildProperties.site.baseUrl'));
                    }
                }
            }
        }
    });

    grunt.registerTask('loadConfig', function (env) {
        if (!env) {
            return grunt.util.error('You must specify an environment');
        }

        var _ = require('lodash');

        var config = {};
        if (grunt.file.exists('./server/config.json')) {
            config = grunt.file.readJSON('server/config.json');
        }
        else if (grunt.file.exists('./server/config.js')) {
            config = require('./server/config.js');
        }
        else {
            throw new Error('Incorrect workflow#1 detected in the "loadConfig" task');
        }

        if (grunt.file.exists('./server/config.' + env + '.json')) {
            _.merge(config, grunt.file.readJSON('server/config.' + env + '.json'));
        }
        else if (grunt.file.exists('./server/config.' + env + '.js')) {
            _.merge(config, require('./server/config.' + env + '.js'));
        }
        else {
            throw new Error('Incorrect workflow#2 detected in the "loadConfig" task');
        }

        console.log('config:', config);

        config.environment = env;
        grunt.config('buildProperties', config);
    });

    grunt.registerTask('run', 'Start the app server', function () {
        var done = this.async();

        var connectConfig = grunt.config.get().connect.options;
        process.env.LIVE_RELOAD = connectConfig.livereload;
        process.env.NODE_ENV = this.args[0]; // sets dev, prod etc. env(s) into NODE_ENV

        var keepAlive = this.flags.keepalive || connectConfig.keepalive; // https://github.com/rwaldron/dmv/blob/master/node_modules/grunt/docs/api.md#this-flags-grunt-task-current-flags

        var server = require('./server/server.js');
        server.set('port', connectConfig.port);
        server.set('host', connectConfig.hostname);
        server.start()
            .on('listening', function () {
                if (!keepAlive) {
                    done();
                }
            })
            .on('error', function (err) {
                if (err.code === 'EADDRINUSE') {
                    grunt.fatal('Port ' + connectConfig.port +
                        ' is already in use by another process.');
                }else {
                    grunt.fatal(err);
                }
            });
    });

    /**
     * "env" may be development|staging|production:
     */
    grunt.registerTask('server',
        'For example:' +
        '\n\tgrunt server:local' +
        '\n\tgrunt server:development --subdomain mppulkit',
        function (env) {
            if (!env) {
                return grunt.util.error('You must specify an environment');
            }
            return grunt.task.run([
                'jshint',
                'loadConfig:' + env,
                'localtunnel:anyEnv',
                'env:' + env, // TODO: move this to be right after `localtunnel` task? or will it exacerbate the race condition?
                'build:' + env,
                'run:' + env,
                'watch'
            ]);
        });

    grunt.registerTask('build', function (env) {
        if (!env) {
            return grunt.util.error('You must specify an environment');
        }
        grunt.option('environment', env);
        grunt.task.run([
            'jshint',
            'replace:all'
        ]);
    });
    grunt.registerTask('configsetup', function (env) {
        if (!env) {
            return grunt.util.error('You must specify an environment');
        }
        grunt.option('environment', env);
        grunt.task.run([
            'mustache_render:all'
        ]);
    });

    grunt.registerTask('deploy', function (env) {
        if (!env) {
            return grunt.util.error('You must specify an environment');
        }
        grunt.option('environment', env);
        if (env === 'local' || env === 'development') {
            localGruntTask(env);
        }else {
            grunt.task.run([
                'jshint',
                'loadConfig:' + env,
                'replace:all'
            ]);
        }

    });

    grunt.registerTask('test', function (env) {
        localGruntTask(env);
        console.log('skip tests for now - to be implemented...');
    });

    // Function to load development friendly tasks only, skipping minification/uglification etc....
    function localGruntTask(env) {
        console.log('Skipping unnecessary steps for dev environment');
        grunt.task.run([
            'jshint',
            'loadConfig:' + env,
            'replace:all'
        ]);
    }
};
