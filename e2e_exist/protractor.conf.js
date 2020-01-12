exports.config = {
  framework: 'jasmine',
  specs: ['./modules/auth/tests/*.js'],
  jasmineNodeOpts: {
    defaultTimeoutInterval: 1000 * 60 * 10
  },
  baseUrl: process.env.BASE_URL
};
