import { normalizeHomeLanguage } from '../../components/home/homeTranslations.ts';
import { interpolateBusinessHours } from '../config/business-hours.mjs';

// Kept independent from full articles so global page metadata stays lightweight.
const REGIONAL_METADATA = {
  "de": {
    "/reinigung/region-zuerich": {
      "title": "Reinigung Zürich & kleine Umzüge | Kraken PFM",
      "description": "Fenster, Wohnungsreinigung und kleine Umzüge in Zürich. Persönlich abgestimmt, ohne MwSt. auf der Rechnung. Leistung wählen und Preis im Rechner ansehen.",
      "h1": "Reinigung und kleine Umzüge in Zürich. Gut geplant, persönlich begleitet.",
      "faqs": [
        {
          "question": "Übernimmt Kraken auch nur die Fenster einer Wohnung?",
          "answer": "Ja, Fensterreinigung kann als eigene Leistung geplant werden. Erfassen Sie Ihre Fenster im Rechner und nennen Sie Storen oder schwierige Zugänge zusätzlich. Dort sehen Sie die für Ihren Auftrag geltenden Konditionen."
        },
        {
          "question": "Was muss ich bei einem Umzug ohne Lift angeben?",
          "answer": "Geben Sie das Stockwerk an beiden Adressen, die Treppensituation und die grössten Gegenstände an. Fotos und Masse helfen bei engen Stellen. Auch die Strecke vom Parkplatz bis zur Wohnung gehört zur Planung."
        },
        {
          "question": "Kann ich Umzug und Endreinigung aufeinander abstimmen?",
          "answer": "Ja. Teilen Sie uns Abhol-, Einzugs- und Übergabetermin sowie den gewünschten Reinigungsumfang mit. Wir klären die Reihenfolge und Verfügbarkeit, damit Transport, Reinigung und Schlüsselübergabe zusammen geplant werden können."
        },
        {
          "question": "Hat Kraken ein Büro in Zürich?",
          "answer": "Unser Standort ist Seewadelstrasse 3, 8203 Schaffhausen. Zürich gehört zu unserem Einsatzgebiet. Für Ihren Termin kommen wir nach Vereinbarung an die angegebene Adresse; diese Seite beschreibt unser Angebot für Zürich."
        }
      ]
    },
    "/reinigung/kanton-schaffhausen": {
      "title": "Reinigungsfirma Schaffhausen | Kraken PFM",
      "description": "Kraken aus Schaffhausen: Reinigung für Privathaushalte, Fenster und kleine Umzüge. Persönlicher Kontakt, keine MwSt. Auftrag im Rechner zusammenstellen.",
      "h1": "Ihre Reinigungsfirma in Schaffhausen. Für die Aufgaben, die Sie Zeit kosten.",
      "faqs": [
        {
          "question": "Wie erreiche ich Kraken in Schaffhausen?",
          "answer": "Sie erreichen uns unter +41 77 450 57 05 oder kai@krakenpfm.ch, {{businessHours}}. Unser Standort ist Seewadelstrasse 3, 8203 Schaffhausen. Einen Besuch vereinbaren Sie bitte im Voraus."
        },
        {
          "question": "Kann ich einen Auftrag aus der Rheinfallregion anfragen?",
          "answer": "Ja. Geben Sie im Rechner Ihre genaue Adresse und die gewünschte Leistung an. Liegt Ihr Zuhause ausserhalb der Stadt Schaffhausen, klären wir Einsatzmöglichkeit, Anfahrt und Termin für diesen konkreten Auftrag."
        },
        {
          "question": "Was bedeutet die Abnahmegarantie bei der Umzugsreinigung?",
          "answer": "Sie bezieht sich auf die im Auftrag vereinbarten Reinigungsleistungen. Deshalb klären wir vorab die Räume, Arbeiten und Bedingungen. Beschädigungen, Reparaturen oder andere Fragen zum Mietverhältnis gehören nicht zum Reinigungsauftrag."
        },
        {
          "question": "Warum steht keine MwSt. auf meiner Rechnung?",
          "answer": "Kraken ist derzeit nicht mehrwertsteuerpflichtig und stellt deshalb keine Mehrwertsteuer in Rechnung. Massgebend für Ihren Auftrag sind der ausgewiesene Gesamtpreis und die vereinbarten Leistungen."
        }
      ]
    },
    "/reinigung/region-winterthur": {
      "title": "Reinigung Winterthur für Ihr Zuhause | Kraken PFM",
      "description": "Regelmässige Reinigung, Grundreinigung, Fenster und kleine Umzüge in Winterthur. Wählen Sie passende Hilfe für Ihr Zuhause und berechnen Sie Ihren Auftrag.",
      "h1": "Reinigung in Winterthur, die zu Ihrem Alltag passt.",
      "faqs": [
        {
          "question": "Brauche ich eine regelmässige Reinigung oder eine Grundreinigung?",
          "answer": "Regelmässige Reinigung dient der wiederkehrenden Pflege der vereinbarten Räume. Eine Grundreinigung richtet sich auf eine intensivere, einmalige Bearbeitung ausgewählter Bereiche. Beschreiben Sie den Zustand und Ihre Prioritäten; daraus lässt sich die passende Leistung ableiten."
        },
        {
          "question": "Kann ich zuerst Küche und Bad in den Mittelpunkt stellen?",
          "answer": "Ja. Nennen Sie diese Schwerpunkte bei der Planung und beschreiben Sie die gewünschten Arbeiten. Der Auftrag kann auf ausgewählte Bereiche abgestimmt werden. Im Rechner sehen Sie, welche Angaben für die gewählte Leistung erforderlich sind."
        },
        {
          "question": "Welche Gegenstände gehören auf die Liste für meinen kleinen Umzug?",
          "answer": "Erfassen Sie Möbel, Kartons und alles, was zusätzlich transportiert werden soll, auch aus Keller oder Abstellraum. Bei grossen Gegenständen helfen Masse und Angaben zur Demontage. Die Zugänge an beiden Adressen sind ebenso wichtig wie die Gegenstandsliste."
        },
        {
          "question": "Kann ich Fensterreinigung und Haushaltsreinigung getrennt planen?",
          "answer": "Ja. Fensterreinigung ist eine eigene Leistung. Geben Sie den jeweiligen Umfang und Ihre Terminwünsche an. Wir stimmen ab, ob getrennte Termine oder eine Kombination für Ihren Auftrag sinnvoll und verfügbar sind."
        }
      ]
    }
  },
  "en": {
    "/reinigung/region-zuerich": {
      "title": "Cleaning and small moves in Zurich | Kraken PFM",
      "description": "Windows, home cleaning and small moves in Zurich. Personally arranged, with no VAT on your invoice. Choose your service and see the price in our calculator.",
      "h1": "Cleaning and small moves in Zurich. Well planned, with personal support.",
      "faqs": [
        {
          "question": "Can Kraken clean just the windows of my flat?",
          "answer": "Yes, window cleaning can be booked as a separate service. Enter your windows in the calculator and also mention blinds or difficult access. You will see the conditions that apply to your job there."
        },
        {
          "question": "What should I mention for a move without a lift?",
          "answer": "Give the floor at both addresses, describe the stairs and list the largest items. Photos and measurements help with tight spaces. The distance from the parking space to the flat is also part of the planning."
        },
        {
          "question": "Can I coordinate my move and final clean?",
          "answer": "Yes. Tell us your collection, move-in and handover dates, along with the cleaning you need. We check the sequence and availability so that transport, cleaning and key handover can be planned together."
        },
        {
          "question": "Does Kraken have an office in Zurich?",
          "answer": "Our base is at Seewadelstrasse 3, 8203 Schaffhausen. Zurich is one of our service areas. We come to your specified address by arrangement; this page describes our services for Zurich."
        }
      ]
    },
    "/reinigung/kanton-schaffhausen": {
      "title": "Cleaning company in Schaffhausen | Kraken PFM",
      "description": "Kraken in Schaffhausen: home cleaning, windows and small moves. Personal contact, with no VAT charged. Put together your job in our calculator.",
      "h1": "Your cleaning company in Schaffhausen. For the tasks that take up your time.",
      "faqs": [
        {
          "question": "How can I contact Kraken in Schaffhausen?",
          "answer": "You can reach us on +41 77 450 57 05 or at kai@krakenpfm.ch, {{businessHours}}. Our base is at Seewadelstrasse 3, 8203 Schaffhausen. Please arrange a visit in advance."
        },
        {
          "question": "Can I request a job in the Rhine Falls area?",
          "answer": "Yes. Enter your exact address and the service you need in the calculator. If your home is outside the city of Schaffhausen, we check whether we can carry out the job and discuss travel and the appointment for that specific request."
        },
        {
          "question": "What does the handover guarantee for end of tenancy cleaning mean?",
          "answer": "It relates to the cleaning services agreed for the job. That is why we clarify the rooms, tasks and conditions beforehand. Damage, repairs or other tenancy matters are not part of the cleaning job."
        },
        {
          "question": "Why is there no VAT on my invoice?",
          "answer": "Kraken is currently not liable for VAT and therefore does not charge it. The stated total price and agreed services are what apply to your job."
        }
      ]
    },
    "/reinigung/region-winterthur": {
      "title": "Home cleaning in Winterthur | Kraken PFM",
      "description": "Regular cleaning, deep cleaning, windows and small moves in Winterthur. Choose the right help for your home and calculate your job.",
      "h1": "Cleaning in Winterthur that fits your everyday life.",
      "faqs": [
        {
          "question": "Do I need regular cleaning or a deep clean?",
          "answer": "Regular cleaning is for recurring care of the agreed rooms. A deep clean provides more intensive, one-off attention to selected areas. Describe the condition and your priorities so the right service can be identified."
        },
        {
          "question": "Can I focus on the kitchen and bathroom first?",
          "answer": "Yes. Mention these priorities when planning and describe the work you would like done. The job can focus on selected areas. In the calculator, you will see which details are needed for the service you choose."
        },
        {
          "question": "Which items should I list for my small move?",
          "answer": "List furniture, boxes and everything else that needs transporting, including items from the cellar or storage room. For large items, measurements and dismantling details help. Access at both addresses is just as important as the inventory."
        },
        {
          "question": "Can I plan window cleaning and home cleaning separately?",
          "answer": "Yes. Window cleaning is a service in its own right. Enter the scope of each job and your preferred dates. We discuss whether separate appointments or a combination are suitable and available for your job."
        }
      ]
    }
  },
  "es": {
    "/reinigung/region-zuerich": {
      "title": "Limpieza y pequeñas mudanzas en Zúrich | Kraken PFM",
      "description": "Ventanas, limpieza del hogar y pequeñas mudanzas en Zúrich. Atención personal, sin IVA en la factura. Elija el servicio y consulte el precio en el calculador.",
      "h1": "Limpieza y pequeñas mudanzas en Zúrich. Bien planificadas, con atención personal.",
      "faqs": [
        {
          "question": "¿Puede Kraken limpiar únicamente las ventanas de un piso?",
          "answer": "Sí, la limpieza de ventanas puede contratarse como un servicio independiente. Indique sus ventanas en el calculador y añada las persianas o los accesos difíciles. Allí podrá consultar las condiciones aplicables a su encargo."
        },
        {
          "question": "¿Qué debo indicar para una mudanza sin ascensor?",
          "answer": "Indique la planta de ambas direcciones, las características de las escaleras y los objetos más grandes. Las fotos y las medidas ayudan cuando hay pasos estrechos. El trayecto entre el aparcamiento y la vivienda también forma parte de la planificación."
        },
        {
          "question": "¿Puedo coordinar la mudanza con la limpieza de fin de alquiler?",
          "answer": "Sí. Indique las fechas de recogida, entrada y entrega, junto con el alcance de la limpieza. Aclaramos el orden y la disponibilidad para organizar el transporte, la limpieza y la entrega de llaves."
        },
        {
          "question": "¿Tiene Kraken una oficina en Zúrich?",
          "answer": "Nuestra sede está en Seewadelstrasse 3, 8203 Schaffhausen. Zúrich forma parte de nuestra zona de servicio. Acudimos a la dirección acordada para su cita; esta página describe nuestra oferta para Zúrich."
        }
      ]
    },
    "/reinigung/kanton-schaffhausen": {
      "title": "Empresa de limpieza en Schaffhausen | Kraken PFM",
      "description": "Kraken, con sede en Schaffhausen: limpieza del hogar, ventanas y pequeñas mudanzas. Contacto personal y sin IVA. Configure su encargo en el calculador.",
      "h1": "Su empresa de limpieza en Schaffhausen. Para las tareas que le quitan tiempo.",
      "faqs": [
        {
          "question": "¿Cómo puedo contactar con Kraken en Schaffhausen?",
          "answer": "Puede llamarnos al +41 77 450 57 05 o escribir a kai@krakenpfm.ch, {{businessHours}}. Nuestra sede está en Seewadelstrasse 3, 8203 Schaffhausen. Acuerde una cita antes de venir."
        },
        {
          "question": "¿Puedo solicitar un servicio en la región del Rheinfall?",
          "answer": "Sí. Indique en el calculador su dirección exacta y el servicio que desea. Si su hogar está fuera de la ciudad de Schaffhausen, aclaramos la posibilidad de desplazarnos, el trayecto y la fecha para ese encargo concreto."
        },
        {
          "question": "¿Qué significa la garantía de entrega de la limpieza de fin de alquiler?",
          "answer": "Se refiere a los trabajos de limpieza acordados en el encargo. Por eso aclaramos antes las habitaciones, las tareas y las condiciones. Los daños, las reparaciones u otras cuestiones del alquiler no forman parte del trabajo de limpieza."
        },
        {
          "question": "¿Por qué no aparece IVA en mi factura?",
          "answer": "Actualmente Kraken no está sujeto a IVA y por eso no lo factura. Para su encargo cuentan el precio total indicado y los servicios acordados."
        }
      ]
    },
    "/reinigung/region-winterthur": {
      "title": "Limpieza para su hogar en Winterthur | Kraken PFM",
      "description": "Limpieza periódica, a fondo, de ventanas y pequeñas mudanzas en Winterthur. Elija la ayuda adecuada para su hogar y calcule su encargo.",
      "h1": "Limpieza en Winterthur que se adapta a su día a día.",
      "faqs": [
        {
          "question": "¿Necesito limpieza periódica o una limpieza a fondo?",
          "answer": "La limpieza periódica mantiene de forma habitual las habitaciones acordadas. La limpieza a fondo trata con más intensidad determinadas zonas en una intervención puntual. Describa el estado y sus prioridades para que podamos concretar el servicio adecuado."
        },
        {
          "question": "¿Puedo dar prioridad a la cocina y el baño?",
          "answer": "Sí. Indique estas prioridades al planificar el servicio y describa las tareas que desea. El encargo puede adaptarse a zonas concretas. En el calculador verá qué datos son necesarios para el servicio elegido."
        },
        {
          "question": "¿Qué objetos debo incluir en la lista de mi pequeña mudanza?",
          "answer": "Anote los muebles, las cajas y todo lo que haya que transportar, también desde el sótano o el trastero. Para los objetos grandes ayudan las medidas y los datos sobre su desmontaje. Los accesos de ambas direcciones son tan importantes como la lista de objetos."
        },
        {
          "question": "¿Puedo planificar por separado las ventanas y la limpieza del hogar?",
          "answer": "Sí. La limpieza de ventanas es un servicio independiente. Indique el alcance de cada trabajo y las fechas que prefiere. Acordamos si para su encargo resulta adecuado y posible organizar citas separadas o combinarlas."
        }
      ]
    }
  },
  "pt": {
    "/reinigung/region-zuerich": {
      "title": "Limpeza em Zurique e pequenas mudanças | Kraken PFM",
      "description": "Janelas, limpeza doméstica e pequenas mudanças em Zurique. Acordos pessoais, sem IVA na fatura. Escolha o serviço e consulte o preço na calculadora.",
      "h1": "Limpeza e pequenas mudanças em Zurique. Bem planeadas, acompanhadas pessoalmente.",
      "faqs": [
        {
          "question": "A Kraken também trata apenas das janelas de uma casa?",
          "answer": "Sim, a limpeza de janelas pode ser planeada como serviço independente. Indique as janelas na calculadora e acrescente estores ou acessos difíceis. Aí pode consultar as condições aplicáveis ao seu serviço."
        },
        {
          "question": "O que devo indicar numa mudança sem elevador?",
          "answer": "Indique o andar nas duas moradas, a situação das escadas e os objetos maiores. Fotografias e medidas ajudam em passagens estreitas. O percurso do estacionamento até à casa também faz parte do planeamento."
        },
        {
          "question": "Posso coordenar a mudança com a limpeza final?",
          "answer": "Sim. Indique as datas de recolha, entrada e entrega, assim como o âmbito de limpeza pretendido. Esclarecemos a sequência e a disponibilidade para planear em conjunto o transporte, a limpeza e a entrega das chaves."
        },
        {
          "question": "A Kraken tem um escritório em Zurique?",
          "answer": "A nossa sede fica em Seewadelstrasse 3, 8203 Schaffhausen. Zurique faz parte da nossa zona de serviço. Na data acordada, deslocamo-nos à morada indicada; esta página descreve a nossa oferta para Zurique."
        }
      ]
    },
    "/reinigung/kanton-schaffhausen": {
      "title": "Empresa de limpeza em Schaffhausen | Kraken PFM",
      "description": "Limpeza pessoal e pequenas mudanças em Schaffhausen. Contacto direto, serviços para casas particulares e sem IVA. Prepare o seu pedido na calculadora.",
      "h1": "Limpeza em Schaffhausen. Contacto pessoal, menos preocupações em casa.",
      "faqs": [
        {
          "question": "Como posso contactar a Kraken em Schaffhausen?",
          "answer": "Pode contactar-nos pelo +41 77 450 57 05 ou por kai@krakenpfm.ch, {{businessHours}}. A nossa sede fica em Seewadelstrasse 3, 8203 Schaffhausen. Combine uma visita com antecedência."
        },
        {
          "question": "Posso pedir um serviço na região das Cataratas do Reno?",
          "answer": "Sim. Indique na calculadora a sua morada exata e o serviço pretendido. Se a sua casa ficar fora da cidade de Schaffhausen, esclarecemos a possibilidade de serviço, a deslocação e a data para esse pedido concreto."
        },
        {
          "question": "O que significa a garantia de entrega na limpeza de fim de arrendamento?",
          "answer": "Refere-se aos serviços de limpeza acordados no pedido. Por isso, esclarecemos previamente as divisões, os trabalhos e as condições. Danos, reparações ou outras questões do arrendamento não fazem parte do serviço de limpeza."
        },
        {
          "question": "Porque não há IVA na minha fatura?",
          "answer": "A Kraken não está atualmente sujeita a IVA e, por isso, não o cobra. Para o seu serviço, contam o preço total apresentado e as prestações acordadas."
        }
      ]
    },
    "/reinigung/region-winterthur": {
      "title": "Limpeza em Winterthur para a sua casa | Kraken PFM",
      "description": "Limpeza regular, profunda, de janelas e de fim de arrendamento ou pequenas mudanças em Winterthur. Para casas particulares, com acordos pessoais e sem IVA.",
      "h1": "Limpeza em Winterthur. Mais espaço para o seu dia a dia.",
      "faqs": [
        {
          "question": "Preciso de limpeza regular ou de limpeza profunda?",
          "answer": "A limpeza regular destina-se aos cuidados recorrentes das divisões acordadas. A limpeza profunda trata de uma intervenção mais intensa, pontual, em zonas selecionadas. Descreva o estado e as suas prioridades; assim pode ser identificado o serviço adequado."
        },
        {
          "question": "Posso dar prioridade à cozinha e à casa de banho?",
          "answer": "Sim. Indique essas prioridades no planeamento e descreva os trabalhos pretendidos. O pedido pode ser adaptado a zonas selecionadas. Na calculadora vê que informações são necessárias para o serviço escolhido."
        },
        {
          "question": "Que objetos devem constar da lista da minha pequena mudança?",
          "answer": "Registe móveis, caixas e tudo o que deve ser transportado, incluindo objetos da cave ou da arrecadação. Para objetos grandes, ajudam as medidas e as informações sobre desmontagem. Os acessos nas duas moradas são tão importantes como a lista dos objetos."
        },
        {
          "question": "Posso planear separadamente a limpeza de janelas e a limpeza doméstica?",
          "answer": "Sim. A limpeza de janelas é um serviço independente. Indique o âmbito de cada serviço e as datas pretendidas. Acordamos se marcações separadas ou uma combinação são adequadas e estão disponíveis para o seu pedido."
        }
      ]
    }
  },
  "it": {
    "/reinigung/region-zuerich": {
      "title": "Pulizie a Zurigo e piccoli traslochi | Kraken PFM",
      "description": "Finestre, pulizie domestiche e piccoli traslochi a Zurigo. Accordi personali, senza IVA in fattura. Scelga il servizio e consulti il prezzo nel calcolatore.",
      "h1": "Pulizie e piccoli traslochi a Zurigo. Ben pianificati, seguiti personalmente.",
      "faqs": [
        {
          "question": "Kraken si occupa anche solo delle finestre di un alloggio?",
          "answer": "Sì, la pulizia delle finestre può essere pianificata come servizio autonomo. Inserisca le finestre nel calcolatore e segnali separatamente schermature solari o accessi difficili. Lì trova le condizioni applicabili al suo incarico."
        },
        {
          "question": "Che cosa devo indicare per un trasloco senza ascensore?",
          "answer": "Indichi il piano a entrambi gli indirizzi, la situazione delle scale e gli oggetti più grandi. Foto e dimensioni aiutano per i passaggi stretti. Anche il percorso dal parcheggio all’alloggio fa parte della pianificazione."
        },
        {
          "question": "Posso coordinare trasloco e pulizia finale?",
          "answer": "Sì. Ci comunichi le date di ritiro, ingresso e riconsegna e la portata desiderata della pulizia. Verifichiamo sequenza e disponibilità per pianificare insieme trasporto, pulizia e consegna delle chiavi."
        },
        {
          "question": "Kraken ha un ufficio a Zurigo?",
          "answer": "La nostra sede è in Seewadelstrasse 3, 8203 Schaffhausen. Zurigo rientra nella nostra zona servita. Per il suo appuntamento veniamo all’indirizzo indicato previo accordo; questa pagina descrive la nostra offerta per Zurigo."
        }
      ]
    },
    "/reinigung/kanton-schaffhausen": {
      "title": "Impresa di pulizie a Sciaffusa | Kraken PFM",
      "description": "Pulizie personali e piccoli traslochi a Sciaffusa. Contatto diretto, servizi per abitazioni private e senza IVA. Prepari il suo incarico nel calcolatore.",
      "h1": "Pulizie a Sciaffusa. Un contatto personale, meno pensieri a casa.",
      "faqs": [
        {
          "question": "Come posso contattare Kraken a Sciaffusa?",
          "answer": "Ci trova al +41 77 450 57 05 o a kai@krakenpfm.ch, {{businessHours}}. La nostra sede è in Seewadelstrasse 3, 8203 Schaffhausen. Concordi in anticipo un’eventuale visita."
        },
        {
          "question": "Posso richiedere un servizio nella regione delle cascate del Reno?",
          "answer": "Sì. Indichi nel calcolatore l’indirizzo esatto e il servizio desiderato. Se la sua casa è fuori dalla città di Sciaffusa, verifichiamo possibilità d’intervento, spostamento e data per questo incarico concreto."
        },
        {
          "question": "Che cosa significa la garanzia di riconsegna per le pulizie di fine locazione?",
          "answer": "Riguarda le prestazioni di pulizia concordate nell’incarico. Per questo definiamo in anticipo locali, lavori e condizioni. Danni, riparazioni o altre questioni relative al rapporto di locazione non rientrano nell’incarico di pulizia."
        },
        {
          "question": "Perché sulla mia fattura non c’è IVA?",
          "answer": "Kraken attualmente non è soggetta all’IVA e quindi non la addebita. Per il suo incarico fanno fede il prezzo totale indicato e le prestazioni concordate."
        }
      ]
    },
    "/reinigung/region-winterthur": {
      "title": "Pulizie a Winterthur per la sua casa | Kraken PFM",
      "description": "Pulizie regolari, a fondo, di finestre e di fine locazione o piccoli traslochi a Winterthur. Per abitazioni private, con accordi personali e senza IVA.",
      "h1": "Pulizie a Winterthur. Più spazio per la sua vita quotidiana.",
      "faqs": [
        {
          "question": "Mi serve una pulizia regolare o una pulizia a fondo?",
          "answer": "La pulizia regolare serve alla cura ricorrente dei locali concordati. La pulizia a fondo riguarda un intervento più intenso, una tantum, in zone selezionate. Descriva condizioni e priorità: da queste si può individuare il servizio adatto."
        },
        {
          "question": "Posso dare la priorità a cucina e bagno?",
          "answer": "Sì. Indichi queste priorità durante la pianificazione e descriva i lavori desiderati. L’incarico può essere concordato per zone selezionate. Nel calcolatore vede le informazioni richieste per il servizio scelto."
        },
        {
          "question": "Quali oggetti devo includere nell’elenco del mio piccolo trasloco?",
          "answer": "Inserisca mobili, scatoloni e tutto ciò che va trasportato, anche dalla cantina o dal ripostiglio. Per gli oggetti grandi aiutano dimensioni e informazioni sullo smontaggio. Gli accessi a entrambi gli indirizzi sono importanti quanto l’elenco degli oggetti."
        },
        {
          "question": "Posso pianificare separatamente pulizia delle finestre e pulizie domestiche?",
          "answer": "Sì. La pulizia delle finestre è un servizio autonomo. Indichi la portata di ciascun lavoro e le date desiderate. Concordiamo se appuntamenti separati o una combinazione siano adatti e disponibili per il suo incarico."
        }
      ]
    }
  },
  "fr": {
    "/reinigung/region-zuerich": {
      "title": "Nettoyage à Zurich et petits déménagements | Kraken PFM",
      "description": "Vitres, nettoyage de logements et petits déménagements à Zurich. Organisation personnelle, sans TVA facturée. Choisissez la prestation et consultez le prix dans le calculateur.",
      "h1": "Nettoyage et petits déménagements à Zurich. Bien préparés, avec un accompagnement personnel.",
      "faqs": [
        {
          "question": "Kraken peut-il nettoyer uniquement les fenêtres d’un logement ?",
          "answer": "Oui, le nettoyage de vitres peut être organisé comme une prestation à part entière. Indiquez vos fenêtres dans le calculateur, ainsi que les stores et accès difficiles. Vous y trouverez les conditions applicables à votre demande."
        },
        {
          "question": "Que préciser pour un déménagement sans ascenseur ?",
          "answer": "Indiquez les étages aux deux adresses, la configuration des escaliers et les objets les plus volumineux. Des photos et des mesures aident pour les passages étroits. La distance entre le stationnement et le logement compte aussi."
        },
        {
          "question": "Puis-je coordonner déménagement et nettoyage final ?",
          "answer": "Oui. Communiquez les dates d’enlèvement, d’emménagement et de remise ainsi que le nettoyage souhaité. Nous vérifions l’ordre et la disponibilité pour préparer ensemble le transport, le nettoyage et la remise des clés."
        },
        {
          "question": "Kraken a-t-il un bureau à Zurich ?",
          "answer": "Notre siège est Seewadelstrasse 3, 8203 Schaffhouse. Zurich fait partie de notre zone d’intervention. Nous nous rendons à l’adresse convenue sur rendez-vous ; cette page présente nos prestations pour Zurich."
        }
      ]
    },
    "/reinigung/kanton-schaffhausen": {
      "title": "Entreprise de nettoyage à Schaffhouse | Kraken PFM",
      "description": "Kraken à Schaffhouse : nettoyage pour les particuliers, vitres et petits déménagements. Contact personnel, sans TVA facturée. Préparez votre prestation dans le calculateur.",
      "h1": "Votre entreprise de nettoyage à Schaffhouse. Pour les tâches qui prennent votre temps.",
      "faqs": [
        {
          "question": "Comment joindre Kraken à Schaffhouse ?",
          "answer": "Appelez le +41 77 450 57 05 ou écrivez à kai@krakenpfm.ch, {{businessHours}}. Notre siège est Seewadelstrasse 3, 8203 Schaffhouse. Merci de prendre rendez-vous avant une visite."
        },
        {
          "question": "Puis-je demander une prestation dans la région des chutes du Rhin ?",
          "answer": "Oui. Indiquez votre adresse exacte et la prestation souhaitée dans le calculateur. Si votre logement se trouve hors de la ville de Schaffhouse, nous vérifions les possibilités d’intervention, le déplacement et la date pour cette demande précise."
        },
        {
          "question": "Que signifie la garantie de réception pour le nettoyage de fin de bail ?",
          "answer": "Elle concerne les prestations de nettoyage prévues dans la commande. Nous précisons donc les pièces, les travaux et les conditions à l’avance. Les dommages, réparations et autres questions liées au bail ne font pas partie de la prestation de nettoyage."
        },
        {
          "question": "Pourquoi ma facture ne comporte-t-elle pas de TVA ?",
          "answer": "Kraken n’est actuellement pas assujetti à la TVA et ne la facture donc pas. Le prix total indiqué et les prestations convenues déterminent votre commande."
        }
      ]
    },
    "/reinigung/region-winterthur": {
      "title": "Nettoyage à Winterthour pour votre logement | Kraken PFM",
      "description": "Nettoyage régulier ou approfondi, vitres et petits déménagements à Winterthour. Choisissez l’aide adaptée à votre logement et calculez votre prestation.",
      "h1": "Un nettoyage à Winterthour adapté à votre quotidien.",
      "faqs": [
        {
          "question": "Ai-je besoin d’un nettoyage régulier ou approfondi ?",
          "answer": "Le nettoyage régulier entretient les pièces convenues. Le nettoyage en profondeur traite plus intensivement et ponctuellement certaines zones. Décrivez l’état et vos priorités pour déterminer la prestation adaptée."
        },
        {
          "question": "Puis-je privilégier d’abord la cuisine et la salle de bains ?",
          "answer": "Oui. Indiquez ces priorités et décrivez les travaux souhaités. La commande peut concerner certaines zones seulement. Le calculateur présente les informations nécessaires à la prestation choisie."
        },
        {
          "question": "Quels objets inscrire pour mon petit déménagement ?",
          "answer": "Notez les meubles, les cartons et tout ce qui doit être transporté, y compris de la cave ou du débarras. Pour les grands objets, précisez les dimensions et le démontage éventuel. Les accès aux deux adresses sont tout aussi importants."
        },
        {
          "question": "Puis-je organiser séparément les vitres et l’entretien du logement ?",
          "answer": "Oui. Le nettoyage de vitres est une prestation distincte. Indiquez les périmètres et dates souhaités. Nous vérifions si des rendez-vous séparés ou une combinaison sont adaptés et disponibles pour votre demande."
        }
      ]
    }
  }
};

// Resolve authored tokens once while keeping FAQ object identity stable.
for (const [language, entries] of Object.entries(REGIONAL_METADATA)) {
  for (const page of Object.values(entries)) {
    for (const faq of page.faqs) faq.answer = interpolateBusinessHours(faq.answer, language);
  }
}

export function getRegionalPageMetadata(pathname: string, language: string) {
  const path = pathname.split(/[?#]/)[0].replace(/\/$/, '') || '/';
  const entries: Record<string, { title: string; description: string; h1: string; faqs: {question:string;answer:string}[] }> = REGIONAL_METADATA[normalizeHomeLanguage(language)];
  return entries[path] || null;
}
