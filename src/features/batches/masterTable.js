// Use immutable batch snapshots and exact refined attempt IDs for token matching.
export function batchMasterFiles(batch) {
  if (!batch?.files?.length) throw new Error('This batch has no registration files.');
  return batch.files.map(file => {
    const rows = file.sheets?.[0]?.rows;
    if (!rows || !file.students?.length) throw new Error(`No students found in ${file.fileName}.`);
    const data = file.students.map(student => {
      const row = rows[student.rowIndex];
      if (!row) throw new Error(`Missing student data in ${file.fileName}.`);
      return { RegNum: student.registrationNumber, Name: student.name, Email: row[2] ?? '', Mobile: row[3] ?? '', Date: row[4] ?? '', Time: row[5] ?? '' };
    });
    return { fileName: file.fileName, count: data.length, locationName: '', data };
  });
}
