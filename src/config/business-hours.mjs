/** Single source for Kraken's contact hours, shared by browser, server and email. */
const BUSINESS_WEEK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const BUSINESS_HOURS = Object.freeze({
  days: Object.freeze([...BUSINESS_WEEK_DAYS]),
  opens: '09:00',
  closes: '19:00',
  timeZone: 'Europe/Zurich',
});

const businessHoursTranslations = {
  de: { short: ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'], long: ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'], connector: ' bis ', zone: 'Ortszeit Zürich', sentence: (days, opens, closes, zone) => `Sie erreichen uns ${days} von ${opens} bis ${closes} Uhr (${zone}).` },
  en: { short: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], long: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'], connector: ' to ', zone: 'Zurich local time', sentence: (days, opens, closes, zone) => `We are available ${days}, ${opens}–${closes} (${zone}).` },
  es: { short: ['Lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'], long: ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'], connector: ' a ', zone: 'Hora de Zúrich', sentence: (days, opens, closes, zone) => `Atendemos de ${days}, de ${opens} a ${closes} (${zone}).` },
  pt: { short: ['Seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'], long: ['segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado', 'domingo'], connector: ' a ', zone: 'Hora de Zurique', sentence: (days, opens, closes, zone) => `Atendemos de ${days}, das ${opens} às ${closes} (${zone}).` },
  it: { short: ['Lun', 'mar', 'mer', 'gio', 'ven', 'sab', 'dom'], long: ['lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato', 'domenica'], connector: ' alla ', zone: 'Ora locale di Zurigo', sentence: (days, opens, closes, zone) => `Siamo disponibili dal ${days}, dalle ${opens} alle ${closes} (${zone}).` },
  fr: { short: ['Lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim'], long: ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'], connector: ' au ', zone: 'Heure locale de Zurich', sentence: (days, opens, closes, zone) => `Nous sommes joignables du ${days}, de ${opens} à ${closes} (${zone}).` },
};

function hoursLanguage(language) {
  const code = typeof language === 'string' ? language.toLowerCase().split(/[-_]/)[0] : 'de';
  return Object.hasOwn(businessHoursTranslations, code) ? code : 'de';
}

function businessDaysLabel(language, style, connector = '–') {
  const names = businessHoursTranslations[hoursLanguage(language)][style];
  const indices = BUSINESS_HOURS.days.map(day => BUSINESS_WEEK_DAYS.indexOf(day));
  const contiguous = indices.every((index, position) => position === 0 || index === indices[position - 1] + 1);
  return contiguous && indices.length > 1 ? names[indices[0]] + connector + names[indices.at(-1)] : indices.map(index => names[index]).join(', ');
}

export function businessHoursLabel(language = 'de') {
  return `${businessDaysLabel(language, 'short')} · ${BUSINESS_HOURS.opens}–${BUSINESS_HOURS.closes}`;
}

export function businessHoursTimeZoneLabel(language = 'de') {
  return businessHoursTranslations[hoursLanguage(language)].zone;
}

export function businessHoursLongLabel(language = 'de') {
  const code = hoursLanguage(language);
  const days = businessDaysLabel(code, 'long');
  return `${days[0].toUpperCase() + days.slice(1)}, ${BUSINESS_HOURS.opens}–${BUSINESS_HOURS.closes}${code === 'de' ? ' Uhr' : ''} (${businessHoursTranslations[code].zone})`;
}

export function businessHoursSentence(language = 'de') {
  const code = hoursLanguage(language);
  const zone = businessHoursTranslations[code].zone;
  const sentenceZone = ['es', 'pt', 'it', 'fr'].includes(code) ? zone[0].toLowerCase() + zone.slice(1) : zone;
  const days = businessDaysLabel(code, 'long', businessHoursTranslations[code].connector);
  return businessHoursTranslations[code].sentence(days, BUSINESS_HOURS.opens, BUSINESS_HOURS.closes, sentenceZone);
}

export function businessOpeningHoursSpecification() {
  return [{ '@type': 'OpeningHoursSpecification', dayOfWeek: [...BUSINESS_HOURS.days], opens: BUSINESS_HOURS.opens, closes: BUSINESS_HOURS.closes }];
}

/** Data-file placeholders resolve through the same source as rendered interface copy. */
export function interpolateBusinessHours(text, language = 'de') {
  if (typeof text !== 'string') return text;
  return text.replaceAll('{{businessHours}}', businessHoursLongLabel(language))
    .replaceAll('{{businessHoursSentence}}', businessHoursSentence(language))
    .replaceAll('{{businessHoursTimeZone}}', businessHoursTimeZoneLabel(language));
}

let businessClock;
/** Closing is exclusive; Intl applies Zurich's winter/summer offset for the date. */
export function isBusinessOpen(date = new Date()) {
  businessClock ||= new Intl.DateTimeFormat('en-GB', { timeZone: BUSINESS_HOURS.timeZone, weekday: 'long', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const parts = businessClock.formatToParts(date);
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  const minutes = Number(values.hour) * 60 + Number(values.minute);
  const asMinutes = time => { const [hours, minutes] = time.split(':').map(Number); return hours * 60 + minutes; };
  return BUSINESS_HOURS.days.includes(values.weekday) && minutes >= asMinutes(BUSINESS_HOURS.opens) && minutes < asMinutes(BUSINESS_HOURS.closes);
}
