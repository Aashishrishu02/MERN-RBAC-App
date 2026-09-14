import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Clock,
  MapPin,
  ShieldAlert,
  LogOut,
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
      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div
          onClick={onCloseMobile}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.6)',
            zIndex: 40,
          }}
        />
      )}

      <aside
        style={{
          width: '230px',
          background: 'var(--bg-sidebar)',
          display: 'flex',
          flexDirection: 'column',
          padding: '1.25rem 0.85rem',
          zIndex: 50,
          transition: 'transform 0.2s ease',
          height: '100vh',
          position: 'sticky',
          top: 0,
        }}
        className={mobileOpen ? 'sidebar-mobile-open' : 'sidebar-desktop'}
      >
        {/* Brand Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.75rem', padding: '0 0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                background: '#334155',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
              }}
            >
              <MapPin size={18} />
            </div>
            <div>
              <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#ffffff', lineHeight: 1.2, margin: 0 }}>
                FieldOps
              </h2>
              <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 500 }}>Field Management</span>
            </div>
          </div>

          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* Navigation Section */}
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', padding: '0 0.5rem 0.4rem 0.5rem', letterSpacing: '0.06em' }}>
            Main Menu
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
                    color: isActive ? '#ffffff' : '#94a3b8',
                    background: isActive ? '#1e293b' : 'transparent',
                    transition: 'all 0.15s ease',
                  })}
                >
                  <Icon size={16} color="#cbd5e1" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
        </nav>

        {/* Bottom User Info & Sign Out */}
        {user && (
          <div
            style={{
              background: '#1e293b',
              borderRadius: '8px',
              padding: '0.75rem',
              marginTop: 'auto',
              marginBottom: '0.75rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: '#334155',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#94a3b8',
                }}
              >
                <User size={13} />
              </div>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.name}
              </span>
            </div>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '0.35rem' }}>
              {user.email}
            </div>
            <span className="badge badge-primary" style={{ fontSize: '0.68rem', padding: '0.15rem 0.45rem' }}>
              {user.role?.name || 'User'}
            </span>
          </div>
        )}

        <button
          onClick={handleLogout}
          className="btn"
          style={{
            width: '100%',
            justifyContent: 'flex-start',
            background: 'transparent',
            color: '#f87171',
            border: '1px solid #334155',
            fontSize: '0.8rem',
          }}
        >
          <LogOut size={15} />
          <span>Sign Out</span>
        </button>
      </aside>
    </>
  );
};
