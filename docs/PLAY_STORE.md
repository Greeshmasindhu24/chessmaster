# ChessMaster Pro — Android Play Store Build Guide

Step-by-step instructions to build a signed Android App Bundle (AAB) and submit to Google Play.

## Prerequisites

- **Node.js 20+** and **npm**
- **JDK 17+** (Android Gradle Plugin requirement)
- **Android Studio** (Ladybug or newer recommended) with Android SDK
- **Render backend deployed** — see [RENDER.md](./RENDER.md)
- **Google Play Developer account** ($25 one-time fee)

---

## 1. Production API URL (Render)

The Android app is a static Capacitor shell. API calls are baked in at build time via `VITE_API_URL`.

### Render static site (`chessmaster-web`)

Set in Render Dashboard → **chessmaster-web** → Environment:

```env
VITE_API_URL=https://chessmaster-api.onrender.com
```

Replace with your actual API URL if you renamed services.

### Local production build (for Capacitor sync)

```powershell
cd ChessMasterPro\frontend
copy .env.production.example .env.production
# Edit .env.production — set VITE_API_URL to your Render API URL
```

Example `.env.production`:

```env
VITE_API_URL=https://chessmaster-api.onrender.com
```

> **Important:** Do not use `localhost` for Play Store builds. The app on a phone cannot reach your PC.

### Verify API + WebSockets

After deploy, confirm:

- `https://chessmaster-api.onrender.com/api/v1/health` returns healthy
- Web frontend loads at `https://chessmaster-web.onrender.com`
- Online play works in the browser (confirms `wss://` WebSockets)

---

## 2. Build frontend for Android

```powershell
cd ChessMasterPro\frontend

# Install Capacitor CLI if not already (dev dependency)
npm install -D @capacitor/cli

# Production build with VITE_API_URL from .env.production
npm run build

# Copy web assets into Android project
npx cap sync android
```

`npx cap sync android` updates:

- `android/app/src/main/assets/public/` (web bundle)
- `capacitor.config.json` in Android assets
- Native plugin dependencies

Open in Android Studio (optional):

```powershell
npx cap open android
```

---

## 3. Version fields (`android/app/build.gradle`)

Current configuration:

| Field | Location | Current value |
|-------|----------|---------------|
| `applicationId` | `defaultConfig` | `com.Greeshma.ChessMaster.Pro` |
| `namespace` | `android { }` | `com.Greeshma.ChessMaster.Pro` |
| `versionCode` | `defaultConfig` | `1` (integer — increment every Play upload) |
| `versionName` | `defaultConfig` | `"1.0"` (user-visible string) |

**Before each Play Store upload:**

1. Increment `versionCode` by 1 (required — Play rejects duplicate codes).
2. Update `versionName` (e.g. `"1.0.1"`).

```gradle
defaultConfig {
    applicationId "com.Greeshma.ChessMaster.Pro"
    versionCode 2
    versionName "1.0.1"
    // ...
}
```

Also update `frontend/package.json` `"version"` if you track it there.

### Application ID note

The package matches `MainActivity.java`:

```
frontend/android/app/src/main/java/com/Greeshma/ChessMaster/Pro/MainActivity.java
```

Play Console convention is lowercase reverse-DNS (e.g. `com.greeshma.chessmasterpro`). The current ID works but cannot be changed after first publish without creating a new app listing. Keep it consistent across:

- `frontend/capacitor.config.ts` → `appId`
- `android/app/build.gradle` → `applicationId` + `namespace`
- `android/app/src/main/res/values/strings.xml` → `package_name`

---

## 4. Keystore setup (do NOT commit secrets)

### Generate upload keystore (one time)

Run from a secure location **outside** the git repo (e.g. `%USERPROFILE%\.android\` or a password manager vault folder):

```powershell
keytool -genkeypair -v `
  -keystore chessmaster-upload.jks `
  -alias chessmaster `
  -keyalg RSA -keysize 2048 -validity 10000 `
  -storetype JKS
```

Record securely:

- Keystore file path
- Keystore password
- Key alias (`chessmaster`)
- Key password

**Never commit** `.jks`, `.keystore`, or passwords to git.

### Configure Gradle signing (local only)

Create `frontend/android/keystore.properties` (gitignored):

```properties
storeFile=C:/Users/YOU/.android/chessmaster-upload.jks
storePassword=YOUR_STORE_PASSWORD
keyAlias=chessmaster
keyPassword=YOUR_KEY_PASSWORD
```

Add to `frontend/android/.gitignore`:

```
keystore.properties
*.jks
*.keystore
```

Append to `frontend/android/app/build.gradle` (before final closing brace of `android { }`):

```gradle
def keystorePropertiesFile = rootProject.file("keystore.properties")
def keystoreProperties = new Properties()
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

android {
    // ... existing config ...

    signingConfigs {
        release {
            if (keystorePropertiesFile.exists()) {
                storeFile file(keystoreProperties['storeFile'])
                storePassword keystoreProperties['storePassword']
                keyAlias keystoreProperties['keyAlias']
                keyPassword keystoreProperties['keyPassword']
            }
        }
    }

    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}
```

> Signing config is optional in-repo — you can also sign via **Android Studio → Build → Generate Signed Bundle**.

---

## 5. Generate signed AAB

### Option A — Android Studio (recommended for first build)

1. Open `frontend/android` in Android Studio.
2. **Build → Generate Signed App Bundle or APK**
3. Choose **Android App Bundle**
4. Select your keystore, alias, passwords
5. Build variant: **release**
6. Output: `frontend/android/app/release/app-release.aab`

### Option B — Command line

```powershell
cd ChessMasterPro\frontend\android

# Windows
.\gradlew.bat bundleRelease

# Output (unsigned if no keystore.properties):
# app\build\outputs\bundle\release\app-release.aab
```

Upload the `.aab` to Play Console → **Release → Production** (or internal testing first).

---

## 6. AndroidManifest review

File: `frontend/android/app/src/main/AndroidManifest.xml`

| Item | Status |
|------|--------|
| `INTERNET` permission | Present — required for API + WebSockets |
| `MainActivity` exported | `true` — required for launcher |
| Backup | `allowBackup="true"` — acceptable for MVP; review for Phase 2 |
| No unnecessary permissions | Good — no location, camera, etc. |

No changes required for Phase 1 MVP.

---

## 7. Play Console checklist

### Account & app

- [ ] Google Play Developer account created and verified
- [ ] New app created in Play Console
- [ ] App name: **ChessMaster Pro**
- [ ] Default language set
- [ ] App category: **Games → Board**

### Store listing

- [ ] Short description (80 chars) — see [store/STORE_LISTING.md](./store/STORE_LISTING.md)
- [ ] Full description (4000 chars max)
- [ ] App icon 512×512 PNG
- [ ] Feature graphic 1024×500
- [ ] Phone screenshots (min 2, recommend 4–8)
- [ ] Contact email for store listing

### Policy & compliance

- [ ] **Privacy Policy URL** — `https://chessmaster-web.onrender.com/privacy` (or your domain)
- [ ] Data safety form completed (account info, game activity, crash logs if any)
- [ ] Content rating questionnaire (IARC) — expect **Everyone** or **Everyone 10+** for chess
- [ ] Target audience / ads declaration (likely no ads for MVP)
- [ ] News app / COVID declarations (N/A)

### Release

- [ ] Upload signed AAB to **Internal testing** first
- [ ] Add testers, install on physical device
- [ ] Test: register, login, AI game, online match, logout
- [ ] Promote to **Production** when stable
- [ ] Complete **Pre-launch report** review (automatic testing)

### Backend (Render)

- [ ] `DATABASE_URL` set on API service
- [ ] `CORS_ORIGINS` includes web URL (mobile app uses API directly, not CORS — but web policy URL must work)
- [ ] `SECRET_KEY` set (not default)
- [ ] API health check passing

---

## 8. Full build script (reference)

```powershell
# From ChessMasterPro\frontend
$env:VITE_API_URL = "https://chessmaster-api.onrender.com"
npm run build
npx cap sync android
cd android
.\gradlew.bat bundleRelease
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| App shows blank screen | Run `npm run build` then `npx cap sync android` |
| Cannot reach server | Check `VITE_API_URL` in `.env.production` before build |
| WebSocket fails on device | API must be `https://`; app uses `wss://` automatically |
| `versionCode` already used | Increment `versionCode` in `build.gradle` |
| Gradle JDK error | Use JDK 17+; set `JAVA_HOME` in Android Studio |
| Signing failed | Verify `keystore.properties` paths (use forward slashes or escaped backslashes) |

---

## Security reminders

- Never commit `keystore.properties`, `.jks`, or `.env.production` with real secrets
- Back up upload keystore — losing it prevents updating the app on Play
- Enable [Play App Signing](https://support.google.com/googleplay/android-developer/answer/9842756) (Google manages app signing key)

---

## Next steps

1. Deploy to Render and verify live API
2. Create keystore and first signed AAB
3. Host privacy policy at public URL (deploy frontend with `/privacy` route)
4. Complete Play Console listing using [STORE_LISTING.md](./store/STORE_LISTING.md)
5. Internal test → production release

See [PLAY_STORE_ROADMAP.md](./PLAY_STORE_ROADMAP.md) for Phase 2/3 plans.
