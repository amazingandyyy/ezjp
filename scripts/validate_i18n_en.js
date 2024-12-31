const fs = require('fs');
const path = require('path');

// Function to get all keys from an object recursively with their values
function getAllKeysWithValues(obj, parentKey = '') {
  return Object.entries(obj).reduce((acc, [key, value]) => {
    const currentKey = parentKey ? `${parentKey}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return [...acc, ...getAllKeysWithValues(value, currentKey)];
    }
    return [...acc, { key: currentKey, value }];
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
function findKeyUsageInFile(filePath, key) {
  const content = fs.readFileSync(filePath, 'utf8');
  // Look for t('key') or t("key") patterns
  const pattern1 = `t('${key}')`;
  const pattern2 = `t("${key}")`;
  
  return (content.includes(pattern1) || content.includes(pattern2));
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
allKeysWithValues.forEach(({ key, value, file: sourceFile }) => {
  const usedIn = jsFiles.filter(file => findKeyUsageInFile(file, key))
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

unusedKeys.sort((a, b) => a.key.localeCompare(b.key))
  .forEach(({ key, value, file }) => {
    const valuePreview = typeof value === 'string'
      ? value.length > 50
        ? value.slice(0, 47) + '...'
        : value
      : JSON.stringify(value);
    
    console.log(`\n❌ ${key}:`);
    console.log(`  Value: ${valuePreview}`);
    console.log(`  From: ${file}`);
  });

// Summary
console.log('\nSummary:');
console.log(`Total keys: ${allKeysWithValues.length}`);
console.log(`Used keys: ${Object.keys(keyUsage).length}`);
console.log(`Unused keys: ${unusedKeys.length}`);
console.log(`Files using translations: ${Object.keys(usageByFile).length}`); 