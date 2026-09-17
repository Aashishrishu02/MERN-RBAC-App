import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import nodemailer from 'nodemailer';
import app from '../index';
import { Role, Permission } from '../models/Role';
import { User } from '../models/User';
import bcrypt from 'bcryptjs';

let mongoServer: MongoMemoryServer;
let ownerToken: string;
let employeeToken: string;

let ownerUserId: string;
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
    email: 'owner_prov@test.com',
    password: hashedPassword,
    role: ownerRole._id,
    mustChangePassword: false,
  });
  ownerUserId = (ownerUser._id as any).toString();

  await User.create({
    name: 'Employee User',
    email: 'employee_prov@test.com',
    password: hashedPassword,
    role: employeeRole._id,
    mustChangePassword: false,
  });

  const ownerRes = await request(app).post('/api/auth/login').send({
    email: 'owner_prov@test.com',
    password: 'Password123!',
  });
  ownerToken = ownerRes.body.token;

  const empRes = await request(app).post('/api/auth/login').send({
    email: 'employee_prov@test.com',
    password: 'Password123!',
  });
  employeeToken = empRes.body.token;
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Direct User Provisioning & Mandatory Password Change Flow Tests', () => {
  const provisionedUserEmail = 'provisioned_manager@test.com';
  let capturedTempPassword = '';

  it('1. Owner can provision an unregistered email', async () => {
    const res = await request(app)
      .post('/api/users/provision')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        email: provisionedUserEmail,
        roleId: managerRoleId,
      });

    expect(res.status).toBe(201);
    expect(res.body.message).toContain('Account created');
    expect(res.body.user.email).toBe(provisionedUserEmail);
    expect(res.body.user.mustChangePassword).toBe(true);
  });

  it('2. Unauthorized user without MANAGE_ROLES gets 403 Forbidden', async () => {
    const res = await request(app)
      .post('/api/users/provision')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({
        email: 'unauth_prov@test.com',
        roleId: managerRoleId,
      });

    expect(res.status).toBe(403);
    expect(res.body.message).toContain('MANAGE_ROLES');
  });

  it('3. User is immediately created in DB', async () => {
    const dbUser = await User.findOne({ email: provisionedUserEmail });
    expect(dbUser).not.toBeNull();
    expect(dbUser?.email).toBe(provisionedUserEmail);
  });

  it('4. Correct role is assigned upon provisioning', async () => {
    const dbUser = await User.findOne({ email: provisionedUserEmail });
    expect(dbUser?.role.toString()).toBe(managerRoleId);
  });

  it('5. Temporary password is hashed with bcrypt and never stored plaintext', async () => {
    const dbUser = await User.findOne({ email: provisionedUserEmail });
    expect(dbUser?.password).toBeDefined();
    expect(dbUser?.password?.startsWith('$2a$') || dbUser?.password?.startsWith('$2b$')).toBe(true);
    expect(dbUser?.password).not.toContain(provisionedUserEmail);
  });

  it('6. mustChangePassword=true after provisioning', async () => {
    const dbUser = await User.findOne({ email: provisionedUserEmail });
    expect(dbUser?.mustChangePassword).toBe(true);
  });

  it('7. Credential email is sent through mocked email service during provisioning', async () => {
    const sendMailMock = jest.fn().mockImplementation((options) => {
      // Capture the temporary password from text or HTML body for login testing
      const match = options.text.match(/Temporary Password: (\S+)/);
      if (match) {
        capturedTempPassword = match[1];
      }
      return Promise.resolve({ messageId: '<mocked-credential-msg-id@fieldops.com>' });
    });

    const spy = jest.spyOn(nodemailer, 'createTransport').mockReturnValue({
      sendMail: sendMailMock,
    } as any);

    process.env.SMTP_HOST = 'smtp.testprovider.com';
    process.env.SMTP_USER = 'test_user';
    process.env.SMTP_PASS = 'test_pass';

    const testEmail = 'mock_mail_provision@test.com';
    const res = await request(app)
      .post('/api/users/provision')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        email: testEmail,
        roleId: managerRoleId,
      });

    expect(res.status).toBe(201);
    expect(res.body.emailSent).toBe(true);
    expect(sendMailMock).toHaveBeenCalled();
    expect(capturedTempPassword).not.toBe('');

    delete process.env.SMTP_HOST;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;
    spy.mockRestore();
  });

  it('8. First login works with temporary password', async () => {
    const loginRes = await request(app).post('/api/auth/login').send({
      email: 'mock_mail_provision@test.com',
      password: capturedTempPassword,
    });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.token).toBeDefined();
    expect(loginRes.body.user.mustChangePassword).toBe(true);
  });

  it('9. User payload reflects mustChangePassword=true requiring password change', async () => {
    const loginRes = await request(app).post('/api/auth/login').send({
      email: 'mock_mail_provision@test.com',
      password: capturedTempPassword,
    });

    const token = loginRes.body.token;
    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.user.mustChangePassword).toBe(true);
  });

  it('10. New password changes successfully via POST /api/auth/change-temporary-password', async () => {
    const loginRes = await request(app).post('/api/auth/login').send({
      email: 'mock_mail_provision@test.com',
      password: capturedTempPassword,
    });

    const token = loginRes.body.token;

    const changeRes = await request(app)
      .post('/api/auth/change-temporary-password')
      .set('Authorization', `Bearer ${token}`)
      .send({
        currentPassword: capturedTempPassword,
        newPassword: 'NewSecurePassword123!',
      });

    expect(changeRes.status).toBe(200);
    expect(changeRes.body.message).toContain('Password changed successfully');
    expect(changeRes.body.user.mustChangePassword).toBe(false);
  });

  it('11. mustChangePassword becomes false in database after password change', async () => {
    const dbUser = await User.findOne({ email: 'mock_mail_provision@test.com' });
    expect(dbUser?.mustChangePassword).toBe(false);
  });

  it('12. New password works for subsequent login', async () => {
    const loginRes = await request(app).post('/api/auth/login').send({
      email: 'mock_mail_provision@test.com',
      password: 'NewSecurePassword123!',
    });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.token).toBeDefined();
    expect(loginRes.body.user.mustChangePassword).toBe(false);

    // Old temporary password no longer works
    const oldLoginRes = await request(app).post('/api/auth/login').send({
      email: 'mock_mail_provision@test.com',
      password: capturedTempPassword,
    });
    expect(oldLoginRes.status).toBe(401);
  });

  it('13. Already registered email cannot create duplicate user', async () => {
    const res = await request(app)
      .post('/api/users/provision')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        email: provisionedUserEmail,
        roleId: managerRoleId,
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('User already exists. Use Change Role / Manage Permissions.');
  });

  it('14. Last MANAGE_ROLES safety protection remains intact during role changes', async () => {
    const res = await request(app)
      .put(`/api/users/${ownerUserId}/role`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ roleId: employeeRoleId });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Safety Guard');
  });

  it('15. Existing RBAC/custom permission endpoints continue functioning', async () => {
    const usersRes = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(usersRes.status).toBe(200);
    expect(Array.isArray(usersRes.body.users)).toBe(true);
  });

  it('16. Google login / forgot password / normal registration continue working', async () => {
    // Forgot Password
    const forgotRes = await request(app).post('/api/auth/forgot-password').send({
      email: 'owner_prov@test.com',
    });
    expect(forgotRes.status).toBe(200);
    expect(forgotRes.body.resetToken).toBeDefined();

    // Normal Registration
    const regRes = await request(app).post('/api/auth/register').send({
      name: 'Normal Reg User',
      email: 'normal_reg_test@test.com',
      password: 'Password123!',
    });
    expect(regRes.status).toBe(201);
    expect(regRes.body.user.mustChangePassword).toBe(false);

    // Google Login Demo Mock Mode
    const googleRes = await request(app).post('/api/auth/google').send({
      idToken: 'mock_google_id_token',
    });
    expect(googleRes.status).toBe(200);
    expect(googleRes.body.user.email).toBe('employee@fieldops.com');
  });
});
