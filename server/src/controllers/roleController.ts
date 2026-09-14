import { Request, Response } from 'express';
import { Role, Permission } from '../models/Role';

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

    // Priority 4 Safety Guard: Owner role cannot revoke MANAGE_ROLES from itself
    if (targetRole.name === 'Owner' && !permissions.includes(Permission.MANAGE_ROLES)) {
      res.status(400).json({
        message: 'Safety Guard: The Owner role must retain the MANAGE_ROLES permission to prevent system lockout.',
      });
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
