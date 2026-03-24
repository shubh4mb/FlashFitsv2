# FlashFits App Overview

This document provides a comprehensive and detailed breakdown of the features, architecture, and technology stack of the **FlashFits** mobile application, based on the application's source code and directory structure. 

## 1. App Purpose and Core Functionality
FlashFits is a fully-featured **E-commerce & Shopping Mobile Application**. It allows users to browse products, explore local retail stores, manage a shopping cart, and place orders with integrated delivery tracking and digital payments.

## 2. Technology Stack
The application is built using a modern React Native ecosystem tailored for performance and rapid development:
- **Framework:** React Native / Expo (`expo-router` for file-based routing)
- **Styling:** TailwindCSS via NativeWind
- **Networking:** Axios for REST APIs & `socket.io-client` for real-time WebSocket communication (e.g., live tracking).
- **Navigation:** `@react-navigation/bottom-tabs`, `drawer`, and `stack` combined with `expo-router`.
- **State Management:** React Context API (e.g., `AuthContext`, `AddressContext`, `WishlistContext`, `GenderContext`).
- **Local Storage:** `expo-secure-store` and `@react-native-async-storage/async-storage`.
- **Location & Maps:** `react-native-maps`, `expo-location`, and `react-native-google-places-autocomplete` for geofencing and address selection.
- **Payments:** `react-native-razorpay` for secure digital transactions.
- **Push Notifications:** `expo-notifications`.

---

## 3. High-Level Features & User Flows

### A. Authentication & Onboarding
- **Onboarding Screens (`onboarding.tsx`):** Introductory screens to guide new users through the app's value proposition.
- **OTP Login (`otpVerification.tsx`):** Secure, passwordless authentication utilizing One-Time Passwords (likely integrated with Firebase based on package dependencies).

### B. Main Navigation (Bottom Tabs)
The primary user interface relies on a bottom tab navigation system (`app/(tabs)`):
- **Home (`index.tsx`):** The main landing page showcasing banners, recommended products, and quick links.
- **Categories (`Categories.tsx`):** A browsable directory of all product categories available on the platform.
- **Flashfits Stores (`FlashfitsStores.tsx`):** A dedicated section to discover nearby partner stores and physical shops.
- **Wishlist (`Wishlist.tsx`):** A saved items list where users can curate products they wish to purchase later.

### C. Product Browsing & Search
- **Deep Search (`MainSearchPage.tsx`):** Allowing users to search for specific items by name, category, or brand.
- **Product Details (`ProductDetail/`):** Comprehensive view of individual products, showing images, descriptions, pricing, variations (sizes/colors), and reviews.
- **Shop Details (`ShopDetails/`):** Specific pages for interacting with individual merchants, viewing their specific catalog, and store information.
- **Selection Page (`SelectionPage.tsx`):** Advanced filtering and sorting capabilities integrated with promotional banners.

### D. Cart, Checkout, and Payments
- **Shopping Bag (`ShoppingBag.tsx`):** Cart management, quantity adjustments, and subtotal calculations.
- **Review Order (`ReviewOrder.tsx`):** Final step before payment where users can verify items, apply coupons (`coupons.tsx`), and see delivery chargers.
- **Payment Processing (`Payment.tsx`):** Secure checkout gateway utilizing Razorpay for UPI, card, and net banking payments.

### E. Location and Address Management
- **Geofencing & Accuracy:** The app uses Expo Location to pinpoint the user.
- **Saved Addresses (`address.tsx`, `SavedAddressesScreen.tsx`):** Users can save multiple addresses for home, work, etc.
- **Address Addition (`AddAddressScreen.tsx`, `SelectLocationScreen.tsx`):** Includes a Google Places Autocomplete integration and an interactive map to drop pins for exact delivery locations.

### F. User Profile and Order Management
- **Profile Dashboard (`index.tsx` in profile):** User account settings and quick links.
- **Order History (`orders.tsx`, `OrderDetail/`):** Tracking of past and current orders.
- **Digital Wallet (`mywallet.tsx`):** In-app wallet functionality for easy refunds, cashback, and quick repurchasing.
- **Help & Support (`helpandsupport.tsx`):** Customer service interface.

---

## 4. Logical Modules and API Structure
The API interactions are logically split into distinct domain-driven files inside `app/api/`:
- **`auth.ts`**: Handles token generation, OTP, and user session validation.
- **`categories.ts`**: Fetches hierarchical category data.
- **`productApis/`**: Handles CRUD and read operations for products, search, and filtering.
- **`merchatApis/`**: Operations related to store/merchant data retrieval.
- **`orderApis.ts`**: Order creation, status updates, and historical order retrieval.
- **`reviewApis.ts`**: Submitting and reading user reviews for products and stores.

## 5. Security and Data Integrity
- JWTs or Session Tokens are heavily guarded using `expo-secure-store`.
- React Contexts encapsulate logic and ensure that sensitive address or auth details are not leaked unnecessarily across components.

## Summary
FlashFits is a robust, location-aware e-commerce platform. It seamlessly blends online product discovery with localized merchant storefronts, providing users with a rich UI, real-time tracking, and secure payment pathways.
