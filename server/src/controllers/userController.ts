import { Request, Response } from 'express';
import { User } from '../models/User';
import { Role, Permission, IRole } from '../models/Role';
import { PendingRoleAssignment } from '../models/PendingRoleAssignment';
import { getUserEffectivePermissions, AuthRequest } from '../middleware/auth';

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

    // Clean up any stale pending role assignment for this user's email
    await PendingRoleAssignment.deleteOne({ email: targetUser.email.toLowerCase() });

    const updatedUser = await User.findById(targetUser._id)
      .select('-password -resetPasswordToken -resetPasswordExpires')
      .populate<{ role: IRole }>('role');

    const updatedEffective = getUserEffectivePermissions(updatedUser!);

    res.json({
      message: 'User role updated successfully',
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

export const createOrAssignRoleByEmail = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { email, roleId } = req.body;

    if (!email || typeof email !== 'string') {
      res.status(400).json({ message: 'Email is required' });
      return;
    }

    if (!roleId || typeof roleId !== 'string') {
      res.status(400).json({ message: 'roleId is required' });
      return;
    }

    const emailRegex = /^\S+@\S+\.\S+$/;
    const normalizedEmail = email.trim().toLowerCase();

    if (!emailRegex.test(normalizedEmail)) {
      res.status(400).json({ message: 'Invalid email format' });
      return;
    }

    const targetRole = await Role.findById(roleId);
    if (!targetRole) {
      res.status(400).json({ message: 'Target role not found' });
      return;
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: normalizedEmail }).populate<{ role: IRole }>('role');

    if (existingUser) {
      // Safety Guard if demoting existing user
      const currentEffective = getUserEffectivePermissions(existingUser);
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

      existingUser.customPermissions = undefined;
      existingUser.role = targetRole._id as any;
      await existingUser.save();

      await PendingRoleAssignment.deleteOne({ email: normalizedEmail });

      const updatedUser = await User.findById(existingUser._id)
        .select('-password -resetPasswordToken -resetPasswordExpires')
        .populate<{ role: IRole }>('role');

      const updatedEffective = getUserEffectivePermissions(updatedUser!);

      res.json({
        status: 'UPDATED',
        message: `User found. Role updated to ${targetRole.name}.`,
        user: {
          _id: updatedUser!._id,
          name: updatedUser!.name,
          email: updatedUser!.email,
          role: updatedUser!.role,
          customPermissions: updatedUser!.customPermissions || null,
          effectivePermissions: updatedEffective,
        },
      });
      return;
    }

    // If user does not exist, create or update PendingRoleAssignment
    const creatorId = req.user?.id;
    const assignment = await PendingRoleAssignment.findOneAndUpdate(
      { email: normalizedEmail },
      { role: targetRole._id, createdBy: creatorId },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    )
      .populate<{ role: IRole }>('role')
      .populate<{ name: string; email: string }>('createdBy', 'name email');

    res.status(200).json({
      status: 'PENDING',
      message: `Email verified. ${targetRole.name} role will be assigned when this user registers/logs in.`,
      assignment: {
        _id: assignment._id,
        email: assignment.email,
        role: assignment.role,
        createdBy: assignment.createdBy,
        createdAt: assignment.createdAt,
      },
    });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const getPendingRoleAssignments = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.query;
    const filter: any = {};
    if (email && typeof email === 'string') {
      filter.email = email.trim().toLowerCase();
    }

    const assignments = await PendingRoleAssignment.find(filter)
      .populate<{ role: IRole }>('role')
      .populate<{ name: string; email: string }>('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({ assignments });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const deletePendingRoleAssignment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const assignment = await PendingRoleAssignment.findByIdAndDelete(id);

    if (!assignment) {
      res.status(404).json({ message: 'Pending role assignment not found' });
      return;
    }

    res.json({ message: 'Pending role assignment removed successfully' });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

