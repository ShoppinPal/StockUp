module.exports = function () {

  var self = this;

  /**
   * @description Login using email and password
   * @param email
   * @param password
   */
  self.login = function (email, password) {
    console.log('Entering Login page');
    var baseUrl = browser.baseUrl;
    var testUrl = browser.baseUrl + 'login';
    browser.get(testUrl);
    console.log('Entering username and password', email, password);
    element(by.model('userName')).sendKeys(email);
    element(by.model('password')).sendKeys(password);
    console.log('Clicking login button');
    return element(by.css('button[ng-click="login(userName,password)"]')).click();
  };

  /**
   * @description Click on the logout button
   */
  self.logout = function () {
    var logoutButton = element(by.css('a[href="#/logout"]'));
    console.log('Clicking logout button');
    return logoutButton.click();
  };

};
