import { Request, Response } from 'express';
import { Role, Permission, IRole } from '../models/Role';
import { User } from '../models/User';

export const getRoles = async (req: Request, res: Response): Promise<void> => {
  try {
    const roles = await Role.find().sort({ createdAt: 1 });
    const availablePermissions = Object.values(Permission);

    res.json({
      roles,
      availablePermissions,
    });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const updateRolePermissions = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { permissions } = req.body;

    if (!Array.isArray(permissions)) {
      res.status(400).json({ message: 'Permissions must be an array of string permissions' });
      return;
    }

    const targetRole = await Role.findById(id);
    if (!targetRole) {
      res.status(404).json({ message: 'Role not found' });
      return;
    }

    // Safety Guard: Check if removing MANAGE_ROLES from targetRole would leave zero users with MANAGE_ROLES capability
    const targetCurrentlyHasManageRoles = targetRole.permissions.includes(Permission.MANAGE_ROLES);
    const newHasManageRoles = permissions.includes(Permission.MANAGE_ROLES);

    if (targetCurrentlyHasManageRoles && !newHasManageRoles) {
      const allUsers = await User.find().populate<{ role: IRole }>('role');
      const remainingManageRolesUsers = allUsers.filter((u) => {
        const userRoleId = (u.role as IRole)?._id?.toString();
        if (userRoleId === targetRole._id.toString()) {
          return false;
        }
        return (u.role as IRole)?.permissions?.includes(Permission.MANAGE_ROLES);
      });

      if (remainingManageRolesUsers.length === 0) {
        res.status(400).json({
          message: 'Safety Guard: Cannot remove MANAGE_ROLES permission from this role because it would leave no active users capable of managing roles.',
        });
        return;
      }
    }

    const validPermissions = Object.values(Permission);
    const invalidPermissions = permissions.filter((p: string) => !validPermissions.includes(p as Permission));

    if (invalidPermissions.length > 0) {
      res.status(400).json({
        message: `Invalid permissions provided: ${invalidPermissions.join(', ')}`,
      });
      return;
    }

    targetRole.permissions = permissions;
    await targetRole.save();

    res.json({
      message: 'Role permissions updated successfully',
      role: targetRole,
    });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};

export const createRole = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, description, permissions } = req.body;

    if (!name) {
      res.status(400).json({ message: 'Role name is required' });
      return;
    }

    const existing = await Role.findOne({ name });
    if (existing) {
      res.status(400).json({ message: 'Role with this name already exists' });
      return;
    }

    const role = await Role.create({
      name,
      description: description || '',
      permissions: permissions || [],
    });

    res.status(201).json({
      message: 'Role created successfully',
      role,
    });
  } catch (error) {
    res.status(500).json({ message: (error as Error).message });
  }
};
