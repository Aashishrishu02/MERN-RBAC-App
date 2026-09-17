import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../index';
import { Role, Permission } from '../models/Role';
import { User } from '../models/User';
import bcrypt from 'bcryptjs';

let mongoServer: MongoMemoryServer;
let ownerToken: string;
let managerToken: string;
let employeeToken: string;

let ownerRoleId: string;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
let managerRoleId: string;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  // 1. Seed Roles based on Final Business Permission Matrix
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

  const hashedPassword = await bcrypt.hash('Password123!', 10);

  await User.create({
    name: 'Owner Test',
    email: 'owner@test.com',
    password: hashedPassword,
    role: ownerRole._id,
  });

  await User.create({
    name: 'Manager Test',
    email: 'manager@test.com',
    password: hashedPassword,
    role: managerRole._id,
  });

  await User.create({
    name: 'Employee Test',
    email: 'employee@test.com',
    password: hashedPassword,
    role: employeeRole._id,
  });

  // Get login tokens
  const ownerRes = await request(app).post('/api/auth/login').send({
    email: 'owner@test.com',
    password: 'Password123!',
  });
  ownerToken = ownerRes.body.token;

  const managerRes = await request(app).post('/api/auth/login').send({
    email: 'manager@test.com',
    password: 'Password123!',
  });
  managerToken = managerRes.body.token;

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

describe('FieldOps RBAC & Permission Matrix Enforcement Unit Tests', () => {
  it('1. Authentication - Invalid login credentials return 401', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'owner@test.com',
      password: 'WrongPassword!',
    });
    expect(res.status).toBe(401);
    expect(res.body.message).toContain('Invalid credentials');
  });

  // Scenario A: Owner Capabilities
  describe('Scenario A: Owner Role Enforcement', () => {
    it('Owner CANNOT clock in/out (lacks CLOCK_IN_OUT) -> 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/attendance/clock-in')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ note: 'Owner shift' });
      expect(res.status).toBe(403);
      expect(res.body.message).toContain('CLOCK_IN_OUT');
    });

    it('Owner CAN view all team attendance (has READ_ALL_ATTENDANCE) -> 200 OK', async () => {
      const res = await request(app)
        .get('/api/attendance/all')
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.attendance)).toBe(true);
    });

    it('Owner CAN view all team visits (has READ_ALL_VISIT) -> 200 OK', async () => {
      const res = await request(app)
        .get('/api/visits/all')
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.visits)).toBe(true);
    });

    it('Owner CAN manage roles (has MANAGE_ROLES) -> 200 OK', async () => {
      const res = await request(app)
        .get('/api/roles')
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.roles)).toBe(true);
    });
  });

  // Scenario B: Manager Capabilities
  describe('Scenario B: Manager Role Enforcement', () => {
    it('Manager CAN clock in/out (has CLOCK_IN_OUT) -> 201 Created', async () => {
      const res = await request(app)
        .post('/api/attendance/clock-in')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ note: 'Manager shift start' });
      expect(res.status).toBe(201);
      expect(res.body.attendance.status).toBe('CLOCKED_IN');
    });

    it('Manager CAN view own attendance (has READ_SELF_ATTENDANCE) -> 200 OK', async () => {
      const res = await request(app)
        .get('/api/attendance/my')
        .set('Authorization', `Bearer ${managerToken}`);
      expect(res.status).toBe(200);
    });

    it('Manager CAN view all team attendance (has READ_ALL_ATTENDANCE) -> 200 OK', async () => {
      const res = await request(app)
        .get('/api/attendance/all')
        .set('Authorization', `Bearer ${managerToken}`);
      expect(res.status).toBe(200);
    });

    it('Manager CAN view own visits (has READ_SELF_VISIT) -> 200 OK', async () => {
      const res = await request(app)
        .get('/api/visits/my')
        .set('Authorization', `Bearer ${managerToken}`);
      expect(res.status).toBe(200);
    });

    it('Manager CAN view all team visits (has READ_ALL_VISIT) -> 200 OK', async () => {
      const res = await request(app)
        .get('/api/visits/all')
        .set('Authorization', `Bearer ${managerToken}`);
      expect(res.status).toBe(200);
    });

    it('Manager CAN save visits (has SAVE_VISIT) -> 201 Created', async () => {
      const res = await request(app)
        .post('/api/visits')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          customerName: 'Acme Retail HQ',
          purpose: 'Quarterly review',
          outcome: 'Deal extended',
          locationAddress: '100 Main St',
        });
      expect(res.status).toBe(201);
    });

    it('Manager CANNOT manage roles (lacks MANAGE_ROLES) -> 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/roles')
        .set('Authorization', `Bearer ${managerToken}`);
      expect(res.status).toBe(403);
      expect(res.body.message).toContain('MANAGE_ROLES');
    });
  });

  // Scenario C: Field Employee Capabilities
  describe('Scenario C: Field Employee Role Enforcement', () => {
    it('Field Employee CAN clock in/out (has CLOCK_IN_OUT) -> 201 Created', async () => {
      const res = await request(app)
        .post('/api/attendance/clock-in')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ note: 'Field employee shift start' });
      expect(res.status).toBe(201);
      expect(res.body.attendance.status).toBe('CLOCKED_IN');
    });

    it('Field Employee CAN view own attendance (has READ_SELF_ATTENDANCE) -> 200 OK', async () => {
      const res = await request(app)
        .get('/api/attendance/my')
        .set('Authorization', `Bearer ${employeeToken}`);
      expect(res.status).toBe(200);
    });

    it('Field Employee CAN view own visits (has READ_SELF_VISIT) -> 200 OK', async () => {
      const res = await request(app)
        .get('/api/visits/my')
        .set('Authorization', `Bearer ${employeeToken}`);
      expect(res.status).toBe(200);
    });

    it('Field Employee CAN save visits (has SAVE_VISIT) -> 201 Created', async () => {
      const res = await request(app)
        .post('/api/visits')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          customerName: 'Metro Store 12',
          purpose: 'Stock audit',
          outcome: 'Completed',
          locationAddress: '55 Park Ave',
        });
      expect(res.status).toBe(201);
    });

    it('Field Employee CANNOT view all attendance (lacks READ_ALL_ATTENDANCE) -> 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/attendance/all')
        .set('Authorization', `Bearer ${employeeToken}`);
      expect(res.status).toBe(403);
      expect(res.body.message).toContain('READ_ALL_ATTENDANCE');
    });

    it('Field Employee CANNOT view all visits (lacks READ_ALL_VISIT) -> 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/visits/all')
        .set('Authorization', `Bearer ${employeeToken}`);
      expect(res.status).toBe(403);
      expect(res.body.message).toContain('READ_ALL_VISIT');
    });

    it('Field Employee CANNOT manage roles (lacks MANAGE_ROLES) -> 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/roles')
        .set('Authorization', `Bearer ${employeeToken}`);
      expect(res.status).toBe(403);
      expect(res.body.message).toContain('MANAGE_ROLES');
    });
  });

  // Dynamic Mutation & Safety Guards
  describe('Dynamic Permission Mutation & Safety Guards', () => {
    it('Dynamic Mutation - Owner grants CLOCK_IN_OUT to Owner role dynamically -> Owner can now clock in', async () => {
      const updateRes = await request(app)
        .put(`/api/roles/${ownerRoleId}/permissions`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          permissions: [
            Permission.READ_ALL_ATTENDANCE,
            Permission.READ_ALL_VISIT,
            Permission.MANAGE_ROLES,
            Permission.CLOCK_IN_OUT,
          ],
        });
      expect(updateRes.status).toBe(200);

      const clockInRes = await request(app)
        .post('/api/attendance/clock-in')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ note: 'Owner shift after granted permission' });
      expect(clockInRes.status).toBe(201);
    });

    it('Safety Guard - Revoking MANAGE_ROLES from the last active role is rejected (400)', async () => {
      const res = await request(app)
        .put(`/api/roles/${ownerRoleId}/permissions`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          permissions: [Permission.READ_ALL_ATTENDANCE], // MANAGE_ROLES omitted!
        });
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Safety Guard');
    });
  });
});
