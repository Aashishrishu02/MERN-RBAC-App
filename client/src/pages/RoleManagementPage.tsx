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
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Navbar title="Role & Permission Configurator" />

        <div className="main-content">
          <div style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <ShieldAlert size={26} color="#6366f1" /> Dynamic Permission Assignment Matrix
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '0.3rem', maxWidth: '750px' }}>
              As an Owner, you can dynamically adjust permission strings assigned to any role. 
              Changes immediately mutate database authorization and instantly control user access without hardcoding.
            </p>
          </div>

          {error && (
            <div
              style={{
                background: 'rgba(244, 63, 94, 0.15)',
                border: '1px solid rgba(244, 63, 94, 0.3)',
                borderRadius: '8px',
                padding: '0.75rem 1rem',
                color: '#fda4af',
                fontSize: '0.85rem',
                marginBottom: '1.5rem',
              }}
            >
              {error}
            </div>
          )}

          {success && (
            <div
              style={{
                background: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: '8px',
                padding: '0.75rem 1rem',
                color: '#6ee7b7',
                fontSize: '0.85rem',
                marginBottom: '1.5rem',
              }}
            >
              {success}
            </div>
          )}

          <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: '#818cf8', fontSize: '0.85rem', fontWeight: 600 }}>
              <Info size={16} /> Tip: Toggle checkboxes for any role column below and click Save Matrix to apply changes.
            </div>

            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th style={{ width: '30%' }}>System Permission</th>
                    {roles.map((r) => (
                      <th key={r._id} style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#f8fafc' }}>{r.name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>
                          {(rolePermissionsState[r._id] || []).length} / {availablePermissions.length} Enabled
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {availablePermissions.map((perm) => (
                    <tr key={perm}>
                      <td style={{ fontWeight: 700, color: '#a5b4fc', fontSize: '0.85rem' }}>
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
                                width: '20px',
                                height: '20px',
                                accentColor: '#6366f1',
                                cursor: isOwnerManageRoles ? 'not-allowed' : 'pointer',
                                opacity: isOwnerManageRoles ? 0.6 : 1,
                              }}
                              title={isOwnerManageRoles ? 'Owner role must retain MANAGE_ROLES permission' : ''}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}

                  {/* Save Buttons Row */}
                  <tr style={{ background: 'rgba(15, 23, 42, 0.9)' }}>
                    <td style={{ fontWeight: 800, color: '#f8fafc' }}>Action</td>
                    {roles.map((r) => (
                      <td key={r._id} style={{ textAlign: 'center' }}>
                        <button
                          onClick={() => handleSavePermissions(r._id, r.name)}
                          className="btn btn-primary"
                          style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', width: '100%', maxWidth: '140px', margin: '0 auto' }}
                          disabled={savingRoleId === r._id}
                        >
                          <Save size={14} />
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
