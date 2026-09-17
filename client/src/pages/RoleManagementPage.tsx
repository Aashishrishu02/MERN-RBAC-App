import React, { useEffect, useState } from 'react';
import { ShieldAlert, Save, Info, Users, UserCheck, KeyRound, X, RotateCcw, UserPlus, Trash2, Mail, Sparkles, Copy, Check, Key } from 'lucide-react';
import { roleService, userService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Navbar } from '../components/Navbar';
import { Role, Permission, UserListItem } from '../types';

export const RoleManagementPage: React.FC = () => {
  const { user: currentUser, refreshUser, hasPermission } = useAuth();
  const [roles, setRoles] = useState<Role[]>([]);
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [availablePermissions, setAvailablePermissions] = useState<string[]>([]);
  const [rolePermissionsState, setRolePermissionsState] = useState<Record<string, string[]>>({});
  const [selectedUserRoles, setSelectedUserRoles] = useState<Record<string, string>>({});

  const [savingRoleId, setSavingRoleId] = useState<string | null>(null);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Generate Credentials State
  const [genRoleId, setGenRoleId] = useState('');
  const [genCustomEmail, setGenCustomEmail] = useState('');
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState('');
  const [generatedResult, setGeneratedResult] = useState<{
    loginId: string;
    generatedPassword: string;
    roleName: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // Provision New User state
  const [provisionEmail, setProvisionEmail] = useState('');
  const [provisionRoleId, setProvisionRoleId] = useState('');
  const [provisioning, setProvisioning] = useState(false);
  const [provisionError, setProvisionError] = useState('');
  const [provisionSuccess, setProvisionSuccess] = useState('');

  // Delete User Confirmation modal state
  const [confirmDeleteUser, setConfirmDeleteUser] = useState<UserListItem | null>(null);
  const [deletingUser, setDeletingUser] = useState(false);

  // User Direct Permissions Modal state
  const [selectedUserForPerms, setSelectedUserForPerms] = useState<UserListItem | null>(null);
  const [userRolePermissions, setUserRolePermissions] = useState<string[]>([]);
  const [userCustomPermissions, setUserCustomPermissions] = useState<string[] | null>(null);
  const [userModalPermissions, setUserModalPermissions] = useState<string[]>([]);
  const [isResettingToRole, setIsResettingToRole] = useState(false);
  const [savingUserPerms, setSavingUserPerms] = useState(false);
  const [modalError, setModalError] = useState('');
  const [modalSuccess, setModalSuccess] = useState('');

  const extractErrorMessage = (err: any, fallback: string): string => {
    if (err?.response?.data?.message && typeof err.response.data.message === 'string') {
      return err.response.data.message;
    }
    if (err?.response?.data?.error && typeof err.response.data.error === 'string') {
      return err.response.data.error;
    }
    if (typeof err?.response?.data === 'string' && err.response.data.trim()) {
      return err.response.data;
    }
    if (err?.message && typeof err.message === 'string') {
      return err.message;
    }
    return fallback;
  };

  const fetchRolesData = async () => {
    try {
      const data = await roleService.getRoles();
      setRoles(data.roles);
      if (data.roles.length > 0) {
        if (!provisionRoleId) setProvisionRoleId(data.roles[0]._id);
        if (!genRoleId) setGenRoleId(data.roles[0]._id);
      }
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
      setSuccess(res.message);

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

  const handleConfirmDeleteUser = async () => {
    if (!confirmDeleteUser) return;

    setDeletingUser(true);
    setError('');
    setSuccess('');

    try {
      const res = await userService.deleteUser(confirmDeleteUser._id);
      setSuccess(res.message);

      if (currentUser?.id === confirmDeleteUser._id) {
        await refreshUser();
      }

      await fetchUsersData();
      setConfirmDeleteUser(null);
    } catch (err: any) {
      setError(err.response?.data?.message || `Failed to delete user ${confirmDeleteUser.name}.`);
      setConfirmDeleteUser(null);
    } finally {
      setDeletingUser(false);
    }
  };

  const handleOpenPermissionsModal = async (targetUser: UserListItem) => {
    setSelectedUserForPerms(targetUser);
    setModalError('');
    setModalSuccess('');
    setIsResettingToRole(false);

    try {
      const data = await userService.getUserPermissions(targetUser._id);
      setUserRolePermissions(data.rolePermissions);
      setUserCustomPermissions(data.customPermissions);
      setUserModalPermissions(data.effectivePermissions);
    } catch (err: any) {
      setModalError(err.response?.data?.message || 'Failed to fetch user permissions.');
    }
  };

  const handleToggleUserModalPermission = (perm: string) => {
    setIsResettingToRole(false);
    setUserModalPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    );
  };

  const handleResetToRoleDefaults = () => {
    setUserModalPermissions([...userRolePermissions]);
    setIsResettingToRole(true);
  };

  const handleSaveUserPermissions = async () => {
    if (!selectedUserForPerms) return;

    setSavingUserPerms(true);
    setModalError('');
    setModalSuccess('');

    try {
      const permissionsToSave = isResettingToRole ? null : userModalPermissions;
      await userService.updateUserPermissions(selectedUserForPerms._id, permissionsToSave);
      setModalSuccess(`Permissions saved successfully for ${selectedUserForPerms.name}!`);

      if (currentUser?.id === selectedUserForPerms._id) {
        await refreshUser();
      }

      await fetchUsersData();

      setTimeout(() => {
        setSelectedUserForPerms(null);
      }, 700);
    } catch (err: any) {
      setModalError(err.response?.data?.message || 'Failed to update user permissions.');
    } finally {
      setSavingUserPerms(false);
    }
  };

  const handleGenerateCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!genRoleId) return;

    setGenerating(true);
    setGenError('');
    setGeneratedResult(null);
    setCopied(false);

    try {
      const res = await userService.generateCredentials(genRoleId, genCustomEmail);
      setGeneratedResult({
        loginId: res.loginId,
        generatedPassword: res.generatedPassword,
        roleName: res.roleName,
      });
      setGenCustomEmail('');
      await fetchUsersData();
    } catch (err: any) {
      setGenError(extractErrorMessage(err, 'Failed to generate credentials.'));
    } finally {
      setGenerating(false);
    }
  };

  const handleCopyCredentials = () => {
    if (!generatedResult) return;
    const textToCopy = `FieldOps Account Credentials\nLogin ID: ${generatedResult.loginId}\nPassword: ${generatedResult.generatedPassword}\nRole: ${generatedResult.roleName}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleProvisionUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!provisionEmail.trim() || !provisionRoleId) return;

    setProvisioning(true);
    setProvisionError('');
    setProvisionSuccess('');

    try {
      const res = await userService.provisionUser(provisionEmail, provisionRoleId);
      setProvisionSuccess(res.message);
      setProvisionEmail('');
      await fetchUsersData();
    } catch (err: any) {
      setProvisionError(extractErrorMessage(err, 'Failed to provision user.'));
    } finally {
      setProvisioning(false);
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
              Manage registered user role assignments, pre-assign roles to email addresses before login, and dynamically configure granular permission matrix per role or individual user.
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

          {/* Section 0: Generate Credentials / Create User */}
          {hasPermission(Permission.MANAGE_USER_ACCOUNTS) && (
            <div className="saas-card" style={{ padding: '1.5rem', marginBottom: '2rem', borderLeft: '4px solid #0f172a' }}>
              <div style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Key size={20} color="#0f172a" />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                  Create New User (Generate Credentials)
                </h3>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.1rem', marginBottom: '1.25rem' }}>
                Instantly provision an account and generate secure login credentials for a new team member. No SMTP or recipient pre-registration required.
              </p>

              {genError && <div className="alert alert-danger" style={{ marginBottom: '1rem', fontSize: '0.85rem' }}>{genError}</div>}

              <form onSubmit={handleGenerateCredentials} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: generatedResult ? '1.5rem' : '0' }}>
                <div style={{ width: '220px' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                    Select Role
                  </label>
                  <select
                    className="form-input"
                    style={{ fontSize: '0.85rem' }}
                    value={genRoleId}
                    onChange={(e) => setGenRoleId(e.target.value)}
                  >
                    {roles.map((r) => (
                      <option key={r._id} value={r._id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ flex: 1, minWidth: '240px' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                    Custom Login Email ID <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(Optional - Auto-generates company ID if blank)</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={16} color="#64748b" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      type="email"
                      className="form-input"
                      style={{ paddingLeft: '2.4rem', fontSize: '0.85rem' }}
                      placeholder="e.g. Leave blank for auto-generated ID (owner-8F42@fieldops.com)"
                      value={genCustomEmail}
                      onChange={(e) => setGenCustomEmail(e.target.value)}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ padding: '0.55rem 1.15rem', fontSize: '0.825rem', height: '38px', background: '#0f172a', borderColor: '#0f172a' }}
                  disabled={generating || !genRoleId}
                >
                  <Sparkles size={15} />
                  <span>{generating ? 'Generating...' : 'Generate Credentials'}</span>
                </button>
              </form>

              {/* Account Created Successfully Card */}
              {generatedResult && (
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '1.25rem', marginTop: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#15803d', fontWeight: 700, fontSize: '0.95rem' }}>
                      <Sparkles size={18} color="#15803d" />
                      Account Created Successfully
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyCredentials}
                      className="btn"
                      style={{
                        background: copied ? '#15803d' : '#ffffff',
                        color: copied ? '#ffffff' : '#0f172a',
                        border: '1px solid #cbd5e1',
                        padding: '0.4rem 0.85rem',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                      }}
                    >
                      {copied ? <Check size={14} /> : <Copy size={14} />}
                      <span>{copied ? 'Copied to Clipboard!' : 'Copy Credentials'}</span>
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', background: '#ffffff', padding: '1rem', borderRadius: '6px', border: '1px solid #dcfce7', marginBottom: '0.85rem' }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Login ID</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0f172a', fontFamily: 'monospace', marginTop: '0.2rem' }}>
                        {generatedResult.loginId}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Temporary/Generated Password</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#4f46e5', fontFamily: 'monospace', marginTop: '0.2rem', background: '#e0e7ff', padding: '0.2rem 0.5rem', borderRadius: '4px', display: 'inline-block' }}>
                        {generatedResult.generatedPassword}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Assigned Role</div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#15803d', marginTop: '0.2rem' }}>
                        {generatedResult.roleName}
                      </div>
                    </div>
                  </div>

                  <div style={{ fontSize: '0.78rem', color: '#b45309', background: '#fffbeb', border: '1px solid #fde68a', padding: '0.5rem 0.75rem', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <ShieldAlert size={15} color="#b45309" />
                    <strong>Security Warning:</strong> Save these credentials securely. The password will not be displayed again.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Section 0A: Provision New User (Email Credential Delivery) */}
          <div className="saas-card" style={{ padding: '1.5rem', marginBottom: '2rem', borderLeft: '4px solid #4f46e5' }}>
            <div style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <UserPlus size={20} color="#4f46e5" />
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                Provision New User
              </h3>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.1rem', marginBottom: '1rem' }}>
              Immediately create a user account with a temporary password and send login credentials via email. The user will be required to change their password on first login.
            </p>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '0.75rem 1rem', marginBottom: '1.25rem', fontSize: '0.825rem', color: '#475569' }}>
              <strong>Flow Info:</strong> An account will be created for this email with a temporary password. The user will receive login credentials by email and must change the password on first login.
            </div>

            {provisionError && <div className="alert alert-danger" style={{ marginBottom: '1rem', fontSize: '0.85rem' }}>{provisionError}</div>}
            {provisionSuccess && <div className="alert alert-success" style={{ marginBottom: '1rem', fontSize: '0.85rem' }}>{provisionSuccess}</div>}

            <form onSubmit={handleProvisionUser} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '240px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                  User Email Address
                </label>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} color="#64748b" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="email"
                    className="form-input"
                    style={{ paddingLeft: '2.4rem', fontSize: '0.85rem' }}
                    placeholder="user@organization.com"
                    value={provisionEmail}
                    onChange={(e) => setProvisionEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div style={{ width: '200px' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                  Assigned Role
                </label>
                <select
                  className="form-input"
                  style={{ fontSize: '0.85rem' }}
                  value={provisionRoleId}
                  onChange={(e) => setProvisionRoleId(e.target.value)}
                >
                  {roles.map((r) => (
                    <option key={r._id} value={r._id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ padding: '0.55rem 1.1rem', fontSize: '0.825rem', height: '38px', background: '#4f46e5', borderColor: '#4338ca' }}
                disabled={provisioning || !provisionEmail.trim()}
              >
                <UserPlus size={15} />
                <span>{provisioning ? 'Provisioning...' : 'Create Account & Send Credentials'}</span>
              </button>
            </form>
          </div>

          {/* Section 1: Registered User Role Assignment */}
          <div className="saas-card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
            <div style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Users size={18} color="#0f172a" />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                User Role & Individual Permission Management
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
                    <th style={{ textAlign: 'center' }}>Actions</th>
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
                      const hasCustomPerms = Array.isArray(u.customPermissions);

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
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
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
                              {hasCustomPerms && (
                                <span style={{
                                  padding: '0.15rem 0.4rem',
                                  borderRadius: '4px',
                                  fontSize: '0.7rem',
                                  fontWeight: 600,
                                  background: '#fef3c7',
                                  color: '#b45309',
                                  border: '1px solid #fde68a',
                                }} title="Has individual user-specific permission overrides">
                                  Custom Overrides
                                </span>
                              )}
                            </div>
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
                            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                              <button
                                onClick={() => handleSaveUserRole(u)}
                                className="btn btn-primary"
                                style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem' }}
                                disabled={updatingUserId === u._id || !isRoleChanged}
                              >
                                <UserCheck size={13} />
                                <span>{updatingUserId === u._id ? 'Updating...' : 'Change Role'}</span>
                              </button>

                              <button
                                onClick={() => handleOpenPermissionsModal(u)}
                                className="btn"
                                style={{
                                  padding: '0.4rem 0.75rem',
                                  fontSize: '0.75rem',
                                  background: '#f1f5f9',
                                  color: '#334155',
                                  border: '1px solid #cbd5e1',
                                }}
                              >
                                <KeyRound size={13} />
                                <span>Manage Permissions</span>
                              </button>

                              <button
                                onClick={() => setConfirmDeleteUser(u)}
                                className="btn"
                                style={{ padding: '0.4rem 0.65rem', fontSize: '0.75rem', background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}
                                disabled={updatingUserId === u._id}
                                title="Permanently delete this registered user account"
                              >
                                <Trash2 size={13} />
                                <span>Delete User</span>
                              </button>
                            </div>
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

          {/* Direct User Permissions Modal */}
          {selectedUserForPerms && (
            <div className="modal-overlay" onClick={() => setSelectedUserForPerms(null)}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <KeyRound size={20} color="#4f46e5" /> Manage Direct User Permissions
                    </h3>
                    <div style={{ fontSize: '0.85rem', marginTop: '0.35rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                      User: <span style={{ color: '#4f46e5' }}>{selectedUserForPerms.email}</span> ({selectedUserForPerms.name})
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedUserForPerms(null)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.2rem' }}
                  >
                    <X size={20} />
                  </button>
                </div>

                {modalError && (
                  <div className="alert alert-danger" style={{ marginBottom: '1rem', fontSize: '0.825rem' }}>
                    {modalError}
                  </div>
                )}

                {modalSuccess && (
                  <div className="alert alert-success" style={{ marginBottom: '1rem', fontSize: '0.825rem' }}>
                    {modalSuccess}
                  </div>
                )}

                <div style={{ marginBottom: '1rem', padding: '0.6rem 0.8rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.8rem' }}>
                  <div style={{ fontWeight: 600, color: '#334155' }}>
                    Assigned Role: {typeof selectedUserForPerms.role === 'object' && selectedUserForPerms.role !== null ? selectedUserForPerms.role.name : 'Unassigned'}
                  </div>
                  <div style={{ color: '#64748b', marginTop: '0.2rem' }}>
                    {isResettingToRole || userCustomPermissions === null
                      ? 'Using standard role default permissions.'
                      : 'Custom direct permission overrides are active.'}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '280px', overflowY: 'auto', marginBottom: '1.25rem', paddingRight: '0.25rem' }}>
                  {availablePermissions.map((perm) => {
                    const isChecked = userModalPermissions.includes(perm);
                    return (
                      <label
                        key={perm}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.5rem 0.75rem',
                          border: `1px solid ${isChecked ? '#cbd5e1' : '#f1f5f9'}`,
                          borderRadius: '6px',
                          cursor: 'pointer',
                          background: isChecked ? '#ffffff' : '#f8fafc',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <span style={{ fontSize: '0.825rem', fontWeight: 600, color: isChecked ? '#0f172a' : '#64748b', fontFamily: 'monospace' }}>
                          [{isChecked ? '✓' : ' '}] {perm}
                        </span>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleUserModalPermission(perm)}
                          style={{ width: '16px', height: '16px', accentColor: '#0f172a', cursor: 'pointer' }}
                        />
                      </label>
                    );
                  })}
                </div>

                <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'flex-end', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                  <button
                    onClick={handleResetToRoleDefaults}
                    className="btn"
                    style={{ background: '#f1f5f9', color: '#475569', fontSize: '0.78rem', padding: '0.45rem 0.75rem', border: '1px solid #cbd5e1' }}
                    disabled={savingUserPerms}
                    title="Reset to standard role permissions"
                  >
                    <RotateCcw size={13} />
                    <span>Reset to Role Defaults</span>
                  </button>
                  <button
                    onClick={handleSaveUserPermissions}
                    className="btn btn-primary"
                    style={{ fontSize: '0.78rem', padding: '0.45rem 0.9rem' }}
                    disabled={savingUserPerms}
                  >
                    <Save size={13} />
                    <span>{savingUserPerms ? 'Saving...' : 'Save Permissions'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Permanent Delete User Confirmation Modal */}
          {confirmDeleteUser && (
            <div className="modal-overlay" onClick={() => setConfirmDeleteUser(null)}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '460px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#dc2626', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Trash2 size={20} color="#dc2626" /> Permanent Delete User Confirmation
                  </h3>
                  <button
                    onClick={() => setConfirmDeleteUser(null)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                  >
                    <X size={18} />
                  </button>
                </div>

                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '0.75rem', borderRadius: '6px', marginBottom: '1rem', color: '#991b1b', fontSize: '0.825rem' }}>
                  <strong>Warning:</strong> This action cannot be undone. Permanently deletes user account <strong>{confirmDeleteUser.email}</strong> from MongoDB and revokes all system access.
                </div>

                <p style={{ fontSize: '0.875rem', color: '#334155', lineHeight: '1.5', marginBottom: '1.25rem' }}>
                  Are you sure you want to permanently delete registered user <strong>{confirmDeleteUser.name}</strong> (<code>{confirmDeleteUser.email}</code>)?
                </p>

                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => setConfirmDeleteUser(null)}
                    className="btn"
                    style={{ background: '#f1f5f9', color: '#475569', fontSize: '0.8rem', padding: '0.45rem 0.85rem' }}
                    disabled={deletingUser}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmDeleteUser}
                    className="btn"
                    style={{ background: '#dc2626', color: '#ffffff', fontSize: '0.8rem', padding: '0.45rem 1rem', border: 'none', fontWeight: 600 }}
                    disabled={deletingUser}
                  >
                    {deletingUser ? 'Deleting...' : 'Confirm Delete User'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

