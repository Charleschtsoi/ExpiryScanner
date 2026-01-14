import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import { Database } from '../types/supabase';

// Get Supabase URL and anon key from environment variables
// For Expo, we can use process.env or Constants.expoConfig.extra
const supabaseUrl = 
  process.env.EXPO_PUBLIC_SUPABASE_URL || 
  Constants.expoConfig?.extra?.supabaseUrl || 
  '';
  
const supabaseAnonKey = 
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 
  Constants.expoConfig?.extra?.supabaseAnonKey || 
  '';

// Validate configuration - check if both values are non-empty strings
const isConfigured = !!(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl.trim() !== '' && 
  supabaseAnonKey.trim() !== '' &&
  supabaseUrl !== 'https://your-project-id.supabase.co' &&
  supabaseAnonKey !== 'your-anon-key-here'
);

if (!isConfigured) {
  const missing = [];
  if (!supabaseUrl || supabaseUrl.trim() === '' || supabaseUrl === 'https://your-project-id.supabase.co') {
    missing.push('EXPO_PUBLIC_SUPABASE_URL');
  }
  if (!supabaseAnonKey || supabaseAnonKey.trim() === '' || supabaseAnonKey === 'your-anon-key-here') {
    missing.push('EXPO_PUBLIC_SUPABASE_ANON_KEY');
  }
  
  console.warn(
    `⚠️ Supabase configuration missing: ${missing.join(', ')}\n` +
    `Please set these environment variables:\n` +
    `- Create a .env file in the project root\n` +
    `- Add: EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co\n` +
    `- Add: EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key\n` +
    `- Restart your Expo dev server after adding these variables\n\n` +
    `The app will work but AI analysis features will not function until configured.`
  );
}

// Create Supabase client with valid placeholder URLs to prevent crashes
// Using a valid URL format to satisfy createClient validation
// The client will be created but operations will fail gracefully if credentials are missing
const placeholderUrl = 'https://placeholder-project-id.supabase.co';
const placeholderKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

// Ensure we always pass valid strings to createClient
// CRITICAL: If using placeholder credentials, Edge Functions will return 401
const finalUrl = (isConfigured && supabaseUrl) ? supabaseUrl : placeholderUrl;
const finalKey = (isConfigured && supabaseAnonKey) ? supabaseAnonKey : placeholderKey;

// Warn if using placeholders (this will cause 401 errors with Edge Functions)
if (finalUrl === placeholderUrl || finalKey === placeholderKey) {
  console.warn('⚠️ WARNING: Supabase client is using PLACEHOLDER credentials!');
  console.warn('⚠️ This will cause 401 errors when calling Edge Functions.');
  console.warn('⚠️ Please ensure EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY are set in .env');
  console.warn('⚠️ Then restart your Expo dev server with: npx expo start --clear');
}

// Warn if using publishable key instead of JWT anon key
const keyIsPublishable = finalKey.startsWith('sb_publishable_');
if (keyIsPublishable && finalKey !== placeholderKey) {
  console.warn('⚠️ WARNING: Supabase client initialized with PUBLISHABLE key instead of JWT anon key!');
  console.warn('⚠️ This will cause 401 errors with Edge Functions.');
  console.warn('⚠️ Please update .env file with the JWT anon key (starts with "eyJ") and restart Expo dev server.');
}

// Create Supabase client with error handling
let supabaseClient;
try {
  supabaseClient = createClient<Database>(finalUrl, finalKey, {
    auth: {
      autoRefreshToken: isConfigured,
      persistSession: isConfigured,
      detectSessionInUrl: false,
    },
  });
} catch (error) {
  console.error('Failed to create Supabase client:', error);
  // Fallback: create client with placeholder values even on error
  supabaseClient = createClient<Database>(placeholderUrl, placeholderKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

export const supabase = supabaseClient;

// Export a function to check if Supabase is properly configured
export const isSupabaseConfigured = (): boolean => {
  return isConfigured;
};

// Log configuration status in development
if (process.env.NODE_ENV !== 'production') {
  console.log('🔧 Supabase Client Configuration:', {
    url: supabaseUrl ? `${supabaseUrl.substring(0, 30)}...` : '❌ NOT SET',
    anonKey: supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : '❌ NOT SET',
  });
}
