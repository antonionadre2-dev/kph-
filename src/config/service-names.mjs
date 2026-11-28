/** Public service names shared by navigation, booking, Kai and customer emails. */
export const CANONICAL_SERVICE_NAMES = Object.freeze({
  de: Object.freeze({ windows:'Fensterreinigung', endOfTenancy:'Umzugsreinigung', regular:'Regelmässige Reinigung', deep:'Grundreinigung', moving:'Kleine Umzüge', construction:'Baureinigung' }),
  en: Object.freeze({ windows:'Window cleaning', endOfTenancy:'End-of-tenancy cleaning', regular:'Regular cleaning', deep:'Deep cleaning', moving:'Small moves', construction:'Post-construction cleaning' }),
  es: Object.freeze({ windows:'Limpieza de ventanas', endOfTenancy:'Limpieza de fin de alquiler', regular:'Limpieza periódica', deep:'Limpieza a fondo', moving:'Pequeñas mudanzas', construction:'Limpieza de fin de obra' }),
  pt: Object.freeze({ windows:'Limpeza de janelas', endOfTenancy:'Limpeza de fim de arrendamento', regular:'Limpeza regular', deep:'Limpeza a fundo', moving:'Pequenas mudanças', construction:'Limpeza pós-obra' }),
  it: Object.freeze({ windows:'Pulizia dei vetri', endOfTenancy:'Pulizia di fine locazione', regular:'Pulizia regolare', deep:'Pulizia approfondita', moving:'Piccoli traslochi', construction:'Pulizia di fine cantiere' }),
  fr: Object.freeze({ windows:'Nettoyage des vitres', endOfTenancy:'Nettoyage de fin de bail', regular:'Nettoyage régulier', deep:'Nettoyage en profondeur', moving:'Petits déménagements', construction:'Nettoyage de fin de chantier' }),
});
const genericServiceNames = { de:'Leistung', en:'Service', es:'Servicio', pt:'Serviço', it:'Servizio', fr:'Prestation' };
function serviceNameLanguage(language) {
  const code = typeof language === 'string' ? language.trim().toLowerCase().split(/[-_]/)[0] : 'de';
  return Object.hasOwn(CANONICAL_SERVICE_NAMES, code) ? code : 'de';
}
export function serviceNamesForLanguage(language = 'de') {
  return CANONICAL_SERVICE_NAMES[serviceNameLanguage(language)];
}
export function serviceName(language, value) {
  const code = serviceNameLanguage(language);
  const service = typeof value === 'object' && value !== null
    ? value.service === 'regular' && (value.cleaningKind === 'deep' || !value.cleaningKind && value.frequency === 'once') ? 'deep' : value.service
    : value;
  const key = service === 'end' ? 'endOfTenancy' : service === 'window' ? 'windows' : service;
  return CANONICAL_SERVICE_NAMES[code][key] || genericServiceNames[code];
}
