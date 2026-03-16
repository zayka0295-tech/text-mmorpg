
const RARITY_CONFIG = {
    common:    { priceMult: 1.0 },
    rare:      { priceMult: 3.0 },
    epic:      { priceMult: 7.0 },
    legendary: { priceMult: 18.0 }
};

// Simplified templates containing only what's needed for price calculation
const BASE_TEMPLATES = {
    // WEAPONS
    'blaster_e11':    { baseValue: 80 },
    'dl44_blaster':   { baseValue: 60 },
    'verpine_rifle':  { baseValue: 100 },
    'dc17_pistol':    { baseValue: 50 },
    'vibro_dagger':   { baseValue: 40 },
    'vibro_blade':    { baseValue: 55 },
    'mando_blade':    { baseValue: 75 },

    // ARMOR
    'cloth_tunic':    { baseValue: 40 },
    'mesh_vest':      { baseValue: 80 },
    'durasteel_vest': { baseValue: 130 },
    'beskar_plate':   { baseValue: 250 },

    // HELMETS
    'scout_goggles':  { baseValue: 30 },
    'combat_helmet':  { baseValue: 60 },
    'heavy_helm':     { baseValue: 100 },
    'mando_helm':     { baseValue: 160 },

    // PANTS
    'cloth_pants':    { baseValue: 25 },
    'leather_pants':  { baseValue: 45 },
    'armored_pants':  { baseValue: 75 },

    // BOOTS
    'leather_boots':  { baseValue: 20 },
    'combat_boots':   { baseValue: 40 },
    'durasteel_boots':{ baseValue: 65 }
};

function validateItemPrice(item) {
    if (!item || !item.baseId || !item.rarity) return null;

    const template = BASE_TEMPLATES[item.baseId];
    if (!template) return null; // Unknown item

    const cfg = RARITY_CONFIG[item.rarity];
    if (!cfg) return null; // Unknown rarity

    const level = item.level || 1;
    const levelBonus = 1 + (level - 1) * 0.05;

    // Calculate expected value
    const expectedValue = Math.floor((template.baseValue || 50) * cfg.priceMult * levelBonus);

    // Allow a small margin of error (e.g., +/- 1 credit or rounding diffs)
    // But strictly speaking it should be exact if logic matches.
    return expectedValue;
}

module.exports = { validateItemPrice };
