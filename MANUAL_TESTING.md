# 📋 FieldOps Access Test - Manual Testing Checklist

Use this step-by-step checklist to manually test and verify all user flows and permission enforcement before final submission.

---

## 1. Prerequisites & Startup
- [ ] Run `npm run seed` in project root. Ensure output shows success for Owner, Manager, and Field Employee personas.
- [ ] Run `npm run dev` to start dev servers.
- [ ] Open `http://localhost:5173` in your browser.

---

## 2. Authentication & Persona Logins
- [ ] **Quick Persona Login - Field Employee**:
  - Click **Field Employee Account** badge (`employee@fieldops.com`).
  - Verify redirect to `/dashboard`.
  - Verify active role shows **Field Employee** and permission count is `4`.
  - Verify sidebar contains **Dashboard**, **Attendance**, and **Field Visits**, but **Role Management** is **HIDDEN**.
- [ ] **Quick Persona Login - Manager**:
  - Click Sign Out, then click **Manager Account** badge (`manager@fieldops.com`).
  - Verify sidebar contains **Dashboard**, **Attendance**, **Field Visits**, but **Role Management** is **HIDDEN**.
- [ ] **Quick Persona Login - Owner**:
  - Click Sign Out, then click **Owner Account** badge (`owner@fieldops.com`).
  - Verify sidebar contains **Dashboard**, **Attendance**, **Field Visits**, AND **Role Management**.

---

## 3. Password Reset & Registration Flow
- [ ] Navigate to `/forgot-password`.
- [ ] Enter `employee@fieldops.com` and click **Send Reset Link**.
- [ ] Verify green success message with generated reset link.
- [ ] Click reset link (or navigate to `/reset-password?token=...`).
- [ ] Enter new password `Password456!` and confirm.
- [ ] Verify success prompt and redirect to login screen.
- [ ] Log in with `employee@fieldops.com` and `Password456!`.

---

## 4. Attendance Operations
- [ ] **Field Employee Punch Clock**:
  - Log in as `employee@fieldops.com`.
  - Navigate to `/attendance`.
  - Enter optional note (e.g., "Starting shift in North Region") and click **Clock In Now**.
  - Verify status badge updates to **CLOCKED IN** and entry appears in **My Attendance Log**.
  - Click **Clock Out**. Verify status updates to **Currently Off Duty**.
- [ ] **Manager Attendance View**:
  - Log in as `manager@fieldops.com`.
  - Navigate to `/attendance`.
  - Verify **Team Attendance (Manager / Owner View)** table lists all employee attendance entries.
  - Verify **Punch Clock** button is hidden (unless `CLOCK_IN_OUT` is assigned).

---

## 5. Field Visits Operations (`/visits`)
- [ ] **Register Field Visit**:
  - Log in as `employee@fieldops.com`.
  - Navigate to `/visits`.
  - Click **Register New Visit**.
  - Fill out Customer Name (`Apex Retail`), Purpose (`Audit`), Outcome (`Order placed`), Location (`45 Main St`).
  - Click **Save Visit Record**.
  - Verify record appears instantly in **My Registered Field Visits**.
- [ ] **Manager Team Visits View**:
  - Log in as `manager@fieldops.com`.
  - Navigate to `/visits`.
  - Verify **Team Visits (Manager / Owner View)** table lists all registered field visits with employee names.

---

## 6. Dynamic Permission Management & Owner Safety Guard
- [ ] **Dynamic RBAC Enforce & Instant Update**:
  - Log in as `owner@fieldops.com`.
  - Navigate to `/roles`.
  - Locate **Manager** column.
  - Check the box for `CLOCK_IN_OUT` permission under Manager.
  - Click **Save Matrix** for Manager. Verify green success badge.
  - Sign Out and log in as `manager@fieldops.com`.
  - Navigate to `/attendance`.
  - Verify **Attendance Punch Clock** widget is now **VISIBLE** and functional for Manager!
- [ ] **Owner Self-Lockout Safety Guard**:
  - Log in as `owner@fieldops.com`.
  - Navigate to `/roles`.
  - Verify the checkbox for `MANAGE_ROLES` under the **Owner** column is disabled/greyed out.
  - Attempt to click it; verify safety tooltip preventing removal of `MANAGE_ROLES` from Owner.

---

## 7. Direct Route & API Access Control (401 / 403)
- [ ] **Frontend Protected Route Gate**:
  - Log in as `employee@fieldops.com`.
  - Directly type `http://localhost:5173/roles` in browser address bar.
  - Verify automatic redirect to `/unauthorized` displaying styled **403 Access Denied** card.
- [ ] **Backend Unauthorized Block**:
  - Open terminal and send request without token:
    ```bash
    curl -i http://localhost:5001/api/roles
    ```
  - Verify response HTTP status `401 Unauthorized`.
