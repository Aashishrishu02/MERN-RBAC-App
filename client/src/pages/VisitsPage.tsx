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
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-app)' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Navbar title="Field Visit Management" />

        <div className="main-content">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Client & Store Visits Log</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem', margin: 0 }}>
                Track field visits, client negotiations, outcomes, and geographic locations.
              </p>
            </div>

            <PermissionGate permission={Permission.SAVE_VISIT}>
              <button onClick={() => setIsModalOpen(true)} className="btn btn-primary">
                <Plus size={16} /> Register New Visit
              </button>
            </PermissionGate>
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

          {/* Self Visits Table (Permission Gate: READ_SELF_VISIT) */}
          <PermissionGate permission={Permission.READ_SELF_VISIT}>
            <div className="saas-card" style={{ padding: '1.75rem', marginBottom: '1.75rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 1rem 0', color: 'var(--text-primary)' }}>My Registered Field Visits</h3>
              {selfVisits.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', padding: '1.5rem 0', textAlign: 'center' }}>No personal field visits logged yet.</div>
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
                          <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{v.customerName}</td>
                          <td>{v.purpose}</td>
                          <td>
                            <span className="badge badge-emerald">{v.outcome}</span>
                          </td>
                          <td style={{ color: 'var(--text-muted)' }}>{v.locationAddress}</td>
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
            <div className="saas-card" style={{ padding: '1.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <UserCheck size={18} color="#4f46e5" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Team Visits</h3>
              </div>
              {allVisits.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', padding: '1.5rem 0', textAlign: 'center' }}>No team visit records found.</div>
              ) : (
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Logged By</th>
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
                            <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{userObj?.name || 'Unknown'}</td>
                            <td>{new Date(v.visitDate).toLocaleString()}</td>
                            <td style={{ fontWeight: 600, color: '#4f46e5' }}>{v.customerName}</td>
                            <td>{v.purpose}</td>
                            <td>
                              <span className="badge badge-purple">{v.outcome}</span>
                            </td>
                            <td style={{ color: 'var(--text-muted)' }}>{v.locationAddress}</td>
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Register Field Visit</h3>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.2rem' }}
                  >
                    <X size={20} />
                  </button>
                </div>

                <form onSubmit={handleSaveVisit}>
                  <div className="form-group">
                    <label className="form-label">Customer / Shop Name</label>
                    <div style={{ position: 'relative' }}>
                      <Store size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      <input
                        type="text"
                        className="form-input"
                        style={{ paddingLeft: '2.5rem' }}
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
                      <Target size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      <input
                        type="text"
                        className="form-input"
                        style={{ paddingLeft: '2.5rem' }}
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
                      <CheckCircle2 size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      <input
                        type="text"
                        className="form-input"
                        style={{ paddingLeft: '2.5rem' }}
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
                      <MapPin size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                      <input
                        type="text"
                        className="form-input"
                        style={{ paddingLeft: '2.5rem' }}
                        placeholder="123 Commerce St, Downtown"
                        value={locationAddress}
                        onChange={(e) => setLocationAddress(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
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
