import { registerAction } from '../routes/actions.js';
import { prisma } from '../db/connect.js';

const validDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
export function defaultOperation(date) {
  const day = new Date(`${date}T12:00:00`).getDay();
  return { idsUploaded: false, scoresUploaded: false, idsNotNeeded: day === 5 || day === 6, scoresNotNeeded: day === 5 || day === 6 };
}

export function registerDataHandlers(router) {
  registerAction(router, 'get-week-operations', async ({ dates }) => {
    if (!Array.isArray(dates) || dates.length > 31 || !dates.every(validDate)) {
      return { success: false, message: 'Provide up to 31 valid dates.' };
    }
    const operations = await prisma.dailyOperation.findMany({ where: { date: { in: dates } } });
    const data = Object.fromEntries(dates.map(date => [date, defaultOperation(date)]));
    for (const { date, id: _id, ...operation } of operations) data[date] = operation;
    return { success: true, data };
  });

  registerAction(router, 'toggle-not-needed', async ({ targetDate, type, value, username = 'System' }) => {
    if (!validDate(targetDate) || !['ids', 'scores', 'both'].includes(type) || typeof value !== 'boolean') {
      return { success: false, message: 'Invalid date, operation type, or skip value.' };
    }
    const fields = {};
    if (type === 'ids' || type === 'both') fields.idsNotNeeded = value;
    if (type === 'scores' || type === 'both') fields.scoresNotNeeded = value;
    await prisma.$transaction([
      prisma.dailyOperation.upsert({ where: { date: targetDate }, update: fields, create: { date: targetDate, ...defaultOperation(targetDate), ...fields } }),
      prisma.log.create({ data: { username, action: value ? 'Skip Day' : 'Undo Skip', details: `Toggled skip status for ${targetDate} (${type}). Set to: ${value}`, metadata: JSON.stringify({ targetDate, type, value }) } }),
    ]);
    return { success: true };
  });

  registerAction(router, 'log-frontend-action', async ({ username = 'System', action, details = '', metadata = {} }) => {
    if (typeof action !== 'string' || !action.trim()) return { success: false, message: 'An action is required.' };
    await prisma.log.create({ data: { username, action, details, metadata: JSON.stringify(metadata) } });
    return { success: true };
  });
}
