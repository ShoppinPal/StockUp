exports.config = {
  framework: 'jasmine',
  specs: ['./modules/auth/tests/*.js'],
  jasmineNodeOpts: {
    defaultTimeoutInterval: 1000 * 60 * 10
  },
  seleniumAddress: 'http://127.0.0.1:4444/wd/hub',
};
