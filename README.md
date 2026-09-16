# FieldOps - Enterprise Field Operations Management System

[![CI/CD Pipeline](https://github.com/Aashishrishu02/MERN-RBAC-App/actions/workflows/ci.yml/badge.svg)](https://github.com/Aashishrishu02/MERN-RBAC-App/actions/workflows/ci.yml)
![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue)
![React](https://img.shields.io/badge/React-18.3-cyan)
![Express](https://img.shields.io/badge/Express-4.19-green)
![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-emerald)

**FieldOps** is a production-grade, full-stack B2B SaaS field operations management application built with **TypeScript**, **React**, **Node.js/Express**, and **MongoDB**. It features a pure, permission-based Role-Based Access Control (RBAC) engine, Google Identity Services OAuth, shift attendance tracking, field visit registration, dynamic user role management, and an automated GitHub Actions CI/CD pipeline.

---

## 💡 Interview-Friendly RBAC Explanation

> "Roles define permission sets, while permissions determine authorization. The backend uses `checkPermission()` for protected resources. This avoids hardcoding access rules based on role names and allows permissions to be changed dynamically."

---

## 🎯 1. Project Overview

FieldOps provides field team management, shift clock-in/out tracking, client store visit logs, and administrative user role assignment across a modular stack:

- **Frontend**: React 18, TypeScript, Vite, Lucide Icons, Vanilla CSS Design System
- **Backend API**: Node.js, Express, TypeScript, Mongoose ODM
- **Database**: MongoDB (Atlas in Production, Mongoose ODM)
- **Authentication**: JWT (JSON Web Tokens), Google Identity Services (GIS), Bcrypt Hashing
- **CI/CD Pipeline**: GitHub Actions, Docker, ESLint, TypeScript Compilation Checks, Jest Unit Suite

---

## ⚡ 2. Core Features

- **Authentication Suite**: Email/password registration, password hashing (`bcryptjs`), stateless JWT issuing, password reset token flow, and server-side verified Google Sign-In.
- **Pure Permission-Based RBAC**: Fine-grained authorization enforced via permission strings (`READ_ALL_ATTENDANCE`, `CLOCK_IN_OUT`, `MANAGE_ROLES`, etc.).
- **User Role Management**: Authorized users (`MANAGE_ROLES`) can inspect registered users and reassign roles (`Owner`, `Manager`, `Field Employee`).
- **Dynamic Role Permission Matrix**: Interactive matrix editor allowing role capabilities to be modified at runtime without code changes or server restarts.
- **Attendance Punch Clock**: Shift clock-in and clock-out tracking with status badges and shift notes.
- **Field Visit Logs**: Register client and store visits with customer name, visit purpose, outcome, and location address.
- **Protected Routing**: React frontend route protection (`ProtectedRoute`) and UI component gates (`PermissionGate`) paired with Express backend middleware (`checkPermission`).
- **Lockout Protection**: System safety guards prevent revoking or demoting the last user with `MANAGE_ROLES` permission.

---

## 🏗️ 3. Final RBAC Architecture

```
User Document
  ↓
Role ObjectId (ref: 'Role')
  ↓
Role Document (MongoDB)
  ↓
permissions[] Array
  ↓
authenticateToken Middleware (fetches latest role from DB)
  ↓
checkPermission('PERMISSION_NAME')
  ↓
Allow Request (200 OK) / Reject (403 Forbidden)
```

> **Core Guarantee**: Authorization is permission-based. Application authorization does **not** depend on hardcoded role-name checks (such as `user.role === "Owner"`).

- `User.role` stores a MongoDB `ObjectId` reference pointing to the `Role` collection.
- `Role.permissions` stores an array of permission strings.
- On every HTTP request, `authenticateToken` decodes the stateless JWT (which contains only `{ id: userId }`) and populates the user's latest role document directly from MongoDB.

---

## 🔐 4. Final Permission Matrix

| Permission String | Owner | Manager | Field Employee |
| :--- | :---: | :---: | :---: |
| `READ_SELF_ATTENDANCE` | ❌ | ✅ | ✅ |
| `READ_ALL_ATTENDANCE` | ✅ | ✅ | ❌ |
| `CLOCK_IN_OUT` | ❌ | ✅ | ✅ |
| `READ_SELF_VISIT` | ❌ | ✅ | ✅ |
| `READ_ALL_VISIT` | ✅ | ✅ | ❌ |
| `SAVE_VISIT` | ❌ | ✅ | ✅ |
| `MANAGE_ROLES` | ✅ | ❌ | ❌ |

### Business Behavior & Capabilities
- **Owner**: Administrative manager. Manages user roles and permission matrices; views team attendance and team field visits. Does not clock in/out or create self records.
- **Manager**: Working manager. Clocks shift attendance, registers client visits, views personal records, and reviews team attendance and field visit logs across the organization. Cannot manage roles.
- **Field Employee**: Field worker. Clocks shift attendance, registers client/store visits, and views personal attendance and visit logs. Cannot view team records or manage roles.

---

## 👥 5. User Role Management

- Accessible at `/roles` for users holding the `MANAGE_ROLES` permission.
- Displays all registered system users (Name, Email, Current Role, Role Assignment Dropdown).
- Authorized users can change a user's role to **Owner**, **Manager**, or **Field Employee** via `PUT /api/users/:id/role`.
- Backend enforces `checkPermission(Permission.MANAGE_ROLES)` on user role reassignments.
- **Lockout Safety Guard**: Prevents demoting a user if they are the last remaining user in the system with `MANAGE_ROLES` permission, preventing system lockout.

---

## 🔄 6. Dynamic Permissions

- Permissions assigned to any role can be edited directly via the **Dynamic Permission Matrix** UI (`PUT /api/roles/:id/permissions`).
- Because `authenticateToken` middleware queries MongoDB for the user's role document on **every** API request, permission updates take effect dynamically across all backend endpoints without requiring code updates or JWT token re-issuance.

---

## ⏱️ 7. Attendance Management

- **Manager & Field Employee**: Can punch clock-in and clock-out with shift notes (`CLOCK_IN_OUT`).
- **Field Employee & Manager**: Can view personal attendance history (`READ_SELF_ATTENDANCE`).
- **Owner & Manager**: Can view all team attendance records (`READ_ALL_ATTENDANCE`).
- Backend routes (`/api/attendance/*`) strictly enforce corresponding permission strings.

---

## 📍 8. Field Visits Log

- **Manager & Field Employee**: Can register client and store visits (`SAVE_VISIT`).
- **Field Employee & Manager**: Can view personal field visit logs (`READ_SELF_VISIT`).
- **Owner & Manager**: Can review team-wide field visits (`READ_ALL_VISIT`).
- Backend routes (`/api/visits/*`) strictly enforce corresponding permission strings.

---

## ⚙️ 9. CI/CD Pipeline (`.github/workflows/ci.yml`)

The repository includes a multi-stage GitHub Actions CI/CD pipeline:

```
git push / pull_request (main, dev)
  ↓
GitHub Actions Runner (Ubuntu Latest)
  ↓
Install Dependencies (Client & Server)
  ↓
Lint & TypeScript Check (Client & Server)
  ↓
Backend Unit & RBAC Tests (Jest + Memory MongoDB)
  ↓
Production Build Step (tsc + Vite Build)
  ↓
Docker Build Step
  ↓
Deployment Announcement Step (Pass / Fail)
```

### Automated CI Pipeline Stages
1. **Lint & TypeScript Check**: Runs `check-types` (`tsc --noEmit`) and `lint` (`eslint`) across client and server workspaces.
2. **Backend Unit & RBAC Tests**: Executes Jest unit suite (`server/src/tests/*.test.ts`) validating authentication, authorization headers, 403 error codes, dynamic permission updates, and lockout safety guards.
3. **Build Step**: Compiles backend TypeScript to JavaScript (`tsc`) and builds production Vite client bundle (`vite build`).
4. **Docker Build Step**: Validates container buildability using `docker build`.
5. **Deployment Step**: Executes build notification step for main branch pushes.

---

## 🌐 10. Deployment Architecture

```
React Frontend (Vite) ──> Hosted on Vercel
Express Backend API   ──> Hosted on Render
Database Engine       ──> Hosted on MongoDB Atlas
```

### Required Environment Variables

#### Frontend Configuration (`client/.env`)
```ini
VITE_API_BASE_URL=https://your-backend-api.onrender.com/api
VITE_GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
```

#### Backend Configuration (`server/.env`)
```ini
NODE_ENV=production
PORT=5001
MONGODB_URI=mongodb+sandbox+cluster_url
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRES_IN=7d
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
CLIENT_URL=https://your-app.vercel.app
```

---

## 🔑 11. Seeded Demo Accounts (`npm run seed`)

For development, testing, and evaluation, run `npm --prefix server run seed` to populate demo accounts:

| Role | Email | Demo Password | Default Capabilities |
| :--- | :--- | :--- | :--- |
| **Owner** | `owner@fieldops.com` | `Password123!` | View Team Attendance & Visits, Role & User Management |
| **Manager** | `manager@fieldops.com` | `Password123!` | Clock In/Out, Register Visits, View Team & Self Records |
| **Field Employee** | `employee@fieldops.com` | `Password123!` | Clock In/Out, Register Visits, View Self Records |

> *Note: `Password123!` is explicitly provided for local testing and demo evaluation purposes only.*

---

## 🧪 12. Testing & Verification Status

### Verified Test Suite Status
- **Backend Unit & RBAC Test Suite**: **30/30 Tests Passed** (`PASS src/tests/userRole.test.ts`, `PASS src/tests/rbac.test.ts`)
- **Client TypeScript Check**: Passed (**0 errors**)
- **Client Linting**: Passed (**0 errors**)
- **Client Production Build**: Passed (`dist/index-*.js` compiled successfully)
- **Server TypeScript Check**: Passed (**0 errors**)
- **Server Production Build**: Passed (`dist/index.js` compiled successfully)

---

## 📁 13. Project Structure

```
FieldOps AccessTest/
├── client/                     # Frontend Application (React + TypeScript + Vite)
│   ├── src/
│   │   ├── components/        # Navbar, Sidebar, ProtectedRoute, PermissionGate
│   │   ├── context/           # AuthContext (JWT session, hasPermission helper)
│   │   ├── pages/             # Login, Register, Dashboard, Attendance, Visits, RoleManagement
│   │   ├── services/          # Axios API Service Layer
│   │   └── types/             # Shared TypeScript Interfaces & Permission Enum
│   └── vite.config.ts
├── server/                     # Backend API Server (Node.js + Express + TypeScript)
│   ├── src/
│   │   ├── config/            # MongoDB Connection Handler
│   │   ├── controllers/       # authController, roleController, userController, attendanceController, visitController
│   │   ├── middleware/        # authenticateToken, checkPermission Middleware
│   │   ├── models/            # User, Role, Attendance, Visit Schemas
│   │   ├── routes/            # authRoutes, roleRoutes, userRoutes, attendanceRoutes, visitRoutes
│   │   ├── tests/             # rbac.test.ts, userRole.test.ts (Jest + Memory MongoDB)
│   │   ├── index.ts           # Express Application Entrypoint
│   │   └── seed.ts            # Idempotent Database Seed Script
│   └── tsconfig.json
├── .github/
│   └── workflows/
│       └── ci.yml             # GitHub Actions CI/CD Pipeline
├── Dockerfile                  # Container Build Spec
└── README.md
```

---

## 🔒 14. Security & Compliance Notes

1. **Server-Side Token Verification**: Google Sign-In ID tokens are verified cryptographically via `google-auth-library` (`OAuth2Client.verifyIdToken`). Production builds (`NODE_ENV === 'production'`) reject mock tokens.
2. **Dynamic Permission Validation**: Express routes execute `checkPermission` middleware on every request. Frontend route guards (`ProtectedRoute`) enhance user experience but are not treated as the sole security boundary.
3. **Environment Isolation**: Secrets (`JWT_SECRET`, `MONGODB_URI`, `GOOGLE_CLIENT_ID`) are loaded strictly from environment variables.
4. **Clean Code & Credentials**: No private credentials or secrets are committed to version control.
