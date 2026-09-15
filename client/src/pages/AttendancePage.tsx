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
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-app)' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Navbar title="Attendance Tracker" />

        <div className="main-content">
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

          {/* Punch Clock Widget (Permission Gate: CLOCK_IN_OUT) */}
          <PermissionGate permission={Permission.CLOCK_IN_OUT}>
            <div className="saas-card" style={{ padding: '1.75rem', marginBottom: '1.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Clock size={20} color="#0f172a" /> Punch Clock
                  </h2>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.825rem', marginTop: '0.25rem', margin: 0 }}>
                    Register shift start and completion with optional location/task notes.
                  </p>
                </div>

                <div>
                  {activeAttendance ? (
                    <span className="badge badge-emerald" style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}>
                      <CheckCircle2 size={14} /> CLOCKED IN since {new Date(activeAttendance.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  ) : (
                    <span className="badge badge-amber" style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}>
                      Off Duty
                    </span>
                  )}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1rem', alignItems: 'flex-end' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Shift Note / Location (Optional)</label>
                  <div style={{ position: 'relative' }}>
                    <MessageSquare size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                      type="text"
                      className="form-input"
                      style={{ paddingLeft: '2.5rem' }}
                      placeholder="e.g. Starting client visits in Sector 4"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  {!activeAttendance ? (
                    <button onClick={handleClockIn} className="btn btn-success" disabled={loading} style={{ padding: '0.6rem 1.25rem' }}>
                      <Clock size={16} />
                      <span>{loading ? 'Processing...' : 'Clock In Now'}</span>
                    </button>
                  ) : (
                    <button onClick={handleClockOut} className="btn btn-danger" disabled={loading} style={{ padding: '0.6rem 1.25rem' }}>
                      <LogOut size={16} />
                      <span>{loading ? 'Processing...' : 'Clock Out'}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </PermissionGate>

          {/* Self Attendance History Table (Permission Gate: READ_SELF_ATTENDANCE) */}
          <PermissionGate permission={Permission.READ_SELF_ATTENDANCE}>
            <div className="saas-card" style={{ padding: '1.75rem', marginBottom: '1.75rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 1rem 0', color: 'var(--text-primary)' }}>My Attendance Log</h3>
              {selfAttendance.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', padding: '1.5rem 0', textAlign: 'center' }}>No personal attendance records found.</div>
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
                          <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{new Date(rec.clockIn).toLocaleDateString()}</td>
                          <td>{new Date(rec.clockIn).toLocaleTimeString()}</td>
                          <td>{rec.clockOut ? new Date(rec.clockOut).toLocaleTimeString() : '—'}</td>
                          <td>
                            <span className={rec.status === 'CLOCKED_IN' ? 'badge badge-emerald' : 'badge badge-primary'}>
                              {rec.status}
                            </span>
                          </td>
                          <td style={{ color: 'var(--text-muted)' }}>{rec.note || '—'}</td>
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
            <div className="saas-card" style={{ padding: '1.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <UserCheck size={18} color="#4f46e5" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Team Attendance</h3>
              </div>
              {allAttendance.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', padding: '1.5rem 0', textAlign: 'center' }}>No team attendance records found.</div>
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
                            <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{userObj?.name || 'Unknown Employee'}</td>
                            <td style={{ color: 'var(--text-muted)' }}>{userObj?.email || 'N/A'}</td>
                            <td>{new Date(rec.clockIn).toLocaleString()}</td>
                            <td>{rec.clockOut ? new Date(rec.clockOut).toLocaleString() : '—'}</td>
                            <td>
                              <span className={rec.status === 'CLOCKED_IN' ? 'badge badge-emerald' : 'badge badge-primary'}>
                                {rec.status}
                              </span>
                            </td>
                            <td style={{ color: 'var(--text-muted)' }}>{rec.note || '—'}</td>
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
