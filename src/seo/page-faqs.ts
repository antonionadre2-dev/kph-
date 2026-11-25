import { localText } from './local-translations.ts';
import { homeText } from '../../components/home/homeTranslations.ts';
const faqAnswers = {
  windows: {
    question: 'Welche Fensterseiten können gereinigt werden?',
    answer: 'Das hängt von der sicheren Zugänglichkeit ab. Nennen Sie Anzahl, ungefähre Grösse, Öffnungsart und Stockwerk. Fotos helfen, Innen- und Aussenseiten sowie Rahmen und Fensterbänke vorab abzustimmen.',
  },
  end: {
    question: 'Wie bereite ich die Wohnungsabgabe vor?',
    answer: 'Nennen Sie Reinigungs- und Übergabetermin sowie die Anforderungen Ihrer Verwaltung. Teilen Sie mit, welche Räume leer sind und welche Geräte, Fenster oder Nebenräume gereinigt werden sollen. Den Leistungsumfang vereinbaren wir vorab.',
  },
  regular: {
    question: 'Was unterscheidet regelmässige Reinigung und Grundreinigung?',
    answer: 'Bei regelmässiger Reinigung vereinbaren wir wiederkehrende Aufgaben und einen Rhythmus. Eine Grundreinigung konzentriert sich einmalig intensiver auf die besprochenen Bereiche und Verschmutzungen. Nennen Sie Ihre Prioritäten, damit wir die passende Leistung planen.',
  },
  moving: {
    question: 'Passt mein Umzug in eine Fahrt?',
    answer: 'Der Ford Transit hat innen 255,5 cm Bodenlänge, maximal 177,5 cm Breite und 140,6 cm Höhe. Zwischen den Radkästen sind es 139 cm. Türöffnungen, Möbelmasse und Packweise bestimmen mit, was passt; senden Sie eine Liste und Masse oder Fotos zur Planung.',
  },
};

export function getServicePageFaqs(service: string | undefined, language: string) {
  const selected = service === 'deep' ? faqAnswers.regular : faqAnswers[service as keyof typeof faqAnswers];
  const faqs = [ ...(selected ? [selected] : [faqAnswers.end, faqAnswers.moving]),
    { question: 'Kann ich Reinigung und kleinen Umzug zusammen anfragen?', answer: 'Ja. Geben Sie beide Aufgaben, die Adressen und die gewünschten Termine an. Wir klären den Umfang und ob sich die Reihenfolge für Ihren Auftrag abstimmen lässt.' },
    { question: 'Wo ist Kraken PFM ansässig?', answer: 'Kraken PFM ist an der Seewadelstrasse 3, 8203 Schaffhausen ansässig. Von dort planen wir Reinigung und kleine Umzüge für Privathaushalte in Zürich, Schaffhausen und Winterthur.' },
  ];
  return faqs.map(faq => ({ question: localText(language,faq.question), answer: localText(language,faq.answer) }));
}

const HOME_FAQS = [
  ['Übernehmen Sie auch kleine Aufträge?', 'Ja. Wir konzentrieren uns auf Privathaushalte, Wohnungen mit 1–4 Zimmern und kleine Umzüge. Auch eine einzelne Fensterreinigung oder eine einmalige Grundreinigung können Sie anfragen.'],
  ['Wie plane ich meinen Auftrag?', 'Wählen Sie im Rechner die gewünschte Leistung und geben Sie die Details zu Ihrer Wohnung oder Ihrem Umzug an.'],
  ['Wird Mehrwertsteuer verrechnet?', 'Es wird keine Mehrwertsteuer verrechnet. Die Angaben zu Ihrem Auftrag erhalten Sie im Rechner und in Ihrer persönlichen Bestätigung.'],
  ['In welchen Regionen ist Kraken tätig?', 'Wir unterstützen Privathaushalte in Zürich, Schaffhausen und Winterthur. Geben Sie Ihre Postleitzahl an, damit wir Ihren Auftrag und die Anfahrt gemeinsam prüfen können.'],
  ['Welches Fahrzeug nutzen Sie für kleine Umzüge?', 'Wir nutzen einen Ford Transit. Teilen Sie uns mit, welche Möbel und Kartons transportiert werden sollen und wie die Zugänge aussehen. So können wir Fahrzeug, Helfer und benötigte Fahrten passend abstimmen.'],
];
export function getHomeFaqs(language: string) { return HOME_FAQS.map(([question,answer]) => ({question:homeText(language,question),answer:homeText(language,answer)})); }
