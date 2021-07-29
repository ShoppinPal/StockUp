const chai = require('chai');
const { expect } = chai;
const utils = require('../workers/jobs/utils/utils');
const rp = require('request-promise');
const nock = require('nock');

describe('worker/utils', () => {
    it('should retry on 502, 503, 504 errors',  (done) => {
        nock('http://vend.stockup.localdomain').get('/').reply(503, { notOk: 100});
        nock('http://vend.stockup.localdomain').get('/').reply(502, { notOk: 100});
        nock('http://vend.stockup.localdomain').get('/').reply(504, { notOk: 100});
        let tries = 0;
             utils.retryIfErrorCode(() => {
                 tries++;
                 return rp({
                    method: 'GET',
                    uri: 'http://vend.stockup.localdomain',
                });
            }, 3, 10).then(data => {
                 expect(false).to.be.true;
                 done();
            })
            .catch(e => {
                 expect(e.statusCode <= 504 && e.statusCode >= 502).to.be.true;
                 expect(tries).to.be.equal(3);
                 done();

             });
    });

    it('should retry on 502, 503, 504 errors, and last call is success',  (done) => {
        nock('http://vend.stockup.localdomain').get('/').reply(503, { notOk: 100});
        nock('http://vend.stockup.localdomain').get('/').reply(502, { notOk: 100});
        nock('http://vend.stockup.localdomain').get('/').reply(202, { ok: 200});
        let tries = 0;
        utils.retryIfErrorCode(() => {
            tries++;
            return rp({
                method: 'GET',
                uri: 'http://vend.stockup.localdomain',
            });
        }, 3, 10).then(data => {
            expect(JSON.parse(data)).to.deep.equal({ ok: 200});
            done();
        })
            .catch(e => {
                console.log(e);
               throw new Error('InValid State, test should match required response');

            });
    });
});
