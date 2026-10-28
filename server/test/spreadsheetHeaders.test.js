import test from 'node:test';
import assert from 'node:assert/strict';
import { validateHeaders } from '../../src/utils/spreadsheetHeaders.js';

test('master and scores accept the established CEPT Group Report headers', () => {
  const report = ['Textbox2', 'RSURN', 'RFIRST', 'TotalScore', 'TGVALUE'];
  for (const kind of ['master', 'scores']) {
    assert.doesNotThrow(() => validateHeaders(report, kind));
    assert.doesNotThrow(() => validateHeaders(['Registration Number', 'Last Name', 'First Name', 'Score', 'Value'], kind));
    assert.doesNotThrow(() => validateHeaders([' textbox2 ', ' rsurn ', ' rfirst ', ' total score ', ' tgvalue '], kind));
    assert.throws(() => validateHeaders(['Textbox2', 'RFIRST', 'RSURN', 'TotalScore', 'TGVALUE'], kind));
    assert.throws(() => validateHeaders(report.slice(0, 4), kind));
  }
  assert.doesNotThrow(() => validateHeaders(['RegNum', 'Name', 'Email', 'Mobile', 'Date', 'Time'], 'ids'));
  assert.throws(() => validateHeaders(report, 'ids'));
});

test('master results accept blank untrusted names but still require IDs and valid scores', async () => {
  const { validateMasterRows } = await import('../src/services/imports.js');
  const records = validateMasterRows([['00123', '', '', 75, 'B2']]);
  assert.equal(records[0].registrationNumber, '00123');
  assert.equal(records[0].score, 75);
  assert.equal(records[0].firstName, ''); assert.equal(records[0].lastName, '');
  assert.throws(() => validateMasterRows([['', '', '', 75, 'B2']]));
  assert.throws(() => validateMasterRows([['00123', '', '', 'invalid', 'B2']]));
});
