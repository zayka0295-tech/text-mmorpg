import os
import re
import json
import urllib.request
import urllib.parse
import time

def translate_uk_to_ru(text):
    if not text.strip():
        return text
        
    # Check if text actually has ukrainian specific chars or we just want to force RU
    try:
        url = "https://translate.googleapis.com/translate_a/single?client=gtx&sl=uk&tl=ru&dt=t&q=" + urllib.parse.quote(text)
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode('utf-8'))
            translated_text = "".join([sentence[0] for sentence in result[0]])
            return translated_text
    except Exception as e:
        print(f"Error translating '{text}': {e}")
        return text

def process_file(filepath):
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        orig = content
        
        # We find strings containing at least one Cyrillic character.
        # But wait, there are strings like 'Надето!' which are already Russian.
        # Translating RU to RU from UK -> RU might slightly change it, but usually keeps it intact.
        # To be safe and fast, let's collect all unique cyrillic strings.
        
        # Regex to match string literals with single, double or backticks
        # It must contain at least one cyrillic char.
        # We need to be careful with backticks containing expressions like ${...}
        
        def replacer(match):
            quote = match.group(1)
            inner = match.group(2)
            
            # If it's a backtick string, it might have ${...}. 
            # We should probably not translate the ${var} parts.
            if quote == '`' and '${' in inner:
                # Basic handling: split by ${...} and translate parts
                parts = re.split(r'(\$\{.*?\})', inner)
                translated_parts = []
                for p in parts:
                    if p.startswith('${') and p.endswith('}'):
                        translated_parts.append(p)
                    elif re.search(r'[А-Яа-яІіЄєЇїҐґ]', p):
                        translated_parts.append(translate_uk_to_ru(p))
                    else:
                        translated_parts.append(p)
                return quote + "".join(translated_parts) + quote
                
            elif re.search(r'[А-Яа-яІіЄєЇїҐґ]', inner):
                # Only translate if it has Ukrainian specific chars or if we just want to translate all
                # Let's check if it has ukrainian chars or specific words to avoid over-translating 
                # fully Russian strings which could get messed up.
                uk_chars = re.search(r'[ІіЄєЇїҐґ]', inner)
                # Some words are just ukrainian but share alphabet with RU: 
                # e.g., "гравець", "зберегти", "налаштування", "рівень"
                # If we translate everything, Google API handles mixed RU/UK well.
                translated = translate_uk_to_ru(inner)
                return quote + translated + quote
            
            return match.group(0)

        # Match single or double quote strings
        pattern_quotes = r'(["\'])(.*?)\1'
        content = re.sub(pattern_quotes, replacer, content)
        
        # Match backtick strings (can be multiline, so re.DOTALL)
        pattern_ticks = r'(`)(.*?)`'
        content = re.sub(pattern_ticks, replacer, content, flags=re.DOTALL)

        if content != orig:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"Translated: {filepath}")
            
    except Exception as e:
        print(f"File Error {filepath}: {e}")

if __name__ == "__main__":
    files_to_process = []
    # Include index.html
    if os.path.exists('index.html'):
        files_to_process.append('index.html')
        
    for root, dirs, files in os.walk('src'):
        for file in files:
            if file.endswith('.js') or file.endswith('.html'):
                files_to_process.append(os.path.join(root, file))
                
    total = len(files_to_process)
    for i, fp in enumerate(files_to_process):
        print(f"Processing {i+1}/{total}: {fp}")
        process_file(fp)
        time.sleep(0.1) # Be nice to the API
