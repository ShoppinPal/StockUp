exports.config = {
    framework: 'jasmine',
    specs: ['./modules/*.js'],
    jasmineNodeOpts: {
        defaultTimeoutInterval: 1000 * 60 * 10
    }
};
