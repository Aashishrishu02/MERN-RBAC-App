# FieldOps Access Test - MERN RBAC Application (TypeScript)

[![CI/CD Pipeline](https://github.com/fieldops/access-test/actions/workflows/ci.yml/badge.svg)](https://github.com/fieldops/access-test/actions/workflows/ci.yml)
![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue)
![React](https://img.shields.io/badge/React-18.3-cyan)
![Express](https://img.shields.io/badge/Express-4.19-green)
![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-emerald)

**FieldOps Access Test** is a full-stack, production-grade MERN application built with **TypeScript** demonstrating configurable Role-Based Access Control (RBAC) powered by **permission strings** (rather than hardcoded role names), full Authentication (Email/Password, Google OAuth, Password Reset flow), Attendance Punch Clock, Field Visits Manager, Role Configurator UI, unit tests, Dockerization, and GitHub Actions CI/CD.

---

## 🎯 Key Architectural Highlights

1. **Configurable Permission-Based RBAC (Not Hardcoded Role Names)**:
   - Access control checks evaluate specific permissions (`READ_ALL_ATTENDANCE`, `CLOCK_IN_OUT`, `MANAGE_ROLES`, etc.) stored dynamically in MongoDB role documents.
   - Roles (*Owner*, *Manager*, *Field Employee*) are fully configurable by the *Owner* role via the interactive **Role Management Matrix** UI without modifying code or restarting servers.
   - Dynamic authorization is strictly enforced on both **Express backend API endpoints** (returns HTTP `403 Forbidden`) and **React frontend route guards** (`<PermissionGate>` & `<ProtectedRoute>`).

2. **Complete Authentication Suite**:
   - **Email/Password**: Password hashing via `bcryptjs`, JWT issuing & Bearer authorization headers.
   - **Google OAuth**: `/api/auth/google` with cryptographically verified ID tokens (`google-auth-library` `OAuth2Client.verifyIdToken()`).
   - **Password Reset Flow**: Crypto token generation with 15-minute expiration, email simulation link, and password reset endpoint.
   - **User Session**: `/api/auth/me` with dynamic permission resolution.

3. **Core Field Ops Features**:
   - **Attendance Tracking**: Shift clock-in and clock-out with status indicators, timestamps, and optional notes.
   - **Field Visits Log**: Register client visits with customer/shop name, visit purpose, outcome, and location address.
   - **Owner Role Management UI**: Dynamic checkbox matrix for toggling permissions per role with safety guards preventing self-lockout.

4. **Automated Unit & Integration Testing**:
   - Jest & Supertest unit test suite (`server/src/tests/rbac.test.ts`) utilizing `mongodb-memory-server` to validate auth flow, token checks, permission denial (403), dynamic permission updates, and safety guard enforcement.

---

## 🔐 Permissions & Default Role Matrix

| System Permission | Owner | Manager | Field Employee |
| :--- | :---: | :---: | :---: |
| `READ_SELF_ATTENDANCE` | ✅ | ✅ | ✅ |
| `READ_ALL_ATTENDANCE` | ✅ | ✅ | ❌ |
| `CLOCK_IN_OUT` | ✅ | ❌ *(Configurable)* | ✅ |
| `READ_SELF_VISIT` | ✅ | ✅ | ✅ |
| `READ_ALL_VISIT` | ✅ | ✅ | ❌ |
| `SAVE_VISIT` | ✅ | ❌ *(Configurable)* | ✅ |
| `MANAGE_ROLES` | ✅ | ❌ | ❌ |

---

## 🔑 Demo Seed Accounts (`npm run seed`)

The project includes an automated seed script (`server/src/seed.ts`) pre-configuring MongoDB with default roles and demo accounts:

| Role | Email | Password | Primary Capabilities |
| :--- | :--- | :--- | :--- |
| **Owner** | `owner@fieldops.com` | `Password123!` | All permissions + Role Management matrix editor |
| **Manager** | `manager@fieldops.com` | `Password123!` | View all team attendance & all field visits |
| **Field Employee** | `employee@fieldops.com` | `Password123!` | Punch clock in/out & register field visits |

---

## 🚀 Quick Setup & Local Execution

### Prerequisites
- **Node.js**: `v20+`
- **npm**: `v10+`
- **MongoDB**: Local MongoDB instance (`mongodb://localhost:27017/fieldops_access_test`) or MongoDB Atlas. *(Falls back to in-memory MongoDB automatically if no local instance is running)*.

### Installation Steps

1. **Clone Repository & Install Dependencies**:
   ```bash
   git clone <repository-url>
   cd "FieldOps AccessTest"
   npm run install:all
   ```

2. **Configure Environment Variables**:
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

3. **Seed Database**:
   Populates MongoDB with roles and default demo users:
   ```bash
   npm run seed
   ```

4. **Start Development Servers (Monorepo)**:
   Launches both backend (`http://localhost:5001`) and frontend client (`http://localhost:5173`) concurrently:
   ```bash
   npm run dev
   ```

5. **Access Application**:
   Open browser at `http://localhost:5173`. Use the quick persona cards on the login page to easily log in as **Owner**, **Manager**, or **Field Employee**.

---

## 📡 API Overview

| Method | Endpoint | Required Permission | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Public | Register new user account |
| `POST` | `/api/auth/login` | Public | Authenticate user and receive JWT |
| `POST` | `/api/auth/google` | Public | Authenticate via Google ID Token |
| `POST` | `/api/auth/forgot-password` | Public | Request password reset token/link |
| `POST` | `/api/auth/reset-password` | Public | Reset password using valid token |
| `GET` | `/api/auth/me` | Authenticated | Fetch active user session & permissions |
| `GET` | `/api/roles` | `MANAGE_ROLES` | List all roles & system permissions |
| `PUT` | `/api/roles/:id/permissions` | `MANAGE_ROLES` | Update permissions array for a role |
| `POST` | `/api/attendance/clock-in` | `CLOCK_IN_OUT` | Clock in shift |
| `POST` | `/api/attendance/clock-out` | `CLOCK_IN_OUT` | Clock out shift |
| `GET` | `/api/attendance/my` | `READ_SELF_ATTENDANCE` | Get personal attendance records |
| `GET` | `/api/attendance/all` | `READ_ALL_ATTENDANCE` | Get all team attendance records |
| `POST` | `/api/visits` | `SAVE_VISIT` | Register new field visit |
| `GET` | `/api/visits/my` | `READ_SELF_VISIT` | Get personal visit records |
| `GET` | `/api/visits/all` | `READ_ALL_VISIT` | Get team visit records |

---

## 🧪 Testing & Verification Commands

```bash
# Run Backend Jest Unit & RBAC Tests (with Memory MongoDB)
npm test

# Run ESLint across monorepo
npm run lint

# Run TypeScript compilation checks across workspace
npm run check-types

# Run Production Build
npm run build
```

---

## 🐳 Docker Deployment

Run the complete stack (Node.js application + MongoDB container) using Docker Compose:

```bash
# Build and start services
docker-compose up --build

# Application will be accessible at http://localhost:5001
```

---

## ⚙️ GitHub Actions CI/CD Pipeline (`.github/workflows/ci.yml`)

The repository includes a multi-stage GitHub Actions pipeline:
1. **Lint & TypeScript Check**: Validates ESLint and TypeScript compilation (`tsc --noEmit`) for both client and server.
2. **Backend Unit & RBAC Tests**: Executes Jest test suite validating authentication and permission check enforcement.
3. **Build Job**: Compiles backend TypeScript to JS and builds production Vite client bundle.
4. **Docker Build Step**: Verifies container buildability.
5. **Deploy Placeholder**: Placeholder step demonstrating automated deployment.

---

## ⚠️ Known Limitations & Design Decisions

1. **Email Delivery**: Forgot Password flow generates valid reset tokens and outputs a developer link in response payload/console when SMTP server is not configured.
2. **Google OAuth Client ID**: Local dev mock mode is provided for offline testing when `GOOGLE_CLIENT_ID` is unset. Production OAuth requires registering a GCP OAuth Client ID.
