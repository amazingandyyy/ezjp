const fs = require('fs');
const path = require('path');

// Function to get all keys from an object recursively
function getAllKeys(obj, parentKey = '') {
  return Object.entries(obj).reduce((keys, [key, value]) => {
    const currentKey = parentKey ? `${parentKey}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return [...keys, currentKey, ...getAllKeys(value, currentKey)];
    }
    return [...keys, currentKey];
  }, []);
}

// Function to get missing keys in target object
function getMissingKeys(sourceKeys, targetKeys) {
  return sourceKeys.filter(key => !targetKeys.includes(key));
}

// Function to get extra keys in target object
function getExtraKeys(sourceKeys, targetKeys) {
  return targetKeys.filter(key => !sourceKeys.includes(key));
}

// Function to get value type mismatches and value mismatches
function getTypeMismatches(sourceObj, targetObj, parentKey = '') {
  return Object.entries(sourceObj).reduce((mismatches, [key, sourceValue]) => {
    const currentKey = parentKey ? `${parentKey}.${key}` : key;
    const targetValue = targetObj[key];

    // Skip if key doesn't exist in target
    if (targetValue === undefined) return mismatches;

    const sourceType = Array.isArray(sourceValue) ? 'array' : typeof sourceValue;
    const targetType = Array.isArray(targetValue) ? 'array' : typeof targetValue;

    if (sourceType !== targetType) {
      mismatches.push({
        key: currentKey,
        sourceType,
        targetType,
        sourceValue,
        targetValue
      });
    } else if (sourceType === 'object' && targetType === 'object') {
      return [...mismatches, ...getTypeMismatches(sourceValue, targetValue, currentKey)];
    } else if (Array.isArray(sourceValue)) {
      // For arrays, check if they have the same elements
      const arrayDiff = JSON.stringify(sourceValue) !== JSON.stringify(targetValue);
      if (arrayDiff) {
        mismatches.push({
          key: currentKey,
          sourceType: 'array',
          targetType: 'array',
          sourceValue,
          targetValue,
          issue: 'array_mismatch'
        });
      }
    }

    return mismatches;
  }, []);
}

// Helper function to get value by path
function getValueByPath(obj, path) {
  return path.split('.').reduce((acc, part) => acc && acc[part], obj);
}

// Main validation function
function validateTranslations(sourcePath, targetPath) {
  try {
    const sourceContent = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
    const targetContent = JSON.parse(fs.readFileSync(targetPath, 'utf8'));

    const sourceKeys = getAllKeys(sourceContent);
    const targetKeys = getAllKeys(targetContent);

    const missing = getMissingKeys(sourceKeys, targetKeys).map(key => ({
      key,
      englishValue: getValueByPath(sourceContent, key)
    }));

    const extra = getExtraKeys(sourceKeys, targetKeys).map(key => ({
      key,
      value: getValueByPath(targetContent, key)
    }));

    const typeMismatches = getTypeMismatches(sourceContent, targetContent);

    return {
      missing,
      extra,
      typeMismatches,
      hasIssues: missing.length > 0 || extra.length > 0 || typeMismatches.length > 0
    };
  } catch (error) {
    return {
      error: error.message,
      hasIssues: true
    };
  }
}

// Function to get all JSON files in a directory
function getJsonFiles(dir) {
  return fs.readdirSync(dir)
    .filter(file => file.endsWith('.json'))
    .map(file => ({
      name: file,
      path: path.join(dir, file)
    }));
}

// Function to validate a specific file type across all languages
function validateFileType(messagesDir, fileType) {
  console.log(`\nValidating ${fileType} translations against English source...`);
  console.log('='.repeat(50));

  const sourceFile = path.join(messagesDir, 'en', fileType);
  
  // Check if source file exists
  if (!fs.existsSync(sourceFile)) {
    console.log(`❌ Source file ${fileType} not found in English translations`);
    return true;
  }

  // Get all language directories
  const langDirs = fs.readdirSync(messagesDir)
    .filter(dir => dir !== 'en' && fs.statSync(path.join(messagesDir, dir)).isDirectory());

  let hasAnyIssues = false;

  langDirs.forEach(lang => {
    const targetFile = path.join(messagesDir, lang, fileType);
    
    // Check if target file exists
    if (!fs.existsSync(targetFile)) {
      console.log(`❌ ${lang}: Missing file ${targetFile}`);
      hasAnyIssues = true;
      return;
    }

    console.log(`\nChecking ${targetFile}...`);
    const result = validateTranslations(sourceFile, targetFile);

    if (result.error) {
      console.log(`❌ Error processing ${lang}: ${result.error}`);
      hasAnyIssues = true;
      return;
    }

    if (result.hasIssues) {
      hasAnyIssues = true;
      console.log(`❌ Issues found in ${lang}:`);

      if (result.missing.length > 0) {
        console.log('\nMissing keys:');
        result.missing.forEach(({ key, englishValue }) => {
          const valuePreview = typeof englishValue === 'string' 
            ? englishValue.length > 50 
              ? englishValue.slice(0, 47) + '...' 
              : englishValue
            : JSON.stringify(englishValue);
          console.log(`  - ${key}`);
          console.log(`    English: ${valuePreview}`);
        });
      }

      if (result.extra.length > 0) {
        console.log('\nExtra keys:');
        result.extra.forEach(({ key, value }) => {
          const valuePreview = typeof value === 'string'
            ? value.length > 50
              ? value.slice(0, 47) + '...'
              : value
            : JSON.stringify(value);
          console.log(`  - ${key}`);
          console.log(`    Current value: ${valuePreview}`);
        });
      }

      if (result.typeMismatches.length > 0) {
        console.log('\nType mismatches and value differences:');
        result.typeMismatches.forEach(({ key, sourceType, targetType, sourceValue, targetValue, issue }) => {
          if (issue === 'array_mismatch') {
            console.log(`  - ${key}: arrays have different values`);
            console.log(`    English: ${JSON.stringify(sourceValue)}`);
            console.log(`    Current: ${JSON.stringify(targetValue)}`);
          } else {
            console.log(`  - ${key}: expected ${sourceType}, got ${targetType}`);
            console.log(`    English: ${JSON.stringify(sourceValue)}`);
            console.log(`    Current: ${JSON.stringify(targetValue)}`);
          }
        });
      }

      console.log(''); // Empty line for readability
    } else {
      console.log(`✅ ${lang} is valid`);
    }
  });

  return hasAnyIssues;
}

// Main execution
const messagesDir = path.join(__dirname, '..', 'messages');
const englishDir = path.join(messagesDir, 'en');

// Get all JSON files from English directory
const englishFiles = getJsonFiles(englishDir);

if (englishFiles.length === 0) {
  console.log('❌ No JSON files found in English translations directory');
  process.exit(1);
}

console.log(`Found ${englishFiles.length} files to validate:`, englishFiles.map(f => f.name).join(', '));

let hasAnyIssues = false;

englishFiles.forEach(file => {
  const fileHasIssues = validateFileType(messagesDir, file.name);
  hasAnyIssues = hasAnyIssues || fileHasIssues;
});

if (hasAnyIssues) {
  console.log('\n❌ Validation failed. Please fix the issues above.');
  process.exit(1);
} else {
  console.log('\n✅ All translations are valid!');
  process.exit(0);
} 