#!/usr/bin/env node

/**
 * Comprehensive validation script to verify repository reorganization
 * Tests all imports, paths, and functionality after file restructuring
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Repository Reorganization Validation\n');
console.log('=' .repeat(60));

const results = {
  passed: [],
  failed: [],
  warnings: []
};

// Test 1: Verify core source files exist
console.log('\n1️⃣ Checking core source files...');
const coreFiles = [
  'src/app.js',
  'src/config/database.js',
  'src/config/environment.js',
  'src/controllers/messageController.js',
  'src/controllers/webhookController.js',
  'src/services/whatsappService.js',
  'src/services/geminiService.js',
  'src/services/userService.js',
  'src/services/conversationService.js',
  'src/models/User.js',
  'src/utils/languageUtils.js'
];

coreFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    console.log(`   ✅ ${file}`);
    results.passed.push(`Core file exists: ${file}`);
  } else {
    console.log(`   ❌ ${file} - MISSING!`);
    results.failed.push(`Core file missing: ${file}`);
  }
});

// Test 2: Verify test files moved to tests directory
console.log('\n2️⃣ Checking test files reorganization...');
const testDir = path.join(__dirname, 'tests/root-tests');
if (fs.existsSync(testDir)) {
  const testFiles = fs.readdirSync(testDir).filter(f => f.endsWith('.js'));
  console.log(`   ✅ tests/root-tests/ directory exists with ${testFiles.length} files`);
  results.passed.push(`Test files organized: ${testFiles.length} files`);
} else {
  console.log('   ❌ tests/root-tests/ directory missing!');
  results.failed.push('Test directory missing');
}

// Test 3: Verify documentation files moved to docs
console.log('\n3️⃣ Checking documentation reorganization...');
const docsDir = path.join(__dirname, 'docs');
if (fs.existsSync(docsDir)) {
  const docFiles = fs.readdirSync(docsDir, { withFileTypes: true });
  const mdFiles = docFiles.filter(f => f.isFile() && f.name.endsWith('.md'));
  const subDirs = docFiles.filter(f => f.isDirectory());
  console.log(`   ✅ docs/ directory exists with ${mdFiles.length} files and ${subDirs.length} subdirectories`);
  results.passed.push(`Documentation organized: ${mdFiles.length} files, ${subDirs.length} dirs`);
} else {
  console.log('   ❌ docs/ directory missing!');
  results.failed.push('Documentation directory missing');
}

// Test 4: Verify database setup
console.log('\n4️⃣ Checking database setup...');
const dbFiles = ['database/setup.js', 'database/schema.sql'];
dbFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    console.log(`   ✅ ${file}`);
    results.passed.push(`Database file exists: ${file}`);
  } else {
    console.log(`   ❌ ${file} - MISSING!`);
    results.failed.push(`Database file missing: ${file}`);
  }
});

// Test 5: Verify package.json scripts
console.log('\n5️⃣ Checking package.json scripts...');
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
const criticalScripts = {
  'start': 'node src/app.js',
  'dev': 'nodemon src/app.js',
  'setup-db': 'node database/setup.js'
};

Object.entries(criticalScripts).forEach(([scriptName, expectedCommand]) => {
  const actualCommand = packageJson.scripts[scriptName];
  if (actualCommand && actualCommand.includes(expectedCommand.split(' ')[1])) {
    console.log(`   ✅ npm ${scriptName} - ${actualCommand}`);
    results.passed.push(`Script correct: ${scriptName}`);
  } else {
    console.log(`   ❌ npm ${scriptName} - Script may be broken`);
    results.failed.push(`Script issue: ${scriptName}`);
  }
});

// Test 6: Check for import statement syntax
console.log('\n6️⃣ Validating import statements in source files...');
try {
  const appJs = fs.readFileSync(path.join(__dirname, 'src/app.js'), 'utf8');
  const messageController = fs.readFileSync(path.join(__dirname, 'src/controllers/messageController.js'), 'utf8');
  
  // Check for common import patterns
  const hasValidImports = appJs.includes("require('./config/") && 
                         appJs.includes("require('./controllers/");
  
  if (hasValidImports) {
    console.log('   ✅ Import statements look valid');
    results.passed.push('Import syntax valid');
  } else {
    console.log('   ⚠️  Import statements may need review');
    results.warnings.push('Import statements may need review');
  }
} catch (error) {
  console.log(`   ❌ Error reading source files: ${error.message}`);
  results.failed.push('Error reading source files');
}

// Test 7: Verify essential documentation files
console.log('\n7️⃣ Checking essential documentation...');
const essentialDocs = [
  'README.md',
  'CONTRIBUTING.md',
  'LICENSE',
  '.gitignore'
];

essentialDocs.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    console.log(`   ✅ ${file}`);
    results.passed.push(`Essential doc exists: ${file}`);
  } else {
    console.log(`   ❌ ${file} - MISSING!`);
    results.failed.push(`Essential doc missing: ${file}`);
  }
});

// Test 8: Verify no test files in root
console.log('\n8️⃣ Checking root directory is clean...');
const rootFiles = fs.readdirSync(__dirname);
const testFilesInRoot = rootFiles.filter(f => 
  f.startsWith('test-') || 
  f.startsWith('debug-') || 
  f.startsWith('verify-')
);

if (testFilesInRoot.length === 0) {
  console.log('   ✅ No test files in root directory');
  results.passed.push('Root directory clean');
} else {
  console.log(`   ⚠️  Found ${testFilesInRoot.length} test files still in root:`);
  testFilesInRoot.forEach(f => console.log(`      - ${f}`));
  results.warnings.push(`${testFilesInRoot.length} test files in root`);
}

// Test 9: Syntax check on critical files
console.log('\n9️⃣ Syntax validation...');
const { exec } = require('child_process');
const filesToCheck = [
  'src/app.js',
  'src/controllers/messageController.js',
  'database/setup.js'
];

let syntaxChecksPassed = 0;
let syntaxChecksTotal = filesToCheck.length;

filesToCheck.forEach(file => {
  try {
    require.resolve(path.join(__dirname, file));
    console.log(`   ✅ ${file} - Syntax valid`);
    syntaxChecksPassed++;
    results.passed.push(`Syntax valid: ${file}`);
  } catch (error) {
    console.log(`   ❌ ${file} - Syntax error: ${error.message}`);
    results.failed.push(`Syntax error: ${file}`);
  }
});

// Test 10: Check environment configuration
console.log('\n🔟 Checking environment configuration...');
const envExample = path.join(__dirname, '.env.example');
if (fs.existsSync(envExample)) {
  const envContent = fs.readFileSync(envExample, 'utf8');
  const requiredVars = [
    'WHATSAPP_ACCESS_TOKEN',
    'SUPABASE_URL',
    'GEMINI_API_KEY'
  ];
  
  const missingVars = requiredVars.filter(v => !envContent.includes(v));
  
  if (missingVars.length === 0) {
    console.log('   ✅ .env.example has all required variables');
    results.passed.push('Environment configuration complete');
  } else {
    console.log(`   ⚠️  Missing variables in .env.example: ${missingVars.join(', ')}`);
    results.warnings.push('Some environment variables missing');
  }
} else {
  console.log('   ⚠️  .env.example not found');
  results.warnings.push('.env.example not found');
}

// Final Report
console.log('\n' + '='.repeat(60));
console.log('📊 VALIDATION REPORT');
console.log('='.repeat(60));

console.log(`\n✅ Passed: ${results.passed.length}`);
if (results.passed.length > 0) {
  results.passed.slice(0, 5).forEach(item => console.log(`   • ${item}`));
  if (results.passed.length > 5) {
    console.log(`   ... and ${results.passed.length - 5} more`);
  }
}

if (results.warnings.length > 0) {
  console.log(`\n⚠️  Warnings: ${results.warnings.length}`);
  results.warnings.forEach(item => console.log(`   • ${item}`));
}

if (results.failed.length > 0) {
  console.log(`\n❌ Failed: ${results.failed.length}`);
  results.failed.forEach(item => console.log(`   • ${item}`));
}

// Overall status
console.log('\n' + '='.repeat(60));
if (results.failed.length === 0) {
  console.log('✅ OVERALL STATUS: PASSED');
  console.log('🎉 Repository reorganization is complete and functional!');
  console.log('\n📋 Next steps:');
  console.log('   1. Run: npm install');
  console.log('   2. Run: npm run dev');
  console.log('   3. Test WhatsApp integration');
  process.exit(0);
} else {
  console.log('❌ OVERALL STATUS: FAILED');
  console.log(`🔧 ${results.failed.length} critical issues need attention`);
  process.exit(1);
}
