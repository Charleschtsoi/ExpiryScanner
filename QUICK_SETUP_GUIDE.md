# Quick Setup Guide: Configure Supabase

## 🎯 Goal
Set up environment variables so your app can connect to Supabase and use AI features.

---

## Step 1: Get Your Supabase Credentials

### Option A: You Already Have a Supabase Project

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Sign in to your account
3. Select your project from the list
4. Go to **Settings** (gear icon in left sidebar)
5. Click on **API** in the settings menu
6. You'll see two values you need:
   - **Project URL** - looks like `https://abcdefghijklmnop.supabase.co`
   - **anon public** key - a long string starting with `eyJhbGci...`

### Option B: Create a New Supabase Project

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Click **New Project**
3. Fill in:
   - **Name**: ExpiryScanner (or any name you like)
   - **Database Password**: Create a strong password (save it!)
   - **Region**: Choose closest to you
4. Click **Create new project** (takes 1-2 minutes)
5. Once created, go to **Settings** → **API**
6. Copy the **Project URL** and **anon public** key

---

## Step 2: Create .env File

### On Mac/Linux:
```bash
cd /Users/charlescht/ExpiryScanner/ExpiryScanner
cp .env.example .env
```

### On Windows:
```cmd
cd C:\path\to\ExpiryScanner\ExpiryScanner
copy .env.example .env
```

### Or Manually:
1. In your project root folder (`/Users/charlescht/ExpiryScanner/ExpiryScanner`)
2. Create a new file named exactly `.env` (with the dot at the beginning)
3. Make sure it's in the same folder as `package.json`

---

## Step 3: Add Your Credentials

Open the `.env` file in a text editor and replace the placeholder values:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-actual-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-actual-anon-key-here
```

**Example** (with fake values):
```env
EXPO_PUBLIC_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTY0NTE5MjAwMCwiZXhwIjoxOTYwNzY4MDAwfQ.example
```

**Important:**
- ✅ No quotes around the values
- ✅ No spaces around the `=` sign
- ✅ Must start with `EXPO_PUBLIC_` prefix
- ✅ Copy the exact values from Supabase dashboard

---

## Step 4: Verify .env File Location

Your file structure should look like this:

```
ExpiryScanner/
├── .env                    ← Must be here (project root)
├── .env.example
├── package.json
├── App.js
├── index.js
└── ...
```

**Check if file exists:**
```bash
ls -la .env
```

You should see the file listed. If not, you're in the wrong directory or the file wasn't created.

---

## Step 5: Restart Expo Server

**This is critical!** Expo only loads environment variables when it starts.

1. **Stop the current server:**
   - Press `Ctrl+C` in the terminal where Expo is running
   - Or close the terminal window

2. **Clear cache and restart:**
   ```bash
   npx expo start --clear
   ```

   The `--clear` flag ensures new environment variables are loaded.

3. **Wait for bundling to complete**

---

## Step 6: Verify Configuration

After restarting, check the console output. You should see:

### ✅ Success:
```
🔧 Supabase Client Configuration: {
  url: 'https://your-project.supabase.co...',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
}
```

### ❌ Still Missing:
```
⚠️ Supabase configuration missing: EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY
```

If you still see the warning:
- Double-check the `.env` file exists in the project root
- Verify the variable names are exactly `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- Make sure there are no extra spaces or quotes
- Restart the server again with `--clear`

---

## Step 7: Test It Works

1. Open the app on your device/simulator
2. Click **"Start Scanning"** button
3. Scan a barcode (or use manual entry)
4. You should see:
   - ✅ "AI Agent analyzing..." loading screen
   - ✅ Product details appear after analysis
   - ❌ No more "Supabase is not configured" errors

---

## Common Issues & Solutions

### Issue: "File .env not found"
**Solution:** Make sure you're in the project root directory and the file is named exactly `.env` (with the dot)

### Issue: Variables still not loading
**Solution:** 
1. Check file is in project root (same folder as `package.json`)
2. Restart with `npx expo start --clear`
3. Try closing and reopening the terminal completely

### Issue: "Invalid URL" error
**Solution:** 
- Make sure the URL starts with `https://`
- No trailing slash at the end
- Copy the exact URL from Supabase dashboard

### Issue: Still getting configuration errors
**Solution:**
1. Verify `.env` file content:
   ```bash
   cat .env
   ```
2. Check for typos in variable names
3. Make sure values don't have quotes: `EXPO_PUBLIC_SUPABASE_URL="..."` ❌
4. Should be: `EXPO_PUBLIC_SUPABASE_URL=https://...` ✅

---

## Quick Reference

### File Location
```
/Users/charlescht/ExpiryScanner/ExpiryScanner/.env
```

### Required Variables
```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### Where to Get Values
1. Go to: https://app.supabase.com
2. Select project → Settings → API
3. Copy **Project URL** and **anon public** key

### Restart Command
```bash
npx expo start --clear
```

---

## Next Steps After Configuration

Once Supabase is configured, you'll also need to:

1. **Deploy the Edge Function:**
   ```bash
   supabase functions deploy analyze-product
   ```

2. **Set OpenAI API Key:**
   ```bash
   supabase secrets set OPENAI_API_KEY=sk-your-openai-key
   ```

3. **Run Database Migrations:**
   - Go to Supabase SQL Editor
   - Run the SQL from `supabase/migrations/001_create_inventory_table.sql`
   - Run the SQL from `supabase/migrations/002_create_product_master_list.sql`

---

## Need Help?

If you're still having issues:
1. Check `ENV_SETUP.md` for more detailed troubleshooting
2. Verify your `.env` file content matches the format above
3. Make sure you restarted the Expo server after creating `.env`
4. Check the console logs for specific error messages
