const fs = require('fs');
const path = require('path');

// Function to get all keys from an object recursively with their values
function getAllKeysWithValues(obj, parentKey = '') {
  return Object.entries(obj).reduce((acc, [key, value]) => {
    const currentKey = parentKey ? `${parentKey}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return [...acc, ...getAllKeysWithValues(value, currentKey)];
    }
    return [...acc, { 
      key: currentKey, 
      value,
      isNumericKey: /^\d+$/.test(key),
      parentKey: parentKey
    }];
  }, []);
}

// Function to find all JS files in a directory recursively
function findJsFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      findJsFiles(filePath, fileList);
    } else if (file.endsWith('.js') || file.endsWith('.jsx') || file.endsWith('.ts') || file.endsWith('.tsx')) {
      fileList.push(filePath);
    }
  });
  return fileList;
}

// Function to find key usage in a file
function findKeyUsageInFile(filePath, key, isNumericKey = false, parentKey = '') {
  const content = fs.readFileSync(filePath, 'utf8');
  // Escape special characters in the key for regex safety
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  
  // Handle dynamic key construction patterns
  const keyParts = key.split('.');
  const lastPart = keyParts[keyParts.length - 1];

  // If this is a numeric key, check if its parent object is used with string interpolation
  if (isNumericKey && parentKey) {
    const escapedParentKey = parentKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parentPatterns = [
      // Template literal with variable interpolation in JSX
      `\\{t\\(\`${escapedParentKey}\\.\\$\\{[^}]+\\}\`\\)\\}`,   // {t(`parentKey.${var}`)}
      `\\{t\`${escapedParentKey}\\.\\$\\{[^}]+\\}\`\\}`,         // {t`parentKey.${var}`}
      // Previous patterns
      `t\`${escapedParentKey}\\.\\$\\{[^}]+\\}\``,             // t`parentKey.${var}`
      `t\\(\`${escapedParentKey}\\.\\$\\{[^}]+\\}\`\\)`,       // t(`parentKey.${var}`)
      `t\\('${escapedParentKey}\\.\\$\\{[^}]+\\}'\\)`,         // t('parentKey.${var}')
      `t\\("${escapedParentKey}\\.\\$\\{[^}]+\\}"\\)`,         // t("parentKey.${var}")
      // String concatenation
      `t\\(${escapedParentKey} \\+ [^)]+\\)`,                  // t(parentKey + something)
      `t\\('${escapedParentKey}\\.' \\+ [^)]+\\)`,             // t('parentKey.' + something)
      `t\\("${escapedParentKey}\\." \\+ [^)]+\\)`,             // t("parentKey." + something)
      // Array/object access
      `${escapedParentKey}\\[\\$\\{[^}]+\\}\\]`,              // parentKey[${var}]
      `${escapedParentKey}\\[[^\\]]+\\]`,                      // parentKey[anything]
    ];
    
    const hasParentUsage = parentPatterns.some(pattern => {
      try {
        return new RegExp(pattern).test(content);
      } catch (e) {
        console.warn(`Invalid regex pattern for parent key "${parentKey}":`, e.message);
        return false;
      }
    });
    
    if (hasParentUsage) {
      return true;
    }
  }

  const patterns = [
    // JSX patterns with curly braces
    `\\{t\\(\`${escapedKey}\`\\)\\}`,                         // {t(`key`)}
    `\\{t\`${escapedKey}\`\\}`,                               // {t`key`}
    `\\{t\\('${escapedKey}'\\)\\}`,                           // {t('key')}
    `\\{t\\("${escapedKey}"\\)\\}`,                           // {t("key")}
    // Previous patterns
    `t\\('${escapedKey}'\\)`,                                 // t('key')
    `t\\("${escapedKey}"\\)`,                                 // t("key")
    `t\`${escapedKey}\``,                                     // t`key`
    `t\\(\`${escapedKey}\`\\)`,                               // t(`key`)
    `'${escapedKey}'`,                                        // Direct key usage
    `"${escapedKey}"`,                                        // Direct key usage
    `\`${escapedKey}\``,                                      // Template string
    `\\['${escapedKey}'\\]`,                                  // Object access
    `\\["${escapedKey}"\\]`,                                  // Object access
    `t\\(${key.split('.').map(part => `'${part}'`).join(' \\+ "\\." \\+ ')}\\)`, // Dynamic key construction
    `useTranslation\\('${escapedKey}'\\)`,                    // Hook usage
    `getTranslation\\('${escapedKey}'\\)`,                    // Function call
    // Dynamic variable-based patterns
    `\\{t\\(\`[^$]*\\$\\{[^}]+\\}\\.${escapedKey}\`\\)\\}`,  // {t(`${var}.key`)}
    `\\{t\`[^$]*\\$\\{[^}]+\\}\\.${escapedKey}\`\\}`,        // {t`${var}.key`}
    `t\`[^$]*\\$\\{[^}]+\\}\\.${escapedKey}\``,              // t`${var}.key`
    `t\\(\`[^$]*\\$\\{[^}]+\\}\\.${escapedKey}\`\\)`,        // t(`${var}.key`)
    `t\\([^)]*\\.${escapedKey}[^)]*\\)`,                     // t(something.key)
    `\\$\\{t\\([^)]*\\.${escapedKey}[^)]*\\)\\}`,            // ${t(something.key)}
    `t\\([^)]*\\.${lastPart}[^)]*\\)`,                       // t(something.lastPart)
    `\\$\\{t\\([^)]*\\.${lastPart}[^)]*\\)\\}`,             // ${t(something.lastPart)}
  ];
  
  return patterns.some(pattern => {
    try {
      return new RegExp(pattern).test(content);
    } catch (e) {
      console.warn(`Invalid regex pattern for key "${key}":`, e.message);
      return false;
    }
  });
}

// Function to remove a key from an object using dot notation
function removeKey(obj, key) {
  const parts = key.split('.');
  let current = obj;
  
  for (let i = 0; i < parts.length - 1; i++) {
    if (!(parts[i] in current)) return;
    current = current[parts[i]];
  }
  
  delete current[parts[parts.length - 1]];
  
  // Clean up empty objects
  for (let i = parts.length - 2; i >= 0; i--) {
    current = obj;
    for (let j = 0; j < i; j++) {
      current = current[parts[j]];
    }
    if (Object.keys(current[parts[i]]).length === 0) {
      delete current[parts[i]];
    }
  }
}

// Function to remove keys from a language file
function removeKeysFromFile(filePath, keysToRemove) {
  if (!fs.existsSync(filePath)) return;
  
  const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  keysToRemove.forEach(key => removeKey(content, key));
  fs.writeFileSync(filePath, JSON.stringify(content, null, 2) + '\n');
}

// Main execution
const messagesDir = path.join(__dirname, '..', 'messages');
const englishDir = path.join(messagesDir, 'en');
const appDir = path.join(__dirname, '..', 'app');

// Get all JSON files from English directory
const englishFiles = fs.readdirSync(englishDir)
  .filter(file => file.endsWith('.json'))
  .map(file => ({
    name: file,
    path: path.join(englishDir, file)
  }));

if (englishFiles.length === 0) {
  console.log('❌ No JSON files found in English translations directory');
  process.exit(1);
}

// Collect all keys from all English translation files
const allKeysWithValues = [];
englishFiles.forEach(file => {
  const content = JSON.parse(fs.readFileSync(file.path, 'utf8'));
  const keys = getAllKeysWithValues(content);
  allKeysWithValues.push(...keys.map(k => ({ ...k, file: file.name })));
});

console.log(`Found ${allKeysWithValues.length} unique translation keys`);

// Find all JS files in app directory
const jsFiles = findJsFiles(appDir);
console.log(`Found ${jsFiles.length} JS files to analyze`);

// Create a map of key usage
const keyUsage = {};
allKeysWithValues.forEach(({ key, value, file: sourceFile, isNumericKey, parentKey }) => {
  const usedIn = jsFiles.filter(file => findKeyUsageInFile(file, key, isNumericKey, parentKey))
    .map(file => path.relative(process.cwd(), file));
  
  if (usedIn.length > 0) {
    keyUsage[key] = {
      sourceFile,
      value,
      usedIn
    };
  }
});

// Group usage by file
const usageByFile = {};
Object.entries(keyUsage).forEach(([key, { usedIn }]) => {
  usedIn.forEach(file => {
    if (!usageByFile[file]) usageByFile[file] = [];
    usageByFile[file].push(key);
  });
});

// Generate report
console.log('\nTranslation Key Usage');
console.log('='.repeat(50));

Object.entries(keyUsage)
  .sort(([a], [b]) => a.localeCompare(b))
  .forEach(([key, { sourceFile, value, usedIn }]) => {
    const valuePreview = typeof value === 'string' 
      ? value.length > 50 
        ? value.slice(0, 47) + '...' 
        : value
      : JSON.stringify(value);
    
    console.log(`\n✅ ${key}:`);
    console.log(`  Value: ${valuePreview}`);
    console.log(`  From: ${sourceFile}`);
    console.log(`  Used in:`);
    usedIn.sort().forEach(file => {
      console.log(`    - ${file}`);
    });
  });

// Find unused keys
console.log('\nUnused Translation Keys');
console.log('='.repeat(50));

const usedKeys = new Set(Object.keys(keyUsage));
const unusedKeys = allKeysWithValues.filter(({ key }) => !usedKeys.has(key));

// Group unused keys by source file
const unusedByFile = {};
unusedKeys.forEach(({ key, value, file }) => {
  if (!unusedByFile[file]) unusedByFile[file] = [];
  unusedByFile[file].push({ key, value });
});

// Remove unused keys from all language files
const languageDirs = fs.readdirSync(messagesDir)
  .map(dir => path.join(messagesDir, dir))
  .filter(dir => fs.statSync(dir).isDirectory());

Object.entries(unusedByFile).sort().forEach(([file, keys]) => {
  console.log(`\n📄 ${file}:`);
  keys.sort((a, b) => a.key.localeCompare(b.key)).forEach(({ key, value }) => {
    const valuePreview = typeof value === 'string'
      ? value.length > 50
        ? value.slice(0, 47) + '...'
        : value
      : JSON.stringify(value);
    
    console.log(`\n❌ ${key}:`);
    console.log(`  Value: ${valuePreview}`);
  });
  
  // Remove keys from all language files
  // languageDirs.forEach(langDir => {
  //   const langFile = path.join(langDir, file);
  //   const langName = path.basename(langDir);
  //   console.log(`  🗑️  Removing from ${langName}/${file}`);
  //   removeKeysFromFile(langFile, keys.map(k => k.key));
  // });
});

// Summary
console.log('\nSummary:');
console.log(`Total keys: ${allKeysWithValues.length}`);
console.log(`Used keys: ${Object.keys(keyUsage).length}`);
console.log(`Unused keys: ${unusedKeys.length}`);
console.log(`Files using translations: ${Object.keys(usageByFile).length}`);
console.log(`\nRemoved ${unusedKeys.length} unused keys from all language files.`);