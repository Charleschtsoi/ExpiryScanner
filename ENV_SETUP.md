# Environment Variables Setup Guide

## Quick Setup

The app is now configured to handle missing Supabase credentials gracefully. However, to use AI analysis features, you need to configure your environment variables.

### Step 1: Create .env File

Copy the example file:
```bash
cp .env.example .env
```

### Step 2: Add Your Supabase Credentials

Open the `.env` file and add your actual values:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### Step 3: Get Your Supabase Credentials

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project (or create a new one)
3. Go to **Settings** → **API**
4. Copy:
   - **Project URL** → `EXPO_PUBLIC_SUPABASE_URL`
   - **anon public** key → `EXPO_PUBLIC_SUPABASE_ANON_KEY`

### Step 4: Restart Expo Server

**Important:** After adding/updating `.env` file, you must restart your Expo dev server:

```bash
# Stop the current server (Ctrl+C)
# Then restart:
npx expo start --clear
```

The `--clear` flag clears the cache to ensure new environment variables are loaded.

## Verification

After restarting, check the console logs. You should see:

✅ **Good:**
```
🔧 Supabase Client Configuration: {
  url: 'https://your-project.supabase.co...',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5...'
}
```

❌ **If still missing:**
```
⚠️ Supabase configuration missing: EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY
```

## Troubleshooting

### Environment Variables Not Loading

1. **Check file name**: Must be exactly `.env` (not `.env.example`)
2. **Check location**: Must be in the project root (same folder as `package.json`)
3. **Check format**: No quotes around values
   ```env
   # ✅ Correct
   EXPO_PUBLIC_SUPABASE_URL=https://abc.supabase.co
   
   # ❌ Wrong
   EXPO_PUBLIC_SUPABASE_URL="https://abc.supabase.co"
   ```
4. **Restart server**: Always restart after changing `.env` file
5. **Clear cache**: Use `npx expo start --clear`

### App Works But AI Features Don't

The app is designed to work without Supabase (won't crash), but AI features require configuration:

- **Without config**: App loads, but scanning will show configuration errors
- **With config**: Full AI analysis features work

### Using Expo Go

Expo Go should automatically load `.env` files with `EXPO_PUBLIC_` prefix. If it doesn't work:

1. Use `expo-constants` package (already installed)
2. Check that variables are prefixed with `EXPO_PUBLIC_`
3. Restart the Expo Go app on your device

## Next Steps After Configuration

Once configured:

1. ✅ Deploy Edge Function:
   ```bash
   supabase functions deploy analyze-product
   ```

2. ✅ Set OpenAI API key:
   ```bash
   supabase secrets set OPENAI_API_KEY=sk-your-key
   ```

3. ✅ Test scanning: Scan a barcode to verify AI analysis works

## Current Status

The app is now configured to:
- ✅ Load without crashing if Supabase is not configured
- ✅ Show helpful warning messages
- ✅ Allow the UI to work (home screen, camera, etc.)
- ✅ Fail gracefully when trying to use AI features without config
