export function registrationBase(value) {
 return String(value).trim().replace(/-R\d+$/i, '');
}

export function nextRegistrationNumber(base, numbers) {
 let highest = -1n;
 for (const value of numbers) {
  const number = String(value).trim();
  if (number === base) { if (highest < 0n) highest = 0n; continue; }
  const match = number.match(/^(.*)-R(\d+)$/i);
  if (match && match[1] === base) {
   const attempt = BigInt(match[2]);
   if (attempt > highest) highest = attempt;
  }
 }
 return highest < 0n ? null : `${base}-R${highest + 1n}`;
}
