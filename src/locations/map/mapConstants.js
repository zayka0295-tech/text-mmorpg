// ==========================================
//MAP CONSTANTS - статические данные для MapScreen
// ==========================================

/**
 * Карта "обратных" ссылок между локациями.
 * Ключ: текущая локация, значение: куда ведет кнопка "Назад".*/
export const BACK_LINKS = {
    // Tatooine
    'tatooine_market':        'tatooine_spaceport',
    'tatooine_cantina':       'tatooine_spaceport',
    'jundland_wastes':        'tatooine_spaceport',
    'tatooine_dune_sea':      'jundland_wastes',

    // Coruscant
    'coruscant_market':       'coruscant_spaceport',
    'coruscant_dexters':      'coruscant_spaceport',
    'coruscant_level_1313':   'coruscant_spaceport',
    'coruscant_senate':       'coruscant_spaceport',
    'coruscant_jedi_temple':  'coruscant_spaceport',

    // Korriban
    'korriban_academy':       'korriban_landing',
    'korriban_library':       'korriban_landing',
    'korriban_valley':        'korriban_landing',
    'korriban_shyrack':       'korriban_landing',
    'korriban_ceremony_hall': 'korriban_academy',
    'korriban_sith_temple':   'korriban_academy',
    'korriban_arena':         'korriban_academy',
    'tomb_ajunta_pall':       'korriban_valley',
    'tomb_tulak_hord':        'korriban_valley',
    'tomb_marka_ragnos':      'korriban_valley',

    // Dantooine
    'dantooine_enclave':      'dantooine_courtyard',
    'dantooine_farmlands':    'dantooine_courtyard',
    'dantooine_crystal_caves':'dantooine_courtyard',
    'dantooine_meditation':   'dantooine_enclave',
    'dantooine_knowledge':    'dantooine_enclave',
    'dantooine_padawan':      'dantooine_enclave',
};

/**
 * Изображение фона для каждой локации.*/
export const LOCATION_BACKGROUNDS = {
    // Korriban
    'korriban_landing':       '/public/assets/locations/korriban/landing_bg.png',
    'korriban_academy':       '/public/assets/locations/korriban/academy_bg.png',
    'korriban_valley':        '/public/assets/locations/korriban/valley_bg.png',
    'korriban_library':       '/public/assets/locations/korriban/library_bg.png',
    'korriban_shyrack':       '/public/assets/locations/korriban/shyrack_bg.png',
    'korriban_ceremony_hall': '/public/assets/locations/korriban/ceremony_bg.png',
    'korriban_sith_temple':   '/public/assets/locations/korriban/temple_bg.png',
    'korriban_arena':         '/public/assets/locations/korriban/arena_bg.png',
    'tomb_ajunta_pall':       '/public/assets/locations/korriban/ajunta_pall_bg.png',
    'tomb_tulak_hord':        '/public/assets/locations/korriban/tulak_hord_bg.png',
    'tomb_marka_ragnos':      '/public/assets/locations/korriban/marka_ragnos_bg.png',
    // Tatooine
    'tatooine_spaceport':     '/public/assets/locations/tatooine/spaceport_bg.png',
    'tatooine_cantina':       '/public/assets/locations/tatooine/cantina_bg.png',
    'tatooine_market':        '/public/assets/locations/tatooine/market_bg.png',
    'jundland_wastes':        '/public/assets/locations/tatooine/wastes_bg.png',
    'tatooine_dune_sea':      '/public/assets/locations/tatooine/dune_bg.png',
    // Coruscant
    'coruscant_spaceport':    '/public/assets/locations/coruscant/spaceport_bg.png',
    'coruscant_market':       '/public/assets/locations/coruscant/market_bg.png',
    'coruscant_bank':         '/public/assets/locations/coruscant/bank_bg.png',
    'coruscant_dexters':      '/public/assets/locations/coruscant/dexters_bg.png',
    'coruscant_level_1313':   '/public/assets/locations/coruscant/level1313_bg.png',
    'coruscant_senate':       '/public/assets/locations/coruscant/senate_bg.png',
    'coruscant_jedi_temple':  '/public/assets/locations/coruscant/temple_bg.png',
    // Dantooine
    'dantooine_courtyard':    '/public/assets/locations/dantooine/courtyard_bg.png',
    'dantooine_enclave':      '/public/assets/locations/dantooine/enclave_bg.png',
    'dantooine_meditation':   '/public/assets/locations/dantooine/meditation_bg.png',
    'dantooine_padawan':      '/public/assets/locations/dantooine/padawan_bg.png',
    'dantooine_knowledge':    '/public/assets/locations/dantooine/knowledge_bg.png',
    'dantooine_crystal_caves':'/public/assets/locations/dantooine/caves_bg.png',
    'dantooine_farmlands':    '/public/assets/locations/dantooine/farmlands_bg.png',
};
