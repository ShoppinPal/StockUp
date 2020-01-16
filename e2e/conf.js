
exports.config = {
    directConnect: false,
    baseUrl: '',
    onPrepare: function () {
        setTimeout(function () {
            var x = 0, y = 0;
            browser.driver.manage().window().setPosition(x, y);
            browser.driver.executeScript(function () {
                return {
                    width: window.screen.availWidth,
                    height: window.screen.availHeight
                };
            }).then(function (result) {
                browser.driver.manage().window().setSize(result.width, result.height);
            });
        });
    },
    multiCapabilities: [
        {
            'browserName': 'chrome',
            'chromeOptions': {
                'args': ['--no-sandbox', '--disable-web-security']
            }
        }
    ],
    seleniumAddress: 'http://selenium:4444/wd/hub',
    specs: ['./module/auth/tests/01_signup.js'],
    jasmineNodeOpts: {
        defaultTimeoutInterval: 1000 * 60 * 10
    },
    allScriptsTimeout: 20 * 30 * 100
};
