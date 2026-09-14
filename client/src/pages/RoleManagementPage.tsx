import React, { useEffect, useState } from 'react';
import { ShieldAlert, Save, Info } from 'lucide-react';
import { roleService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Navbar } from '../components/Navbar';
import { Role, Permission } from '../types';

export const RoleManagementPage: React.FC = () => {
  const { refreshUser } = useAuth();
  const [roles, setRoles] = useState<Role[]>([]);
  const [availablePermissions, setAvailablePermissions] = useState<string[]>([]);
  const [rolePermissionsState, setRolePermissionsState] = useState<Record<string, string[]>>({});
  const [savingRoleId, setSavingRoleId] = useState<string | null>(null);
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

  useEffect(() => {
    fetchRolesData();
  }, []);

  const handleTogglePermission = (role: Role, permission: string) => {
    // Safety Guard: Prevent removing MANAGE_ROLES from Owner role
    if (role.name === 'Owner' && permission === Permission.MANAGE_ROLES) {
      setError('Safety Guard: The Owner role must retain MANAGE_ROLES permission to prevent system lockout.');
      return;
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

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-canvas)' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Navbar title="Role & Permission Configurator" />

        <div className="main-content">
          <div style={{ marginBottom: '1.75rem' }}>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldAlert size={22} color="#818cf8" /> Dynamic Permission Matrix
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.35rem', maxWidth: '750px', margin: 0 }}>
              As an Owner, you can dynamically adjust permission strings assigned to any role. 
              Changes immediately mutate database authorization and instantly control user access without hardcoding.
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

          <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '1rem', color: '#818cf8', fontSize: '0.8rem', fontWeight: 500 }}>
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
                      <td style={{ fontWeight: 600, color: '#818cf8', fontSize: '0.825rem' }}>
                        {perm}
                      </td>
                      {roles.map((r) => {
                        const isChecked = (rolePermissionsState[r._id] || []).includes(perm);
                        const isOwnerManageRoles = r.name === 'Owner' && perm === Permission.MANAGE_ROLES;

                        return (
                          <td key={r._id} style={{ textAlign: 'center' }}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              disabled={isOwnerManageRoles}
                              onChange={() => handleTogglePermission(r, perm)}
                              style={{
                                width: '18px',
                                height: '18px',
                                accentColor: '#6366f1',
                                cursor: isOwnerManageRoles ? 'not-allowed' : 'pointer',
                                opacity: isOwnerManageRoles ? 0.5 : 1,
                              }}
                              title={isOwnerManageRoles ? 'Owner role must retain MANAGE_ROLES permission' : ''}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}

                  {/* Save Buttons Row */}
                  <tr style={{ background: 'var(--bg-canvas)' }}>
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

