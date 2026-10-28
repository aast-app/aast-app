const normalize = value => String(value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
export function validateHeaders(headers, kind) {
  const aliases = {
    registration: ['regnum', 'regno', 'registrationnumber', 'registrationno', 'registration', 'candidatenumber', 'candidateid', 'textbox2'],
    last: ['lastname', 'surname', 'familyname', 'rsurn'], first: ['firstname', 'givenname', 'rfirst'],
    score: ['score', 'result', 'testscore', 'ceptscore', 'totalscore'], value: ['value', 'level', 'cefr', 'cefrlevel', 'grade', 'tgvalue'],
  };
  const expected = kind === 'ids' ? [['regnum'], ['name'], ['email'], ['mobile'], ['date'], ['time']] : [aliases.registration, aliases.last, aliases.first, aliases.score, aliases.value];
  if (expected.some((choices, index) => !choices.includes(normalize(headers[index])))) {
    throw new Error(kind === 'ids' ? 'Expected headers: RegNum, Name, Email, Mobile, Date, Time.' : 'Expected headers: Registration Number, Last Name, First Name, Score, Value (or Level).');
  }
}
