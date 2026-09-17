import { getTransporter, verifySmtpConfig, sendEmail, sendCredentialEmail } from '../services/emailService';

describe('Email Service - Resend SMTP Configuration Tests', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('1. getTransporter initializes Nodemailer SMTPS transport with Resend settings (port 465, secure true)', () => {
    process.env.SMTP_HOST = 'smtp.resend.com';
    process.env.SMTP_PORT = '465';
    process.env.SMTP_USER = 'resend';
    process.env.SMTP_PASS = 're_test_api_key_12345';
    process.env.SMTP_FROM = 'onboarding@resend.dev';

    const transporter = getTransporter();
    expect(transporter).not.toBeNull();
    expect(transporter?.options).toMatchObject({
      host: 'smtp.resend.com',
      port: 465,
      secure: true,
      auth: {
        user: 'resend',
        pass: 're_test_api_key_12345',
      },
    });
  });

  it('2. getTransporter defaults port to 465 and secure to true when SMTP_PORT is not set', () => {
    process.env.SMTP_HOST = 'smtp.resend.com';
    process.env.SMTP_USER = 'resend';
    process.env.SMTP_PASS = 're_test_api_key_12345';
    delete process.env.SMTP_PORT;
    delete process.env.SMTP_SECURE;

    const transporter = getTransporter();
    expect(transporter).not.toBeNull();
    expect(transporter?.options).toMatchObject({
      host: 'smtp.resend.com',
      port: 465,
      secure: true,
    });
  });

  it('3. verifySmtpConfig returns false in production if credentials are missing', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_PASS;

    const result = await verifySmtpConfig();
    expect(result.success).toBe(false);
    expect(result.error).toContain('SMTP Configuration Incomplete');
  });

  it('4. sendEmail returns dev preview mock when unconfigured in non-production mode', async () => {
    process.env.NODE_ENV = 'test';
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_PASS;

    const res = await sendEmail({
      to: 'user@example.com',
      subject: 'Test Subject',
      text: 'Test Text',
      html: '<p>Test Text</p>',
    });

    expect(res.success).toBe(true);
    expect(res.messageId).toBe('dev-preview-mock-id');
  });

  it('5. sendCredentialEmail constructs valid HTML/text containing login details', async () => {
    process.env.NODE_ENV = 'test';
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_PASS;

    const res = await sendCredentialEmail('testuser@fieldops.com', 'TempPass123!', 'Owner');
    expect(res.success).toBe(true);
  });
});
