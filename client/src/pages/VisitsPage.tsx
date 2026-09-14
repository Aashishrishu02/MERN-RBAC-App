import React, { useEffect, useState } from 'react';
import { MapPin, Plus, Store, Target, CheckCircle2, UserCheck, X } from 'lucide-react';
import { visitService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Navbar } from '../components/Navbar';
import { PermissionGate } from '../components/PermissionGate';
import { Visit, Permission } from '../types';

export const VisitsPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const [selfVisits, setSelfVisits] = useState<Visit[]>([]);
  const [allVisits, setAllVisits] = useState<Visit[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [customerName, setCustomerName] = useState('');
  const [purpose, setPurpose] = useState('');
  const [outcome, setOutcome] = useState('');
  const [locationAddress, setLocationAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchVisits = async () => {
    try {
      if (hasPermission(Permission.READ_SELF_VISIT)) {
        const data = await visitService.getSelfVisits();
        setSelfVisits(data.visits);
      }
      if (hasPermission(Permission.READ_ALL_VISIT)) {
        const dataAll = await visitService.getAllVisits();
        setAllVisits(dataAll.visits);
      }
    } catch (err: any) {
      console.error('Error fetching visits:', err);
    }
  };

  useEffect(() => {
    fetchVisits();
  }, []);

  const handleSaveVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await visitService.saveVisit({
        customerName,
        purpose,
        outcome,
        locationAddress,
      });

      setSuccess('Visit record registered successfully!');
      setCustomerName('');
      setPurpose('');
      setOutcome('');
      setLocationAddress('');
      setIsModalOpen(false);
      await fetchVisits();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to register visit.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Navbar title="Field Visit Management" />

        <div className="main-content">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Client & Store Visits Log</h2>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '0.2rem' }}>
                Track field visits, client negotiations, outcomes, and geographic locations.
              </p>
            </div>

            <PermissionGate permission={Permission.SAVE_VISIT}>
              <button onClick={() => setIsModalOpen(true)} className="btn btn-primary">
                <Plus size={18} /> Register New Visit
              </button>
            </PermissionGate>
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

          {/* Self Visits Table (Permission Gate: READ_SELF_VISIT) */}
          <PermissionGate permission={Permission.READ_SELF_VISIT}>
            <div className="glass-panel" style={{ padding: '1.75rem', marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem' }}>My Registered Field Visits</h3>
              {selfVisits.length === 0 ? (
                <div style={{ color: '#64748b', fontSize: '0.9rem', padding: '1rem 0' }}>No personal field visits logged yet.</div>
              ) : (
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Date & Time</th>
                        <th>Customer / Shop Name</th>
                        <th>Purpose</th>
                        <th>Outcome</th>
                        <th>Location / Address</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selfVisits.map((v) => (
                        <tr key={v._id}>
                          <td>{new Date(v.visitDate).toLocaleString()}</td>
                          <td style={{ fontWeight: 700, color: '#f8fafc' }}>{v.customerName}</td>
                          <td>{v.purpose}</td>
                          <td>
                            <span className="badge badge-emerald">{v.outcome}</span>
                          </td>
                          <td style={{ color: '#94a3b8' }}>{v.locationAddress}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </PermissionGate>

          {/* All Team Visits Table (Permission Gate: READ_ALL_VISIT) */}
          <PermissionGate permission={Permission.READ_ALL_VISIT}>
            <div className="glass-panel" style={{ padding: '1.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <UserCheck size={20} color="#8b5cf6" />
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Team Visits (Manager / Owner View)</h3>
              </div>
              {allVisits.length === 0 ? (
                <div style={{ color: '#64748b', fontSize: '0.9rem', padding: '1rem 0' }}>No team visit records found.</div>
              ) : (
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Field Employee</th>
                        <th>Date & Time</th>
                        <th>Customer / Shop Name</th>
                        <th>Purpose</th>
                        <th>Outcome</th>
                        <th>Location</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allVisits.map((v) => {
                        const userObj = typeof v.userId === 'object' ? v.userId : null;
                        return (
                          <tr key={v._id}>
                            <td style={{ fontWeight: 600, color: '#f8fafc' }}>{userObj?.name || 'Unknown'}</td>
                            <td>{new Date(v.visitDate).toLocaleString()}</td>
                            <td style={{ fontWeight: 700, color: '#a5b4fc' }}>{v.customerName}</td>
                            <td>{v.purpose}</td>
                            <td>
                              <span className="badge badge-purple">{v.outcome}</span>
                            </td>
                            <td style={{ color: '#94a3b8' }}>{v.locationAddress}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </PermissionGate>

          {/* Register Visit Modal */}
          {isModalOpen && (
            <div className="modal-overlay">
              <div className="modal-content">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <h3 style={{ fontSize: '1.3rem', fontWeight: 800 }}>Register Field Visit</h3>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
                  >
                    <X size={22} />
                  </button>
                </div>

                <form onSubmit={handleSaveVisit}>
                  <div className="form-group">
                    <label className="form-label">Customer / Shop Name</label>
                    <div style={{ position: 'relative' }}>
                      <Store size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                      <input
                        type="text"
                        className="form-input"
                        style={{ paddingLeft: '2.75rem' }}
                        placeholder="Apex Supermarket"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Purpose of Visit</label>
                    <div style={{ position: 'relative' }}>
                      <Target size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                      <input
                        type="text"
                        className="form-input"
                        style={{ paddingLeft: '2.75rem' }}
                        placeholder="Stock Audit & Restock Order"
                        value={purpose}
                        onChange={(e) => setPurpose(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Visit Outcome / Result</label>
                    <div style={{ position: 'relative' }}>
                      <CheckCircle2 size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                      <input
                        type="text"
                        className="form-input"
                        style={{ paddingLeft: '2.75rem' }}
                        placeholder="Order placed: 50 units"
                        value={outcome}
                        onChange={(e) => setOutcome(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Location / Address</label>
                    <div style={{ position: 'relative' }}>
                      <MapPin size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                      <input
                        type="text"
                        className="form-input"
                        style={{ paddingLeft: '2.75rem' }}
                        placeholder="123 Commerce St, Downtown"
                        value={locationAddress}
                        onChange={(e) => setLocationAddress(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                    <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary" style={{ flex: 1 }}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={loading}>
                      {loading ? 'Saving...' : 'Save Visit Record'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
