export function normalizeNoteHtml(html: string): string {
  return html
    .replace(/<div><br><\/div>/gi, '<br>')
    .replace(/<div>/gi, '<p>')
    .replace(/<\/div>/gi, '</p>')
    .replace(/<p><\/p>/gi, '<br>');
}