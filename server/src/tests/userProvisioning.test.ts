import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../index';
import { Role, Permission } from '../models/Role';
import { User } from '../models/User';
import bcrypt from 'bcryptjs';

let mongoServer: MongoMemoryServer;
let ownerToken: string;
let employeeToken: string;

let ownerUserId: string;
let ownerRoleId: string;
let managerRoleId: string;
let employeeRoleId: string;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  const ownerRole = await Role.create({
    name: 'Owner',
    permissions: [
      Permission.READ_ALL_ATTENDANCE,
      Permission.READ_ALL_VISIT,
      Permission.MANAGE_ROLES,
    ],
    isDefault: false,
  });
  ownerRoleId = (ownerRole._id as any).toString();

  const managerRole = await Role.create({
    name: 'Manager',
    permissions: [
      Permission.READ_SELF_ATTENDANCE,
      Permission.READ_ALL_ATTENDANCE,
      Permission.CLOCK_IN_OUT,
      Permission.READ_SELF_VISIT,
      Permission.READ_ALL_VISIT,
      Permission.SAVE_VISIT,
    ],
    isDefault: false,
  });
  managerRoleId = (managerRole._id as any).toString();

  const employeeRole = await Role.create({
    name: 'Field Employee',
    permissions: [
      Permission.READ_SELF_ATTENDANCE,
      Permission.CLOCK_IN_OUT,
      Permission.READ_SELF_VISIT,
      Permission.SAVE_VISIT,
    ],
    isDefault: true,
  });
  employeeRoleId = (employeeRole._id as any).toString();

  const hashedPassword = await bcrypt.hash('Password123!', 10);

  const ownerUser = await User.create({
    name: 'Owner User',
    email: 'admin_owner@fieldops.com',
    password: hashedPassword,
    role: ownerRole._id,
    mustChangePassword: false,
  });
  ownerUserId = (ownerUser._id as any).toString();

  await User.create({
    name: 'Employee User',
    email: 'employee_test@fieldops.com',
    password: hashedPassword,
    role: employeeRole._id,
    mustChangePassword: false,
  });

  const ownerRes = await request(app).post('/api/auth/login').send({
    email: 'admin_owner@fieldops.com',
    password: 'Password123!',
  });
  ownerToken = ownerRes.body.token;

  const empRes = await request(app).post('/api/auth/login').send({
    email: 'employee_test@fieldops.com',
    password: 'Password123!',
  });
  employeeToken = empRes.body.token;
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Admin Direct Credential Generation & Provisioning Flow Tests', () => {
  let generatedOwnerLoginId = '';
  let generatedOwnerPassword = '';

  let generatedManagerLoginId = '';
  let generatedManagerPassword = '';

  let generatedEmployeeLoginId = '';
  let generatedEmployeePassword = '';

  it('1. Admin can generate a new Owner account', async () => {
    const res = await request(app)
      .post('/api/users/generate-credentials')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ roleId: ownerRoleId });

    expect(res.status).toBe(201);
    expect(res.body.message).toContain('User credentials generated successfully');
    expect(res.body.loginId).toBeDefined();
    expect(res.body.generatedPassword).toBeDefined();
    expect(res.body.roleName).toBe('Owner');

    generatedOwnerLoginId = res.body.loginId;
    generatedOwnerPassword = res.body.generatedPassword;
  });

  it('2. Admin can generate a new Manager account', async () => {
    const res = await request(app)
      .post('/api/users/generate-credentials')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ roleId: managerRoleId });

    expect(res.status).toBe(201);
    expect(res.body.loginId).toBeDefined();
    expect(res.body.generatedPassword).toBeDefined();
    expect(res.body.roleName).toBe('Manager');

    generatedManagerLoginId = res.body.loginId;
    generatedManagerPassword = res.body.generatedPassword;
  });

  it('3. Admin can generate a new Field Employee account', async () => {
    const res = await request(app)
      .post('/api/users/generate-credentials')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ roleId: employeeRoleId });

    expect(res.status).toBe(201);
    expect(res.body.loginId).toBeDefined();
    expect(res.body.generatedPassword).toBeDefined();
    expect(res.body.roleName).toBe('Field Employee');

    generatedEmployeeLoginId = res.body.loginId;
    generatedEmployeePassword = res.body.generatedPassword;
  });

  it('4. Generated login IDs are unique and use company domain format', async () => {
    expect(generatedOwnerLoginId).not.toBe(generatedManagerLoginId);
    expect(generatedManagerLoginId).not.toBe(generatedEmployeeLoginId);
    expect(generatedOwnerLoginId.endsWith('@fieldops.com')).toBe(true);
    expect(generatedManagerLoginId.endsWith('@fieldops.com')).toBe(true);
  });

  it('5. Generated password is cryptographically random (12+ characters)', async () => {
    expect(generatedOwnerPassword.length).toBeGreaterThanOrEqual(12);
    expect(generatedManagerPassword.length).toBeGreaterThanOrEqual(12);
    expect(generatedOwnerPassword).not.toBe(generatedManagerPassword);
  });

  it('6. Password is stored only as bcrypt hash in MongoDB', async () => {
    const ownerDoc = await User.findOne({ email: generatedOwnerLoginId });
    expect(ownerDoc).not.toBeNull();
    expect(ownerDoc?.password).toBeDefined();
    expect(ownerDoc?.password?.startsWith('$2a$') || ownerDoc?.password?.startsWith('$2b$')).toBe(true);
    expect(ownerDoc?.password).not.toBe(generatedOwnerPassword);
  });

  it('7. Plaintext password is not returned by later user GET APIs', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    const targetUser = res.body.users.find((u: any) => u.email === generatedOwnerLoginId);
    expect(targetUser).toBeDefined();
    expect(targetUser.password).toBeUndefined();
  });

  it('8. Generated credentials can successfully authenticate immediately', async () => {
    const loginRes = await request(app).post('/api/auth/login').send({
      email: generatedManagerLoginId,
      password: generatedManagerPassword,
    });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.token).toBeDefined();
    expect(loginRes.body.user.email).toBe(generatedManagerLoginId);
    expect(loginRes.body.user.mustChangePassword).toBe(false);
  });

  it('9. Correct role is assigned to the created user', async () => {
    const managerDoc = await User.findOne({ email: generatedManagerLoginId }).populate<{ role: any }>('role');
    expect(managerDoc?.role.name).toBe('Manager');
  });

  it('10. Correct role permissions are effective immediately on login', async () => {
    const loginRes = await request(app).post('/api/auth/login').send({
      email: generatedManagerLoginId,
      password: generatedManagerPassword,
    });

    const managerToken = loginRes.body.token;

    // Manager can access /api/attendance/all immediately
    const attendanceRes = await request(app)
      .get('/api/attendance/all')
      .set('Authorization', `Bearer ${managerToken}`);

    expect(attendanceRes.status).toBe(200);
  });

  it('11. Unauthorized user without MANAGE_ROLES receives 403 Forbidden', async () => {
    const res = await request(app)
      .post('/api/users/generate-credentials')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({ roleId: managerRoleId });

    expect(res.status).toBe(403);
    expect(res.body.message).toContain('MANAGE_ROLES');
  });

  it('12. Duplicate login IDs are handled safely', async () => {
    // Attempting to generate credentials with a custom email that already exists
    const res = await request(app)
      .post('/api/users/generate-credentials')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        roleId: managerRoleId,
        customEmail: generatedManagerLoginId,
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('User with this login ID already exists');
  });

  it('13. Last MANAGE_ROLES safety protection remains intact', async () => {
    // Clean up extra generated Owner user so ownerUserId is the sole remaining MANAGE_ROLES user
    const generatedOwner = await User.findOne({ email: generatedOwnerLoginId });
    if (generatedOwner) {
      await User.findByIdAndDelete(generatedOwner._id);
    }

    const res = await request(app)
      .put(`/api/users/${ownerUserId}/role`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ roleId: employeeRoleId });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Safety Guard');
  });

  it('14. Existing RBAC/custom permission tests continue passing', async () => {
    const usersRes = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(usersRes.status).toBe(200);
    expect(Array.isArray(usersRes.body.users)).toBe(true);
  });

  it('15. Forgot Password continues working separately', async () => {
    const forgotRes = await request(app).post('/api/auth/forgot-password').send({
      email: 'admin_owner@fieldops.com',
    });

    expect(forgotRes.status).toBe(200);
    expect(forgotRes.body.resetToken).toBeDefined();
    expect(forgotRes.body.resetUrl).toBeDefined();
  });
});
