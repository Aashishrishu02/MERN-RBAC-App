import nodemailer from 'nodemailer';

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export const getTransporter = () => {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const secureEnv = process.env.SMTP_SECURE;
  const secure = secureEnv === 'true' || (secureEnv !== 'false' && port === 465);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
  });
};

export const verifySmtpConfig = async (): Promise<{ success: boolean; error?: string }> => {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const secureEnv = process.env.SMTP_SECURE;
  const secure = secureEnv === 'true' || (secureEnv !== 'false' && port === 465);
  const user = process.env.SMTP_USER;
  const fromAddress = process.env.SMTP_FROM || process.env.EMAIL_FROM || user || 'noreply@fieldops.com';

  if (!host || !user || !process.env.SMTP_PASS) {
    const msg = `SMTP Configuration Incomplete: Host=${host || 'undefined'}, Port=${port}, Secure=${secure}, User=${user || 'undefined'}, From=${fromAddress}`;
    if (process.env.NODE_ENV === 'production') {
      console.error(`[SMTP Startup Diagnostic] ${msg}`);
      return { success: false, error: msg };
    }
    console.log(`[SMTP Startup Diagnostic] Dev mode: Real SMTP disabled (${msg})`);
    return { success: true };
  }

  try {
    const transporter = getTransporter();
    if (!transporter) {
      return { success: false, error: 'Failed to initialize Nodemailer transporter' };
    }

    await transporter.verify();
    console.log(`[SMTP Startup Diagnostic] SMTP Connection verified successfully. Host: ${host}, Port: ${port}, Secure: ${secure}, User: ${user}, From: ${fromAddress}`);
    return { success: true };
  } catch (err: any) {
    const errCode = err.code ? ` (Code: ${err.code})` : '';
    const errResp = err.response ? ` | Response: ${err.response}` : '';
    console.error(`[SMTP Startup Diagnostic Error] Failed to verify SMTP connection to ${host}:${port}${errCode} - ${err.message}${errResp}`);
    return { success: false, error: err.message };
  }
};

export const sendEmail = async (options: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<SendEmailResult> => {
  try {
    const transporter = getTransporter();
    const host = process.env.SMTP_HOST || 'unconfigured';
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const secureEnv = process.env.SMTP_SECURE;
    const secure = secureEnv === 'true' || (secureEnv !== 'false' && port === 465);
    const user = process.env.SMTP_USER;
    const fromAddress = process.env.SMTP_FROM || process.env.EMAIL_FROM || user || 'noreply@fieldops.com';

    if (!transporter) {
      if (process.env.NODE_ENV === 'production') {
        const errorMsg = 'SMTP credentials (SMTP_HOST, SMTP_USER, SMTP_PASS) are missing or incomplete in production environment.';
        console.error(`[SMTP Production Error] Delivery blocked for ${options.to}: ${errorMsg}`);
        return {
          success: false,
          error: errorMsg,
        };
      } else {
        console.log(`[Dev Mail Preview] To: ${options.to} | Subject: ${options.subject}`);
        console.log(`[Dev Mail Text]: ${options.text}`);
        return { success: true, messageId: 'dev-preview-mock-id' };
      }
    }

    console.log(`[SMTP Attempt] Host: ${host}, Port: ${port}, Secure: ${secure}, User: ${user ? user : 'unconfigured'}, From: ${fromAddress}, To: ${options.to}`);

    const info = await transporter.sendMail({
      from: `"FieldOps System" <${fromAddress}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });

    console.log(`[SMTP Success] Email accepted for delivery to ${options.to}. MessageId: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    const code = error.code ? `Code: ${error.code}` : '';
    const command = error.command ? `Command: ${error.command}` : '';
    const response = error.response ? `Response: ${error.response}` : '';
    const diagDetails = [code, command, response, error.message].filter(Boolean).join(' | ');

    console.error(`[SMTP Delivery Failure] Target: ${options.to} | Host: ${process.env.SMTP_HOST}:${process.env.SMTP_PORT} | ${diagDetails}`);
    return {
      success: false,
      error: error.message || 'Failed to transmit email notification via SMTP.',
    };
  }
};

export const sendRoleAssignmentEmail = async (
  email: string,
  name: string,
  roleName: string
): Promise<SendEmailResult> => {
  const subject = 'Your FieldOps role has been updated';
  const text = `Hello ${name},

Your FieldOps account role has been updated by an administrator.

New role: ${roleName}

Please log in to access your updated permissions.

Regards,
FieldOps Team`;

  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
      <h2 style="color: #0f172a;">FieldOps Role Update Notification</h2>
      <p>Hello <strong>${name}</strong>,</p>
      <p>Your FieldOps account role has been updated by an administrator.</p>
      <div style="background: #f1f5f9; padding: 12px 16px; border-radius: 6px; font-weight: bold; margin: 15px 0;">
        New Role: <span style="color: #4f46e5;">${roleName}</span>
      </div>
      <p>Please log in to your account to view your updated permissions.</p>
      <br/>
      <p>Regards,<br/><strong>FieldOps Team</strong></p>
    </div>
  `;

  return sendEmail({ to: email, subject, text, html });
};

export const sendRoleInvitationEmail = async (
  email: string,
  roleName: string,
  inviteToken: string
): Promise<SendEmailResult> => {
  const frontendUrl =
    process.env.FRONTEND_URL ||
    process.env.CLIENT_URL ||
    'https://mern-rbac-app-sand.vercel.app';
  const inviteLink = `${frontendUrl.replace(/\/+$/, '')}/register?invite=${inviteToken}`;
  const subject = "You've been invited to FieldOps";

  const text = `Hello,

An administrator has pre-assigned the ${roleName} role to your email address (${email}) on FieldOps.

Please click the link below to complete your account registration and access your permissions:
${inviteLink}

This invitation link is valid for 7 days.

Regards,
FieldOps Team`;

  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
      <h2 style="color: #0f172a;">You've Been Invited to FieldOps</h2>
      <p>Hello,</p>
      <p>An administrator has pre-assigned the <strong>${roleName}</strong> role to your email address (<code>${email}</code>) on FieldOps.</p>
      <p>Click the button below to complete your registration and claim your assigned permissions:</p>
      <div style="margin: 20px 0;">
        <a href="${inviteLink}" style="background: #0f172a; color: #ffffff; padding: 12px 20px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">
          Accept Invitation & Register
        </a>
      </div>
      <p style="font-size: 0.85em; color: #64748b;">Or copy this link into your browser: <br/><a href="${inviteLink}">${inviteLink}</a></p>
      <br/>
      <p>Regards,<br/><strong>FieldOps Team</strong></p>
    </div>
  `;

  return sendEmail({ to: email, subject, text, html });
};

export const sendRoleRemovalEmail = async (
  email: string,
  name: string,
  defaultRoleName: string
): Promise<SendEmailResult> => {
  const subject = 'Your FieldOps role has been updated';
  const text = `Hello ${name},

Your FieldOps account role has been updated by an administrator.

New role: ${defaultRoleName}

Please log in to access your updated permissions.

Regards,
FieldOps Team`;

  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
      <h2 style="color: #0f172a;">FieldOps Role Update Notification</h2>
      <p>Hello <strong>${name}</strong>,</p>
      <p>Your FieldOps account role has been updated by an administrator.</p>
      <div style="background: #f1f5f9; padding: 12px 16px; border-radius: 6px; font-weight: bold; margin: 15px 0;">
        New Role: <span style="color: #4f46e5;">${defaultRoleName}</span>
      </div>
      <p>Please log in to your account to view your updated permissions.</p>
      <br/>
      <p>Regards,<br/><strong>FieldOps Team</strong></p>
    </div>
  `;

  return sendEmail({ to: email, subject, text, html });
};

export const sendCredentialEmail = async (
  email: string,
  tempPassword: string,
  roleName: string
): Promise<SendEmailResult> => {
  const frontendUrl =
    process.env.FRONTEND_URL ||
    process.env.CLIENT_URL ||
    'https://mern-rbac-app-sand.vercel.app';
  const loginUrl = `${frontendUrl.replace(/\/+$/, '')}/login`;
  const subject = 'Your FieldOps account has been created';

  const text = `Welcome to FieldOps!

Your FieldOps account has been created by an administrator.

Login Details:
- Login Email: ${email}
- Temporary Password: ${tempPassword}
- Assigned Role: ${roleName}
- Login URL: ${loginUrl}

You must change your temporary password after first login.

Regards,
FieldOps Team`;

  const html = `
    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
      <h2 style="color: #0f172a;">Welcome to FieldOps!</h2>
      <p>Your FieldOps account has been created by an administrator.</p>
      <div style="background: #f1f5f9; padding: 16px; border-radius: 6px; margin: 15px 0;">
        <p style="margin: 4px 0;"><strong>Login Email:</strong> ${email}</p>
        <p style="margin: 4px 0;"><strong>Temporary Password:</strong> <code style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px;">${tempPassword}</code></p>
        <p style="margin: 4px 0;"><strong>Assigned Role:</strong> <span style="color: #4f46e5; font-weight: bold;">${roleName}</span></p>
        <p style="margin: 4px 0;"><strong>Login URL:</strong> <a href="${loginUrl}">${loginUrl}</a></p>
      </div>
      <p style="color: #dc2626; font-weight: bold;">You must change your temporary password after first login.</p>
      <div style="margin: 20px 0;">
        <a href="${loginUrl}" style="background: #0f172a; color: #ffffff; padding: 12px 20px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">
          Log In Now
        </a>
      </div>
      <br/>
      <p>Regards,<br/><strong>FieldOps Team</strong></p>
    </div>
  `;

  return sendEmail({ to: email, subject, text, html });
};

