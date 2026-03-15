const fs = require('fs');

const lines = fs.readFileSync('src/styles/content.css', 'utf8').split(/\r?\n/);

function getLines(start, end) {
    if (start > lines.length) return '';
    const actualEnd = Math.min(end, lines.length);
    return lines.slice(start - 1, actualEnd).join('\n');
}

// 1. MAPS CSS (Layouts, locations, special planets)
const mapsCSS = [
    getLines(1, 383),     // basic map stuff, Korriban, Coruscant
    getLines(999, 1146),  // spaceport, galactic map
    getLines(1311, 1580)  // location-box, zone players, Dantooine, animations
].join('\n\n');

// 2. COMBAT CSS 
const combatCSS = getLines(478, 776);

// 3. MODALS & MISC CSS (NPC Dialogs, Settings, Item Rarity)
const modalsMiscCSS = [
    getLines(384, 477),   // NPC Dialog
    getLines(925, 998)    // WIP screens, Item Rarity
].join('\n\n');

// 4. REMAINING CONTENT CSS (Inventory, Market mockups - which might be moved later, but we keep them here for now)
const contentCSSRem = [
    '/* content.css - Reduced to core layout and specific screens like Inventory/Market */',
    getLines(777, 924),   // Inventory screen
    getLines(1147, 1310)  // Market screen
].join('\n\n');


fs.writeFileSync('src/styles/maps.css', mapsCSS);
fs.writeFileSync('src/styles/combat.css', combatCSS);
fs.writeFileSync('src/styles/modals-misc.css', modalsMiscCSS);
fs.writeFileSync('src/styles/content.css', contentCSSRem);

console.log('Split successfully. Please check src/styles/ folder.');
