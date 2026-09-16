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
let employeeUserId: string;
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
    email: 'owner@test.com',
    password: hashedPassword,
    role: ownerRole._id,
  });
  ownerUserId = (ownerUser._id as any).toString();

  const employeeUser = await User.create({
    name: 'Employee User',
    email: 'employee@test.com',
    password: hashedPassword,
    role: employeeRole._id,
  });
  employeeUserId = (employeeUser._id as any).toString();

  const ownerRes = await request(app).post('/api/auth/login').send({
    email: 'owner@test.com',
    password: 'Password123!',
  });
  ownerToken = ownerRes.body.token;

  const empRes = await request(app).post('/api/auth/login').send({
    email: 'employee@test.com',
    password: 'Password123!',
  });
  employeeToken = empRes.body.token;
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('User Role Assignment API Tests', () => {
  it('1. GET /api/users - Authorized user with MANAGE_ROLES can fetch user list', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.users)).toBe(true);
    expect(res.body.users.length).toBe(2);
    expect(res.body.users[0].email).toBe('owner@test.com');
  });

  it('2. GET /api/users - Unauthorized user without MANAGE_ROLES gets 403 Forbidden', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${employeeToken}`);

    expect(res.status).toBe(403);
    expect(res.body.message).toContain('MANAGE_ROLES');
  });

  it('3. PUT /api/users/:id/role - Authorized role change succeeds', async () => {
    const res = await request(app)
      .put(`/api/users/${employeeUserId}/role`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ roleId: managerRoleId });

    expect(res.status).toBe(200);
    expect(res.body.message).toContain('User role updated successfully');
    expect(res.body.user.role.name).toBe('Manager');
  });

  it('4. PUT /api/users/:id/role - Unauthorized user receives 403 Forbidden', async () => {
    const res = await request(app)
      .put(`/api/users/${employeeUserId}/role`)
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({ roleId: managerRoleId });

    expect(res.status).toBe(403);
    expect(res.body.message).toContain('MANAGE_ROLES');
  });

  it('5. PUT /api/users/:id/role - Invalid user ID yields 404 Not Found', async () => {
    const fakeUserId = new mongoose.Types.ObjectId().toString();
    const res = await request(app)
      .put(`/api/users/${fakeUserId}/role`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ roleId: managerRoleId });

    expect(res.status).toBe(404);
    expect(res.body.message).toContain('User not found');
  });

  it('6. PUT /api/users/:id/role - Invalid role ID yields 400 Bad Request', async () => {
    const fakeRoleId = new mongoose.Types.ObjectId().toString();
    const res = await request(app)
      .put(`/api/users/${employeeUserId}/role`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ roleId: fakeRoleId });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Target role not found');
  });

  it('7. PUT /api/users/:id/role - Safety Guard blocks demoting the last user with MANAGE_ROLES permission', async () => {
    // Attempting to demote ownerUser to Field Employee when ownerUser is the only user with MANAGE_ROLES
    const res = await request(app)
      .put(`/api/users/${ownerUserId}/role`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ roleId: employeeRoleId });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Safety Guard');
  });

  it('8. Dynamic Permission Revocation - Removing READ_ALL_ATTENDANCE immediately revokes active access without token refresh', async () => {
    // Create a dedicated Manager user
    const hashedPassword = await bcrypt.hash('Password123!', 10);
    await User.create({
      name: 'Manager Revoke Test',
      email: 'manager_revoke@test.com',
      password: hashedPassword,
      role: managerRoleId,
    });

    const loginRes = await request(app).post('/api/auth/login').send({
      email: 'manager_revoke@test.com',
      password: 'Password123!',
    });
    const managerRevokeToken = loginRes.body.token;

    // 1. Initial access should succeed (200)
    const initialRes = await request(app)
      .get('/api/attendance/all')
      .set('Authorization', `Bearer ${managerRevokeToken}`);
    expect(initialRes.status).toBe(200);

    // 2. Owner revokes READ_ALL_ATTENDANCE from Manager role
    const revokeRes = await request(app)
      .put(`/api/roles/${managerRoleId}/permissions`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        permissions: [
          Permission.READ_SELF_ATTENDANCE,
          Permission.READ_SELF_VISIT,
          Permission.READ_ALL_VISIT,
        ],
      });
    expect(revokeRes.status).toBe(200);

    // 3. Same token now receives 403 Forbidden without token re-issuance
    const revokedRes = await request(app)
      .get('/api/attendance/all')
      .set('Authorization', `Bearer ${managerRevokeToken}`);
    expect(revokedRes.status).toBe(403);
    expect(revokedRes.body.message).toContain('READ_ALL_ATTENDANCE');
  });

  it('9. Role Reassignment - Reassigning a user immediately grants target role permissions on subsequent API calls', async () => {
    // 1. Create a dedicated Employee user
    const hashedPassword = await bcrypt.hash('Password123!', 10);
    const empUser = await User.create({
      name: 'Promote Test Employee',
      email: 'promote_emp@test.com',
      password: hashedPassword,
      role: employeeRoleId,
    });

    const loginRes = await request(app).post('/api/auth/login').send({
      email: 'promote_emp@test.com',
      password: 'Password123!',
    });
    const empToken = loginRes.body.token;

    // 2. Initially lacks READ_ALL_VISIT (403)
    const initialRes = await request(app)
      .get('/api/visits/all')
      .set('Authorization', `Bearer ${empToken}`);
    expect(initialRes.status).toBe(403);

    // 3. Owner promotes user to Manager role
    const reassignRes = await request(app)
      .put(`/api/users/${(empUser._id as any).toString()}/role`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ roleId: managerRoleId });
    expect(reassignRes.status).toBe(200);

    // 4. Using the EXACT SAME token, subsequent API call succeeds (200)
    const promotedRes = await request(app)
      .get('/api/visits/all')
      .set('Authorization', `Bearer ${empToken}`);
    expect(promotedRes.status).toBe(200);
  });
});
