# 👗 Smart Fashion Store

<div align="center">

<img src="https://i.postimg.cc/zffS9KfZ/favicon.png" alt="Smart Fashion Store" width="160" />

[![React Native](https://img.shields.io/badge/React%20Native-0.81-blue?logo=react&logoColor=white)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-54-black?logo=expo&logoColor=white)](https://expo.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Appwrite](https://img.shields.io/badge/Appwrite-Cloud-FF382D?logo=appwrite&logoColor=white)](https://appwrite.io/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green?logo=node.js&logoColor=white)](https://nodejs.org/)

A modern fashion e-commerce app with a customer shopping experience and a powerful admin dashboard.

[🚀 Quick Start](#-quick-start) • [🛍️ Features](#-features) • [☁️ Appwrite Restore](#️-appwrite-restore-required) • [📚 Docs](#-documentation)

</div>

---

## 🎯 Overview

Smart Fashion Store is a full-stack mobile commerce application built with React Native, Expo, and Appwrite. It includes product browsing, cart and wishlist management, authentication, admin controls, and order handling in one polished experience.

> If you want the app to work properly, the Appwrite project must be restored or recreated first. Without the database, collections, and storage bucket, the app will not load its data.

---

---

## ✨ Features

- 🔐 Authentication with login, register, password reset, and OTP flow
- 🛍️ Product browsing, search, and category-based filtering
- ❤️ Wishlist and cart management
- 💳 Order tracking and profile management
- 📊 Admin dashboard for products, orders, coupons, users, and revenue
- 💬 Messaging and support-related flows
- ☁️ Appwrite-powered database, auth, and storage

---

## 🛠️ Tech Stack

### Frontend

- React Native
- Expo Router
- TypeScript
- Expo SDK

### Backend

- Node.js
- Express
- Appwrite
- Nodemailer

---

## 📋 Prerequisites

Make sure the following are installed:

- Node.js 18+
- npm or yarn
- Git
- Android Studio (for Android)
- Xcode (for iOS on macOS)

---

## ☁️ Appwrite Restore (Required)

This project depends on Appwrite for data storage and authentication. If you restore the project from another machine or clone it fresh, do this first.

### 1) Create or Restore the Appwrite Project

1. Open the Appwrite Console.
2. Create a new project or restore your existing one.
3. Make sure the project endpoint and project ID match the values used by the app.

### 2) Create the Database and Collections

Create a database with this ID:

- Database ID: `69ce0993000e669d574c`

Create these collections inside it:

- `products`
- `categories`
- `orders`
- `users`
- `banners`
- `coupons`
- `reviews`
- `settings`
- `chats`
- `wishlist`
- `messages`
- `order_timeline`

### 3) Create the Storage Bucket

Create a storage bucket named:

- `product_images`

Enable file upload permissions for the app to upload and display product images.

### 4) Update Appwrite Config

The app is already configured with these defaults in [app.json](app.json) and [appwrite/config.ts](appwrite/config.ts):

- Endpoint: `https://tor.cloud.appwrite.io/v1`
- Project ID: `69ce028900081643e1c3`
- Database ID: `69ce0993000e669d574c`

If your restored Appwrite project uses different values, update them in [app.json](app.json) and [appwrite/config.ts](appwrite/config.ts).

> Without restoring or recreating the Appwrite database and bucket, the app will not run properly because the screens depend on those documents.

---

## 🚀 Quick Start

### 1) Clone the Repository

```bash
git clone https://github.com/rahi-8/Smart_Fashion_Store
cd Smart_Fashion_Store
```

### 2) Install Frontend Dependencies

```bash
npm install
```

### 3) Install Backend Dependencies

```bash
cd backend
npm install
cd ..
```

### 4) Start the Backend

```bash
cd backend
npm start
# or
node server.js
```

If the backend fails to start, make sure the Appwrite project is restored and the Appwrite credentials are correct.

### 5) Start the Expo App

In a new terminal:

```bash
npx expo start
# or
npm start
```

Then:

- Press `a` for Android
- Press `W` for Web
- Scan the QR code with Expo Go on your phone

---

## 📁 Project Structure

```text
Smart_Fashion_Store/
├── app/                 # Expo Router screens and navigation
├── components/          # Reusable UI components
├── appwrite/            # Appwrite client and service helpers
├── backend/             # Node.js backend server
├── contexts/            # Auth and global state
├── hooks/               # Custom hooks
├── utils/               # Shared utilities and types
├── assets/              # Images and app assets
├── android/             # Android native project
├── app.json             # Expo config and Appwrite values
└── package.json         # Frontend dependencies
```

---

## 🔐 Authentication Flow

The app includes:

- Login and registration
- Password reset and OTP verification
- Protected routes for authenticated users
- Admin and customer role-based screens

---

## 🧪 Troubleshooting

### Metro issues

```bash
npx expo start --clear
```

### Backend not running

```bash
cd backend
npm install
npm start
```

### Appwrite data not loading

- Confirm the database and collections exist
- Confirm the storage bucket exists
- Confirm the endpoint and project ID are correct
- Restart the Expo app after changing Appwrite settings

---

## 📚 Documentation

- [React Native Docs](https://reactnative.dev/docs/getting-started)
- [Expo Documentation](https://docs.expo.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Appwrite Documentation](https://appwrite.io/docs)

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push the branch
5. Open a pull request

---

## 📄 License

This project is licensed under the MIT License.

---

## 📞 Support

If you need help, open an issue or contact the project maintainer.
