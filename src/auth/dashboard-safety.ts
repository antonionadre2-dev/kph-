export function identityScope(uid?: string, staff = false): string { return `${uid || ''}:${staff}`; }
export function isClientEditableStatus(status: string): boolean { return status === 'Draft' || status === 'Pending'; }
export function emailDraftHref(to: string, cc: string, subject: string, body: string): string {
  const valid = (email: string) => /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(email) && !/[\r\n]/.test(email);
  if (!valid(to) || (cc && !valid(cc))) throw Error('Invalid recipient');
  const parameters = [['subject', subject], ['body', body], ...(cc ? [['cc', cc]] : [])];
  return 'mailto:' + encodeURIComponent(to).replace('%40', '@') + '?' + parameters.map(([key, value]) => key + '=' + encodeURIComponent(value)).join('&');
}
export function emailPreviewDocument(html: string): string {
  return '<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'; img-src data:; form-action \'none\'; base-uri \'none\'"></head><body>' + html + '</body></html>';
}
