# Troubleshooting: AI Connection Issues

## Common Issues and Quick Fixes

### ❌ Issue 1: "Supabase URL is not configured" Error

**Problem:** Environment variables are not set or not loaded.

**Solution:**
1. Create a `.env` file in your project root:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   ```

2. **For Expo projects**, environment variables need the `EXPO_PUBLIC_` prefix to be exposed to the client.

3. **Restart your Expo dev server** after adding/changing `.env` file:
   ```bash
   # Stop the current server (Ctrl+C)
   # Then restart:
   npm start
   # or
   npx expo start
   ```

4. Verify the variables are loaded:
   ```javascript
   console.log('SUPABASE_URL:', process.env.EXPO_PUBLIC_SUPABASE_URL);
   ```

**Get your Supabase credentials:**
- Go to https://app.supabase.com
- Select your project
- Go to Settings > API
- Copy the "Project URL" and "anon public" key

---

### ❌ Issue 2: Edge Function Not Deployed

**Problem:** The `analyze-product` Edge Function doesn't exist in your Supabase project.

**Solution:**
```bash
# 1. Install Supabase CLI (if not installed)
npm install -g supabase

# 2. Login to Supabase
supabase login

# 3. Link your project
supabase link --project-ref your-project-ref

# 4. Deploy the function
supabase functions deploy analyze-product

# 5. Verify deployment
supabase functions list
```

**Get your project ref:**
- Go to your Supabase project dashboard
- The project ref is in the URL: `https://app.supabase.com/project/[PROJECT_REF]`

---

### ❌ Issue 3: OpenAI API Key Not Set or Invalid

**Problem:** Edge Function returns "OpenAI API key is not configured" error or 500 errors.

**Solution:**
```bash
# Set the OpenAI API key as a Supabase secret
supabase secrets set OPENAI_API_KEY=sk-your-openai-api-key-here

# Verify it's set
supabase secrets list
```

**Get your OpenAI API key:**
- Go to https://platform.openai.com/api-keys
- Create a new API key or use an existing one
- Copy the key (starts with `sk-`)

**Common OpenAI API Errors:**
- **401 Unauthorized**: API key is invalid or expired - generate a new key
- **429 Rate Limit**: Too many requests - wait a moment and try again
- **500/503 Service Unavailable**: OpenAI service is down - try again later
- **Insufficient Quota**: Account has no credits - add credits to your OpenAI account

**Note:** The app will automatically fall back to manual entry if OpenAI API fails, so the app remains functional.

---

### ❌ Issue 4: Edge Function Returns 404 or "Function not found"

**Problem:** Function name mismatch or function not deployed to the correct project.

**Solutions:**

1. **Check function name:**
   - Ensure it matches exactly: `analyze-product`
   - Check in `supabase/functions/analyze-product/index.ts` exists

2. **Verify deployment:**
   ```bash
   supabase functions list
   ```

3. **Test the function directly:**
   ```bash
   curl -X POST https://your-project-id.supabase.co/functions/v1/analyze-product \
     -H "Authorization: Bearer your-anon-key" \
     -H "Content-Type: application/json" \
     -d '{"code":"123456"}'
   ```

---

### ❌ Issue 5: CORS or Network Errors

**Problem:** Network request fails or CORS errors appear.

**Solutions:**

1. **Check your Supabase URL is correct:**
   - Format: `https://[project-ref].supabase.co`
   - No trailing slash

2. **Verify Edge Function has CORS headers:**
   - The function already includes CORS headers
   - If still failing, check Supabase project settings

3. **Check network connectivity:**
   - Ensure device/emulator has internet connection
   - Try on a physical device if using emulator

---

### ❌ Issue 6: 401 Unauthorized Error

**Problem:** Edge Function returns 401 error when called from the app.

**Common Causes:**
1. **Wrong anon key format**: Using publishable key (`sb_publishable_*`) instead of JWT anon key (`eyJ*`)
2. **Placeholder credentials**: `.env` file has placeholder values
3. **Environment variables not loaded**: Expo dev server wasn't restarted after updating `.env`

**Solutions:**

1. **Check your `.env` file:**
   ```bash
   cat .env | grep EXPO_PUBLIC_SUPABASE_ANON_KEY
   ```
   - Should start with `eyJ` (JWT token format)
   - Should NOT start with `sb_publishable_`

2. **Get the correct anon key:**
   - Go to https://app.supabase.com
   - Select your project
   - Go to Settings → API
   - Copy the **"anon public"** key (NOT the publishable key)
   - It should start with `eyJ` (it's a JWT token)

3. **Update `.env` and restart:**
   ```bash
   # Update .env file with correct JWT anon key
   # Then restart Expo:
   npx expo start --clear
   ```

---

### ❌ Issue 7: 500 Internal Server Error

**Problem:** Edge Function returns 500 error or "Failed to analyze product with AI".

**Common Causes:**
1. **OpenAI API key issues**: Invalid, expired, or quota exceeded
2. **OpenAI API service issues**: Rate limits or service unavailable
3. **Network/timeout issues**: Request to OpenAI API timed out

**Solutions:**

1. **Check OpenAI API key:**
   ```bash
   supabase secrets list | grep OPENAI_API_KEY
   ```
   - Verify the key is set
   - Test the key directly with OpenAI API

2. **Check OpenAI account:**
   - Go to https://platform.openai.com/account/usage
   - Verify you have credits/quota available
   - Check if key has proper permissions

3. **Common OpenAI errors:**
   - **401**: API key invalid - generate a new key
   - **429**: Rate limit exceeded - wait and retry
   - **500/503**: Service unavailable - try again later
   - **Insufficient quota**: Add credits to your account

4. **Fallback behavior:**
   - The app will automatically fall back to manual entry if AI fails
   - Database lookup will be attempted if configured
   - User can always enter product details manually

**Note:** The app is designed to gracefully handle OpenAI failures - it will show a manual entry form instead of crashing.

---

### ❌ Issue 8: Service Role Key Not Set (for Database Fallback)

**Problem:** Database fallback doesn't work (but AI might still work).

**Solution:**
```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Get your service role key:**
- Go to Supabase project > Settings > API
- Copy the "service_role" key (keep this secret!)

---

## Step-by-Step Setup Checklist

### ✅ 1. Environment Variables Setup
- [ ] Create `.env` file in project root
- [ ] Add `EXPO_PUBLIC_SUPABASE_URL`
- [ ] Add `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- [ ] Restart Expo dev server

### ✅ 2. Supabase CLI Setup
- [ ] Install Supabase CLI: `npm install -g supabase`
- [ ] Login: `supabase login`
- [ ] Link project: `supabase link --project-ref [ref]`

### ✅ 3. Edge Function Deployment
- [ ] Deploy function: `supabase functions deploy analyze-product`
- [ ] Verify: `supabase functions list`
- [ ] Check logs: `supabase functions logs analyze-product`

### ✅ 4. Secrets Configuration
- [ ] Set OpenAI API key: `supabase secrets set OPENAI_API_KEY=sk-...`
- [ ] Set Service Role key: `supabase secrets set SUPABASE_SERVICE_ROLE_KEY=...`
- [ ] Verify: `supabase secrets list`

### ✅ 5. Testing
- [ ] Test function directly with curl (see Issue 4)
- [ ] Check console logs in app for errors
- [ ] Verify Edge Function logs for OpenAI API calls

---

## Error Handling and User Messages

The app now provides user-friendly error messages instead of technical errors:

**User-Friendly Error Messages:**
- "AI service temporarily unavailable" → OpenAI API is down, manual entry available
- "Could not identify this product automatically" → AI failed, manual entry form opens
- "Authentication failed" → Supabase credentials issue, restart app
- "Service temporarily unavailable" → Network/server issue, try again later

**Error Codes:**
- `NOT_CONFIGURED`: Supabase credentials missing
- `PLACEHOLDER_CREDENTIALS`: Using placeholder values in `.env`
- `WRONG_KEY_TYPE`: Using publishable key instead of JWT anon key
- `AI_NOT_CONFIGURED`: OpenAI API key not set
- `AI_AUTH_FAILED`: OpenAI API authentication failed
- `AI_RATE_LIMIT`: OpenAI rate limit exceeded
- `AI_SERVICE_UNAVAILABLE`: OpenAI service down
- `AI_ANALYSIS_FAILED`: AI couldn't analyze product (falls back to manual entry)
- `AUTH_FAILED`: Supabase authentication failed
- `SERVER_ERROR`: Edge Function server error
- `INVALID_REQUEST`: Invalid request format

**Fallback Behavior:**
- If AI analysis fails → Database lookup attempted
- If database lookup fails → Manual entry form opens automatically
- App never crashes - always provides a way to continue

## Debugging Steps

### 1. Check Console Logs

In your app, look for these console messages:
```
✅ Good: "Starting product analysis for code: 123456"
✅ Good: "Invoking Edge Function: analyze-product"
✅ Good: "Product analyzed successfully: {...}"

❌ Bad: "Supabase URL is not configured"
❌ Bad: "Edge Function error: ..."
❌ Bad: "OpenAI API key is not configured"
❌ Bad: "401 Unauthorized" (check anon key format)
❌ Bad: "500 Internal Server Error" (check OpenAI API key)
```

### 2. Check Edge Function Logs

```bash
# View recent logs
supabase functions logs analyze-product --tail

# View logs with timestamps
supabase functions logs analyze-product --follow
```

### 3. Test Edge Function Manually

Use Postman, curl, or your browser:

```bash
curl -X POST https://your-project.supabase.co/functions/v1/analyze-product \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"code":"123456"}'
```

Expected response:
```json
{
  "productName": "Organic Milk",
  "category": "Dairy",
  "expiryDate": "2024-12-31",
  "confidenceScore": 0.85
}
```

---

## Still Having Issues?

1. **Check Edge Function code:**
   - Verify `supabase/functions/analyze-product/index.ts` exists
   - Check for syntax errors

2. **Verify all dependencies are installed:**
   ```bash
   npm install
   ```

3. **Clear cache and restart:**
   ```bash
   npx expo start -c
   ```

4. **Check Supabase project status:**
   - Ensure project is active (not paused)
   - Check billing/quota limits

5. **Test with a simple Edge Function:**
   Create a test function to verify basic connectivity works

---

## Quick Test Script

Add this to your app temporarily to test configuration:

```javascript
// Test Supabase connection
const testConnection = async () => {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  
  console.log('Configuration Test:');
  console.log('URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
  console.log('Key:', supabaseKey ? '✅ Set' : '❌ Missing');
  
  if (supabaseUrl && supabaseKey) {
    try {
      const { data, error } = await supabase.functions.invoke('analyze-product', {
        body: { code: '123456' }
      });
      console.log('Function Test:', error ? '❌ Failed' : '✅ Success', error || data);
    } catch (e) {
      console.log('Function Test: ❌ Error', e);
    }
  }
};
```
