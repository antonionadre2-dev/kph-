/** Stored customer text is still untrusted when it leaves React's escaping boundary. */
export function escapeDocumentText(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
export function escapedDocumentRecord<T extends object>(record: T): T {
  return Object.fromEntries(Object.entries(record).map(([key, value]) => [key, typeof value === 'string' ? escapeDocumentText(value) : value])) as T;
}
export const DOCUMENT_PREVIEW_CSP = "default-src 'none'; style-src 'unsafe-inline'; img-src https://krakenpfm.ch data:; base-uri 'none'; form-action 'none'";
export function documentDraftLabel(language: string): string {
  const labels: Record<string, string> = { de: 'Entwurf – vor Verwendung prüfen', en: 'Draft – check before use', es: 'Borrador – revise antes de usar', fr: 'Brouillon – à vérifier avant utilisation', it: 'Bozza – verifichi prima dell’uso', pt: 'Rascunho – verifique antes de utilizar' };
  return labels[language.split('-')[0]] || labels.de;
}
export function documentPreviewBlocked(language: string): string {
  const labels: Record<string, string> = { de: 'Bitte erlauben Sie ein neues Fenster für die PDF-Vorschau.', en: 'Please allow a new window for the PDF preview.', es: 'Permita una nueva ventana para la vista previa del PDF.', fr: 'Veuillez autoriser une nouvelle fenêtre pour l’aperçu PDF.', it: 'Consenta una nuova finestra per l’anteprima PDF.', pt: 'Permita uma nova janela para a pré-visualização do PDF.' };
  return labels[language.split('-')[0]] || labels.de;
}
export function documentPreviewDate(language: string, date = new Date()): string {
  const code = language.split('-')[0];
  const locale = ({ de: 'de-CH', fr: 'fr-CH', it: 'it-CH' } as Record<string, string>)[code] || code;
  return new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Europe/Zurich' }).format(date);
}
/** No inline script is needed in the preview's deliberately script-free document. */
export function connectPreviewPrint(preview: Window): void {
  preview.opener = null;
  preview.document.querySelectorAll('[data-print-invoice]').forEach(button => button.addEventListener('click', () => preview.print()));
}
