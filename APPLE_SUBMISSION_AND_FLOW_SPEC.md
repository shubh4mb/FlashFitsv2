# FlashFits iOS App Store Compliance & Master Architecture State

> **Last Updated:** October 13, 2026  
> **Target Submission:** iOS App Store (Apple Review Guidelines 5.1.1(v), 5.1.1(iv), 5.1.5)  
> **Repository:** `c:\Users\leno2\Desktop\flashfits-refactor`  
> **Branch:** `production`

---

## 1. Executive Summary & Review Context

Apple rejected the previous build under **Guideline 5.1.1(v) - Legal - Privacy - Data Collection and Storage**:
> *"The app requires users to register or log in to access features that are not account based. Specifically, the app requires users to register before browsing products. Registration can only be required for account-based features like adding to cart or checking out."*

This document serves as the **single source of truth (SSOT)** for all past implementations, current state, and the upcoming roadmap so that future sessions and agents have complete context without memory loss.

---

## 2. Completed Work & Current System State

### A. Auth Wall Removal & Unauthenticated Entry
1. **Entry Point (`app/index.tsx`)**:
   - Removed the blocking `router.replace('/(auth)')` redirect for users without a token.
   - All users directly navigate to `/(app)/(tabs)`.
2. **Phone Login UI (`components/auth/PhoneLogin.tsx`)**:
   - Added **"Explore as Guest"** link in the header.
   - Added **"Continue as Guest"** outline button at the base of the phone number input card.
   - Tapping either routes directly to `/(app)/(tabs)` without requiring phone/OTP.
3. **Auth Screen Back Navigation (`app/(auth)/index.tsx`)**:
   - Android back button and screen back button gracefully navigate to `/(app)/(tabs)` rather than trapping the user.
4. **Gesture Navigation (`app/_layout.tsx`)**:
   - Enabled `gestureEnabled: true` unconditionally across root stack screens.

### B. Guest Cart & Wishlist Guards
1. **Axios Token Interceptor (`api/axiosConfig.ts`)**:
   - Updated the 401 response interceptor so it only emits `auth:session-expired` or attempts token refresh if the request actually sent an `Authorization: Bearer ...` header. Public endpoints called by guests no longer trigger false auth-expiration popups.
2. **Wishlist Guard (`context/WishlistContext.tsx`)**:
   - If an unauthenticated user attempts to add an item to the wishlist, an alert prompt directs them to sign in.
3. **Account Screens Auth Walls**:
   - `app/(app)/profile.tsx`, `orders.tsx`, `addresses.tsx`, and `wishlist.tsx` now check `isAuthenticated`. Unauthenticated users see an empty/guest state with a prominent "Sign In / Register" CTA button instead of throwing unhandled API errors.

### C. Kaloor Hub Fallback (Silent Try & Buy Catalog)
1. **Coordinate Defaults (`context/AddressContext.tsx`)**:
   - Exported `DEFAULT_FALLBACK_COORDS = { latitude: 10.0072, longitude: 76.2891 }` (FlashFits Kaloor Hub).
   - In `updateAvailability`: When `!selectedAddress && !userLocation`, the availability check runs with `DEFAULT_FALLBACK_COORDS` behind the scenes. This ensures `tbAvailable = true` and `deliveryAvailable = true` so the Try & Buy catalog is active.
   - `locationAddress` remains `null` so the UI does NOT display "Kaloor" anywhere.
2. **Product Feeds & Catalogs**:
   - `app/(app)/(tabs)/index.tsx`: Home feed queries use `DEFAULT_FALLBACK_COORDS` when address/location is null.
   - `app/(app)/(tabs)/explore.tsx`: Courier & explore products query with `DEFAULT_FALLBACK_COORDS`.
   - `app/(app)/(tabs)/flashmart.tsx`: Warehouse inventory queries with `DEFAULT_FALLBACK_COORDS`.
   - `components/sections/MerchantLogosSection.tsx`: Partner stores query with `DEFAULT_FALLBACK_COORDS`.
   - `components/sections/AvailableBrandsSection.tsx`: Partner brands query with `DEFAULT_FALLBACK_COORDS`.
   - `components/sections/RecentlyViewedSection.tsx`: Fallbacks applied.
3. **UI Cleanliness**:
   - `MainHeader.tsx`: Shows `"30-Min Try at Home"` or `"FlashFits Delivery"` with subtext `"Select delivery location"`. No hardcoded city/area names are exposed.

---

## 3. Approved New Specification: Onboarding, Location & Guest Cart

Based on Apple Guidelines 5.1.1(v), 5.1.1(iv), and 5.1.5, we have agreed on the following full user flow:

### Phase 1: First Open & Skip Experience
1. **First-Time App Open**:
   - Show the clean Welcome/Login screen with a clear **"Skip"** button.
   - User can either log in with phone/OTP or tap **"Skip"**.

### Phase 2: Location Permission Handling (Post-Skip / Post-Login)
1. **Only trigger location permission AFTER the user taps Skip or completes Login**.
2. **Guest Branch (Tapped Skip)**:
   - **Case A: Location Allowed**:
     - Detect GPS coordinates.
     - Store coordinates in `userLocation`.
     - Reverse-geocode to display device location.
     - Show: *"Use Current Location"* + prompt *"Login to get saved addresses"*.
   - **Case B: Location Denied**:
     - Do NOT hard-block the user.
     - Show an informative, dismissible banner or prompt:
       - *"Enable location for doorstep Try & Buy"* (Settings link).
       - *"Login to use saved addresses"* (Login navigation).
       - *"Browse Catalog"* (Dismissible / automatic fallback to Kaloor catalog without mentioning "Kaloor").
3. **Logged-In Branch**:
   - **Case A: Location Allowed**:
     - Detect GPS, check proximity to saved addresses, select nearest or current.
   - **Case B: Location Denied & User HAS Saved Addresses**:
     - Prompt user to pick from their saved addresses (Home, Work, etc.).
   - **Case C: Location Denied & User HAS NO Saved Addresses**:
     - Show two options:
       1. **"Add Delivery Address"** (opens address entry).
       2. **"Browse Products"** (falls back to default Kaloor hub inventory so user can inspect products without being blocked).

### Phase 3: Guest Cart (Local Storage) & Checkout Login Funnel
1. **Add to Cart for Unauthenticated Users**:
   - Allow guests to select size/color and tap **"Add to Cart"** or **"Try at Home"**.
   - Store cart items locally in `AsyncStorage` / `CartContext`.
   - Guest can inspect cart, adjust quantities, and view bill breakdown.
2. **Checkout Gate ("Swipe to Order")**:
   - When guest reaches the bottom of the Cart and attempts **"Swipe to Order"**:
     - Intercept with auth modal: *"Please sign in with your phone number to place your order"*.
     - Navigate to Phone Login with callback redirect to Cart.
3. **Cart Sync & Delivery Address on Login**:
   - After successful OTP verification:
     - Merge local guest cart items with the server cart.
     - If the user account has no saved address: show a modal to **"Add Delivery Address"**.
     - Once address is selected/saved -> Allow user to proceed with **"Swipe to Order"** to place the order.

---

## 4. Implementation Plan & Status

| Phase | Description | Key Files Involved | Status |
| :--- | :--- | :--- | :--- |
| **Phase 1** | First Open Onboarding Logic & Permission Timing | `app/index.tsx`, `app/(auth)/index.tsx`, `components/auth/PhoneLogin.tsx` | ✅ Completed |
| **Phase 2** | Location Permission Flow & Permission Denied Sheets | `context/AddressContext.tsx`, `components/common/AddressSelectorModal.tsx`, `app/(app)/(tabs)/index.tsx` | ✅ Completed |
| **Phase 3** | Guest Cart Local Storage Persistence & Hydration | `context/CartContext.tsx`, `context/CourierCartContext.tsx`, `api/cart.ts`, `api/courier.ts` | ✅ Completed |
| **Phase 4** | Checkout Gate & Auth Interception on Swipe to Order | `app/(app)/cart.tsx`, `product/[id].tsx`, `app/(auth)/index.tsx` | ✅ Completed |
| **Phase 5** | Verification & Build Validation | `npx tsc --noEmit` (0 errors) | ✅ Completed |
| **Phase 6** | Stores Tab Location Gating ("Stores Available", Instant Try gating, Distance hidden) | `app/(app)/(tabs)/stores.tsx`, `components/sections/MerchantLogosSection.tsx` | ✅ Completed |
| **Phase 7** | Store Detail Location Gating (Hide delivery minutes & distance when no location set) | `app/(app)/merchant/[id].tsx` | ✅ Completed |
| **Phase 8** | Product Detail FlashFits Promise Perks (Try & Buy, 30m Delivery, Instant Return, Store Price) | `app/(app)/product/[id].tsx` | ✅ Completed |
| **Phase 9** | Push Notification Permission Deferral (Zero prompt on startup; deferred to post-login & order tracking) | `hooks/usePushNotifications.ts`, `context/AuthContext.tsx`, `app/(app)/order-tracking.tsx` | ✅ Completed |

---

## 5. Engineering Constraints & Rules
- **NEVER hard-block browsing**: In any permission-denied or unauthenticated branch, the user must always have an escape hatch to view products.
- **NEVER prompt for permissions on startup**: Both Location and Push Notifications must never show system alerts on cold boot. Push notifications are requested contextually upon sign-in or order tracking.
- **NEVER show distance or delivery duration** when location is not set (e.g. stores tab, store detail page).
- **NEVER show "Kaloor" in the UI** when using default coordinates fallback.
- **Preserve TypeScript integrity**: Ensure `npx tsc --noEmit` exits with 0 errors after every change.

---

## 6. App Store Connect Reply Message (Guideline 5.1.1(v) Resolution)

```text
Hello Apple App Review Team,

Thank you for your feedback regarding Guideline 5.1.1(v) - Legal - Privacy - Data Collection and Storage.

We have updated the app in this build to ensure full compliance:

1. Unrestricted Guest Browsing:
   - On initial launch, users are presented with a clear "Skip" button in the upper header.
   - Tapping "Skip" allows users to immediately enter and explore the entire app, catalog, search, and product details without registering or signing in.

2. Guest Cart & Wishlist:
   - Unauthenticated users can freely select sizes and add products to their shopping cart (stored locally on device).
   - Account login is only required when the user initiates order placement ("Swipe to Buy" / "Proceed to Checkout") or accesses personal account details (e.g., saved order history).

3. Permission Deferral & Fallback:
   - Location permissions are no longer requested during the login screen or initial app launch. Permission is only requested after the user enters the main experience.
   - If a user chooses to deny location permissions, they are not blocked: they can choose "Browse Products" to freely view the catalog without hindrance.

Thank you for your guidance. Please let us know if any further clarification is required.
```
