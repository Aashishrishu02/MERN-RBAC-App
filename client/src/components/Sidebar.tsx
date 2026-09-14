import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Clock,
  MapPin,
  ShieldAlert,
  LogOut,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Permission } from '../types';

export const Sidebar: React.FC = () => {
  const { user, logout, hasPermission } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    {
      label: 'Dashboard',
      path: '/dashboard',
      icon: LayoutDashboard,
      show: true,
    },
    {
      label: 'Attendance',
      path: '/attendance',
      icon: Clock,
      show: hasPermission(Permission.READ_SELF_ATTENDANCE) || hasPermission(Permission.READ_ALL_ATTENDANCE),
    },
    {
      label: 'Field Visits',
      path: '/visits',
      icon: MapPin,
      show: hasPermission(Permission.READ_SELF_VISIT) || hasPermission(Permission.READ_ALL_VISIT),
    },
    {
      label: 'Role Management',
      path: '/roles',
      icon: ShieldAlert,
      show: hasPermission(Permission.MANAGE_ROLES),
    },
  ];

  return (
    <aside
      style={{
        width: '260px',
        background: 'rgba(15, 23, 42, 0.95)',
        borderRight: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex',
        flexDirection: 'column',
        padding: '1.5rem 1rem',
      }}
    >
      {/* Brand Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem', padding: '0 0.5rem' }}>
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            boxShadow: '0 4px 15px rgba(99, 102, 241, 0.4)',
          }}
        >
          <ShieldCheck size={24} />
        </div>
        <div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc', lineHeight: 1.2 }}>
            FieldOps
          </h2>
          <span style={{ fontSize: '0.75rem', color: '#6366f1', fontWeight: 600 }}>Access Test RBAC</span>
        </div>
      </div>

      {/* User Persona Card */}
      {user && (
        <div
          style={{
            background: 'rgba(30, 41, 59, 0.6)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            padding: '0.85rem',
            marginBottom: '1.5rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
            <UserCheck size={18} color="#a5b4fc" />
            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f8fafc' }}>{user.name}</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.5rem', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {user.email}
          </div>
          <span className="badge badge-purple">
            Role: {user.role?.name || 'Unassigned'}
          </span>
        </div>
      )}

      {/* Navigation */}
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', padding: '0 0.5rem 0.4rem 0.5rem', letterSpacing: '0.05em' }}>
          Navigation
        </div>
        {navItems
          .filter((item) => item.show)
          .map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.8rem',
                  padding: '0.75rem 1rem',
                  borderRadius: '10px',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  textDecoration: 'none',
                  color: isActive ? '#ffffff' : '#94a3b8',
                  background: isActive ? 'linear-gradient(90deg, rgba(99, 102, 241, 0.25) 0%, rgba(139, 92, 246, 0.15) 100%)' : 'transparent',
                  borderLeft: isActive ? '3px solid #6366f1' : '3px solid transparent',
                  transition: 'all 0.2s ease',
                })}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
      </nav>

      {/* Logout Button */}
      <button
        onClick={handleLogout}
        className="btn btn-secondary"
        style={{ width: '100%', justifyContent: 'flex-start', color: '#f43f5e', borderColor: 'rgba(244, 63, 94, 0.2)' }}
      >
        <LogOut size={18} />
        <span>Sign Out</span>
      </button>
    </aside>
  );
};
