import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../index';
import { Role, Permission } from '../models/Role';
import { User } from '../models/User';
import { PendingRoleAssignment } from '../models/PendingRoleAssignment';
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
    expect(res.body.message).toContain('Role updated');
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

  describe('Individual User Permission Override Tests', () => {
    let customUserToken: string;
    let customUserId: string;

    beforeAll(async () => {
      const hashedPassword = await bcrypt.hash('Password123!', 10);
      const customUser = await User.create({
        name: 'Custom Perm Employee',
        email: 'custom_perm@test.com',
        password: hashedPassword,
        role: employeeRoleId,
      });
      customUserId = (customUser._id as any).toString();

      const loginRes = await request(app).post('/api/auth/login').send({
        email: 'custom_perm@test.com',
        password: 'Password123!',
      });
      customUserToken = loginRes.body.token;
    });

    it('10. GET /api/users/:id/permissions - Authorized user can retrieve user permissions structure', async () => {
      const res = await request(app)
        .get(`/api/users/${customUserId}/permissions`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.userId).toBe(customUserId);
      expect(Array.isArray(res.body.rolePermissions)).toBe(true);
      expect(res.body.customPermissions).toBeNull();
      expect(Array.isArray(res.body.effectivePermissions)).toBe(true);
    });

    it('11. GET /api/users/:id/permissions - Unauthorized user receives 403 Forbidden', async () => {
      const res = await request(app)
        .get(`/api/users/${customUserId}/permissions`)
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('MANAGE_ROLES');
    });

    it('12. PUT /api/users/:id/permissions - Directly granting READ_ALL_ATTENDANCE grants access immediately', async () => {
      // Initially customUser (Field Employee) gets 403 for /api/attendance/all
      const initialRes = await request(app)
        .get('/api/attendance/all')
        .set('Authorization', `Bearer ${customUserToken}`);
      expect(initialRes.status).toBe(403);

      // Owner grants READ_ALL_ATTENDANCE to customUser specifically
      const grantRes = await request(app)
        .put(`/api/users/${customUserId}/permissions`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          permissions: [
            Permission.READ_SELF_ATTENDANCE,
            Permission.CLOCK_IN_OUT,
            Permission.READ_SELF_VISIT,
            Permission.SAVE_VISIT,
            Permission.READ_ALL_ATTENDANCE,
          ],
        });
      expect(grantRes.status).toBe(200);
      expect(grantRes.body.user.customPermissions).toContain(Permission.READ_ALL_ATTENDANCE);

      // Now customUser can access /api/attendance/all with the SAME token
      const grantedRes = await request(app)
        .get('/api/attendance/all')
        .set('Authorization', `Bearer ${customUserToken}`);
      expect(grantedRes.status).toBe(200);
    });

    it('13. PUT /api/users/:id/permissions - Directly revoking CLOCK_IN_OUT revokes access immediately', async () => {
      // Revoke CLOCK_IN_OUT from customUser
      const revokeRes = await request(app)
        .put(`/api/users/${customUserId}/permissions`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          permissions: [Permission.READ_SELF_ATTENDANCE],
        });
      expect(revokeRes.status).toBe(200);

      // customUser attempts to clock in -> receives 403 Forbidden
      const clockInRes = await request(app)
        .post('/api/attendance/clock-in')
        .set('Authorization', `Bearer ${customUserToken}`)
        .send({});
      expect(clockInRes.status).toBe(403);
      expect(clockInRes.body.message).toContain('CLOCK_IN_OUT');
    });

    it('14. PUT /api/users/:id/permissions - Invalid permission values return 400 Bad Request', async () => {
      const res = await request(app)
        .put(`/api/users/${customUserId}/permissions`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          permissions: ['SUPER_ADMIN_INVALID_PERMISSION'],
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Invalid permission');
    });

    it('15. PUT /api/users/:id/permissions - Safety Guard blocks revoking MANAGE_ROLES from last manager', async () => {
      // Attempting to remove MANAGE_ROLES from ownerUser
      const res = await request(app)
        .put(`/api/users/${ownerUserId}/permissions`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          permissions: [Permission.READ_ALL_ATTENDANCE],
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Safety Guard');
    });
  });

  describe('Pre-assign Role by Email (Pending Role Assignment) Tests', () => {
    it('16. POST /api/users/role-assignment - Owner can pre-assign role for nonexistent email', async () => {
      const res = await request(app)
        .post('/api/users/role-assignment')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          email: '  ErPrinceJhaa@gmail.com  ',
          roleId: managerRoleId,
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('PENDING');
      expect(res.body.message).toContain('Role assigned');
      expect(res.body.assignment.email).toBe('erprincejhaa@gmail.com');
    });

    it('17. POST /api/users/role-assignment - Unauthorized user gets 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/users/role-assignment')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          email: 'unauthorized_test@gmail.com',
          roleId: managerRoleId,
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('MANAGE_ROLES');
    });

    it('18. POST /api/users/role-assignment - Existing registered user gets role updated immediately', async () => {
      const res = await request(app)
        .post('/api/users/role-assignment')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          email: 'employee@test.com',
          roleId: managerRoleId,
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('UPDATED');
      expect(res.body.message).toContain('User found. Role updated');
      expect(res.body.user.role.name).toBe('Manager');
    });

    it('19. POST /api/users/role-assignment - Invalid email format is rejected with 400 Bad Request', async () => {
      const res = await request(app)
        .post('/api/users/role-assignment')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          email: 'not-an-email',
          roleId: managerRoleId,
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Invalid email format');
    });

    it('20. POST /api/users/role-assignment - Non-existent role ID returns 400 Bad Request', async () => {
      const fakeRoleId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .post('/api/users/role-assignment')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          email: 'valid_email@test.com',
          roleId: fakeRoleId,
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Target role not found');
    });

    it('21. Standard Registration - Consumes pending role assignment and grants role immediately', async () => {
      // 1. Create pending role assignment for future registrant
      await request(app)
        .post('/api/users/role-assignment')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          email: 'future_manager@test.com',
          roleId: managerRoleId,
        });

      // 2. User registers without specifying roleId
      const regRes = await request(app).post('/api/auth/register').send({
        name: 'Future Manager User',
        email: 'Future_Manager@test.com',
        password: 'Password123!',
      });

      expect(regRes.status).toBe(201);
      expect(regRes.body.user.role.name).toBe('Manager');

      // 3. User immediately has Manager permissions (e.g. READ_ALL_VISIT)
      const visitRes = await request(app)
        .get('/api/visits/all')
        .set('Authorization', `Bearer ${regRes.body.token}`);
      expect(visitRes.status).toBe(200);

      // 4. Pending assignment is deleted/consumed
      const pendingRes = await request(app)
        .get('/api/users/role-assignment?email=future_manager@test.com')
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(pendingRes.body.assignments.length).toBe(0);
    });

    it('22. Google Login Flow - Consumes pending role assignment for new Google user', async () => {
      // 1. Pre-assign Manager role to mock Google email
      await request(app)
        .post('/api/users/role-assignment')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          email: 'employee@fieldops.com',
          roleId: managerRoleId,
        });

      // 2. User logs in with Google mock token
      const googleRes = await request(app).post('/api/auth/google').send({
        idToken: 'mock_google_id_token',
      });

      expect(googleRes.status).toBe(200);
      expect(googleRes.body.user.role.name).toBe('Manager');

      // 3. Pending assignment is consumed
      const pendingRes = await request(app)
        .get('/api/users/role-assignment?email=employee@fieldops.com')
        .set('Authorization', `Bearer ${ownerToken}`);
      expect(pendingRes.body.assignments.length).toBe(0);
    });

    it('23. DELETE /api/users/role-assignment/:id - Unauthorized user gets 403 Forbidden', async () => {
      // Create pending assignment
      const createRes = await request(app)
        .post('/api/users/role-assignment')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          email: 'to_delete@test.com',
          roleId: employeeRoleId,
        });

      const assignmentId = createRes.body.assignment._id;

      const deleteRes = await request(app)
        .delete(`/api/users/role-assignment/${assignmentId}`)
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(deleteRes.status).toBe(403);
      expect(deleteRes.body.message).toContain('MANAGE_ROLES');
    });

    it('24. DELETE /api/users/role-assignment/:id - Owner can cancel pending role assignment', async () => {
      const createRes = await request(app)
        .post('/api/users/role-assignment')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          email: 'to_cancel@test.com',
          roleId: employeeRoleId,
        });

      const assignmentId = createRes.body.assignment._id;

      const deleteRes = await request(app)
        .delete(`/api/users/role-assignment/${assignmentId}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.message).toContain('removed successfully');
    });

    it('25. POST /api/users/:id/reset-role - Resets user role to default role and clears custom permissions', async () => {
      // Create user with custom permissions
      const hashedPassword = await bcrypt.hash('Password123!', 10);
      const userToReset = await User.create({
        name: 'Reset Role Test User',
        email: 'reset_role_test@test.com',
        password: hashedPassword,
        role: managerRoleId,
        customPermissions: [Permission.MANAGE_ROLES],
      });
      const userId = (userToReset._id as any).toString();

      const res = await request(app)
        .post(`/api/users/${userId}/reset-role`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toContain('Role reset to default');
      expect(res.body.user.role.name).toBe('Field Employee');
      expect(res.body.user.customPermissions).toBeNull();
    });

    it('26. Invitation token is securely stored as SHA-256 hash in database', async () => {
      const createRes = await request(app)
        .post('/api/users/role-assignment')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          email: 'secure_token_test@test.com',
          roleId: managerRoleId,
        });

      expect(createRes.status).toBe(200);
      const assignmentDoc = await PendingRoleAssignment.findOne({ email: 'secure_token_test@test.com' });
      expect(assignmentDoc).not.toBeNull();
      expect(assignmentDoc?.tokenHash).toBeDefined();
      expect(assignmentDoc?.tokenHash?.length).toBe(64); // SHA-256 hash length in hex
    });

    it('27. GET /api/users/invite/verify - Verifies valid invitation token', async () => {
      // Create pending role assignment manually with known token
      const rawToken = 'test_raw_invitation_token_12345';
      const tokenHash = require('crypto').createHash('sha256').update(rawToken).digest('hex');

      await PendingRoleAssignment.create({
        email: 'token_verify_test@test.com',
        role: managerRoleId,
        createdBy: ownerUserId,
        tokenHash,
        expiresAt: new Date(Date.now() + 600000),
      });

      const verifyRes = await request(app).get(`/api/users/invite/verify?token=${rawToken}`);
      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.valid).toBe(true);
      expect(verifyRes.body.email).toBe('token_verify_test@test.com');
      expect(verifyRes.body.roleName).toBe('Manager');
    });

    it('28. GET /api/users/invite/verify - Rejects invalid or expired invitation token', async () => {
      const res = await request(app).get('/api/users/invite/verify?token=invalid_token_99999');
      expect(res.status).toBe(400);
      expect(res.body.valid).toBe(false);
      expect(res.body.message).toContain('Invalid or expired');
    });

    it('29. POST /api/users/:id/reset-role - Unauthorized user gets 403 Forbidden', async () => {
      const res = await request(app)
        .post(`/api/users/${employeeUserId}/reset-role`)
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('MANAGE_ROLES');
    });

    it('30. POST /api/users/:id/reset-role - Safety Guard blocks removing role from last MANAGE_ROLES user', async () => {
      const res = await request(app)
        .post(`/api/users/${ownerUserId}/reset-role`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Safety Guard');
    });

    it('31. Nodemailer Transporter - Mocked transporter successfully captures email dispatch and messageId', async () => {
      const nodemailer = require('nodemailer');
      const sendMailMock = jest.fn().mockResolvedValue({ messageId: '<mock-msg-id-12345@fieldops.com>' });
      const spy = jest.spyOn(nodemailer, 'createTransport').mockReturnValue({
        sendMail: sendMailMock,
      } as any);

      process.env.SMTP_HOST = 'smtp.testprovider.com';
      process.env.SMTP_PORT = '587';
      process.env.SMTP_USER = 'test_user';
      process.env.SMTP_PASS = 'test_pass';

      const res = await request(app)
        .post('/api/users/role-assignment')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          email: 'mocked_smtp_test@test.com',
          roleId: managerRoleId,
        });

      expect(res.status).toBe(200);
      expect(res.body.emailSent).toBe(true);
      expect(sendMailMock).toHaveBeenCalled();

      // Cleanup env
      delete process.env.SMTP_HOST;
      delete process.env.SMTP_USER;
      delete process.env.SMTP_PASS;
      spy.mockRestore();
    });

    it('32. SMTP Failure Handling - Reports emailSent: false when transporter fails', async () => {
      const nodemailer = require('nodemailer');
      const sendMailMock = jest.fn().mockRejectedValue(new Error('Connection refused to SMTP server'));
      const spy = jest.spyOn(nodemailer, 'createTransport').mockReturnValue({
        sendMail: sendMailMock,
      } as any);

      process.env.SMTP_HOST = 'smtp.testprovider.com';
      process.env.SMTP_USER = 'test_user';
      process.env.SMTP_PASS = 'test_pass';

      const res = await request(app)
        .post('/api/users/role-assignment')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          email: 'smtp_fail_test@test.com',
          roleId: managerRoleId,
        });

      expect(res.status).toBe(200);
      expect(res.body.emailSent).toBe(false);
      expect(res.body.message).toContain('email could not be sent');

      delete process.env.SMTP_HOST;
      delete process.env.SMTP_USER;
      delete process.env.SMTP_PASS;
      spy.mockRestore();
    });

    it('33. Production SMTP Configuration - Missing credentials in production environment reports clear error', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      delete process.env.SMTP_HOST;
      delete process.env.SMTP_USER;
      delete process.env.SMTP_PASS;

      const { sendRoleAssignmentEmail } = require('../services/emailService');
      const result = await sendRoleAssignmentEmail('prod_test@test.com', 'Prod User', 'Manager');

      expect(result.success).toBe(false);
      expect(result.error).toContain('SMTP credentials');

      process.env.NODE_ENV = originalEnv;
    });

    it('34. DELETE /api/users/:id - Unauthorized user gets 403 Forbidden', async () => {
      const res = await request(app)
        .delete(`/api/users/${employeeUserId}`)
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toContain('MANAGE_ROLES');
    });

    it('35. DELETE /api/users/:id - Safety Guard blocks deleting last MANAGE_ROLES user', async () => {
      const res = await request(app)
        .delete(`/api/users/${ownerUserId}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Safety Guard');
    });

    it('36. DELETE /api/users/:id - Successfully permanently deletes target registered user from MongoDB', async () => {
      // Create temporary user to delete
      const tempUser = await User.create({
        name: 'Temp Delete User',
        email: 'temp_delete@test.com',
        password: 'Password123!',
        role: employeeRoleId,
      });

      const deleteRes = await request(app)
        .delete(`/api/users/${tempUser._id}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.message).toContain('permanently deleted');

      // Verify user no longer exists in database
      const deletedCheck = await User.findById(tempUser._id);
      expect(deletedCheck).toBeNull();

      // Verify deleted user cannot authenticate
      const authRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'temp_delete@test.com', password: 'Password123!' });
      expect(authRes.status).toBe(401);
    });
  });
});
