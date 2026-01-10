# Babel Configuration Fix

## Issue
Error: `.plugins is not a valid Plugin property` when starting Expo

## Solution
NativeWind v4 uses the Metro transformer (configured in `metro.config.js`) instead of requiring a Babel plugin. The Babel plugin has been removed from `babel.config.js`.

## Current Configuration

### babel.config.js
```javascript
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // NativeWind v4 uses Metro transformer, so babel plugin is not needed
  };
};
```

### metro.config.js
```javascript
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, { input: './global.css' });
```

## If NativeWind Classes Don't Work

If you find that Tailwind classes aren't being applied, try adding the plugin back with this format:

```javascript
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Try this format if needed
      ['nativewind/babel', {}],
    ],
  };
};
```

Or check the NativeWind v4 documentation for the correct plugin format.

## Next Steps

1. Clear Metro cache: `npx expo start --clear`
2. Restart the development server
3. If issues persist, check NativeWind v4 documentation for latest configuration
