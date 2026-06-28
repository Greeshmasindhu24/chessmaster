# ChessMaster Pro — Play Store Roadmap

Gap analysis and phased plan for publishing the Android app on Google Play.

## Current state (as of Phase 1 MVP prep)

| Area | Status | Notes |
|------|--------|-------|
| **Web app** | Ready | React + Vite, auth, local/AI/online play |
| **Backend API** | Ready | FastAPI, JWT, WebSockets, game persistence |
| **Render deploy** | Documented | See [RENDER.md](./RENDER.md) — `chessmaster-api` + `chessmaster-web` |
| **Capacitor Android** | Scaffolded | `frontend/android/`, `@capacitor/android` installed |
| **App ID** | Set | `com.Greeshma.ChessMaster.Pro` (matches MainActivity package) |
| **Version** | Initial | `versionCode 1`, `versionName "1.0"` |
| **Privacy / Terms** | Phase 1 | `/privacy`, `/terms` routes + footer links |
| **Store listing copy** | Phase 1 | Draft in [store/STORE_LISTING.md](./store/STORE_LISTING.md) |
| **Signed AAB** | Manual | Keystore + Gradle signing (see [PLAY_STORE.md](./PLAY_STORE.md)) |
| **Play Console** | Not started | Developer account, listing, content rating |
| **Google Sign-In** | Out of scope | Phase 2+ (README Phase 5) |
| **ELO / rankings UI** | Partial | Profile has blitz rating; full leaderboards Phase 4 |
| **Push notifications** | Not configured | No `google-services.json` |
| **In-app billing (Play)** | Not integrated | Dummy billing API exists; real Play Billing Phase 2 |
| **App icons / screenshots** | Default Capacitor | Custom 512×512 icon + phone screenshots needed |
| **Data safety form** | Pending | Map to Privacy Policy before submit |

## Gap analysis — what Play requires vs what we have

### Must-have before first submission

1. **Production backend URL** — Android app must call live API (`VITE_API_URL`), not localhost. Deploy to Render first.
2. **Privacy Policy URL** — Play Console requires a public URL. Host at `https://chessmaster-web.onrender.com/privacy` (or your domain).
3. **Signed release AAB** — Debug builds cannot be published; upload key + release signing required.
4. **Target API level** — Meet Google Play minimum target SDK (check [Android target API requirements](https://developer.android.com/google/play/requirements/target-sdk)).
5. **Content rating questionnaire** — IARC via Play Console.
6. **Store listing** — Short/full description, icon, feature graphic, screenshots.

### Nice-to-have (Phase 2+)

- Google Sign-In (OAuth client + Play Console SHA-1)
- Play In-App Billing (replace dummy card flow)
- Firebase Crashlytics / Analytics
- Deep links / App Links
- Offline mode indicators
- Push notifications for game invites

### Explicitly out of scope for Phase 1

- Google login
- Full ELO / leaderboard UI rewrite
- Major UI redesign
- Real payment integration

---

## Phase 1 — Play Store MVP (this phase)

**Goal:** Publish a minimal, working Android app that connects to the Render backend.

| Task | Deliverable |
|------|-------------|
| Production API config | `frontend/.env.production.example`, Render `VITE_API_URL` |
| Legal pages | `/privacy`, `/terms` in frontend |
| Build guide | [PLAY_STORE.md](./PLAY_STORE.md) |
| Store copy draft | [store/STORE_LISTING.md](./store/STORE_LISTING.md) |
| Android review | Document `applicationId`, version fields, manifest |
| Keystore docs | Generate locally; never commit secrets |

**MVP feature set for v1.0:**

- Email/password registration and login
- Play vs AI (free tier)
- Online multiplayer (WebSocket)
- Local board practice
- Game history on dashboard
- Settings (theme, profile)

---

## Phase 2 — Store polish & growth

**Goal:** Improve conversion, retention, and compliance depth.

| Task | Status | Notes |
|------|--------|-------|
| Custom app icon & splash | Pending | Replace Capacitor defaults |
| Play In-App Billing | **Deferred** | Skipped for now; `VITE_PLAY_MVP=true` hides dummy billing UI |
| Google Sign-In | Pending | OAuth + Play Console SHA-1 fingerprints |
| Email verification flow | **Done** | Register + Settings resend; `/verify-email` confirm; SMTP or dev `verify_url` in API |
| Account deletion | **Done** | API + Settings UI (Phase 1) |
| Board themes | **Done** | Classic, blue, brown, marble — synced to preferences |
| Sound effects | **Done** | Move/capture/check/game-over tones on all play modes |
| Data export | Pending | Optional but good for GDPR-style requests |
| Crash reporting | Pending | Firebase Crashlytics or Sentry |
| Beta track | Pending | Internal testing → closed testing → production |

---

## Phase 3 — Full product parity

**Goal:** Align mobile with web roadmap (README Phases 3–5).

| Feature | README phase |
|---------|--------------|
| Stockfish analysis & puzzles | Phase 3 |
| Tournaments | Phase 4 |
| Friends, chat, notifications | Phase 4 |
| Admin panel & analytics | Phase 5 |
| Rankings & social leaderboards | Phase 4 |
| iOS App Store | Separate Capacitor iOS project |

---

## Recommended timeline

```
Week 1   Deploy Render backend + verify WebSockets
         Build signed AAB locally
         Create Play Developer account ($25 one-time)

Week 2   Complete Play Console listing (copy from STORE_LISTING.md)
         Internal testing track — install on 2–3 devices
         Fix any mobile-specific bugs (keyboard, orientation, back button)

Week 3   Closed testing (optional)
         Submit for production review
         Publish when approved
```

---

## Related docs

- [PLAY_STORE.md](./PLAY_STORE.md) — Build AAB, keystore, Play Console checklist
- [RENDER.md](./RENDER.md) — Deploy API and web to Render
- [store/STORE_LISTING.md](./store/STORE_LISTING.md) — Store listing copy
- [WINDOWS-NO-WSL.md](./WINDOWS-NO-WSL.md) — Local dev on Windows
