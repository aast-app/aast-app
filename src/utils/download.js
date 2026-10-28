// Called from a user gesture; fall back to a standard download in browsers without a picker.
export async function createDownloadTarget(options) {
  if (typeof window.showSaveFilePicker === 'function' && navigator.userActivation?.isActive !== false) return window.showSaveFilePicker(options);
  return { async createWritable() {
    let contents;
    return {
      async write(data) { contents = data; },
      async close() { downloadBlob(contents instanceof Blob ? contents : new Blob([contents]), options.suggestedName); },
    };
  } };
}
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
export async function saveBlob(blob, filename) {
  const target = await createDownloadTarget({ suggestedName: filename });
  const stream = await target.createWritable();
  await stream.write(blob);
  await stream.close();
}
