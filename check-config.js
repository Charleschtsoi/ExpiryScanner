#!/usr/bin/env node
/**
 * Quick configuration checker for ExpiryScanner
 * Run with: node check-config.js
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 ExpiryScanner Configuration Check\n');
console.log('=' .repeat(50));

// Check 1: Environment variables file
console.log('\n1️⃣  Checking .env file...');
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  console.log('   ✅ .env file exists');
  const envContent = fs.readFileSync(envPath, 'utf8');
  const hasUrl = envContent.includes('EXPO_PUBLIC_SUPABASE_URL');
  const hasKey = envContent.includes('EXPO_PUBLIC_SUPABASE_ANON_KEY');
  
  console.log('   ' + (hasUrl ? '✅' : '❌') + ' EXPO_PUBLIC_SUPABASE_URL');
  console.log('   ' + (hasKey ? '✅' : '❌') + ' EXPO_PUBLIC_SUPABASE_ANON_KEY');
  
  if (!hasUrl || !hasKey) {
    console.log('\n   ⚠️  Missing environment variables in .env file');
    console.log('   Add these lines to your .env file:');
    console.log('   EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co');
    console.log('   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here');
  }
} else {
  console.log('   ❌ .env file not found');
  console.log('\n   📝 Create a .env file in the project root with:');
  console.log('   EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co');
  console.log('   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here');
}

// Check 2: Edge Function exists
console.log('\n2️⃣  Checking Edge Function file...');
const edgeFunctionPath = path.join(__dirname, 'supabase', 'functions', 'analyze-product', 'index.ts');
if (fs.existsSync(edgeFunctionPath)) {
  console.log('   ✅ Edge Function file exists: supabase/functions/analyze-product/index.ts');
} else {
  console.log('   ❌ Edge Function file not found');
  console.log('   Expected: supabase/functions/analyze-product/index.ts');
}

// Check 3: Supabase client file
console.log('\n3️⃣  Checking Supabase client...');
const supabaseClientPath = path.join(__dirname, 'lib', 'supabase.ts');
if (fs.existsSync(supabaseClientPath)) {
  console.log('   ✅ Supabase client file exists: lib/supabase.ts');
} else {
  console.log('   ❌ Supabase client file not found');
}

// Check 4: ScannerScreen
console.log('\n4️⃣  Checking ScannerScreen...');
const scannerScreenPath = path.join(__dirname, 'screens', 'ScannerScreen.tsx');
if (fs.existsSync(scannerScreenPath)) {
  console.log('   ✅ ScannerScreen exists: screens/ScannerScreen.tsx');
} else {
  console.log('   ❌ ScannerScreen not found');
}

// Summary
console.log('\n' + '='.repeat(50));
console.log('\n📋 Next Steps:\n');

console.log('1. If .env file is missing or incomplete:');
console.log('   - Create .env file with your Supabase credentials');
console.log('   - Get credentials from: https://app.supabase.com/project/[your-project]/settings/api');
console.log('   - Restart your Expo dev server after adding variables\n');

console.log('2. Deploy the Edge Function:');
console.log('   npm install -g supabase');
console.log('   supabase login');
console.log('   supabase link --project-ref [your-project-ref]');
console.log('   supabase functions deploy analyze-product\n');

console.log('3. Set OpenAI API key secret:');
console.log('   supabase secrets set OPENAI_API_KEY=sk-your-key-here\n');

console.log('4. Verify everything works:');
console.log('   - Check console logs when scanning a barcode');
console.log('   - Look for "Starting product analysis" message');
console.log('   - Check for any error messages\n');

console.log('📖 For detailed troubleshooting, see TROUBLESHOOTING.md\n');
