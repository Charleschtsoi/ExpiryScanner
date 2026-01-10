# ExpiryScanner 📱

ExpiryScanner is a React Native mobile application built with Expo and Supabase that allows users to scan product barcodes, analyze them using AI, track expiration dates, and receive notifications for expiring items.

## 🚀 Features

### Core Functionality
- **Barcode Scanning**: Instantly scan QR codes, EAN13, UPC, and other barcode formats using device camera
- **AI-Powered Product Analysis**: Automatically identify products and estimate shelf life using OpenAI (GPT-4o-mini)
- **Hybrid Fallback System**: Combines AI analysis with database lookup (`product_master_list`) for improved accuracy
- **Manual Entry**: When AI cannot identify a product, users can manually enter product details including batch codes
- **Expiration Tracking**: Calculate and display days until expiry with color-coded status indicators
- **Inventory Management**: Save scanned products to Supabase database with user-specific access (RLS)
- **Push Notifications**: Register for push notifications to receive alerts for expiring items (3 days before expiry)

### User Experience
- **Home Screen**: Clean welcome screen with "Start Scanning" button
- **On-Demand Scanning**: Camera only activates when user initiates scan
- **Visual Feedback**: Loading states, progress indicators, and clear result displays
- **Error Handling**: Graceful error messages with automatic fallback to manual entry
- **Result Display**: Beautiful modals showing product details, category, confidence score, and expiry status

### Smart Features
- **Confidence Scoring**: AI provides confidence levels for product identification
- **Category Classification**: Automatic product categorization
- **Shelf Life Estimation**: AI estimates shelf life based on product type
- **Status Indicators**: 
  - 🔴 Expired
  - 🟠 Expires Today
  - 🟡 Expires Soon (1-3 days)
  - 🟢 Safe (more than 3 days)

## 🛠 Tech Stack

- **Framework**: React Native 0.81.5
- **Platform**: Expo SDK 54
- **Backend**: Supabase (PostgreSQL, Edge Functions, Auth)
- **AI Service**: OpenAI GPT-4o-mini (via Supabase Edge Function)
- **Camera**: expo-camera 17.0.10
- **Notifications**: expo-notifications 0.32.16
- **Styling**: NativeWind (Tailwind CSS) 4.2.1
- **Language**: JavaScript/JSX (with TypeScript types)
- **Database**: PostgreSQL with Row Level Security (RLS)

## 📦 Installation

### Prerequisites
- Node.js 18+ and npm
- Expo CLI (`npm install -g expo-cli`)
- Expo Go app on your device (iOS/Android)
- Supabase account (for backend features)
- OpenAI API key (for AI analysis)

### Step 1: Clone the Repository
```bash
git clone https://github.com/your-username/ExpiryScanner.git
cd ExpiryScanner
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Environment Configuration
Create a `.env` file in the project root:

```env
# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Optional: Override Expo Project ID (get from expo.dev)
# EXPO_PUBLIC_PROJECT_ID=your-expo-project-id-here
```

**Get your Supabase credentials:**
1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project (or create a new one)
3. Go to Settings → API
4. Copy the "Project URL" and "anon/public" key

For detailed setup instructions, see [ENV_SETUP.md](./ENV_SETUP.md) or [QUICK_SETUP_GUIDE.md](./QUICK_SETUP_GUIDE.md).

### Step 4: Database Setup

Run the Supabase migrations to create the required tables:

```bash
# Option 1: Using Supabase CLI (recommended)
supabase db push

# Option 2: Manual SQL execution
# Copy the SQL from supabase/migrations/ and run in Supabase SQL Editor
```

**Required Migrations:**
- `001_create_inventory_table.sql` - Creates inventory table with RLS policies
- `002_create_product_master_list.sql` - Creates product master list for fallback lookups

### Step 5: Deploy Edge Function

Deploy the AI analysis Edge Function to Supabase:

```bash
# Using Supabase CLI
supabase functions deploy analyze-product

# Or use the Supabase Dashboard:
# 1. Go to Edge Functions
# 2. Create new function: analyze-product
# 3. Copy code from supabase/functions/analyze-product/index.ts
```

**Edge Function Environment Variables** (set in Supabase Dashboard):
- `OPENAI_API_KEY` - Your OpenAI API key
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key (for database access)

For detailed Edge Function setup, see [SETUP.md](./SETUP.md).

## 📱 Running the App

### Start Development Server
```bash
npx expo start
```

### Run on Device
1. **Download Expo Go** from [App Store](https://apps.apple.com/app/expo-go/id982107779) (iOS) or [Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent) (Android)

2. **Scan QR Code**: Open Expo Go and scan the QR code displayed in your terminal

3. **Grant Permissions**: Allow camera and notification permissions when prompted

### Run on Simulator/Emulator
```bash
# iOS Simulator
npx expo start --ios

# Android Emulator
npx expo start --android
```

## 🔧 Configuration

### App Configuration
The app is configured via `app.json`. Key settings:
- **Project ID**: Configure your Expo project ID for push notifications (get from [expo.dev](https://expo.dev))
- **Orientation**: Portrait
- **Platforms**: iOS, Android, Web

### Supabase Configuration
The app automatically loads Supabase credentials from:
1. Environment variables (`.env` file)
2. `app.json` extra config
3. Fallback placeholder values (app runs but AI features disabled)

### AI Analysis Configuration
AI features require:
- ✅ Supabase Edge Function deployed
- ✅ OpenAI API key configured in Edge Function
- ✅ Valid Supabase credentials in `.env`

If not configured, the app will:
- Show warning messages in console
- Automatically open manual entry modal when scan fails
- Still allow manual product entry and expiry checking

## 📖 Usage

### Basic Workflow

1. **Launch App**: Open ExpiryScanner on your device
2. **Start Scanning**: Tap "Start Scanning" button on home screen
3. **Scan Barcode**: Align product barcode within the camera frame
4. **AI Analysis**: Wait for AI to analyze the product (shows loading indicator)
5. **View Results**: Product details displayed in result modal
6. **Manual Entry** (if needed): If AI fails, manual entry modal opens automatically
7. **Save to Inventory**: (Future feature) Save product to your inventory

### Manual Entry
When AI cannot identify a product:
1. Manual entry modal opens automatically
2. Enter product details:
   - Product Name (required)
   - Category (optional)
   - Batch Code (auto-filled from scan)
   - Expiry Date (required, format: YYYY-MM-DD)
3. Tap "Check Expiry" to calculate expiry status

### Result Display
Results show:
- Product name and barcode
- Category badge
- AI confidence score (if AI identified product)
- Expiry status with color coding
- Days until expiry
- Shelf life information

## 🗂 Project Structure

```
ExpiryScanner/
├── App.js                          # Main application component
├── app.json                        # Expo configuration
├── package.json                    # Dependencies
├── tailwind.config.js              # Tailwind CSS configuration
├── metro.config.js                 # Metro bundler config (NativeWind)
├── global.css                      # Tailwind CSS directives
│
├── lib/
│   └── supabase.ts                # Supabase client configuration
│
├── services/
│   ├── aiAnalysis.ts              # AI analysis service layer
│   └── README.md                  # Service documentation
│
├── types/
│   └── supabase.ts                # TypeScript types for database
│
├── utils/
│   └── notifications.ts           # Push notification utilities
│
├── screens/
│   └── ScannerScreen.tsx          # Scanner screen component (legacy)
│
├── supabase/
│   ├── functions/
│   │   └── analyze-product/
│   │       ├── index.ts           # Edge Function: AI product analysis
│   │       └── README.md          # Edge Function documentation
│   ├── migrations/
│   │   ├── 001_create_inventory_table.sql
│   │   └── 002_create_product_master_list.sql
│   └── queries/
│       └── expiring_items_query.sql  # Query for expiring items (3 days)
│
└── assets/                        # Images and icons
    ├── icon.png
    ├── splash-icon.png
    └── adaptive-icon.png
```

## 🗄 Database Schema

### `inventory` Table
Stores user-scanned products:
- `id` (uuid, primary key)
- `user_id` (uuid, references auth.users)
- `barcode` (text)
- `product_name` (text)
- `category` (text)
- `expiry_date` (date)
- `ai_confidence` (float)
- `created_at` (timestamp)

**RLS Policies**: Users can only access their own inventory items.

### `product_master_list` Table
Master database for product lookups:
- `id` (uuid, primary key)
- `code` (text, unique) - Barcode or batch code
- `name` (text)
- `category` (text)
- `shelf_life_days` (int, nullable)

**RLS Policies**: Read access for authenticated users.

## 🔐 Security

- **Row Level Security (RLS)**: Enabled on all tables to ensure users only access their own data
- **Environment Variables**: Sensitive keys stored in `.env` (git-ignored)
- **Supabase Auth**: User authentication handled by Supabase (when implemented)
- **Service Role Key**: Only used server-side in Edge Functions, never exposed to client

## 🐛 Troubleshooting

### Common Issues

**1. "Supabase configuration missing" warning**
- Ensure `.env` file exists with correct variables
- Restart Expo dev server after adding environment variables
- See [ENV_SETUP.md](./ENV_SETUP.md) for details

**2. "AI failed to understand product"**
- Check Edge Function is deployed and configured
- Verify OpenAI API key is set in Supabase Edge Function environment
- Manual entry modal should open automatically as fallback
- See [DEBUGGING_AI_CONNECTION.md](./DEBUGGING_AI_CONNECTION.md)

**3. Camera not working**
- Grant camera permissions in device settings
- Restart the app after granting permissions
- Check `expo-camera` is installed: `npx expo install expo-camera`

**4. Push notifications not registering**
- Ensure running on physical device (not simulator)
- Check your Expo project ID is configured in `app.json` or environment variables
- Grant notification permissions when prompted

For more troubleshooting tips, see [TROUBLESHOOTING.md](./TROUBLESHOOTING.md).

## 📚 Additional Documentation

- [SETUP.md](./SETUP.md) - Complete AI Agent Integration setup guide
- [ENV_SETUP.md](./ENV_SETUP.md) - Environment variable configuration
- [QUICK_SETUP_GUIDE.md](./QUICK_SETUP_GUIDE.md) - Quick start guide
- [DEBUGGING_AI_CONNECTION.md](./DEBUGGING_AI_CONNECTION.md) - AI connection troubleshooting
- [REFACTOR_SUMMARY.md](./REFACTOR_SUMMARY.md) - Code refactoring details
- [UI_REFACTOR_SUMMARY.md](./UI_REFACTOR_SUMMARY.md) - UI changes documentation
- [services/README.md](./services/README.md) - Service layer documentation

## 🔮 Future Roadmap

- [ ] **User Authentication**: Full Supabase Auth integration
- [ ] **Inventory Management Screen**: View, edit, and delete saved products
- [ ] **Push Notification Backend**: Automated daily checks for expiring items (pg_cron)
- [ ] **Product Image Analysis**: Use image recognition for products without barcodes
- [ ] **Multi-language Support**: Internationalization (i18n)
- [ ] **Offline Mode**: Cache recent scans for offline viewing
- [ ] **Barcode History**: Save and manage scan history
- [ ] **Export Data**: Export inventory to CSV/PDF
- [ ] **Share Products**: Share product details with others
- [ ] **Widget Support**: iOS/Android home screen widgets

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License

This project is private and proprietary.

## 👤 Author

**Charles T**

---

## 🎯 Quick Start Checklist

- [ ] Clone repository
- [ ] Install dependencies (`npm install`)
- [ ] Create `.env` file with Supabase credentials
- [ ] Run database migrations
- [ ] Deploy Edge Function with OpenAI API key
- [ ] Configure Edge Function environment variables
- [ ] Start Expo dev server (`npx expo start`)
- [ ] Test on device with Expo Go
- [ ] Grant camera and notification permissions
- [ ] Scan a product barcode!

---

**Built with ❤️ using React Native, Expo, and Supabase**
