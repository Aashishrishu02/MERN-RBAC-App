import { Request, Response } from 'express';
import { User } from '../models/User';
import { Role, Permission, IRole } from '../models/Role';
import { getUserEffectivePermissions } from '../middleware/auth';

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
