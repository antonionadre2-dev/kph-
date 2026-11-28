import zuerich from './cities/zuerich.json' with { type: 'json' };
import schaffhausen from './cities/schaffhausen.json' with { type: 'json' };
import winterthur from './cities/winterthur.json' with { type: 'json' };
import { normalizeHomeLanguage, type HomeLanguage } from '../../components/home/homeTranslations.ts';

type Localized = Record<HomeLanguage, string>;
export type CityContent = {
  id: string;
  name: Localized;
  sources: { id: string; url: string; label: Localized; verifiedAt: string }[];
  facts: { id: string; sourceId: string; text: Localized }[];
  services: Record<string, string[]>;
  pendingOwner: string[];
};
export const VERIFIED_CITY_CONTENT: Readonly<Record<string, CityContent>> = { zuerich, schaffhausen, winterthur };
const languages = ['de', 'en', 'es', 'pt', 'it', 'fr'] as const;
const labels = {
  title: ['Planung für Ihre Adresse in {city}', 'Planning for your address in {city}', 'Planificación para su dirección en {city}', 'Planeamento para a sua morada em {city}', 'Pianificazione per il suo indirizzo a {city}', 'Préparer votre intervention à {city}'],
  windows: ['Nennen Sie Fensterzahl, Öffnungsart und sichere Erreichbarkeit. Fotografieren Sie schwer zugängliche Stellen vorab; das Quartier allein sagt nichts über den nötigen Arbeitsumfang aus.', 'Tell us the window count, opening type and safe accessibility. Send photos of difficult areas beforehand; the neighbourhood alone does not determine the work required.', 'Indique cantidad, apertura y acceso seguro de las ventanas. Envíe fotos de zonas difíciles; el barrio por sí solo no determina el trabajo necesario.', 'Indique quantidade, abertura e acesso seguro às janelas. Envie fotos das zonas difíceis; o bairro, por si só, não determina o trabalho necessário.', 'Indichi numero, apertura e accessibilità sicura delle finestre. Invii foto delle zone difficili; il quartiere da solo non determina il lavoro necessario.', 'Précisez le nombre de vitres, leur ouverture et leur accessibilité sûre. Envoyez des photos des zones difficiles ; le quartier seul ne détermine pas le travail.'],
  end: ['Stimmen Sie Auszugs-, Reinigungs- und Abgabetermin aufeinander ab. Teilen Sie uns die Vorgaben der Verwaltung, den Schlüsselzugang und die zulässige Haltemöglichkeit an der konkreten Adresse mit.', 'Coordinate move-out, cleaning and handover dates. Tell us the property manager’s requirements, key access and lawful stopping arrangements for the exact address.', 'Coordine salida, limpieza y entrega. Indique los requisitos de la administración, el acceso con llaves y la parada permitida en la dirección concreta.', 'Coordene saída, limpeza e entrega. Indique os requisitos da administração, acesso às chaves e paragem permitida na morada concreta.', 'Coordini uscita, pulizia e riconsegna. Indichi requisiti dell’amministrazione, accesso alle chiavi e sosta consentita all’indirizzo esatto.', 'Coordonnez départ, nettoyage et remise. Précisez les exigences de la gérance, l’accès aux clés et l’arrêt autorisé à l’adresse exacte.'],
  regular: ['Für wiederkehrende Reinigungen klären wir den Rhythmus, die gewünschten Räume und die Schlüsselübergabe. Nennen Sie auch Haustiere und empfindliche Oberflächen, damit die Planung zu Ihrem Haushalt passt.', 'For recurring cleaning, we agree the frequency, rooms and key handover. Mention pets and delicate surfaces so planning suits your household.', 'Para limpiezas periódicas acordamos frecuencia, zonas y entrega de llaves. Indique mascotas y superficies delicadas para adaptar la planificación a su hogar.', 'Nas limpezas regulares acordamos frequência, áreas e entrega de chaves. Indique animais e superfícies delicadas para adaptar o planeamento à sua casa.', 'Per le pulizie regolari concordiamo frequenza, locali e consegna delle chiavi. Segnali animali e superfici delicate per pianificare secondo le esigenze della casa.', 'Pour un nettoyage régulier, nous convenons du rythme, des pièces et des clés. Signalez animaux et surfaces délicates pour adapter l’organisation à votre logement.'],
  deep: ['Beschreiben Sie die betroffenen Materialien und Rückstände statt nur die Wohnungsgrösse. Wir klären die Prioritäten, freien Arbeitsflächen und den Zugang zu Wasser und Strom vor dem vereinbarten Einsatz.', 'Describe the affected materials and residues rather than just floor area. We clarify priorities, clear working surfaces and access to water and electricity before the agreed visit.', 'Describa materiales y suciedad, además de la superficie. Aclaramos prioridades, zonas despejadas y acceso a agua y electricidad antes del servicio acordado.', 'Descreva materiais e sujidade, além da área. Esclarecemos prioridades, superfícies livres e acesso a água e eletricidade antes do serviço acordado.', 'Descriva materiali e residui oltre alla superficie. Chiariamo priorità, zone libere e accesso ad acqua ed elettricità prima dell’intervento concordato.', 'Décrivez matériaux et résidus, au-delà de la surface. Nous clarifions priorités, espaces dégagés et accès à l’eau et à l’électricité avant l’intervention convenue.'],
  moving: ['Geben Sie die genaue Abhol- und Zieladresse, Stockwerke, Lift und Möbelmasse an. Prüfen Sie den Weg zwischen Fahrzeug und Haustür; eine Parkplatzreservation allein bestätigt noch nicht die Zufahrt bis zum Eingang.', 'Give exact collection and delivery addresses, floors, lifts and furniture dimensions. Check the carrying route; reserving a parking space alone does not establish access to the entrance.', 'Indique direcciones exactas, plantas, ascensores y medidas de muebles. Compruebe el recorrido a pie; reservar aparcamiento no confirma por sí solo el acceso hasta el portal.', 'Indique moradas exatas, pisos, elevadores e medidas dos móveis. Verifique o percurso a pé; reservar estacionamento não confirma, por si só, o acesso até à entrada.', 'Indichi indirizzi esatti, piani, ascensori e misure dei mobili. Verifichi il percorso a piedi; prenotare un parcheggio da solo non conferma l’accesso all’ingresso.', 'Précisez adresses exactes, étages, ascenseurs et dimensions des meubles. Vérifiez le trajet à pied ; réserver une place ne confirme pas à lui seul l’accès à l’entrée.'],
} as const;
const serviceKeys: Record<string, keyof Omit<typeof labels, 'title'>> = { 'window-cleaning': 'windows', 'end-of-tenancy': 'end', 'daily-cleaning': 'regular', 'deep-cleaning': 'deep', 'moving-furniture': 'moving' };

export function getCityServiceContent(cityId: string, serviceId: string, language: unknown) {
  const cityKey = cityId === 'zurich' ? 'zuerich' : cityId;
  const city = Object.hasOwn(VERIFIED_CITY_CONTENT, cityKey) ? VERIFIED_CITY_CONTENT[cityKey] : null;
  const ids = city && Object.hasOwn(city.services, serviceId) ? city.services[serviceId] : null;
  const service = Object.hasOwn(serviceKeys, serviceId) ? serviceKeys[serviceId] : null;
  if (!city || !ids || !service) return null;
  const locale = normalizeHomeLanguage(language), index = languages.indexOf(locale);
  return {
    cityId: city.id,
    title: labels.title[index].replace('{city}', city.name[locale]),
    preparation: labels[service][index],
    facts: ids.map(id => {
      const fact = city.facts.find(item => item.id === id)!;
      const source = city.sources.find(item => item.id === fact.sourceId)!;
      return { id, text: fact.text[locale], source: { ...source, label: source.label[locale] } };
    }),
  };
}
