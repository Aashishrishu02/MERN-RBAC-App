import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Clock,
  MapPin,
  ShieldAlert,
  LogOut,
  Shield,
  User,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Permission } from '../types';

interface SidebarProps {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, onCloseMobile }) => {
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
    <>
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div
          onClick={onCloseMobile}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            zIndex: 40,
          }}
        />
      )}

      <aside
        style={{
          width: '240px',
          background: 'var(--bg-sidebar)',
          borderRight: '1px solid var(--border-default)',
          display: 'flex',
          flexDirection: 'column',
          padding: '1.25rem 0.85rem',
          zIndex: 50,
          transition: 'transform 0.2s ease',
        }}
        className={mobileOpen ? 'sidebar-mobile-open' : 'sidebar-desktop'}
      >
        {/* Brand Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', padding: '0 0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
              }}
            >
              <Shield size={18} />
            </div>
            <div>
              <h2 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                FieldOps
              </h2>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Access Portal</span>
            </div>
          </div>

          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* User Profile Summary */}
        {user && (
          <div
            style={{
              background: 'var(--bg-card-subtle)',
              border: '1px solid var(--border-default)',
              borderRadius: '8px',
              padding: '0.75rem',
              marginBottom: '1.25rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: 'var(--border-default)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-secondary)',
                }}
              >
                <User size={14} />
              </div>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.name}
              </span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginBottom: '0.4rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user.email}
            </div>
            <span className="badge badge-primary" style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem' }}>
              {user.role?.name || 'User'}
            </span>
          </div>
        )}

        {/* Navigation Section */}
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', padding: '0 0.5rem 0.4rem 0.5rem', letterSpacing: '0.06em' }}>
            Menu
          </div>
          {navItems
            .filter((item) => item.show)
            .map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={onCloseMobile}
                  style={({ isActive }) => ({
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.7rem',
                    padding: '0.6rem 0.75rem',
                    borderRadius: '6px',
                    fontSize: '0.85rem',
                    fontWeight: isActive ? 600 : 500,
                    textDecoration: 'none',
                    color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                    background: isActive ? 'var(--bg-card-subtle)' : 'transparent',
                    borderLeft: isActive ? '3px solid var(--primary)' : '3px solid transparent',
                    transition: 'all 0.15s ease',
                  })}
                >
                  <Icon size={16} />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
        </nav>

        {/* Sign Out Button */}
        <button
          onClick={handleLogout}
          className="btn btn-secondary"
          style={{ width: '100%', justifyContent: 'flex-start', color: '#f87171', borderColor: 'var(--border-default)', fontSize: '0.8rem' }}
        >
          <LogOut size={16} />
          <span>Sign Out</span>
        </button>
      </aside>
    </>
  );
};
