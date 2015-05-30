beforeEach(function() {
  //browser.get('http://ishare.nardi.me:8000');
  browser.get('https://mppulkit1.localtunnel.me');
});

var login = {
  username: element(by.model('userNameWindow'))/*,
  password: element(by.model('userNameWindow')),
  loginButton: element(by.xpath('//form[@name=\'loginForm\']//button[@type=\'submit\']'))*/
};

describe('experiment', function() {
  it('validate that you land on the login page', function() {
    /*
    expect(url).toMatch(/#\/login/);
    expect(browser.getLocationAbsUrl()).toBe('https://mppulkit1.localtunnel.me/#/store-landing');
    */

    expect(browser.getLocationAbsUrl()) .toBe('https://mppulkit1.localtunnel.me/#/login');
  });

  it('logs the user in', function() {
    expect(browser.getLocationAbsUrl()) .toBe('https://mppulkit1.localtunnel.me/#/login');

    login.username.sendKeys('merchant2@shoppinpal.com');
    // TODO: find the username password elements fill them in
    // TODO: click the login button
    // TODO: validate that you land on the store-landing page
  });
});