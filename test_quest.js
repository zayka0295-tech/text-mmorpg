const { readFileSync } = require('fs');
const { join } = require('path');

const SCRATCH_DIR = 'c:/Users/zayka/.gemini/antigravity/scratch/text-mmorpg/src';

const filesToCheck = [
  'engine/Entities/Player.js',
  'engine/Data/items.js',
  'engine/Dialogues/DialogManager.js',
  'locations/map/handlers/TombHandler.js',
  'locations/map/handlers/SithHolocronHandler.js',
  'locations/map/planets/KorribanRenderer.js',
  'locations/MapScreen.js',
  'engine/Data/locations.js'
];

console.log("Checking for syntax errors...");

let hasErrors = false;

for (const file of filesToCheck) {
  try {
    const content = readFileSync(join(SCRATCH_DIR, file), 'utf-8');
    // Using new Function() is a quick way to catch basic syntax errors in JS strings
    new Function(content);
    console.log(`[OK] ${file}`);
  } catch(e) { 
    console.error(`[ERROR] ${file}:`, e.message); 
    hasErrors = true;
  }
}

if (!hasErrors) {
  console.log("All syntax checks passed! You can start the game now.");
}
