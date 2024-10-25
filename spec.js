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
    waitForSometime(1000);

    // fill in a username
    login.username.sendKeys('merchant1@linktoany.com');
    waitForSometime(1000);

    // fill in a password
    login.password.sendKeys('9732KilzSqEUGF');
    waitForSometime(1000);

    // click the login button
    login.loginButton.click();

    // validate that you land on the `store-landing` page
    expect(browser.getLocationAbsUrl()) .toBe('/store-landing');
  });

  it('managers should be able to kick-off a job to generate a stock order on demand', function() {
    expect(browser.getLocationAbsUrl()) .toBe('/store-landing');

    element(by.buttonText('New Stock Order')).click();
    expect(browser.getLocationAbsUrl()) .toBe('/create-manual-order');

    var name = 'ordered on - ' + Date.now();
    element(by.id('orderName')).sendKeys(name);
    expect(element(by.id('orderName')).getAttribute('value')).toBe(name);
    waitForSometime(3000);
  });
});

var waitForSometime = function(milliSeconds){
  var start = new Date().getTime();
  var script = (milliSeconds)
    ? 'window.setTimeout(arguments[arguments.length - 1], '+ milliSeconds +');'
    : 'window.setTimeout(arguments[arguments.length - 1], 3000);';
  browser.executeAsyncScript(script)
    .then(function() {
      console.log('Elapsed time: ' + (new Date().getTime() - start) + ' ms');
    });
};
