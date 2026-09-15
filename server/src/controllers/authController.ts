import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import { User } from '../models/User';
import { Role, IRole } from '../models/Role';
import { AuthRequest, getJwtSecret } from '../middleware/auth';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const generateToken = (userId: string): string => {
  const secret = getJwtSecret();
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  return jwt.sign({ id: userId }, secret, { expiresIn: expiresIn as any });
};

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, roleId } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({ message: 'Name, email, and password are required' });
      return;
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      res.status(400).json({ message: 'User with this email already exists' });
      return;
    }

    let targetRoleId = roleId;
    if (!targetRoleId) {
      const defaultRole = await Role.findOne({ isDefault: true });
      if (!defaultRole) {
        res.status(500).json({ message: 'Default role not found. Please run seed script.' });
        return;
      }
      targetRoleId = defaultRole._id;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: targetRoleId,
    });

    const populatedUser = await User.findById(newUser._id).populate<{ role: IRole }>('role');
    const roleDoc = populatedUser?.role as IRole;
    const token = generateToken((newUser._id as any).toString());

    res.status(201).json({
      token,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: {
          id: roleDoc._id,
          name: roleDoc.name,
        },
        permissions: roleDoc.permissions || [],
      },
    });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ message: 'Email and password are required' });
      return;
    }

    const user = await User.findOne({ email: email.toLowerCase() }).populate<{ role: IRole }>('role');
    if (!user || !user.password) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    const roleDoc = user.role as IRole;
    const token = generateToken((user._id as any).toString());

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: {
          id: roleDoc._id,
          name: roleDoc.name,
        },
        permissions: roleDoc.permissions || [],
      },
    });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const googleLogin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      res.status(400).json({ message: 'Google ID token is required' });
      return;
    }

    let verifiedEmail: string;
    let verifiedName: string;
    let verifiedGoogleId: string;

    // Developer Mock Mode support when running in local development mode
    if (idToken === 'mock_google_id_token' && process.env.NODE_ENV !== 'production') {
      verifiedEmail = 'employee@fieldops.com';
      verifiedName = 'Sam Employee (Google Demo)';
      verifiedGoogleId = 'google_demo_mock_sub_123';
    } else {
      const clientId = process.env.GOOGLE_CLIENT_ID;
      if (!clientId || clientId === 'your_google_client_id_here.apps.googleusercontent.com') {
        res.status(400).json({
          message: 'Google Client ID is not configured on the server. Please set GOOGLE_CLIENT_ID in .env.',
        });
        return;
      }

      // Verify Google ID Token against OAuth2Client
      const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: clientId,
      });

      const payload = ticket.getPayload();
      if (!payload || !payload.email) {
        res.status(400).json({ message: 'Invalid Google token payload: Email missing' });
        return;
      }

      verifiedEmail = payload.email.toLowerCase();
      verifiedName = payload.name || payload.email.split('@')[0];
      verifiedGoogleId = payload.sub;
    }

    // Retrieve or create user based strictly on cryptographically verified email
    let existingUser = await User.findOne({ email: verifiedEmail });

    if (!existingUser) {
      const defaultRole = await Role.findOne({ isDefault: true });
      if (!defaultRole) {
        res.status(500).json({ message: 'Default role not found for Google login. Run seed script.' });
        return;
      }

      existingUser = await User.create({
        name: verifiedName,
        email: verifiedEmail,
        googleId: verifiedGoogleId,
        role: defaultRole._id,
      });
    }

    const user = await User.findById(existingUser._id).populate<{ role: IRole }>('role');
    if (!user) {
      res.status(500).json({ message: 'Failed to retrieve user after Google auth' });
      return;
    }

    const roleDoc = user.role as IRole;
    const token = generateToken((user._id as any).toString());

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: {
          id: roleDoc._id,
          name: roleDoc.name,
        },
        permissions: roleDoc.permissions || [],
      },
    });
  } catch (error) {
    res.status(401).json({ message: `Google authentication failed: ${(error as Error).message}` });
  }
};

export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ message: 'Email is required' });
      return;
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      res.status(404).json({ message: 'User with this email does not exist' });
      return;
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await user.save();

    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const resetUrl = `${clientUrl}/reset-password?token=${resetToken}`;

    res.json({
      message: 'Password reset link generated successfully',
      resetToken,
      resetUrl,
    });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      res.status(400).json({ message: 'Token and new password are required' });
      return;
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
      res.status(400).json({ message: 'Invalid or expired password reset token' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    res.json({ message: 'Password reset successful. You can now log in with your new password.' });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ message: 'Not authenticated' });
      return;
    }

    res.json({
      user: req.user,
    });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};
