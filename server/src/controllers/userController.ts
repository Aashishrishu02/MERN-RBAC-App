import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { Request, Response } from 'express';
import { User } from '../models/User';
import { Role, Permission, IRole } from '../models/Role';
import { getUserEffectivePermissions, AuthRequest } from '../middleware/auth';
import {
  sendRoleAssignmentEmail,
  sendRoleRemovalEmail,
  sendCredentialEmail,
} from '../services/emailService';

export const getUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const users = await User.find()
      .select('-password -resetPasswordToken -resetPasswordExpires')
      .populate<{ role: IRole }>('role')
      .sort({ createdAt: 1 });

    const formattedUsers = users.map((u) => {
      const effectivePermissions = getUserEffectivePermissions(u);
      return {
        _id: u._id,
        name: u.name,
        email: u.email,
        role: u.role,
        customPermissions: u.customPermissions || null,
        effectivePermissions,
        createdAt: u.createdAt,
      };
    });

    res.json({ users: formattedUsers });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const updateUserRole = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { roleId } = req.body;

    if (!roleId) {
      res.status(400).json({ message: 'roleId is required' });
      return;
    }

    const targetUser = await User.findById(id).populate<{ role: IRole }>('role');
    if (!targetUser) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const targetRole = await Role.findById(roleId);
    if (!targetRole) {
      res.status(400).json({ message: 'Target role not found' });
      return;
    }

    // Safety Guard: Check if demoting target user would leave zero users with MANAGE_ROLES permission
    const currentEffective = getUserEffectivePermissions(targetUser);
    const currentUserHasManageRoles = currentEffective.includes(Permission.MANAGE_ROLES);
    const newRoleHasManageRoles = targetRole.permissions?.includes(Permission.MANAGE_ROLES);

    if (currentUserHasManageRoles && !newRoleHasManageRoles) {
      const allUsers = await User.find().populate<{ role: IRole }>('role');
      const manageRolesCount = allUsers.filter((u) =>
        getUserEffectivePermissions(u).includes(Permission.MANAGE_ROLES)
      ).length;

      if (manageRolesCount <= 1) {
        res.status(400).json({
          message:
            'Safety Guard: Cannot demote the last remaining user with MANAGE_ROLES permission to prevent system lockout.',
        });
        return;
      }
    }

    // Reset customPermissions on role re-assignment so user adopts new role permissions
    targetUser.customPermissions = undefined;
    targetUser.role = targetRole._id as any;
    await targetUser.save();

    const updatedUser = await User.findById(targetUser._id)
      .select('-password -resetPasswordToken -resetPasswordExpires')
      .populate<{ role: IRole }>('role');

    const updatedEffective = getUserEffectivePermissions(updatedUser!);

    const emailResult = await sendRoleAssignmentEmail(targetUser.email, targetUser.name, targetRole.name);

    res.json({
      message: emailResult.success
        ? `Role updated to ${targetRole.name} and notification email sent.`
        : `Role updated to ${targetRole.name}, but email notification could not be sent.`,
      emailSent: emailResult.success,
      user: {
        _id: updatedUser!._id,
        name: updatedUser!.name,
        email: updatedUser!.email,
        role: updatedUser!.role,
        customPermissions: updatedUser!.customPermissions || null,
        effectivePermissions: updatedEffective,
      },
    });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const resetUserRole = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const targetUser = await User.findById(id).populate<{ role: IRole }>('role');
    if (!targetUser) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const defaultRole = await Role.findOne({ isDefault: true });
    if (!defaultRole) {
      res.status(500).json({ message: 'Default role not found. Run seed script.' });
      return;
    }

    // Safety Guard: Check if demoting target user would leave zero users with MANAGE_ROLES permission
    const currentEffective = getUserEffectivePermissions(targetUser);
    const currentUserHasManageRoles = currentEffective.includes(Permission.MANAGE_ROLES);
    const newRoleHasManageRoles = defaultRole.permissions?.includes(Permission.MANAGE_ROLES);

    if (currentUserHasManageRoles && !newRoleHasManageRoles) {
      const allUsers = await User.find().populate<{ role: IRole }>('role');
      const manageRolesCount = allUsers.filter((u) =>
        getUserEffectivePermissions(u).includes(Permission.MANAGE_ROLES)
      ).length;

      if (manageRolesCount <= 1) {
        res.status(400).json({
          message:
            'Safety Guard: Cannot reset the last remaining user with MANAGE_ROLES permission to default role.',
        });
        return;
      }
    }

    targetUser.customPermissions = undefined;
    targetUser.role = defaultRole._id as any;
    await targetUser.save();

    const updatedUser = await User.findById(targetUser._id)
      .select('-password -resetPasswordToken -resetPasswordExpires')
      .populate<{ role: IRole }>('role');

    const updatedEffective = getUserEffectivePermissions(updatedUser!);

    const emailResult = await sendRoleRemovalEmail(targetUser.email, targetUser.name, defaultRole.name);

    res.json({
      message: emailResult.success
        ? `Role reset to default (${defaultRole.name}) and notification email sent.`
        : `Role reset to default (${defaultRole.name}), but notification email could not be sent.`,
      emailSent: emailResult.success,
      user: {
        _id: updatedUser!._id,
        name: updatedUser!.name,
        email: updatedUser!.email,
        role: updatedUser!.role,
        customPermissions: updatedUser!.customPermissions || null,
        effectivePermissions: updatedEffective,
      },
    });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const targetUser = await User.findById(id).populate<{ role: IRole }>('role');
    if (!targetUser) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Safety Guard: Check if deleting target user would leave zero users with MANAGE_ROLES permission
    const currentEffective = getUserEffectivePermissions(targetUser);
    const currentUserHasManageRoles = currentEffective.includes(Permission.MANAGE_ROLES);

    if (currentUserHasManageRoles) {
      const allUsers = await User.find().populate<{ role: IRole }>('role');
      const manageRolesCount = allUsers.filter((u) =>
        getUserEffectivePermissions(u).includes(Permission.MANAGE_ROLES)
      ).length;

      if (manageRolesCount <= 1) {
        res.status(400).json({
          message:
            'Safety Guard: Cannot delete the last remaining user with MANAGE_ROLES permission to prevent system lockout.',
        });
        return;
      }
    }

    // Delete user account permanently from MongoDB
    await User.findByIdAndDelete(id);

    res.json({
      message: `User ${targetUser.name} (${targetUser.email}) permanently deleted.`,
    });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const getUserPermissions = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const targetUser = await User.findById(id).populate<{ role: IRole }>('role');

    if (!targetUser) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const roleDoc = targetUser.role as IRole;
    const rolePermissions = roleDoc?.permissions || [];
    const effectivePermissions = getUserEffectivePermissions(targetUser);

    res.json({
      userId: targetUser._id,
      userName: targetUser.name,
      userEmail: targetUser.email,
      role: {
        id: roleDoc?._id,
        name: roleDoc?.name,
      },
      rolePermissions,
      customPermissions: targetUser.customPermissions || null,
      effectivePermissions,
      availablePermissions: Object.values(Permission),
    });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const updateUserPermissions = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { permissions } = req.body;

    if (!Array.isArray(permissions)) {
      res.status(400).json({ message: 'Permissions must be an array of string permissions' });
      return;
    }

    const validPermissions = Object.values(Permission);
    const invalidPermissions = permissions.filter((p: string) => !validPermissions.includes(p as Permission));

    if (invalidPermissions.length > 0) {
      res.status(400).json({
        message: `Invalid permissions provided: ${invalidPermissions.join(', ')}`,
      });
      return;
    }

    const targetUser = await User.findById(id).populate<{ role: IRole }>('role');
    if (!targetUser) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const currentEffective = getUserEffectivePermissions(targetUser);
    const currentHasManageRoles = currentEffective.includes(Permission.MANAGE_ROLES);
    const newHasManageRoles = permissions.includes(Permission.MANAGE_ROLES);

    // Safety Guard: Lockout check preventing removal of MANAGE_ROLES from last active user
    if (currentHasManageRoles && !newHasManageRoles) {
      const allUsers = await User.find().populate<{ role: IRole }>('role');
      const manageRolesCount = allUsers.filter((u) =>
        getUserEffectivePermissions(u).includes(Permission.MANAGE_ROLES)
      ).length;

      if (manageRolesCount <= 1) {
        res.status(400).json({
          message:
            'Safety Guard: Cannot revoke MANAGE_ROLES permission because it would leave no active users capable of managing roles.',
        });
        return;
      }
    }

    targetUser.customPermissions = permissions;
    await targetUser.save();

    const updatedUser = await User.findById(targetUser._id)
      .select('-password -resetPasswordToken -resetPasswordExpires')
      .populate<{ role: IRole }>('role');

    const updatedEffective = getUserEffectivePermissions(updatedUser!);

    res.json({
      message: 'User permissions updated successfully',
      user: {
        _id: updatedUser!._id,
        name: updatedUser!.name,
        email: updatedUser!.email,
        role: updatedUser!.role,
        customPermissions: updatedUser!.customPermissions || null,
        effectivePermissions: updatedEffective,
      },
    });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const generateSecurePassword = (length = 14): string => {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const digits = '23456789';
  const symbols = '@#$%&*!';
  const allChars = upper + lower + digits + symbols;

  let password = '';
  password += upper[crypto.randomInt(0, upper.length)];
  password += lower[crypto.randomInt(0, lower.length)];
  password += digits[crypto.randomInt(0, digits.length)];
  password += symbols[crypto.randomInt(0, symbols.length)];

  for (let i = password.length; i < length; i++) {
    password += allChars[crypto.randomInt(0, allChars.length)];
  }

  const arr = password.split('');
  for (let i = arr.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.join('');
};

export const provisionUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { email, roleId, name } = req.body;

    if (!email || typeof email !== 'string' || !email.trim()) {
      res.status(400).json({ message: 'Email address is required' });
      return;
    }

    if (!roleId || typeof roleId !== 'string' || !roleId.trim()) {
      res.status(400).json({ message: 'roleId is required' });
      return;
    }

    const trimmedRoleId = roleId.trim();
    if (!mongoose.Types.ObjectId.isValid(trimmedRoleId)) {
      res.status(400).json({ message: 'Invalid role ID format' });
      return;
    }

    const emailRegex = /^\S+@\S+\.\S+$/;
    const normalizedEmail = email.trim().toLowerCase();

    if (!emailRegex.test(normalizedEmail)) {
      res.status(400).json({ message: 'Invalid email address format' });
      return;
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      res.status(400).json({
        message: 'User already exists with this email address.',
      });
      return;
    }

    const targetRole = await Role.findById(trimmedRoleId);
    if (!targetRole) {
      res.status(400).json({ message: 'Target role not found' });
      return;
    }

    // Generate cryptographically secure temporary password (14 chars)
    const tempPassword = generateSecurePassword(14);
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(tempPassword, salt);

    const userName = name && typeof name === 'string' && name.trim()
      ? name.trim()
      : normalizedEmail.split('@')[0];

    const newUser = await User.create({
      name: userName,
      email: normalizedEmail,
      password: hashedPassword,
      role: targetRole._id,
      mustChangePassword: false,
    });

    const populatedUser = await User.findById(newUser._id)
      .select('-password -resetPasswordToken -resetPasswordExpires')
      .populate<{ role: IRole }>('role');

    // Send credentials via email
    const emailResult = await sendCredentialEmail(normalizedEmail, tempPassword, targetRole.name);

    if (process.env.NODE_ENV === 'production' && !emailResult.success) {
      // In production, delete user if email delivery failed
      await User.findByIdAndDelete(newUser._id);
      res.status(500).json({
        message: `Failed to transmit credential email to ${normalizedEmail}. ${emailResult.error || 'SMTP delivery failed.'}`,
        emailSent: false,
      });
      return;
    }

    res.status(201).json({
      message: emailResult.success
        ? `Account created and login credentials sent to ${normalizedEmail}.`
        : `Account created for ${normalizedEmail} (dev preview mode).`,
      emailSent: emailResult.success,
      loginId: normalizedEmail,
      generatedPassword: tempPassword,
      roleName: targetRole.name,
      user: {
        _id: populatedUser!._id,
        name: populatedUser!.name,
        email: populatedUser!.email,
        role: populatedUser!.role,
        mustChangePassword: false,
      },
    });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const generateCredentials = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { roleId, customEmail } = req.body;

    if (!roleId || typeof roleId !== 'string' || !roleId.trim()) {
      res.status(400).json({ message: 'roleId is required' });
      return;
    }

    const trimmedRoleId = roleId.trim();
    if (!mongoose.Types.ObjectId.isValid(trimmedRoleId)) {
      res.status(400).json({ message: 'Invalid role ID format' });
      return;
    }

    const targetRole = await Role.findById(trimmedRoleId);
    if (!targetRole) {
      res.status(400).json({ message: 'Target role not found' });
      return;
    }

    let loginId = '';

    if (customEmail && typeof customEmail === 'string' && customEmail.trim()) {
      const normalized = customEmail.trim().toLowerCase();
      const emailRegex = /^\S+@\S+\.\S+$/;
      if (!emailRegex.test(normalized)) {
        res.status(400).json({ message: 'Invalid custom email format' });
        return;
      }

      const existingUser = await User.findOne({ email: normalized });
      if (existingUser) {
        res.status(400).json({ message: 'User with this login ID already exists' });
        return;
      }
      loginId = normalized;
    } else {
      const rawDomain = process.env.COMPANY_DOMAIN || 'fieldops.com';
      const companyDomain = rawDomain.replace(/^@/, '').trim().toLowerCase() || 'fieldops.com';
      const roleSlug = (targetRole.name || 'user').toLowerCase().replace(/[^a-z0-9]/g, '') || 'user';
      let isUnique = false;
      let attempts = 0;

      while (!isUnique && attempts < 10) {
        attempts++;
        const hex = crypto.randomBytes(2).toString('hex').toUpperCase();
        loginId = `${roleSlug}-${hex}@${companyDomain}`.toLowerCase();
        const existing = await User.findOne({ email: loginId });
        if (!existing) {
          isUnique = true;
        }
      }

      if (!isUnique) {
        res.status(500).json({ message: 'Failed to generate a unique login ID. Please try again.' });
        return;
      }
    }

    const generatedPassword = generateSecurePassword(14);
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(generatedPassword, salt);

    const userName = `${targetRole.name} User (${loginId.split('@')[0]})`;

    const newUser = await User.create({
      name: userName,
      email: loginId,
      password: hashedPassword,
      role: targetRole._id,
      mustChangePassword: false,
    });

    const populatedUser = await User.findById(newUser._id)
      .select('-password -resetPasswordToken -resetPasswordExpires')
      .populate<{ role: IRole }>('role');

    res.status(201).json({
      message: 'User credentials generated successfully.',
      loginId,
      generatedPassword,
      roleName: targetRole.name,
      user: {
        _id: populatedUser!._id,
        name: populatedUser!.name,
        email: populatedUser!.email,
        role: populatedUser!.role,
        mustChangePassword: false,
      },
    });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};




