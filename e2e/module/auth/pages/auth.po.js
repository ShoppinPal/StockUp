module.exports = function() {

    var self = this;
    var EC = protractor.ExpectedConditons;

    /**
     * @description 
    */
    self.validateLoginBanner = function(){
    };

    /**
     * @description Registered user will get logged in
     */
    self.loginValidUser = function(){
    };

    /**
     * @description Register with valid credentials
     */

     /**
      * @description Logins a user
      */
    self.login = function(authData){
        browser.ignoreSynchronization = false;
        var userName = element(by.css('input[placeholder="Username"]'));
        //browser.wait(EC.elementToBeClickable(userName), 5000, 'User name field time-out: user name field not clickable even after 5 secs');
        userName.sendKeys(authData.Username);
        element(by.css('input[placeholder="Password"]')).sendKeys(authData.Password);
        var loginBtn = element(by.buttonText('Login'));
        loginBtn.click();
        var error_toast = element(by.id('toast-container'));
        expect(error_toast.isDisplayed()).toBe(true);

     };
};