beforeEach(function() {
  // do something useful
});

var subdomain = 'mppulkit1';
var baseUrl = 'https://'+subdomain+'.localtunnel.me/';

var login = {
  username: element(by.model('userName')),
  password: element(by.model('password')),
  loginButton: element(by.id('login'))
};

describe('In Warehouse', function() {
  it('anonymous users should you land on the login page by default', function() {
    browser.get(baseUrl);
    expect(browser.getLocationAbsUrl()) .toBe('/login');
  });

  it('users with appropriate credentials should be able to login', function() {
    expect(browser.getLocationAbsUrl()) .toBe('/login');

    // fill in a username
    login.username.sendKeys('merchant1@shoppinpal.com');

    // fill in a password
    login.password.sendKeys('9732KilzSqEUGF');

    // click the login button
    login.loginButton.click();

    // validate that you land on the `store-landing` page
    expect(browser.getLocationAbsUrl()) .toBe('/store-landing');
  });

  it('managers should be able to kick-off a job to generate a stock order on demand', function() {
    expect(browser.getLocationAbsUrl()) .toBe('/store-landing');

    element(by.buttonText('Create manual order')).click();
    expect(browser.getLocationAbsUrl()) .toBe('/create-manual-order');

  });
});

