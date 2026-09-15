import { Request, Response } from 'express';
import { User } from '../models/User';
import { Role, Permission, IRole } from '../models/Role';

export const getUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const users = await User.find()
      .select('-password -resetPasswordToken -resetPasswordExpires')
      .populate<{ role: IRole }>('role')
      .sort({ createdAt: 1 });

    res.json({ users });
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
    const currentRole = targetUser.role as IRole;
    const currentUserHasManageRoles = currentRole && currentRole.permissions?.includes(Permission.MANAGE_ROLES);
    const newRoleHasManageRoles = targetRole.permissions?.includes(Permission.MANAGE_ROLES);

    if (currentUserHasManageRoles && !newRoleHasManageRoles) {
      // Count total users currently holding a role with MANAGE_ROLES permission
      const allUsers = await User.find().populate<{ role: IRole }>('role');
      const manageRolesCount = allUsers.filter(
        (u) => (u.role as IRole)?.permissions?.includes(Permission.MANAGE_ROLES)
      ).length;

      if (manageRolesCount <= 1) {
        res.status(400).json({
          message:
            'Safety Guard: Cannot demote the last remaining user with MANAGE_ROLES permission to prevent system lockout.',
        });
        return;
      }
    }

    targetUser.role = targetRole._id as any;
    await targetUser.save();

    const updatedUser = await User.findById(targetUser._id)
      .select('-password -resetPasswordToken -resetPasswordExpires')
      .populate<{ role: IRole }>('role');

    res.json({
      message: 'User role updated successfully',
      user: updatedUser,
    });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};
