import type { TermsTranslation } from './types';
import { routeLanguage } from '../../src/routing/site-paths';

// Editorial cleanup of the existing document; commercial conditions require owner review.
const documents = {
  "de": {
    "title": "Allgemeine Geschäftsbedingungen (AGB)",
    "description": "Diese AGB gelten für Reinigungen und kleine Umzüge für Privathaushalte von Kraken PFM.",
    "sections": [
      {
        "title": "1. Geltungsbereich & Definitionen",
        "content": "Diese Allgemeinen Geschäftsbedingungen (AGB) gelten für Fensterreinigung, Umzugsreinigung, regelmässige Reinigung, Grundreinigung und kleine Umzüge von Kraken PFM (Kraken, wir) für Privathaushalte. Abweichende Bedingungen gelten nur bei schriftlicher Akzeptanz."
      },
      {
        "title": "2. Angebote, Schätzungen & Vertragsabschluss",
        "content": "Ein Vertrag kommt durch die Bestätigung einer Offerte oder Online-Buchung zustande. Der Leistungsumfang definiert sich über die Buchungsbestätigung. Schätzungen des Online-Rechners sind unverbindlich. Unrichtige Angaben berechtigen Kraken zu Preisanpassungen. Express-Buchungen erfordern 15% Anzahlung."
      },
      {
        "title": "3. Preise, MwSt. & Zuschläge",
        "content": "Alle Preise sind in Schweizer Franken (CHF) angegeben. Der Rechnerpreis bezieht sich auf den gewählten Leistungsumfang; gewählte Extras werden im Gesamtpreis ausgewiesen. Massgeblich sind die bestätigte Offerte und der vereinbarte Umfang. Kraken ist derzeit nicht mehrwertsteuerpflichtig und stellt keine Mehrwertsteuer in Rechnung."
      },
      {
        "title": "4. Anfahrt im Preis enthalten",
        "content": "Die übliche Anfahrt für die gewählte Leistung ist im Preis des Rechners enthalten. Ausserordentliche Anfahrtskosten bedürfen einer vorherigen Vereinbarung und müssen in der schriftlichen Offerte ausgewiesen sein."
      },
      {
        "title": "5. Zahlungsbedingungen & Verzug",
        "content": "Zahlungen erfolgen über Payrexx, Banküberweisung oder QR-Rechnung. Der Restbetrag ist innert 7 Tagen fällig. Bei Zahlungsverzug fallen 5% Verzugszins sowie Mahngebühren von CHF 20.00 (2. Mahnung) und CHF 50.00 (3. Mahnung) an. Inkassokosten gehen zu Lasten des Kunden."
      },
      {
        "title": "6. Stornierungen, Terminverschiebungen & Nichterscheinen",
        "content": "Stornierungen müssen schriftlich erfolgen. Gebühren: >48h vor Start: kostenlos; <48h: 50% des Preises; <12h, Nichterscheinen oder Absage vor Ort: 100% des Preises. Eine kostenlose Verschiebung ist >24h vor Start nach Verfügbarkeit zulässig."
      },
      {
        "title": "7. Wiederkehrende Reinigungen und Kündigung",
        "content": "Wiederkehrende Pläne laufen auf unbestimmte Zeit. Kündigung: 30 Tage auf Monatsende (7 Tage während der 2-monatigen Probezeit). Terminausfälle erfordern 48h Frist. Jährliche Preisanpassungen sind mit 60 Tagen Vorankündigung möglich."
      },
      {
        "title": "8. Umzugsreinigung — Abnahmegarantie",
        "content": "Beinhaltet kostenlose Mängelbehebung bei offizieller Wohnungsübergabe (Abgabeprotokoll). Gültig, wenn: (a) Kraken innert 24h schriftlich mit Protokoll/Fotos benachrichtigt wird; (b) Übergabe innert 72h nach Reinigung stattfindet; (c) Objekt unbewohnt und ungenutzt blieb. Normaler Verschleiss, Schäden oder ausgeschlossene Bereiche sind nicht gedeckt."
      },
      {
        "title": "9. Umzugs- & Transportdienstleistungen",
        "content": "Sie stellen ein genaues Inventar bereit. Bargeld, Schmuck, Gefahrstoffe sowie Pflanzen und Tiere sind ohne schriftliche Vereinbarung vom Transport ausgeschlossen. Verdeckte Schäden sind innert 3 Tagen zu melden."
      },
      {
        "title": "10. Pflichten des Kunden, Zugang & Wartezeiten",
        "content": "Sie stellen ungehinderten Zugang, Strom, fliessendes Wasser, Heizung und den vorgesehenen Aufzug bereit. Bei fehlendem Zugang gilt die bestehende Stornoregelung. Übergebene Schlüssel werden sicher und anonymisiert aufbewahrt."
      },
      {
        "title": "11. Mängelrügen & Reklamationen",
        "content": "Arbeiten sind sofort nach Abschluss zu prüfen. Sichtbare Mängel innerhalb von 48h rügen; verdeckte Mängel innert 48h nach Entdeckung (max. 7 Tage nach Abschluss). Primäres Recht ist Nachbesserung. Rechnungsrückbehalte sind nur anteilig für betroffene Teile zulässig."
      },
      {
        "title": "12. Haftung & Versicherung",
        "content": "Angaben zu einer allfälligen Versicherungsdeckung ergeben sich aus den einschlägigen Versicherungsunterlagen und der schriftlichen Offerte. Fragen dazu klären Sie vor dem Auftrag mit Kraken."
      },
      {
        "title": "13. Subunternehmer, spezialisierte Partner & Ablehnungsrecht",
        "content": "Kraken kann qualifizierte Drittspezialisten beiziehen, bleibt jedoch alleiniger Vertragspartner. Kraken behält sich das Recht vor, Arbeiten abzulehnen oder einzustellen, wenn vor Ort unzumutbare Sicherheits- oder Gesundheitsrisiken bestehen."
      },
      {
        "title": "14. Höhere Gewalt (Force Majeure)",
        "content": "Keine Partei haftet für Verzögerungen oder Nichterfüllung aufgrund von Ereignissen ausserhalb zumutbarer Kontrolle (Naturkatastrophen, Streiks, Pandemien, Infrastrukturausfälle). Die Pflichten ruhen; dauert das Ereignis >30 Tage, können beide Parteien zurücktreten."
      },
      {
        "title": "15. Datenschutz & Dokumentation",
        "content": "Datenverarbeitung erfolgt gemäss dem Schweizer Datenschutzgesetz (DSG) und der DSGVO. Vorher-/Nachher-Fotos können zur Qualitätskontrolle und Versicherung erstellt werden. Die werbliche Nutzung von Fotos erfordert die vorherige Zustimmung."
      },
      {
        "title": "16. Änderungen & Salvatorische Klausel",
        "content": "Kraken kann diese AGB mit einer Frist von 30 Tagen ändern. Nicht-Widerspruch gilt als Genehmigung. Sollte eine Bestimmung ungültig sein, bleibt die Gültigkeit der übrigen unberührt; die ungültige wird durch eine dem wirtschaftlichen Zweck am nächsten kommende ersetzt."
      },
      {
        "title": "17. Anwendbares Recht & Gerichtsstand",
        "content": "Alle Verträge unterliegen ausschliesslich materiellem Schweizer Recht unter Ausschluss des UN-Kaufrechts (CISG). Gerichtsstand ist Schaffhausen, Schweiz. Zwingende gesetzliche Konsumentengerichtsstände bleiben vorbehalten."
      }
    ],
    "verificationTitle": "Version der Bedingungen",
    "lastUpdated": "Bedingungsversion: kraken-2026-11-25 · Redaktionelle Prüfung: 25.11.2026",
    "companyInfo": "Kraken PFM | Seewadelstrasse 3, 8203 Schaffhausen, Schweiz",
    "backHome": "Zurück zur Startseite"
  },
  "en": {
    "title": "General Terms & Conditions (AGB)",
    "description": "These terms govern cleaning and small moves for private households provided by Kraken PFM.",
    "sections": [
      {
        "title": "1. Scope of Application & Definitions",
        "content": "These terms apply to window cleaning, end-of-tenancy cleaning, regular cleaning, deep cleaning and small moves provided by Kraken PFM (Kraken, we) for private households. Different conditions apply only if accepted in writing."
      },
      {
        "title": "2. Offers, Estimates & Contract Conclusion",
        "content": "A contract is concluded when you confirm an offer or booking. The booking confirmation defines the scope. Estimates from the online calculator are preliminary. Incorrect information entitles Kraken to adjust pricing. Express bookings require a 15% deposit."
      },
      {
        "title": "3. Prices, VAT & Surcharges",
        "content": "All prices are in Swiss francs (CHF). The calculator price relates to the selected scope; selected extras are shown in the total. The confirmed quote and agreed scope apply. Kraken is currently not liable for VAT and does not charge it."
      },
      {
        "title": "4. Travel included in the price",
        "content": "Ordinary travel for the selected service is included in the calculator price. Any exceptional travel expense requires prior agreement and must be set out in the written quote."
      },
      {
        "title": "5. Payment Terms & Default",
        "content": "Payments are processed via Payrexx, bank transfer, or QR-bill. Balance is due within 7 days of invoice. Default interest of 5% p.a. applies, plus reminder fees of CHF 20.00 (2nd reminder) and CHF 50.00 (3rd reminder). Collection costs are borne by the client."
      },
      {
        "title": "6. Cancellations, Rescheduling & No-Shows",
        "content": "Cancellations must be in writing. Fees: >48 hours notice: free; <48 hours: 50% of price; <12 hours, no-show, or cancellation at door: 100% of price. One free rescheduling is permitted >24 hours prior, subject to availability."
      },
      {
        "title": "7. Recurring cleaning and termination",
        "content": "Recurring plans are indefinite. Termination requires 30 days’ notice to the end of a month (7 days during the 2-month trial). Skipping a visit requires 48 hours’ notice. Prices may be adjusted once a year with 60 days’ notice."
      },
      {
        "title": "8. End-of-Tenancy Cleaning — Handover Guarantee",
        "content": "Includes free rectification of landlord-identified cleaning deficiencies. Valid if: (a) notified in writing within 24h of inspection with protocol/photos; (b) inspection is within 72h of cleaning; (c) property remained unoccupied. Does not cover wear and tear, structural defects, or excluded items."
      },
      {
        "title": "9. Moving & Transport Services",
        "content": "You provide an accurate inventory. Cash, jewellery, hazardous substances, plants and animals are excluded from transport without a written agreement. Hidden damage must be reported within 3 days."
      },
      {
        "title": "10. Client Responsibilities, Access & Waiting Time",
        "content": "You provide access, electricity, running water, heating and the planned lift. If access is not provided, the existing cancellation conditions apply. Keys handed to us are stored securely and anonymously."
      },
      {
        "title": "11. Complaints & Notification of Defects",
        "content": "Inspect work on completion. Visible defects must be reported within 48h; hidden defects within 48h of discovery (max 7 days post-completion). Primary remedy is rectification. Proportionate invoice withholding is allowed only for affected parts."
      },
      {
        "title": "12. Liability & Insurance",
        "content": "Information about any applicable insurance cover is set out in the relevant policy documents and written quote. Please clarify questions with Kraken before the job."
      },
      {
        "title": "13. Subcontractors, Specialized Partners & Right of Refusal",
        "content": "Kraken may engage qualified third-party specialists but remains the sole contractual partner. Kraken reserves the right to refuse or terminate service if conditions pose safety or health risks."
      },
      {
        "title": "14. Force Majeure",
        "content": "Neither party is liable for delays or non-performance caused by events beyond reasonable control (natural disasters, strikes, pandemic, power failures). Obligations are suspended for the duration. If lasting >30 days, either party may withdraw."
      },
      {
        "title": "15. Data Protection & Documentation",
        "content": "We process personal data compliant with the Swiss Federal Act on Data Protection (revFADP) and GDPR. Before/after photos may be taken for quality control and insurance. Marketing use of photos requires prior consent."
      },
      {
        "title": "16. Amendments & Severability",
        "content": "Kraken may amend these T&Cs with 30 days notice. Non-objection constitutes acceptance. If any provision is invalid, the remaining provisions remain unaffected and are replaced with a valid clause closest to the economic purpose."
      },
      {
        "title": "17. Governing Law & Jurisdiction",
        "content": "All contracts are governed exclusively by Swiss substantive law, excluding CISG. Place of jurisdiction is Schaffhausen, Switzerland. Mandatory consumer places of jurisdiction remain reserved."
      }
    ],
    "verificationTitle": "Terms version",
    "lastUpdated": "Terms version: kraken-2026-11-25 · Editorial review: 25.11.2026",
    "companyInfo": "Kraken PFM | Seewadelstrasse 3, 8203 Schaffhausen, Switzerland",
    "backHome": "Back to Home"
  },
  "es": {
    "title": "Condiciones Generales de Contratación (CGC)",
    "description": "Estas condiciones generales regulan la limpieza y las pequeñas mudanzas para hogares particulares de Kraken PFM.",
    "sections": [
      {
        "title": "1. Ámbito de Aplicación y Definiciones",
        "content": "Estas condiciones se aplican a la limpieza de ventanas, de fin de alquiler, periódica, a fondo y a las pequeñas mudanzas que presta Kraken PFM (Kraken, nosotros) a hogares particulares. Las condiciones distintas solo se aplican si se aceptan por escrito."
      },
      {
        "title": "2. Ofertas, Estimaciones y Formalización del Contrato",
        "content": "El contrato se formaliza cuando confirma un presupuesto o una reserva. El alcance se define en la confirmación de reserva. Las estimaciones del calculador en línea son preliminares. La información incorrecta autoriza a Kraken a ajustar los precios. Las reservas express requieren un anticipo del 15%."
      },
      {
        "title": "3. Precios, IVA y Recargos",
        "content": "Todos los precios se indican en francos suizos (CHF). El precio del calculador corresponde al alcance elegido; los extras seleccionados figuran en el total. Se aplican el presupuesto confirmado y los trabajos acordados. Actualmente Kraken no está sujeto a IVA y no lo factura."
      },
      {
        "title": "4. Desplazamiento incluido en el precio",
        "content": "El desplazamiento ordinario para el servicio seleccionado está incluido en el precio del calculador. Cualquier gasto extraordinario de desplazamiento requiere acuerdo previo y debe constar en el presupuesto escrito."
      },
      {
        "title": "5. Condiciones de Pago y Mora",
        "content": "Pagos vía Payrexx, transferencia o QR-bill. El saldo vence a los 7 días de la factura. Mora automática tras vencer plazo, con un interés anual del 5% y cargos por reclamación de 20,00 CHF (2ª reclamación) y 50,00 CHF (3ª reclamación). Costes de cobro a cargo del cliente."
      },
      {
        "title": "6. Cancelaciones, Aplazamientos y No Presentación",
        "content": "Cancelaciones por escrito. Tasas: >48 horas de antelación: gratis; <48 horas: 50% del importe; <12 horas, no presentación o cancelación en puerta: 100% del presupuesto. Un aplazamiento gratuito es permitido >24 horas antes, según disponibilidad."
      },
      {
        "title": "7. Limpiezas periódicas y rescisión",
        "content": "Los planes periódicos tienen duración indefinida. Para rescindirlos se requiere un preaviso de 30 días a fin de mes (7 días durante el periodo de prueba de 2 meses). Omitir una visita requiere 48 horas de aviso. Los precios pueden ajustarse anualmente con 60 días de preaviso."
      },
      {
        "title": "8. Limpieza de Final de Arrendamiento — Garantía de Entrega",
        "content": "Garantía de entrega (Wohnungsabgabe): subsanación gratuita de deficiencias. Válido si: (a) notificado por escrito en 24h tras inspección con protocolo/fotos; (b) inspección en 72h tras limpieza; (c) propiedad desocupada e inutilizada. No cubre daños estructurales, desgaste o áreas excluidas."
      },
      {
        "title": "9. Servicios de Mudanza y Transporte",
        "content": "Debe facilitar un inventario preciso. El dinero, las joyas, las sustancias peligrosas, las plantas y los animales quedan excluidos del transporte sin acuerdo escrito. Los daños ocultos deben comunicarse en un plazo de 3 días."
      },
      {
        "title": "10. Responsabilidades del Cliente, Acceso y Tiempos de Espera",
        "content": "Debe facilitar el acceso, electricidad, agua corriente, calefacción y el ascensor previsto. Si no se facilita el acceso, se aplican las condiciones de cancelación existentes. Las llaves entregadas se guardan de forma segura y anónima."
      },
      {
        "title": "11. Quejas y Notificación de Defectos",
        "content": "Inspeccionar al finalizar. Defectos visibles en 48h; ocultos en 48h tras descubrimiento (máx 7 días post-servicio). Remedio primario es la rectificación. Retenciones parciales solo permitidas para la sección afectada."
      },
      {
        "title": "12. Responsabilidad Civil y Seguros",
        "content": "La información sobre una posible cobertura de seguro figura en la documentación de la póliza y el presupuesto escrito correspondientes. Aclare sus dudas con Kraken antes del encargo."
      },
      {
        "title": "13. Subcontratistas, Socios Especializados y Derecho de Rechazo",
        "content": "Kraken puede contratar terceros cualificados pero sigue siendo el único socio contractual. Kraken puede rechazar o suspender el servicio si hay riesgos de seguridad o salud."
      },
      {
        "title": "14. Fuerza Mayor",
        "content": "Ninguna parte responde de retrasos o incumplimientos por causas fuera de control (desastres, huelgas, pandemias, fallos eléctricos). Obligaciones suspendidas; si dura >30 días, se puede rescindir."
      },
      {
        "title": "15. Protección de Datos y Documentación",
        "content": "Procesamiento de datos conforme a la Ley Suiza de Protección de Datos (revDSG) y el RGPD. Fotos de antes/después para control de calidad y seguros. Uso comercial de fotos requiere consentimiento previo."
      },
      {
        "title": "16. Modificaciones y Divisibilidad",
        "content": "Kraken puede modificar estas CGC con aviso de 30 días. No oponerse implica aceptación. Si una cláusula es inválida, el resto sigue vigente y la inválida se reemplaza por otra que cumpla el mismo fin económico."
      },
      {
        "title": "17. Legislación Aplicable y Jurisdicción",
        "content": "Todos los contratos se rigen por el derecho suizo, excluyendo la CISG. Fuero exclusivo en Schaffhausen, Suiza. Se reservan los fueros de consumo obligatorios."
      }
    ],
    "verificationTitle": "Versión de las condiciones",
    "lastUpdated": "Versión de condiciones: kraken-2026-11-25 · Revisión editorial: 25.11.2026",
    "companyInfo": "Kraken PFM | Seewadelstrasse 3, 8203 Schaffhausen, Suiza",
    "backHome": "Volver al Inicio"
  },
  "pt": {
    "title": "Condições Gerais de Contrato (CGC)",
    "description": "Estas condições gerais regulam os serviços de limpeza e pequenas mudanças para casas particulares da Kraken PFM.",
    "sections": [
      {
        "title": "1. Âmbito de Aplicação & Definições",
        "content": "Estas condições aplicam-se à limpeza de janelas, de fim de arrendamento, regular, a fundo e às pequenas mudanças prestadas pela Kraken PFM (Kraken, nós) a casas particulares. Condições diferentes só se aplicam se forem aceites por escrito."
      },
      {
        "title": "2. Ofertas, Estimativas & Conclusão do Contrato",
        "content": "O contrato é formalizado quando confirma um orçamento ou uma reserva. O âmbito é definido na confirmação da reserva. As estimativas da calculadora em linha são aproximadas. Informações incorretas autorizam a Kraken a ajustar os preços. As reservas express requerem um adiantamento de 15%."
      },
      {
        "title": "3. Preços, IVA & Sobretaxas",
        "content": "Todos os preços são indicados em francos suíços (CHF). O preço da calculadora corresponde ao âmbito escolhido; os extras selecionados constam do total. Aplicam-se o orçamento confirmado e o âmbito acordado. Atualmente a Kraken não está sujeita a IVA e não o fatura."
      },
      {
        "title": "4. Deslocação incluída no preço",
        "content": "A deslocação habitual para o serviço escolhido está incluída no preço da calculadora. Qualquer despesa de deslocação excecional exige acordo prévio e deve constar do orçamento escrito."
      },
      {
        "title": "5. Condições de Pagamento & Mora",
        "content": "Pagamentos seguros via Payrexx, transferência ou fatura QR. O saldo restante vence 7 dias após a fatura. A mora é automática após o vencimento, com juros anuais de 5% e taxas de cobrança de CHF 20.00 (2º aviso) e CHF 50.00 (3º aviso). Os custos de cobrança judicial são suportados pelo cliente."
      },
      {
        "title": "6. Cancelamentos, Adiamentos & Não-Comparência",
        "content": "Os cancelamentos devem ser feitos por escrito. Taxas: aviso >48 horas: gratuito; <48 horas: 50% do valor; <12 horas, não-comparência ou cancelamento no local: 100% do orçamento. É permitido um adiamento gratuito com aviso >24 horas, sujeito a disponibilidade."
      },
      {
        "title": "7. Limpezas regulares e rescisão",
        "content": "Os planos regulares são por tempo indeterminado. A rescisão exige aviso de 30 dias para o fim de um mês (7 dias durante o período de experiência de 2 meses). Cancelar uma visita exige 48 horas de aviso. Os preços podem ser ajustados anualmente com aviso prévio de 60 dias."
      },
      {
        "title": "8. Limpeza de Final de Arrendamento — Garantia de Entrega",
        "content": "Inclui a correção gratuita de quaisquer deficiências detetadas pelo senhorio na vistoria oficial (Abgabeprotokoll). Condições: (a) comunicado por escrito em 24h com protocolo/fotos; (b) vistoria em até 72h após a limpeza; (c) imóvel mantido desocupado e sem uso. Não cobre desgaste normal, danos estruturais ou áreas excluídas."
      },
      {
        "title": "9. Serviços de Mudança & Logística",
        "content": "Deve fornecer um inventário preciso. Dinheiro, joias, substâncias perigosas, plantas e animais ficam excluídos do transporte sem acordo escrito. Danos ocultos devem ser comunicados no prazo de 3 dias."
      },
      {
        "title": "10. Deveres do Cliente, Acesso & Tempos de Espera",
        "content": "Deve facilitar o acesso, eletricidade, água corrente, aquecimento e o elevador previsto. Se não houver acesso, aplicam-se as condições de cancelamento existentes. As chaves entregues são guardadas de forma segura e anónima."
      },
      {
        "title": "11. Reclamações & Notificação de Defeitos",
        "content": "Inspecionar os trabalhos logo após a conclusão. Defeitos visíveis reportados em 48h; ocultos em 48h após a descoberta (máx. 7 dias pós-serviço). A correção é a solução primária. Retenções de faturas são autorizadas apenas para a parte afetada."
      },
      {
        "title": "12. Responsabilidade Civil & Seguros",
        "content": "A informação sobre uma eventual cobertura de seguro consta dos documentos da apólice e do orçamento escrito correspondentes. Esclareça as suas dúvidas com a Kraken antes do serviço."
      },
      {
        "title": "13. Subempreiteiros, Parceiros Especializados & Direito de Recusa",
        "content": "A Kraken pode subcontratar parceiros qualificados mas permanece como único parceiro contratual. A Kraken reserva o direito de recusar ou suspender o serviço se existirem riscos para a saúde ou segurança das equipas."
      },
      {
        "title": "14. Força Maior",
        "content": "Nenhuma das partes responde por atrasos ou incumprimentos decorrentes de eventos fora de controlo (catástrofes, greves, pandemias, falhas de energia). Obrigações suspensas; se durar >30 dias, qualquer parte pode rescindir."
      },
      {
        "title": "15. Proteção de Dados & Documentazione",
        "content": "Tratamento confidencial de dados pessoais de acordo com a Lei de Proteção de Dados Suíça (LPD) e o RGPD. Fotos 'antes/depois' podem ser feitas para controlo de qualidade e seguros. Uso promocional de fotos exige consentimento prévio."
      },
      {
        "title": "16. Alterações & Cláusula de Salvaguarda",
        "content": "A Kraken pode alterar estas CGC com aviso prévio de 30 dias. A não objeção implica aceitação. Se alguma cláusula for considerada inválida, as restantes continuam vigentes e a cláusula inválida é substituída por uma equivalente ao fim económico."
      },
      {
        "title": "17. Legislação Aplicável & Foro Competente",
        "content": "Todos os contratos são regidos exclusivamente pelo direito suíço material, excluindo a CISG. O foro exclusivo é em Schaffhausen, Suíça. Salvaguardam-se os foros de consumo obrigatórios."
      }
    ],
    "verificationTitle": "Versão das condições",
    "lastUpdated": "Versão das condições: kraken-2026-11-25 · Revisão editorial: 25.11.2026",
    "companyInfo": "Kraken PFM | Seewadelstrasse 3, 8203 Schaffhausen, Suíça",
    "backHome": "Regressar à Página de Início"
  },
  "it": {
    "title": "Condizioni Generali di Contratto (CGC)",
    "description": "Queste condizioni generali disciplinano le pulizie e i piccoli traslochi per abitazioni private di Kraken PFM.",
    "sections": [
      {
        "title": "1. Ambito di Applicazione & Definizioni",
        "content": "Queste condizioni si applicano alla pulizia di finestre, di fine locazione, regolare, a fondo e ai piccoli traslochi forniti da Kraken PFM (Kraken, noi) per abitazioni private. Condizioni diverse si applicano solo se accettate per iscritto."
      },
      {
        "title": "2. Offerte, Stime & Conclusione del Contratto",
        "content": "Il contratto si perfeziona quando conferma un preventivo o una prenotazione. La conferma definisce la portata del servizio. Le stime del calcolatore online sono indicative. Informazioni errate autorizzano Kraken ad adeguare i prezzi. Le prenotazioni express richiedono un acconto del 15%."
      },
      {
        "title": "3. Prezzi, IVA & Maggiorazioni",
        "content": "Tutti i prezzi sono indicati in franchi svizzeri (CHF). Il prezzo del calcolatore si riferisce alla portata scelta; gli extra selezionati sono indicati nel totale. Si applicano il preventivo confermato e le prestazioni concordate. Kraken attualmente non è soggetta a IVA e non la fattura."
      },
      {
        "title": "4. Trasferta inclusa nel prezzo",
        "content": "La trasferta ordinaria per il servizio scelto è inclusa nel prezzo del calcolatore. Eventuali spese di trasferta eccezionali richiedono un accordo preventivo e devono essere indicate nel preventivo scritto."
      },
      {
        "title": "5. Termini di Pagamento & Mora",
        "content": "Pagamenti sicuri tramite Payrexx, bonifico o polizza QR. Il saldo è esigibile entro 7 giorni dalla fatturazione. La mora è automatica alla scadenza, con un interesse annuo del 5% e spese di sollecito di CHF 20.00 (2° sollecito) e CHF 50.00 (3° sollecito). Le spese di recupero crediti sono a carico del cliente."
      },
      {
        "title": "6. Cancellazioni, Rinvii & Mancata Presentazione",
        "content": "Le cancellazioni devono essere formate per iscritto. Penali: preavviso >48 ore: gratuito; <48 ore: 50% del prezzo; <12 ore, mancata presentazione o cancellazione sul posto: 100% del preventivo. Un rinvio gratuito è consentito >24 ore prima dell'intervento, previa disponibilità."
      },
      {
        "title": "7. Pulizie regolari e risoluzione",
        "content": "I piani regolari sono a tempo indeterminato. La risoluzione richiede un preavviso di 30 giorni per la fine di un mese (7 giorni durante il periodo di prova di 2 mesi). Saltare una visita richiede 48 ore di preavviso. I prezzi possono essere adeguati annualmente con 60 giorni di preavviso."
      },
      {
        "title": "8. Pulizia di Fine Locazione — Garanzia di Consegna",
        "content": "Include la risoluzione gratuita di qualsiasi lacuna riscontrata dal locatore durante il collaudo ufficiale (Abgabeprotokoll). Condizioni: (a) notifica scritta entro 24h con protocollo/foto; (b) collaudo ufficiale entro 72h dalla pulizia; (c) immobile rimasto sfitto e inutilizzato. Esclude la normale usura, difetti strutturali ed elementi esclusi."
      },
      {
        "title": "9. Servizi di Trasloco & Logistica",
        "content": "Lei fornisce un inventario preciso. Contanti, gioielli, sostanze pericolose, piante e animali sono esclusi dal trasporto senza accordo scritto. I danni nascosti devono essere segnalati entro 3 giorni."
      },
      {
        "title": "10. Doveri del Cliente, Accesso & Tempi d'Attesa",
        "content": "Lei mette a disposizione l’accesso, l’elettricità, l’acqua corrente, il riscaldamento e l’ascensore previsto. In mancanza di accesso si applicano le condizioni di cancellazione esistenti. Le chiavi consegnate sono custodite in modo sicuro e anonimo."
      },
      {
        "title": "11. Reclami & Segnalazione dei Difetti",
        "content": "Controllare il lavoro immediatamente al termine. Segnalare i difetti visibili entro 48 ore; occulti entro 48 ore dalla scoperta (max 7 giorni post-intervento). Il rimedio primario è la rettifica. Trattenute parziali della fattura sono consentite solo per la sezione interessata."
      },
      {
        "title": "12. Responsabilità Civile & Assicurazioni",
        "content": "Le informazioni su un’eventuale copertura assicurativa risultano dai relativi documenti di polizza e dal preventivo scritto. Chiarisca le sue domande con Kraken prima dell’incarico."
      },
      {
        "title": "13. Subappaltatori, Partner Specializzati & Diritto di Rifiuto",
        "content": "Kraken è libera di avvalersi di subappaltatori specializzati ma rimane l'unico partner contrattuale. Kraken si riserva di annullare o sospendere il servizio se le condizioni compromettono la salute o la sicurezza del personale."
      },
      {
        "title": "14. Forza Maggiore",
        "content": "Nessuna delle parti risponde di ritardi o inadempimenti dovuti a forza maggiore (catastrofi, scioperi, pandemie, interruzioni di corrente). Obblighi sospesi; se la durata supera i 30 giorni, ciascuna parte ha il diritto di recedere."
      },
      {
        "title": "15. Protezione dei Dati & Documentazione",
        "content": "Trattamento riservato dei dati personali ai sensi della Legge svizzera sulla protezione dei dati (LPD) e del GDPR. Possono essere scattate foto 'prima/dopo' per il controllo qualità e scopi assicurativi. L'uso promozionale delle foto è soggetto a preventivo consenso."
      },
      {
        "title": "16. Modifiche & Clausola Salvatoria",
        "content": "Kraken si riserva di modificare le presenti CGC con un preavviso di 30 giorni. La mancata opposizione equivale ad accettazione. Se una clausola è dichiarata invalida, le altre rimangono in vigore e quella invalida viene sostituita con la disposizione più vicina allo scopo economico."
      },
      {
        "title": "17. Legge Applicabile & Foro Competente",
        "content": "Tutti i contratti sono regolati esclusivamente dal diritto svizzero materiale, ad esclusione della CISG. Il foro competente esclusivo è Sciaffusa, Svizzera. Sono fatti salvi i fori di consumo imperativi."
      }
    ],
    "verificationTitle": "Versione delle condizioni",
    "lastUpdated": "Versione delle condizioni: kraken-2026-11-25 · Revisione editoriale: 25.11.2026",
    "companyInfo": "Kraken PFM | Seewadelstrasse 3, 8203 Schaffhausen, Svizzera",
    "backHome": "Ritorna alla Home page"
  },
  "fr": {
    "title": "Conditions Générales de Vente (CGV)",
    "description": "Ces conditions générales régissent les nettoyages et petits déménagements pour les particuliers proposés par Kraken PFM.",
    "sections": [
      {
        "title": "1. Champ d'Application & Définitions",
        "content": "Ces conditions s’appliquent au nettoyage des vitres, de fin de bail, régulier, en profondeur et aux petits déménagements fournis par Kraken PFM (Kraken, nous) pour les particuliers. Des conditions différentes ne s’appliquent que si elles sont acceptées par écrit."
      },
      {
        "title": "2. Offres, Estimations & Conclusion de Contrat",
        "content": "Un contrat est conclu lorsque vous confirmez une offre ou une réservation. La confirmation définit l’étendue de la prestation. Les estimations du calculateur en ligne sont provisoires. Des informations incorrectes autorisent Kraken à ajuster le prix. Les réservations express nécessitent un acompte de 15%."
      },
      {
        "title": "3. Tarifs, TVA & Majorations",
        "content": "Tous les prix sont indiqués en francs suisses (CHF). Le prix du calculateur correspond à l’étendue choisie ; les options sélectionnées figurent dans le total. Le devis confirmé et l’étendue convenue s’appliquent. Kraken n’est actuellement pas assujettie à la TVA et ne la facture pas."
      },
      {
        "title": "4. Déplacement inclus dans le prix",
        "content": "Le déplacement habituel pour la prestation choisie est inclus dans le prix du calculateur. Tout frais de déplacement exceptionnel nécessite un accord préalable et doit figurer dans le devis écrit."
      },
      {
        "title": "5. Modalités de Règlement & Retards",
        "content": "Règlements sécurisés via Payrexx, virement ou QR-facture. Le solde est exigible sous 7 jours dès facturation. Tout retard entraîne un intérêt moratoire légal de 5% par an et des frais de sommation de CHF 20.00 (2e rappel) et CHF 50.00 (3e rappel). Les frais de recouvrement incombent au client."
      },
      {
        "title": "6. Annulations, Reports & Non-Présentation",
        "content": "Toute annulation doit être formulée par écrit. Indemnités: préavis >48 heures: gratuit; <48 heures: 50% du prix; <12 heures, non-présentation ou annulation sur place: 100% du devis. Un report gratuit est toléré >24 heures avant l'intervention, selon nos disponibilités."
      },
      {
        "title": "7. Nettoyages réguliers et résiliation",
        "content": "Les programmes réguliers sont à durée indéterminée. La résiliation nécessite un préavis de 30 jours pour la fin d’un mois (7 jours pendant la période d’essai de 2 mois). Sauter une visite nécessite un préavis de 48 heures. Les prix peuvent être ajustés annuellement avec un préavis de 60 jours."
      },
      {
        "title": "8. Nettoyage de Fin de Bail — Garantie de Remise",
        "content": "Comprend la rectification gratuite de toute lacune signalée par le bailleur lors de l'état des lieux officiel (Abgabeprotokoll). Conditions: (a) notification écrite sous 24h avec protocole/photos; (b) visite d'état des lieux sous 72h après nettoyage; (c) logement resté inoccupé et inutilisé. Exclut l'usure normale, défauts du bâtiment et éléments exclus."
      },
      {
        "title": "9. Services de Déménagement & Logistique",
        "content": "Vous fournissez un inventaire précis. L’argent, les bijoux, les substances dangereuses, les plantes et les animaux sont exclus du transport sans accord écrit. Les dommages cachés doivent être signalés dans un délai de 3 jours."
      },
      {
        "title": "10. Devoirs du Client, Accès & Heures d'Attente",
        "content": "Vous assurez l’accès, l’électricité, l’eau courante, le chauffage et l’ascenseur prévu. En l’absence d’accès, les conditions d’annulation existantes s’appliquent. Les clés remises sont conservées de manière sûre et anonyme."
      },
      {
        "title": "11. Réclamations & Signalement des Défauts",
        "content": "Contrôler le travail immédiatement à l'issue. Signaler les défauts apparents sous 48h; cachés sous 48h dès découverte (max 7 jours post-intervention). Le remède primaire est la retouche. Les retenues de factures sont limitées à la section concernée."
      },
      {
        "title": "12. Responsabilité & Assurances",
        "content": "Les informations sur une éventuelle couverture d’assurance figurent dans les documents de police correspondants et le devis écrit. Veuillez clarifier vos questions avec Kraken avant la prestation."
      },
      {
        "title": "13. Sous-traitants, Partenaires Agréés & Droit de Refus",
        "content": "Kraken est libre de s'adjoindre des sous-traitants spécialisés mais demeure le seul interlocuteur contractuel. Kraken se réserve d'annuler ou suspendre l'acte si les conditions compromettent la santé ou la sécurité."
      },
      {
        "title": "14. Force Majeure",
        "content": "Aucune partie ne répond de retards ou inexécutions consécutifs à des cas de force majeure (catastrophes, grèves, pandémies, coupures d'énergie). Obligations suspendues; si la durée excède 30 jours, chaque partie est en droit de résilier."
      },
      {
        "title": "15. Protection des Données & Documentation",
        "content": "Traitement confidentiel des données selon la Loi suisse sur la protection des données (LPD) et le RGPD. Des photos de contrôle 'avant/après' peuvent être réalisées pour la qualité et les assurances. Usage publicitaire soumis à accord préalable."
      },
      {
        "title": "16. Modifications & Clause de Réserve",
        "content": "Kraken se réserve d'ajuster ces CGV sous préavis de 30 jours. L'absence d'opposition vaut acceptation. Si une clause est jugée invalide, les autres demeurent en vigueur, et celle-ci est substituée par la clause la plus proche du but économique visé."
      },
      {
        "title": "17. Droit Applicable & Juridiction",
        "content": "Tous les contrats sont soumis exclusivement au droit matériel suisse, à l'exclusion de la CIVM. Le for juridique exclusif est à Schaffhouse, en Suisse. Les fors de consommation impératifs sont réservés."
      }
    ],
    "verificationTitle": "Version des conditions",
    "lastUpdated": "Version des conditions : kraken-2026-11-25 · Révision éditoriale : 25.11.2026",
    "companyInfo": "Kraken PFM | Seewadelstrasse 3, 8203 Schaffhausen, Suisse",
    "backHome": "Retour à l'Accueil"
  }
} satisfies Record<string, TermsTranslation>;

export function getTermsTranslation(language: unknown): TermsTranslation {
  return documents[routeLanguage(language) || 'de'];
}
