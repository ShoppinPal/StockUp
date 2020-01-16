var AuthFunctions = require('../pages/auth.po.js');
var authData = require('../testData/auth.td.js');

describe('Signup module for signing up new users', function () {
var authFunctions = new AuthFunctions();
// --------------------------------User login assertion with unregistered user------------------------------------
    browser.ignoreSynchronization = true;
    it('url verifications', function() {
    // browser.get('https://staging.stockup.online/');
    var baseUrl = browser.baseUrl;
    var testUrl =  baseUrl + '/v2/#/login';
    browser.get(testUrl);
    browser.getCurrentUrl().then(function(url){
        console.log("Web page url is : " +url )
    })
    });
    it('should assert user login and not allow unregistered user to login', function(){
        console.log('On stockup page');
        authFunctions.login(authData);
        browser.sleep(5000);
    });
});