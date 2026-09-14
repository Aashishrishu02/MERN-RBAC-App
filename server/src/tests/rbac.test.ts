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
let managerRoleId: string;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  // Seed roles
  const ownerRole = await Role.create({
    name: 'Owner',
    permissions: Object.values(Permission),
  });
  ownerRoleId = (ownerRole._id as any).toString();

  const managerRole = await Role.create({
    name: 'Manager',
    permissions: [
      Permission.READ_SELF_ATTENDANCE,
      Permission.READ_ALL_ATTENDANCE,
      Permission.READ_SELF_VISIT,
      Permission.READ_ALL_VISIT,
    ],
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

describe('FieldOps RBAC & Permission Enforcement Unit Tests', () => {
  it('1. Authentication - Invalid login credentials should return 401', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'owner@test.com',
      password: 'WrongPassword!',
    });
    expect(res.status).toBe(401);
    expect(res.body.message).toContain('Invalid credentials');
  });

  it('2. RBAC - Field Employee accessing role management (/api/roles) should be FORBIDDEN (403)', async () => {
    const res = await request(app)
      .get('/api/roles')
      .set('Authorization', `Bearer ${employeeToken}`);
    expect(res.status).toBe(403);
    expect(res.body.message).toContain('MANAGE_ROLES');
  });

  it('3. RBAC - Owner accessing role management (/api/roles) should succeed (200)', async () => {
    const res = await request(app)
      .get('/api/roles')
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.roles)).toBe(true);
    expect(res.body.roles.length).toBeGreaterThanOrEqual(3);
  });

  it('4. Attendance - Field Employee can clock in (has CLOCK_IN_OUT permission)', async () => {
    const res = await request(app)
      .post('/api/attendance/clock-in')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({ note: 'Starting field shift' });
    expect(res.status).toBe(201);
    expect(res.body.attendance.status).toBe('CLOCKED_IN');
  });

  it('5. Attendance - Manager attempting to clock in is FORBIDDEN (lacks CLOCK_IN_OUT permission initially)', async () => {
    const res = await request(app)
      .post('/api/attendance/clock-in')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ note: 'Manager shift' });
    expect(res.status).toBe(403);
    expect(res.body.message).toContain('CLOCK_IN_OUT');
  });

  it('6. Dynamic Permissions - Owner dynamically adds CLOCK_IN_OUT permission to Manager role', async () => {
    const updateRes = await request(app)
      .put(`/api/roles/${managerRoleId}/permissions`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        permissions: [
          Permission.READ_SELF_ATTENDANCE,
          Permission.READ_ALL_ATTENDANCE,
          Permission.READ_SELF_VISIT,
          Permission.READ_ALL_VISIT,
          Permission.CLOCK_IN_OUT,
        ],
      });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.role.permissions).toContain(Permission.CLOCK_IN_OUT);

    const clockInRes = await request(app)
      .post('/api/attendance/clock-in')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ note: 'Manager shift after permission update' });
    expect(clockInRes.status).toBe(201);
    expect(clockInRes.body.attendance.status).toBe('CLOCKED_IN');
  });

  it('7. Owner Safety Guard - Revoking MANAGE_ROLES from Owner role should be rejected (400)', async () => {
    const res = await request(app)
      .put(`/api/roles/${ownerRoleId}/permissions`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        permissions: [Permission.READ_SELF_ATTENDANCE], // MANAGE_ROLES omitted!
      });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Safety Guard');
  });
});
