var AuthFunctions = require('./../pages/auth.po.js');
describe('Login', function () {

  var authFunctions = new AuthFunctions();
  var authParams = require('./../testData/auth.td.js');
  var manager = authParams.manager;

  /**
   * Login to the warehouse as a store manager with correct credentials,
   * and redirect to store-landing page.
   */
  it('Store manager login', function () {

    authFunctions.login(manager.email, manager.password)
      .then(function () {
        expect(browser.getCurrentUrl()).toContain('/store-landing');
        console.log('Entered store landing page');
      });

  });

  /**
   * Logout of the warehouse successfully, and redirect back to login page
   */
  it('Store manager logout', function () {
    authFunctions.logout()
      .then(function () {
        expect(browser.getCurrentUrl()).toContain('/login');
        console.log('Logged out successfully');
      });
  });


  /**
   * Login to the warehouse using invalid username and password, and expect
   * to get an error without any redirection
   */
  it('Store manager login wrong username and password', function () {
    authFunctions.login(manager.email + 'blah', manager.password + 'blah')
      .then(function () {
        var userNameError = element(by.binding('errors.username')).getText();
        expect(browser.getCurrentUrl()).toContain('/login');
        expect(userNameError).toBe('login failed');
        console.log('Login failure checked successfully');
      });
  });

});
