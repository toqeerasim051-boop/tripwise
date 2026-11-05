/**
 * Curated top attractions per country (ISO 3166-1 alpha-3 code), as English Wikipedia article
 * titles plus the city or region shown to users. `npm run data:attractions` turns this list into
 * src/data/attractions.json with descriptions, coordinates and freely licensed photos from
 * Wikipedia / Wikimedia Commons, and reports any title it can't resolve.
 *
 * To add a country or attraction: add [wikipediaTitle, place] below, run the script, review the
 * output, and commit both files. The first attraction's photo is the country's cover photo.
 *
 * An optional third element overrides fields, e.g. { description } when the Wikipedia intro can't
 * be cleaned automatically. Override text must stay a faithful edit of the Wikipedia intro.
 */

export const HERO_CANDIDATES = ['Moraine Lake', 'Lake Bled', 'Lauterbrunnen', 'Hallstatt'];

/**
 * Home-page slideshow after the hero: famous places from ATTRACTIONS (titles must appear there),
 * in this order, keeping the first SLIDE_COUNT whose lead photo is landscape.
 */
export const HERO_SLIDES = [
  'Taj Mahal',
  'Machu Picchu',
  'Giza pyramid complex',
  'Sydney Opera House',
  'Santorini',
  'Colosseum',
  'Mount Fuji',
  'Angkor Wat',
  'Great Wall of China',
  'Petra',
];
export const SLIDE_COUNT = 5;

/** Order of "Featured" destinations on Explore; curated countries not listed follow in list order. */
export const FEATURED_FIRST = [
  'JPN',
  'ITA',
  'CAN',
  'FRA',
  'AUS',
  'DEU',
  'USA',
  'THA',
  'ESP',
  'GBR',
];

export const ATTRACTIONS = {
  FRA: [
    ['Eiffel Tower', 'Paris'],
    ['Mont-Saint-Michel', 'Normandy'],
    ['Louvre', 'Paris'],
    ['Palace of Versailles', 'Versailles'],
    ['Notre-Dame de Paris', 'Paris'],
    ['Pont du Gard', 'Vers-Pont-du-Gard'],
  ],
  ITA: [
    ['Colosseum', 'Rome'],
    ['Grand Canal (Venice)', 'Venice'],
    ['Leaning Tower of Pisa', 'Pisa'],
    ['Florence Cathedral', 'Florence'],
    ['Pompeii', 'Campania'],
    ['Amalfi Coast', 'Campania'],
  ],
  ESP: [
    ['Sagrada Família', 'Barcelona'],
    ['Alhambra', 'Granada'],
    ['Park Güell', 'Barcelona'],
    ['Mosque–Cathedral of Córdoba', 'Córdoba'],
    ['Museo del Prado', 'Madrid'],
    ['Plaza Mayor, Madrid', 'Madrid'],
  ],
  GBR: [
    ['Tower Bridge', 'London'],
    ['Stonehenge', 'Wiltshire'],
    ['Tower of London', 'London'],
    ['Edinburgh Castle', 'Edinburgh'],
    ['Roman Baths (Bath)', 'Bath'],
    ['British Museum', 'London'],
  ],
  DEU: [
    ['Neuschwanstein Castle', 'Bavaria'],
    ['Brandenburg Gate', 'Berlin'],
    ['Cologne Cathedral', 'Cologne'],
    ['Museum Island', 'Berlin'],
    ['Heidelberg Castle', 'Heidelberg'],
  ],
  PRT: [
    ['Pena Palace', 'Sintra'],
    ['Belém Tower', 'Lisbon'],
    ['Jerónimos Monastery', 'Lisbon'],
    ['Dom Luís I Bridge', 'Porto'],
  ],
  GRC: [
    ['Santorini', 'Cyclades'],
    ['Acropolis of Athens', 'Athens'],
    ['Meteora', 'Thessaly'],
    ['Delphi', 'Phocis'],
    ['Knossos', 'Crete'],
  ],
  NLD: [
    ['Kinderdijk', 'South Holland'],
    ['Rijksmuseum', 'Amsterdam'],
    ['Anne Frank House', 'Amsterdam'],
    ['Keukenhof', 'Lisse'],
  ],
  CHE: [
    ['Matterhorn', 'Zermatt'],
    ['Jungfraujoch', 'Bernese Oberland'],
    ['Chillon Castle', 'Montreux'],
    ['Lake Lucerne', 'Central Switzerland'],
  ],
  AUT: [
    ['Hallstatt', 'Upper Austria'],
    ['Schönbrunn Palace', 'Vienna'],
    ['Hofburg', 'Vienna'],
    ['Hohensalzburg Fortress', 'Salzburg'],
  ],
  CZE: [
    ['Charles Bridge', 'Prague'],
    ['Prague Castle', 'Prague'],
    ['Old Town Square', 'Prague'],
    ['Český Krumlov', 'South Bohemia'],
  ],
  HRV: [
    ['Plitvice Lakes National Park', 'Lika-Senj'],
    ['Walls of Dubrovnik', 'Dubrovnik'],
    ["Diocletian's Palace", 'Split'],
    ['Hvar', 'Dalmatia'],
  ],
  HUN: [
    ['Hungarian Parliament Building', 'Budapest'],
    ['Buda Castle', 'Budapest'],
    ['Széchenyi thermal bath', 'Budapest'],
    ['Lake Balaton', 'Transdanubia'],
  ],
  POL: [
    ['Main Square, Kraków', 'Kraków'],
    ['Wawel Castle', 'Kraków'],
    ['Wieliczka Salt Mine', 'Wieliczka'],
    ['Malbork Castle', 'Malbork'],
  ],
  IRL: [
    ['Cliffs of Moher', 'County Clare'],
    ['Ring of Kerry', 'County Kerry'],
    ['Rock of Cashel', 'County Tipperary'],
    ['Guinness Storehouse', 'Dublin'],
  ],
  ISL: [
    ['Jökulsárlón', 'Southeast Iceland'],
    ['Gullfoss', 'Southern Region'],
    ['Þingvellir', 'Southern Region'],
    ['Blue Lagoon (geothermal spa)', 'Grindavík'],
  ],
  NOR: [
    ['Geirangerfjord', 'Møre og Romsdal'],
    ['Preikestolen', 'Rogaland'],
    ['Bryggen', 'Bergen'],
    ['Lofoten', 'Nordland'],
  ],
  DNK: [
    ['Nyhavn', 'Copenhagen'],
    ['Tivoli Gardens', 'Copenhagen'],
    ['Kronborg', 'Helsingør'],
    ['The Little Mermaid (statue)', 'Copenhagen'],
  ],
  SWE: [
    ['Gamla stan', 'Stockholm'],
    ['Vasa Museum', 'Stockholm'],
    ['Drottningholm Palace', 'Stockholm'],
  ],
  BEL: [
    ['Grand-Place', 'Brussels'],
    ['Belfry of Bruges', 'Bruges'],
    ['Atomium', 'Brussels'],
    ['Manneken Pis', 'Brussels'],
  ],
  TUR: [
    ['Cappadocia', 'Central Anatolia'],
    ['Hagia Sophia', 'Istanbul'],
    ['Pamukkale', 'Denizli'],
    ['Ephesus', 'İzmir Province'],
  ],
  EGY: [
    ['Giza pyramid complex', 'Giza'],
    ['Great Sphinx of Giza', 'Giza'],
    ['Karnak', 'Luxor'],
    ['Abu Simbel', 'Aswan Governorate'],
    ['Valley of the Kings', 'Luxor'],
  ],
  MAR: [
    ['Chefchaouen', 'Chefchaouen'],
    ['Jemaa el-Fnaa', 'Marrakesh'],
    ['Hassan II Mosque', 'Casablanca'],
    ['Aït Benhaddou', 'Ouarzazate Province'],
  ],
  ZAF: [
    ['Table Mountain', 'Cape Town'],
    ['Kruger National Park', 'Mpumalanga and Limpopo'],
    ['Robben Island', 'Cape Town'],
    ['Cape of Good Hope', 'Western Cape'],
  ],
  KEN: [
    ['Maasai Mara', 'Narok County'],
    ['Amboseli National Park', 'Kajiado County'],
    ['Mount Kenya', 'Central Kenya'],
    ['Lake Nakuru', 'Nakuru County'],
  ],
  TZA: [
    ['Mount Kilimanjaro', 'Kilimanjaro Region'],
    ['Serengeti National Park', 'Mara and Simiyu'],
    ['Ngorongoro Conservation Area', 'Arusha Region'],
    ['Stone Town', 'Zanzibar'],
  ],
  USA: [
    ['Grand Canyon', 'Arizona'],
    ['Statue of Liberty', 'New York City'],
    ['Golden Gate Bridge', 'San Francisco'],
    ['Yellowstone National Park', 'Wyoming'],
    ['Times Square', 'New York City'],
  ],
  CAN: [
    ['Moraine Lake', 'Alberta'],
    ['Niagara Falls', 'Ontario'],
    ['Banff National Park', 'Alberta'],
    ['CN Tower', 'Toronto'],
    ['Old Quebec', 'Quebec City'],
  ],
  MEX: [
    ['Chichen Itza', 'Yucatán'],
    ['Teotihuacan', 'State of Mexico'],
    ['Tulum', 'Quintana Roo'],
    ['Palenque', 'Chiapas'],
  ],
  CUB: [
    ['Old Havana', 'Havana'],
    ['Viñales Valley', 'Pinar del Río'],
    ['Trinidad, Cuba', 'Sancti Spíritus'],
    ['Malecón, Havana', 'Havana'],
  ],
  BRA: [
    ['Christ the Redeemer (statue)', 'Rio de Janeiro'],
    ['Iguazu Falls', 'Paraná'],
    ['Sugarloaf Mountain', 'Rio de Janeiro'],
    ['Copacabana, Rio de Janeiro', 'Rio de Janeiro'],
    ['Pelourinho', 'Salvador'],
  ],
  ARG: [
    ['Perito Moreno Glacier', 'Santa Cruz'],
    ['Iguazú National Park', 'Misiones'],
    ['La Boca', 'Buenos Aires'],
    ['La Recoleta Cemetery', 'Buenos Aires'],
  ],
  PER: [
    ['Machu Picchu', 'Cusco Region'],
    ['Cusco', 'Cusco'],
    ['Lake Titicaca', 'Puno'],
    ['Nazca Lines', 'Ica Region'],
    ['Vinicunca', 'Cusco Region'],
  ],
  CHL: [
    ['Torres del Paine National Park', 'Magallanes'],
    ['Easter Island', 'Valparaíso Region'],
    ['Atacama Desert', 'Antofagasta Region'],
    ['Valparaíso', 'Valparaíso'],
  ],
  JPN: [
    ['Mount Fuji', 'Honshu'],
    ['Fushimi Inari-taisha', 'Kyoto'],
    ['Kinkaku-ji', 'Kyoto'],
    ['Sensō-ji', 'Tokyo'],
    ['Himeji Castle', 'Himeji'],
    ['Itsukushima Shrine', 'Hiroshima Prefecture'],
  ],
  CHN: [
    ['Great Wall of China', 'Northern China'],
    ['Forbidden City', 'Beijing'],
    ['Terracotta Army', "Xi'an"],
    ['The Bund', 'Shanghai'],
    ['Zhangjiajie National Forest Park', 'Hunan'],
  ],
  KOR: [
    ['Gyeongbokgung', 'Seoul'],
    ['Bukchon Hanok Village', 'Seoul'],
    ['Bulguksa', 'Gyeongju'],
    ['Jeju Island', 'Jeju'],
    ['N Seoul Tower', 'Seoul'],
  ],
  IND: [
    ['Taj Mahal', 'Agra'],
    ['Amber Fort', 'Jaipur'],
    ['Hawa Mahal', 'Jaipur'],
    ['Golden Temple', 'Amritsar'],
    ['Gateway of India', 'Mumbai'],
    ['Qutb Minar', 'Delhi'],
  ],
  PAK: [
    ['Badshahi Mosque', 'Lahore'],
    ['Hunza Valley', 'Gilgit-Baltistan'],
    ['Lahore Fort', 'Lahore'],
    ['Faisal Mosque', 'Islamabad'],
    ['Mohenjo-daro', 'Sindh'],
  ],
  NPL: [
    ['Mount Everest', 'Khumbu'],
    ['Boudhanath', 'Kathmandu'],
    ['Swayambhunath', 'Kathmandu'],
    ['Phewa Lake', 'Pokhara'],
  ],
  LKA: [
    ['Sigiriya', 'Central Province'],
    ['Temple of the Tooth', 'Kandy'],
    ['Galle Fort', 'Galle'],
    ['Dambulla cave temple', 'Dambulla'],
  ],
  THA: [
    ['Wat Arun', 'Bangkok'],
    ['Grand Palace', 'Bangkok'],
    ['Phi Phi Islands', 'Krabi Province'],
    ['Ayutthaya Historical Park', 'Ayutthaya'],
  ],
  VNM: [
    ['Ha Long Bay', 'Quảng Ninh'],
    ['Hội An', 'Quảng Nam'],
    ['Phong Nha-Kẻ Bàng National Park', 'Quảng Bình'],
    ['Imperial City of Huế', 'Huế'],
  ],
  KHM: [
    ['Angkor Wat', 'Siem Reap'],
    ['Bayon', 'Angkor'],
    ['Ta Prohm', 'Angkor'],
    ['Royal Palace, Phnom Penh', 'Phnom Penh'],
  ],
  IDN: [
    ['Borobudur', 'Central Java'],
    ['Prambanan', 'Yogyakarta'],
    ['Mount Bromo', 'East Java'],
    ['Pura Luhur Uluwatu', 'Bali'],
    ['Komodo National Park', 'East Nusa Tenggara'],
  ],
  MYS: [
    ['Petronas Towers', 'Kuala Lumpur'],
    ['Batu Caves', 'Selangor'],
    ['Mount Kinabalu', 'Sabah'],
    ['George Town, Penang', 'Penang'],
  ],
  SGP: [
    ['Gardens by the Bay', 'Marina Bay'],
    ['Marina Bay Sands', 'Marina Bay'],
    ['Merlion', 'Marina Bay'],
    ['Sentosa', 'Sentosa'],
  ],
  PHL: [
    ['Chocolate Hills', 'Bohol'],
    ['Banaue Rice Terraces', 'Ifugao'],
    ['Puerto Princesa Subterranean River National Park', 'Palawan'],
    ['Intramuros', 'Manila'],
  ],
  ARE: [
    ['Burj Khalifa', 'Dubai'],
    ['Sheikh Zayed Grand Mosque', 'Abu Dhabi'],
    ['Palm Jumeirah', 'Dubai'],
    ['Louvre Abu Dhabi', 'Abu Dhabi'],
  ],
  JOR: [
    ['Petra', "Ma'an Governorate"],
    [
      'Wadi Rum',
      'Aqaba Governorate',
      {
        // The Wikipedia intro has an unclosed bracket; this keeps its own wording.
        description:
          'Wadi Rum, known also as the Valley of the Moon, is a valley cut into the sandstone and granite rock in southern Jordan, near the border with Saudi Arabia.',
      },
    ],
    ['Dead Sea', 'Jordan Valley'],
    ['Jerash', 'Jerash Governorate'],
  ],
  AUS: [
    ['Sydney Opera House', 'Sydney'],
    ['Great Barrier Reef', 'Queensland'],
    ['Uluru', 'Northern Territory'],
    ['Sydney Harbour Bridge', 'Sydney'],
    ['Twelve Apostles (Victoria)', 'Victoria'],
  ],
  NZL: [
    ['Milford Sound', 'Fiordland'],
    ['Aoraki / Mount Cook', 'Canterbury'],
    ['Hobbiton Movie Set', 'Matamata'],
    ['Tongariro Alpine Crossing', 'Tongariro National Park'],
    ['Waitomo Glowworm Caves', 'Waitomo'],
  ],
};
