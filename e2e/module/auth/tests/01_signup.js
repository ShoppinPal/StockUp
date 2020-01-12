var AuthFunctions = require('../pages/auth.po.js');
var authData = require('../testData/auth.td.js');

describe('Signup module for signing up new users', function () {
var authFunctions = new AuthFunctions();
//var authData = new AuthData();
// --------------------------------User login assertion with unregistered user------------------------------------
    it('should assert user login and not allow unregistered user to login', function(){
        browser.ignoreSynchronization = true;
        var baseUrl = browser.baseUrl;
        var testUrl =  baseUrl + '/v2/#/login';
        browser.get(testUrl);
        //browser.get('https://staging.stockup.online/');
        authFunctions.login(authData);
        browser.sleep(5000);
    });
});