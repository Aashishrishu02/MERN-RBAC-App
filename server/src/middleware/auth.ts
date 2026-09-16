import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { IRole } from '../models/Role';

export interface AuthRequest<
  P = Record<string, any>,
  ResBody = any,
  ReqBody = any,
  ReqQuery = Record<string, any>
> extends Request<P, ResBody, ReqBody, ReqQuery> {
  user?: {
    id: string;
    email: string;
    name: string;
    role: {
      id: string;
      name: string;
    };
    permissions: string[];
  };
}

export const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('FATAL: MING_JWT_SECRET - JWT_SECRET environment variable must be set in production!');
    }
    return 'dev_only_super_secret_jwt_key_fieldops_2026';
  }
  return secret;
};

export const getUserEffectivePermissions = (user: { role: IRole; customPermissions?: string[] }): string[] => {
  if (Array.isArray(user.customPermissions)) {
    return user.customPermissions;
  }
  const roleDoc = user.role as IRole;
  return roleDoc?.permissions || [];
};

export const authenticateToken = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      res.status(401).json({ message: 'Unauthorized: Access token missing' });
      return;
    }

    const secret = getJwtSecret();
    const decoded = jwt.verify(token, secret) as { id: string };

    const user = await User.findById(decoded.id).populate<{ role: IRole }>('role');

    if (!user || !user.role) {
      res.status(401).json({ message: 'Unauthorized: User or role invalid' });
      return;
    }

    const roleDoc = user.role as IRole;
    const effectivePermissions = getUserEffectivePermissions(user);

    req.user = {
      id: (user._id as any).toString(),
      email: user.email,
      name: user.name,
      role: {
        id: (roleDoc._id as any).toString(),
        name: roleDoc.name,
      },
      permissions: effectivePermissions,
    };

    next();
  } catch (error) {
    res.status(401).json({ message: 'Unauthorized: Invalid or expired token' });
  }
};

export const checkPermission = (requiredPermission: string) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: 'Unauthorized: Authentication required' });
      return;
    }

    const hasAccess = req.user.permissions.includes(requiredPermission);

    if (!hasAccess) {
      res.status(403).json({
        message: `Forbidden: You do not have the required permission (${requiredPermission})`,
        requiredPermission,
      });
      return;
    }

    next();
  };
};
