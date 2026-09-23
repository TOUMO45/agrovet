# أغروفيت – إدارة طلبات الكتاكيت (Agrovet – Chick Orders)

Arabic (RTL) **stock-management** dashboard for a day-old-chick business: customer
orders with a live **price per chick** (global or per-client), a one-tap **"تم البيع"
(Sell Done)** step that cuts stock and books revenue, a dedicated **Sales** page, an
**Stock** page with a full movement ledger and low-stock alerts, archiving, bulk
client SMS, and Excel export.

This is the **rebuilt, editable source** of an app that previously existed only as a
compiled bundle.

## License

Copyright (c) 2026 **Kamari Fatima Zohra**. Source-available under the
**[PolyForm Noncommercial License 1.0.0](LICENSE)**. Non-commercial use
(personal, educational, research, non-profit) is free. **Commercial use requires
prior written permission from the copyright holder** — open an issue on this
repository to request a commercial license.

---

## Stack

| Area | Choice |
|---|---|
| Build | Vite 5 + React 18 |
| Styling | Tailwind CSS 3 — dark-native theme, `Cairo` font, `dir="rtl"`, semantic color tokens in `tailwind.config.js` |
| Routing | react-router-dom 6 |
| Auth | Firebase Authentication (email + password) |
| Database | Cloud Firestore (real-time listeners) + offline persistence |
| Icons | lucide-react |
| Dates | date-fns (`ar-DZ` locale) |
| Export | SheetJS (`xlsx`) |

## Getting started

```bash
npm install
cp .env.example .env   # then fill in your own Firebase web config
npm run dev            # http://localhost:5173
```

Create a Firebase project of your own and paste its web-app config into `.env`
(all `VITE_FIREBASE_*` keys). Nothing in this repo is tied to a specific project.

```bash
npm run build     # production build -> dist/
npm run preview   # serve the build locally
```

## Firebase setup

1. **Authentication → Sign-in method →** enable **Email/Password**.
2. **Firestore Database →** create it (production mode).
3. Deploy the security rules in [`firestore.rules`](firestore.rules):
   ```bash
   npm i -g firebase-tools
   firebase login
   firebase deploy --only firestore:rules --project YOUR_PROJECT_ID
   ```
   The default rules let **any signed-in user** read/write the shared data — this
   app is single-workspace by design.

## Data model (Firestore)

| Collection | Doc fields |
|---|---|
| `activeOrders` | `customerName, phoneNumber, quantity, unitPrice, totalPrice, notes, confirmed, priceOverridden, createdBy, createdByName, timestamp` |
| `archivedOrders` | same + `archivedAt` |
| `soldOrders` | same + `soldAt, soldByName, originalOrderId` (`timestamp` = original order time) |
| `stockMovements` | `type` (`restock` \| `sale` \| `adjust` \| `return`), `delta`, `balanceAfter`, `note`, `ref` (customer), `orderId`, `createdByName`, `timestamp` — append-only |
| `priceHistory` | `price, timestamp` (append-only log of every price change) |
| `settings/currentPrice` | `price, updatedAt` |
| `settings/stock` | `available, lowThreshold, updatedAt` |

## Pricing rules

- New order: `unitPrice = currentPrice`, `totalPrice = quantity × unitPrice`.
- While an order is **not confirmed** and has **no custom price**, changing the
  global price updates it too (one batched write, only for stale orders).
- **سعر مخصّص** (per-client price) — set from the order form or the quick
  **تعديل السعر** dialog; sets `priceOverridden` so the global-price sync leaves it
  alone. Can be reset back to the global price.
- Marking an order **جاهز** (ready) **locks** its `unitPrice`; later price changes
  don't touch it.
- Archived orders are fully frozen.

## Sell / stock workflow

- **تم البيع (Sell Done)** on an order runs one Firestore transaction: freeze the
  unit price → `available -= quantity` → append a `sale` movement → move the order
  into `soldOrders` → delete it from `activeOrders`. Selling below available stock
  is allowed (balance goes negative, flagged red) so a backorder is never blocked.
- **المبيعات (Sales page)** — every sold order, with today / 7d / 30d / all range
  filter, revenue + average-sale KPIs, name search, Excel export, and per-row
  **إرجاع** (reverses the transaction: restock + back to orders) or **حذف السجل**
  (drops the record only, stock untouched).
- **المخزون (Stock page)** — current balance with a low-stock alert, **إضافة مخزون**
  (restock) and **تعديل الرصيد** (set exact, logs the diff), an editable alert
  threshold, and the full `stockMovements` ledger (±delta, running balance, who /
  when).
- **الإيرادات المحقّقة** on the dashboard = Σ `soldOrders.totalPrice`; the pending
  KPI = Σ `activeOrders.totalPrice`.

## What changed from the old build

**Fixes**
- Removed the leftover **Supabase** client. The Profile page now saves your name to
  the Firebase profile the rest of the app reads (it previously wrote to Supabase,
  where the user was never signed in, so it silently did nothing).
- The navbar / profile expected `user.name`; Firebase only provides `displayName`.
  `AuthContext` now exposes one consistent user shape.
- The old code **rewrote every active order on every render** to re-price it. That
  is now a single guarded batched write that runs only when the price changes.

**Enhancements**
- Full **stock management**: stock balance, `stockMovements` ledger, restock /
  manual adjust, low-stock alert, and a **Sell Done** transaction that ties an
  order → stock cut → revenue → Sales page (see *Sell / stock workflow*).
- **Per-client price** override with a quick edit dialog, separate from the global
  price and its auto-sync.
- Offline-first Firestore cache (works on a weak connection, syncs on reconnect).
- Status filter (الكل / منتظر / جاهز) next to the name search.
- "Select all" checkbox in the table header.
- Money shown with thousands separators (`12 345 د.ج`).
- Confirmed orders keep their price; only pending orders follow the current price.
- Per-order `createdBy` / `createdByName` stored for accountability.
- Empty-state and loading messages; guard against adding orders before a price is set.

## Redesign (visual overhaul)

- **Design system**: semantic color tokens (`night` / `surface` / `line` / `fg` /
  `brand` / `info` / `warn` / `danger`) in `tailwind.config.js`, one shadow scale,
  three motion keyframes. Dark-native contrast, not an inverted light theme.
- **Reusable UI kit** in `src/components/ui/` — `Button`, `IconButton`, `Field`,
  `Badge`, `Menu`, `Modal` (bottom-sheet on mobile), `Toast` (replaces `alert`),
  `ConfirmProvider` (replaces `window.confirm`).
- **KPI row** reads like a price ticker: the current price gets a live sparkline
  from `priceHistory` and an "آخر تحديث …" timestamp.
- **Orders**: sticky-header zebra table on desktop, **compact tap-to-expand card
  list on mobile** (`OrdersList` switches at `md`) — one line per order (name ·
  qty · total · **تم البيع**), details + actions (تعديل السعر / تعديل / جاهز /
  حذف) revealed on tap, so a long order list stays scannable. `ready` = filled
  tick + brand edge; custom price = amber tag; invalid phone flagged in amber.
  The same component renders `sold` (Sales) and `archive` rows.
- **Selection bar** slides up from the bottom when rows are selected (notify /
  export / archive / clear).
- Brand mark + wordmark (`src/components/Logo.jsx`), redesigned navbar with an
  account menu, restyled auth pages (`AuthShell`).
- `src/pages/_Preview.jsx` — a **dev-only** visual harness at `/preview`
  (mock data, no Firebase); dead-code-eliminated from production builds.

## Mobile app feel (PWA)

- Installable PWA (`vite-plugin-pwa`): standalone display, `أغروفيت` name, dark
  theme colour, maskable icons (`npm run gen:icons` rebuilds them from the mark).
- **Bottom tab bar** on mobile (`BottomNav`: الرئيسية / المبيعات / المخزون /
  الأرشيف; الإعدادات lives in the account menu) and a **floating "+" button**
  (`Fab`) for new orders; the top nav keeps the full set on desktop. Segmented
  status control instead of a dropdown. Safe-area insets on the nav, FAB,
  selection bar and sheets. Modals are bottom sheets with a grab handle.
- `الأرشيف`, `المبيعات`, `المخزون` are each their own page/route.

## Notify clients

Select orders → **تنبيه العملاء** → pick a pickup date + time. Two message modes:

- **Shared** — one text for everyone (`DEFAULT_SMS_TEMPLATE`).
- **رسالة مخصّصة لكل عميل** — per-client message with `{الاسم}` / `{الكمية}` /
  `{الإجمالي}` filled from that client's order (`PERSONALIZED_SMS_TEMPLATE`).
  Templates carry the clinic address and the doctor's signature; tokens are
  `{التاريخ}` `{الوقت}` `{الاسم}` `{الكمية}` `{الإجمالي}`.

Sending — the dialog picks the best available path automatically:

1. **إرسال إلى الكل (server, zero setup for the user)** — when the site's own
   serverless function `netlify/functions/send-sms.js` is configured (see below).
   The app calls it per recipient with the caller's Firebase ID token; the SMS
   provider key never touches the browser. One tap sends **each client their own
   personalised message** with a live progress list.
2. **إرسال إلى الكل (from your phone)** — when the owner set up **httpSMS** in
   **الإعدادات** (or inline in the dialog). Free open-source Android app that sends
   through the phone's own SIM; its API allows direct browser calls. Its hosted
   free tier is only ~200 msg/month; self-host its server for unlimited.
3. **واتساب** — always available, no account or key: a stepper opens each client's
   message in WhatsApp (`https://wa.me/…?text=`); you tap send, then "التالي".
   Long messages arrive as one WhatsApp message instead of several SMS.
4. **رسائل SMS، واحدة تلو الأخرى** — same stepper, but into the SMS app.
5. **فتح الرسائل** (shared mode) — opens Android Messages with every selected
   number + the one shared text; you tap send once.

Invalid / duplicate numbers are detected and skipped. `src/services/smsGateway.js`
(httpSMS) and `src/services/smsBackend.js` (function) are provider-shaped.

### Serverless SMS backend (optional, recommended)

`netlify/functions/send-sms.js` ships with the site. Set these in **Netlify →
Site configuration → Environment variables**, then redeploy — after that nobody
needs to set up a gateway on a phone by hand:

| Var | Notes |
|---|---|
| `SMS_PROVIDER` | `smsgate` (default) · `httpsms` · `twilio` |
| `FIREBASE_API_KEY` | same value as `VITE_FIREBASE_API_KEY`; used only to check the caller is a signed-in Agrovet user |
| `SMS_ALLOWED_EMAILS` | optional comma-separated allow-list of sender accounts |
| `SMSGATE_USERNAME`, `SMSGATE_PASSWORD` | provider `smsgate` — from the *SMS Gateway for Android* app (sms-gate.app), Cloud server credentials. `SMSGATE_BASE_URL` optional (self-hosted server) |
| `HTTPSMS_API_KEY`, `HTTPSMS_FROM` | provider `httpsms`; `HTTPSMS_FROM` in E.164, e.g. `+213661234567`. `HTTPSMS_BASE_URL` optional (self-hosted) |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM` | provider `twilio`; `TWILIO_FROM` is a number in E.164 or a Messaging Service SID |

**Which provider?** All three send from a real SIM (so each message still costs
your normal SMS credit) except Twilio (paid, cloud numbers).

| Provider | Free allowance | Needs |
|---|---|---|
| **`smsgate`** (SMS Gateway for Android) | **free public cloud, no monthly cap** (soft ~10k/day) | the app on an Android phone |
| `httpsms` | ~200 msg/month hosted; unlimited if self-hosted | the app on an Android phone |
| `twilio` | trial credit only, then ~$0.05/SMS | a paid Twilio account |

`GET /.netlify/functions/send-sms` returns `{ configured, provider }` — the app
uses it to decide whether to show the one-tap button or the fallbacks. With no
vars set, the function reports `configured:false` and the app just uses WhatsApp /
httpSMS / manual, exactly as before.

## Project layout

```
scripts/gen-icons.mjs         Rasterises the mark into public/ PWA + favicon assets
netlify/functions/send-sms.js Serverless SMS sender (httpSMS / Twilio), auth-gated
src/
  lib/firebase.js          Firebase init (auth + Firestore w/ offline cache)
  context/AuthContext.jsx  Auth state + normalized user object
  services/orders.js       Order reads/writes, per-client price, price-sync batch
  services/sales.js        soldOrders feed + sellOrder / undoSale / deleteSale (txns)
  services/stock.js        settings/stock + stockMovements ledger, restock / adjust
  services/price.js        Current price + price history
  services/smsGateway.js   httpSMS client: sendOne / sendBulk / testGateway
  services/smsBackend.js   Client for netlify/functions/send-sms (status + bulk)
  hooks/                   useOrders, useSales, useStock, usePrice, useSmsGateway,
                           useSmsBackend
  components/ui/           Button, IconButton, Field, Badge, Menu, Modal, Toast,
                           ConfirmProvider, Switch, SegmentedControl
  components/              Navbar, BottomNav, Fab, Logo, KpiCard, PriceCard, Sparkline,
                           OrdersToolbar, OrdersList, OrdersTable, OrderCard, OrderForm,
                           QuickPriceDialog, SelectionBar, NotifyClientsDialog,
                           SmsGatewaySetup, AuthShell, Spinner
  pages/                   Login, Signup, Dashboard, Sales, Stock, Archive, Settings,
                           Profile, _Preview (dev only)
  utils/                   format (DZD/number/relative), phone (DZ mobile / E.164),
                           sms (templates + sms: / wa.me URIs), exportExcel
```
