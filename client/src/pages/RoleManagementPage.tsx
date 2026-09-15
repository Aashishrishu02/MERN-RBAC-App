import React, { useEffect, useState } from 'react';
import { ShieldAlert, Save, Info, Users, UserCheck } from 'lucide-react';
import { roleService, userService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Navbar } from '../components/Navbar';
import { Role, Permission, UserListItem } from '../types';

export const RoleManagementPage: React.FC = () => {
  const { user: currentUser, refreshUser } = useAuth();
  const [roles, setRoles] = useState<Role[]>([]);
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [availablePermissions, setAvailablePermissions] = useState<string[]>([]);
  const [rolePermissionsState, setRolePermissionsState] = useState<Record<string, string[]>>({});
  const [selectedUserRoles, setSelectedUserRoles] = useState<Record<string, string>>({});
  
  const [savingRoleId, setSavingRoleId] = useState<string | null>(null);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchRolesData = async () => {
    try {
      const data = await roleService.getRoles();
      setRoles(data.roles);
      setAvailablePermissions(data.availablePermissions);

      const stateMap: Record<string, string[]> = {};
      data.roles.forEach((r) => {
        stateMap[r._id] = [...r.permissions];
      });
      setRolePermissionsState(stateMap);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch roles and permissions.');
    }
  };

  const fetchUsersData = async () => {
    try {
      const data = await userService.getUsers();
      setUsers(data.users);

      const userRolesMap: Record<string, string> = {};
      data.users.forEach((u) => {
        const roleId = typeof u.role === 'object' && u.role !== null ? u.role._id : u.role;
        userRolesMap[u._id] = roleId || '';
      });
      setSelectedUserRoles(userRolesMap);
    } catch (err: any) {
      console.error('Failed to fetch users:', err);
    }
  };

  useEffect(() => {
    fetchRolesData();
    fetchUsersData();
  }, []);

  const handleTogglePermission = (role: Role, permission: string) => {
    // Safety Guard: Prevent removing MANAGE_ROLES if it is the only role possessing MANAGE_ROLES permission
    if (permission === Permission.MANAGE_ROLES) {
      const currentPerms = rolePermissionsState[role._id] || role.permissions || [];
      const isRemoving = currentPerms.includes(Permission.MANAGE_ROLES);

      if (isRemoving) {
        const rolesWithManageRolesCount = roles.filter((r) => {
          const perms = rolePermissionsState[r._id] || r.permissions || [];
          return perms.includes(Permission.MANAGE_ROLES);
        }).length;

        if (rolesWithManageRolesCount <= 1) {
          setError('Safety Guard: At least one role must retain the MANAGE_ROLES permission to prevent system lockout.');
          return;
        }
      }
    }

    setRolePermissionsState((prev) => {
      const currentList = prev[role._id] || [];
      const hasPerm = currentList.includes(permission);
      const updatedList = hasPerm
        ? currentList.filter((p) => p !== permission)
        : [...currentList, permission];

      return {
        ...prev,
        [role._id]: updatedList,
      };
    });
  };

  const handleSavePermissions = async (roleId: string, roleName: string) => {
    setSavingRoleId(roleId);
    setError('');
    setSuccess('');

    try {
      const updatedPermissions = rolePermissionsState[roleId] || [];
      await roleService.updateRolePermissions(roleId, updatedPermissions);
      setSuccess(`Permissions updated for ${roleName}!`);
      await refreshUser(); // Sync current session permissions instantly
      await fetchRolesData();
    } catch (err: any) {
      setError(err.response?.data?.message || `Failed to update permissions for ${roleName}.`);
    } finally {
      setSavingRoleId(null);
    }
  };

  const handleUserRoleChangeSelect = (userId: string, newRoleId: string) => {
    setSelectedUserRoles((prev) => ({
      ...prev,
      [userId]: newRoleId,
    }));
  };

  const handleSaveUserRole = async (targetUser: UserListItem) => {
    const newRoleId = selectedUserRoles[targetUser._id];
    if (!newRoleId) return;

    setUpdatingUserId(targetUser._id);
    setError('');
    setSuccess('');

    try {
      const res = await userService.updateUserRole(targetUser._id, newRoleId);
      const assignedRoleName =
        typeof res.user.role === 'object' && res.user.role !== null ? res.user.role.name : 'new role';
      setSuccess(`Updated role for ${targetUser.name} to ${assignedRoleName}.`);

      // If updating current logged in user's role, refresh session immediately
      if (currentUser?.id === targetUser._id) {
        await refreshUser();
      }

      await fetchUsersData();
    } catch (err: any) {
      setError(err.response?.data?.message || `Failed to update role for ${targetUser.name}.`);
    } finally {
      setUpdatingUserId(null);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-app)' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Navbar title="Role & Access Control Management" />

        <div className="main-content">
          <div style={{ marginBottom: '1.75rem' }}>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldAlert size={22} color="#0f172a" /> Role & Access Control Configurator
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.35rem', maxWidth: '750px', margin: 0 }}>
              Manage registered user role assignments and dynamically configure granular permission matrix per role across the system.
            </p>
          </div>

          {error && (
            <div className="alert alert-danger" style={{ marginBottom: '1.25rem' }}>
              {error}
            </div>
          )}

          {success && (
            <div className="alert alert-success" style={{ marginBottom: '1.25rem' }}>
              {success}
            </div>
          )}

          {/* Section 1: Registered User Role Assignment */}
          <div className="saas-card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
            <div style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Users size={18} color="#0f172a" />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                User Role Management
              </h3>
            </div>

            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Email</th>
                    <th>Current Role</th>
                    <th>Assigned Role</th>
                    <th style={{ textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                        No registered users found.
                      </td>
                    </tr>
                  ) : (
                    users.map((u) => {
                      const currentRoleObj = typeof u.role === 'object' && u.role !== null ? u.role : null;
                      const currentRoleId = currentRoleObj ? currentRoleObj._id : String(u.role || '');
                      const currentRoleName = currentRoleObj ? currentRoleObj.name : 'Unassigned';
                      const selectedRoleId = selectedUserRoles[u._id] || currentRoleId;
                      const isRoleChanged = selectedRoleId !== currentRoleId;

                      return (
                        <tr key={u._id}>
                          <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                            {u.name}
                            {currentUser?.id === u._id && (
                              <span style={{ marginLeft: '0.5rem', fontSize: '0.7rem', background: '#e0e7ff', color: '#3730a3', padding: '0.15rem 0.4rem', borderRadius: '4px', fontWeight: 600 }}>
                                (You)
                              </span>
                            )}
                          </td>
                          <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{u.email}</td>
                          <td>
                            {(() => {
                              const rolePerms = currentRoleObj && 'permissions' in currentRoleObj ? (currentRoleObj.permissions as string[]) : [];
                              const hasAdminPerm = rolePerms.includes(Permission.MANAGE_ROLES);
                              const hasTeamPerm = rolePerms.includes(Permission.READ_ALL_ATTENDANCE);
                              return (
                                <span style={{
                                  padding: '0.25rem 0.6rem',
                                  borderRadius: '4px',
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  background: hasAdminPerm ? '#faf5ff' : hasTeamPerm ? '#eef2ff' : '#ecfdf5',
                                  color: hasAdminPerm ? '#6b21a8' : hasTeamPerm ? '#4338ca' : '#047857',
                                  border: `1px solid ${hasAdminPerm ? '#e9d5ff' : hasTeamPerm ? '#c7d2fe' : '#a7f3d0'}`,
                                }}>
                                  {currentRoleName}
                                </span>
                              );
                            })()}
                          </td>
                          <td>
                            <select
                              className="form-input"
                              style={{ padding: '0.35rem 0.6rem', fontSize: '0.825rem', width: '100%', maxWidth: '180px' }}
                              value={selectedRoleId}
                              onChange={(e) => handleUserRoleChangeSelect(u._id, e.target.value)}
                            >
                              {roles.map((r) => (
                                <option key={r._id} value={r._id}>
                                  {r.name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <button
                              onClick={() => handleSaveUserRole(u)}
                              className="btn btn-primary"
                              style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem' }}
                              disabled={updatingUserId === u._id || !isRoleChanged}
                            >
                              <UserCheck size={13} />
                              <span>{updatingUserId === u._id ? 'Updating...' : 'Save Role'}</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 2: Role & Permission Matrix */}
          <div className="saas-card" style={{ padding: '1.5rem', marginBottom: '1.75rem' }}>
            <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShieldAlert size={18} color="#0f172a" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                  Dynamic Permission Matrix
                </h3>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '1rem', color: '#4f46e5', fontSize: '0.8rem', fontWeight: 500 }}>
              <Info size={15} /> Tip: Toggle checkboxes for any role column below and click Save Matrix to apply changes.
            </div>

            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '30%' }}>System Permission</th>
                    {roles.map((r) => (
                      <th key={r._id} style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>{r.name}</div>
                        <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)', fontWeight: 500, marginTop: '0.1rem' }}>
                          {(rolePermissionsState[r._id] || []).length} / {availablePermissions.length} Enabled
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {availablePermissions.map((perm) => (
                    <tr key={perm}>
                      <td style={{ fontWeight: 600, color: '#4f46e5', fontSize: '0.825rem' }}>
                        {perm}
                      </td>
                      {roles.map((r) => {
                        const isChecked = (rolePermissionsState[r._id] || []).includes(perm);
                        const rolesWithManageRolesCount = roles.filter((role) =>
                          (rolePermissionsState[role._id] || role.permissions || []).includes(Permission.MANAGE_ROLES)
                        ).length;
                        const isManageRolesLockout = perm === Permission.MANAGE_ROLES && isChecked && rolesWithManageRolesCount <= 1;

                        return (
                          <td key={r._id} style={{ textAlign: 'center' }}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              disabled={isManageRolesLockout}
                              onChange={() => handleTogglePermission(r, perm)}
                              style={{
                                width: '18px',
                                height: '18px',
                                accentColor: '#0f172a',
                                cursor: isManageRolesLockout ? 'not-allowed' : 'pointer',
                                opacity: isManageRolesLockout ? 0.5 : 1,
                              }}
                              title={isManageRolesLockout ? 'At least one role must retain MANAGE_ROLES permission' : ''}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}

                  {/* Save Buttons Row */}
                  <tr style={{ background: 'var(--bg-surface-subtle)' }}>
                    <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>Action</td>
                    {roles.map((r) => (
                      <td key={r._id} style={{ textAlign: 'center' }}>
                        <button
                          onClick={() => handleSavePermissions(r._id, r.name)}
                          className="btn btn-primary"
                          style={{ padding: '0.45rem 0.85rem', fontSize: '0.78rem', width: '100%', maxWidth: '130px', margin: '0 auto' }}
                          disabled={savingRoleId === r._id}
                        >
                          <Save size={13} />
                          <span>{savingRoleId === r._id ? 'Saving...' : 'Save Matrix'}</span>
                        </button>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
