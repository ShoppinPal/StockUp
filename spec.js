beforeEach(function() {
  // do something useful
});

var login = {
  username: element(by.model('userNameIos'))/*,
  password: element(by.model('userNameWindow')),
  loginButton: element(by.xpath('//form[@name=\'loginForm\']//button[@type=\'submit\']'))*/
};

describe('Warehouse', function() {
  it('anonymous users should you land on the login page by default', function() {
    browser.get('https://mppulkit1.localtunnel.me');
    expect(browser.getLocationAbsUrl()) .toBe('/login');
  });

  it('users with appropriate credentials should be able to login', function() {
    expect(browser.getLocationAbsUrl()) .toBe('/login');

    login.username.sendKeys('merchant2@shoppinpal.com');
    // TODO: find the username password elements fill them in
    // TODO: click the login button
    // TODO: validate that you land on the store-landing page
  });
});