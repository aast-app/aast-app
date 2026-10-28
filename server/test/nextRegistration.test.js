import test from 'node:test';
import assert from 'node:assert/strict';
import {registrationBase,nextRegistrationNumber} from '../src/utils/nextRegistration.js';

test('Next retake uses the highest exact-family numeric suffix and preserves registration text',()=>{
 assert.equal(registrationBase(' 00123-r2 '),'00123');
 assert.equal(nextRegistrationNumber('00123',['00123']),'00123-R1');
 assert.equal(nextRegistrationNumber('00123',['00123','00123-R2','00123-R10','00123-R9','001230-R90']),'00123-R11');
 assert.equal(nextRegistrationNumber('00123',['00123-r7','00123-R3']),'00123-R8');
 assert.equal(nextRegistrationNumber('00123',['00123-R99999999999999999999']),'00123-R100000000000000000000');
 assert.equal(nextRegistrationNumber('00123',['001230-R9','00123-Rbad']),null);
});
