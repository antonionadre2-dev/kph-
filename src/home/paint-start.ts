/** Small cacheable loader; CSP continues to allow only scripts from approved origins. */
export const HOME_BOOTSTRAP_SRC="/media/home-start-1bd2d517f12f.js";

/** Let the already rendered homepage paint before fetching its interactive application. */
export function startHomeAfterPaint(html: string) {
  const script=html.match(/<script\b(?=[^>]*\btype=["']module["'])(?=[^>]*\bsrc=["'](\/assets\/[A-Za-z0-9_.-]+\.js)["'])[^>]*>\s*<\/script>/i);
  if (!script) return html;
  return html.replace(script[0],()=>`<script type="module" id="kraken-home-start" src="${HOME_BOOTSTRAP_SRC}" data-entry="${script[1]}" fetchpriority="low"></script>`)
    .replace(/<link\b(?=[^>]*\brel=["']modulepreload["'])[^>]*>/gi,'');
}
