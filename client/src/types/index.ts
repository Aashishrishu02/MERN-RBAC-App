export enum Permission {
  READ_SELF_ATTENDANCE = 'READ_SELF_ATTENDANCE',
  READ_ALL_ATTENDANCE = 'READ_ALL_ATTENDANCE',
  CLOCK_IN_OUT = 'CLOCK_IN_OUT',
  READ_SELF_VISIT = 'READ_SELF_VISIT',
  READ_ALL_VISIT = 'READ_ALL_VISIT',
  SAVE_VISIT = 'SAVE_VISIT',
  MANAGE_ROLES = 'MANAGE_ROLES',
}

export interface Role {
  _id: string;
  name: string;
  description?: string;
  permissions: string[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: {
    id: string;
    name: string;
  };
  permissions: string[];
  mustChangePassword?: boolean;
}

export interface UserListItem {
  _id: string;
  name: string;
  email: string;
  role: Role | { _id: string; name: string };
  customPermissions?: string[] | null;
  effectivePermissions?: string[];
  createdAt?: string;
}

export interface UserPermissionsResponse {
  userId: string;
  rolePermissions: string[];
  customPermissions: string[] | null;
  effectivePermissions: string[];
}

export interface PendingRoleAssignmentItem {
  _id: string;
  email: string;
  role: Role | { _id: string; name: string };
  createdBy?: { _id: string; name: string; email: string } | string;
  createdAt: string;
}

export interface Attendance {
  _id: string;
  userId: {
    _id: string;
    name: string;
    email: string;
  } | string;
  clockIn: string;
  clockOut?: string;
  status: 'CLOCKED_IN' | 'CLOCKED_OUT';
  note?: string;
  createdAt: string;
}

export interface Visit {
  _id: string;
  userId: {
    _id: string;
    name: string;
    email: string;
  } | string;
  customerName: string;
  purpose: string;
  outcome: string;
  locationAddress: string;
  visitDate: string;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}
