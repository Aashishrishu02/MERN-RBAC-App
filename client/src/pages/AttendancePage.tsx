import React, { useEffect, useState, useCallback } from 'react';
import { Clock, CheckCircle2, LogOut, UserCheck, MessageSquare } from 'lucide-react';
import { attendanceService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Navbar } from '../components/Navbar';
import { PermissionGate } from '../components/PermissionGate';
import { Attendance, Permission } from '../types';

export const AttendancePage: React.FC = () => {
  const { hasPermission } = useAuth();
  const [selfAttendance, setSelfAttendance] = useState<Attendance[]>([]);
  const [allAttendance, setAllAttendance] = useState<Attendance[]>([]);
  const [activeAttendance, setActiveAttendance] = useState<Attendance | null>(null);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchAttendance = useCallback(async () => {
    try {
      if (hasPermission(Permission.READ_SELF_ATTENDANCE)) {
        const data = await attendanceService.getSelfAttendance();
        setSelfAttendance(data.attendance);
        const currentActive = data.attendance.find((a) => a.status === 'CLOCKED_IN');
        setActiveAttendance(currentActive || null);
      }

      if (hasPermission(Permission.READ_ALL_ATTENDANCE)) {
        const dataAll = await attendanceService.getAllAttendance();
        setAllAttendance(dataAll.attendance);
      }
    } catch (err: any) {
      console.error('Error fetching attendance:', err);
    }
  }, [hasPermission]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  const handleClockIn = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await attendanceService.clockIn(note);
      setSuccess('Clocked in successfully!');
      setNote('');
      await fetchAttendance();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Clock-in failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleClockOut = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await attendanceService.clockOut(note);
      setSuccess('Clocked out successfully!');
      setNote('');
      await fetchAttendance();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Clock-out failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Navbar title="Attendance Tracker" />

        <div className="main-content">
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

          {/* Clock In / Clock Out Action Widget (Permission Gate: CLOCK_IN_OUT) */}
          <PermissionGate permission={Permission.CLOCK_IN_OUT}>
            <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.4rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <Clock size={24} color="#6366f1" /> Attendance Punch Clock
                  </h2>
                  <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '0.2rem' }}>
                    Register shift start and completion with optional location/task notes.
                  </p>
                </div>

                <div>
                  {activeAttendance ? (
                    <span className="badge badge-emerald" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                      <CheckCircle2 size={16} /> CLOCKED IN since {new Date(activeAttendance.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  ) : (
                    <span className="badge badge-amber" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
                      Currently Off Duty
                    </span>
                  )}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1rem', alignItems: 'flex-end' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Shift Note / Location (Optional)</label>
                  <div style={{ position: 'relative' }}>
                    <MessageSquare size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                    <input
                      type="text"
                      className="form-input"
                      style={{ paddingLeft: '2.75rem' }}
                      placeholder="e.g. Starting client visits in Sector 4"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  {!activeAttendance ? (
                    <button onClick={handleClockIn} className="btn btn-success" disabled={loading} style={{ padding: '0.85rem 1.75rem' }}>
                      <Clock size={18} />
                      <span>{loading ? 'Processing...' : 'Clock In Now'}</span>
                    </button>
                  ) : (
                    <button onClick={handleClockOut} className="btn btn-danger" disabled={loading} style={{ padding: '0.85rem 1.75rem' }}>
                      <LogOut size={18} />
                      <span>{loading ? 'Processing...' : 'Clock Out'}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </PermissionGate>

          {/* Self Attendance History Table (Permission Gate: READ_SELF_ATTENDANCE) */}
          <PermissionGate permission={Permission.READ_SELF_ATTENDANCE}>
            <div className="glass-panel" style={{ padding: '1.75rem', marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem' }}>My Attendance Log</h3>
              {selfAttendance.length === 0 ? (
                <div style={{ color: '#64748b', fontSize: '0.9rem', padding: '1rem 0' }}>No personal attendance records found.</div>
              ) : (
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Clock In Time</th>
                        <th>Clock Out Time</th>
                        <th>Status</th>
                        <th>Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selfAttendance.map((rec) => (
                        <tr key={rec._id}>
                          <td>{new Date(rec.clockIn).toLocaleDateString()}</td>
                          <td>{new Date(rec.clockIn).toLocaleTimeString()}</td>
                          <td>{rec.clockOut ? new Date(rec.clockOut).toLocaleTimeString() : '—'}</td>
                          <td>
                            <span className={rec.status === 'CLOCKED_IN' ? 'badge badge-emerald' : 'badge badge-primary'}>
                              {rec.status}
                            </span>
                          </td>
                          <td style={{ color: '#94a3b8' }}>{rec.note || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </PermissionGate>

          {/* All Team Attendance Table (Permission Gate: READ_ALL_ATTENDANCE) */}
          <PermissionGate permission={Permission.READ_ALL_ATTENDANCE}>
            <div className="glass-panel" style={{ padding: '1.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <UserCheck size={20} color="#8b5cf6" />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Team Attendance (Manager / Owner View)</h3>
              </div>
              {allAttendance.length === 0 ? (
                <div style={{ color: '#64748b', fontSize: '0.9rem', padding: '1rem 0' }}>No team attendance records found.</div>
              ) : (
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Employee</th>
                        <th>Email</th>
                        <th>Clock In</th>
                        <th>Clock Out</th>
                        <th>Status</th>
                        <th>Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allAttendance.map((rec) => {
                        const userObj = typeof rec.userId === 'object' ? rec.userId : null;
                        return (
                          <tr key={rec._id}>
                            <td style={{ fontWeight: 600, color: '#f8fafc' }}>{userObj?.name || 'Unknown Employee'}</td>
                            <td style={{ color: '#94a3b8' }}>{userObj?.email || 'N/A'}</td>
                            <td>{new Date(rec.clockIn).toLocaleString()}</td>
                            <td>{rec.clockOut ? new Date(rec.clockOut).toLocaleString() : '—'}</td>
                            <td>
                              <span className={rec.status === 'CLOCKED_IN' ? 'badge badge-emerald' : 'badge badge-primary'}>
                                {rec.status}
                              </span>
                            </td>
                            <td style={{ color: '#94a3b8' }}>{rec.note || '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </PermissionGate>
        </div>
      </div>
    </div>
  );
};
