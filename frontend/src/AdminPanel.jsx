import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import './admin.css';

const API_URL = 'http://127.0.0.1:5000/api';

export default function AdminPanel() {
  const navigate = useNavigate();
  const { user, token, isAdmin, logout } = useAuth();

  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  
  // Inspector modal state
  const [selectedUser, setSelectedUser] = useState(null);
  const [inspectData, setInspectData] = useState(null);
  const [inspectLoading, setInspectLoading] = useState(false);
  const [activeInspectTab, setActiveInspectTab] = useState('advisor');

  // Create User modal
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState('user');
  const [addLoading, setAddLoading] = useState(false);

  useEffect(() => {
    if (!token || !isAdmin) {
      navigate('/login');
      return;
    }

    loadAdminData();
  }, [token, isAdmin, navigate]);

  const loadAdminData = async () => {
    setLoading(true);
    setError('');
    try {
      const [statsRes, usersRes] = await Promise.all([
        fetch(`${API_URL}/admin/stats`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/admin/users`, { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (!statsRes.ok || !usersRes.ok) {
        throw new Error('Failed to load admin telemetry');
      }

      const statsJson = await statsRes.json();
      const usersJson = await usersRes.json();

      setStats(statsJson);
      setUsers(usersJson.users || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInspectUser = async (u) => {
    setSelectedUser(u);
    setInspectLoading(true);
    setInspectData(null);

    try {
      const res = await fetch(`${API_URL}/admin/users/${u.id}/data`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to load user financial data');
      const json = await res.json();
      setInspectData(json.storedData || {});
      
      // Auto select first available tab
      const availableTabs = Object.keys(json.storedData || {});
      if (availableTabs.length > 0) {
        setActiveInspectTab(availableTabs[0]);
      } else {
        setActiveInspectTab('none');
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setInspectLoading(false);
    }
  };

  const handleToggleRole = async (targetUser) => {
    const newRole = targetUser.role === 'admin' ? 'user' : 'admin';
    const confirmChange = window.confirm(`Change role of ${targetUser.email} to ${newRole.toUpperCase()}?`);
    if (!confirmChange) return;

    try {
      const res = await fetch(`${API_URL}/admin/users/${targetUser.id}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ role: newRole })
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Failed to update role');
      }

      await loadAdminData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteUser = async (targetUser) => {
    if (targetUser.id === user.id) {
      alert('You cannot delete your own active admin account.');
      return;
    }

    const confirmDelete = window.confirm(`Are you sure you want to permanently delete user "${targetUser.name}" (${targetUser.email}) and all their stored financial data?`);
    if (!confirmDelete) return;

    try {
      const res = await fetch(`${API_URL}/admin/users/${targetUser.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Failed to delete user');
      }

      await loadAdminData();
      if (selectedUser?.id === targetUser.id) {
        setSelectedUser(null);
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setAddLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newUserName,
          email: newUserEmail,
          password: newUserPassword
        })
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to create user');

      // If requested role is admin, update it
      if (newUserRole === 'admin') {
        await fetch(`${API_URL}/admin/users/${json.user.id}/role`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ role: 'admin' })
        });
      }

      setShowAddUserModal(false);
      setNewUserName('');
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserRole('user');
      await loadAdminData();
    } catch (err) {
      alert(err.message);
    } finally {
      setAddLoading(false);
    }
  };

  const filteredUsers = users.filter(u => 
    u.name?.toLowerCase().includes(search.toLowerCase()) || 
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.role?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="admin-page">
      {/* Navbar */}
      <header className="admin-header">
        <div className="admin-header__brand">
          <Link to="/" className="admin-logo">
            <div className="admin-logo-icon">👑</div>
            <span className="admin-logo-text">FINEXO <span className="gold">ADMIN</span></span>
          </Link>
          <div className="admin-badge">ROOT ACCESS</div>
        </div>

        <div className="admin-header__actions">
          <div className="admin-user-pill">
            <span className="admin-user-avatar">👤</span>
            <span>{user?.name}</span>
            <span className="admin-role-tag">Super Admin</span>
          </div>
          <Link to="/" className="admin-link-btn">Return to Hub</Link>
          <button className="admin-logout-btn" onClick={logout}>Sign Out</button>
        </div>
      </header>

      <main className="admin-main">
        {/* KPI Telemetry Banner */}
        <section className="admin-kpi-grid">
          <div className="admin-kpi-card">
            <div className="kpi-icon blue">👥</div>
            <div className="kpi-info">
              <span className="kpi-label">Total Users</span>
              <span className="kpi-val">{stats?.totalUsers ?? '...'}</span>
              <span className="kpi-sub">Across all engines</span>
            </div>
          </div>

          <div className="admin-kpi-card">
            <div className="kpi-icon gold">👑</div>
            <div className="kpi-info">
              <span className="kpi-label">Administrators</span>
              <span className="kpi-val gold">{stats?.totalAdmins ?? '...'}</span>
              <span className="kpi-sub">Privileged roles</span>
            </div>
          </div>

          <div className="admin-kpi-card">
            <div className="kpi-icon green">💾</div>
            <div className="kpi-info">
              <span className="kpi-label">Stored Engine Datasets</span>
              <span className="kpi-val green">{stats?.totalEnginesSaved ?? '...'}</span>
              <span className="kpi-sub">Autofill synced profiles</span>
            </div>
          </div>

          <div className="admin-kpi-card">
            <div className="kpi-icon indigo">⚡</div>
            <div className="kpi-info">
              <span className="kpi-label">Active AI Engines</span>
              <span className="kpi-val indigo">5 / 5</span>
              <span className="kpi-sub">Online · FastAPI + Express</span>
            </div>
          </div>
        </section>

        {/* User Management Section */}
        <section className="admin-users-section">
          <div className="admin-section-header">
            <div>
              <h2 className="admin-section-title">User Accounts & Engine Storage</h2>
              <p className="admin-section-sub">Inspect stored financial models, manage access permissions, and manage user lifecycles.</p>
            </div>
            <div className="admin-controls-row">
              <div className="admin-search-box">
                <span className="search-icon">🔍</span>
                <input 
                  type="text" 
                  placeholder="Search by name, email or role..." 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="admin-search-input"
                />
                {search && <button className="clear-search" onClick={() => setSearch('')}>✕</button>}
              </div>
              <button className="admin-add-btn" onClick={() => setShowAddUserModal(true)}>
                + Create New User
              </button>
            </div>
          </div>

          {error && <div className="admin-error-banner">⚠️ {error}</div>}

          {/* Users Table */}
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>User Profile</th>
                  <th>Role</th>
                  <th>Stored Engines</th>
                  <th>Registered</th>
                  <th>Last Active</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="6" className="table-empty">Loading user database...</td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="table-empty">No matching users found.</td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u.id} className={u.id === user.id ? 'current-admin-row' : ''}>
                      <td>
                        <div className="user-profile-cell">
                          <div className="user-avatar-circle">
                            {u.name ? u.name.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <div>
                            <div className="user-name">
                              {u.name} {u.id === user.id && <span className="you-badge">(You)</span>}
                            </div>
                            <div className="user-email">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`role-badge ${u.role === 'admin' ? 'role-admin' : 'role-user'}`}>
                          {u.role === 'admin' ? '👑 Admin' : '👤 User'}
                        </span>
                      </td>
                      <td>
                        <div className="engines-saved-chips">
                          <span className="saved-count-pill">{u.savedEnginesCount} / 5</span>
                          {u.hasFinancialAdvisorData && <span className="engine-chip" title="Financial Advisor">🧠 Advisor</span>}
                          {u.hasTaxData && <span className="engine-chip" title="Tax Planner">⚖️ Tax</span>}
                          {u.hasSimulatorData && <span className="engine-chip" title="Goal Simulator">🎯 Goal</span>}
                          {u.hasPortfolioData && <span className="engine-chip" title="Portfolio">📈 Port</span>}
                          {u.hasIrregularIncomeData && <span className="engine-chip" title="Freelance Income">🌊 Freelance</span>}
                        </div>
                      </td>
                      <td>
                        <span className="date-text">
                          {new Date(u.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </td>
                      <td>
                        <span className="date-text">
                          {u.lastLogin ? new Date(u.lastLogin).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Never'}
                        </span>
                      </td>
                      <td>
                        <div className="table-actions">
                          <button 
                            className="action-btn inspect-btn" 
                            title="Inspect User Financial Model Inputs"
                            onClick={() => handleInspectUser(u)}
                          >
                            🔍 View Data
                          </button>
                          <button 
                            className="action-btn role-btn" 
                            title="Toggle User/Admin Role"
                            onClick={() => handleToggleRole(u)}
                          >
                            🔄 Role
                          </button>
                          <button 
                            className="action-btn delete-btn" 
                            title="Delete User"
                            onClick={() => handleDeleteUser(u)}
                            disabled={u.id === user.id}
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {/* User Data Inspector Modal */}
      {selectedUser && (
        <div className="admin-modal-overlay" onClick={() => setSelectedUser(null)}>
          <div className="admin-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <div className="modal-title-wrap">
                <span className="modal-icon">📊</span>
                <div>
                  <h3 className="modal-title">Financial Data Inspector</h3>
                  <p className="modal-subtitle">User: <strong>{selectedUser.name}</strong> ({selectedUser.email})</p>
                </div>
              </div>
              <button className="modal-close-btn" onClick={() => setSelectedUser(null)}>✕</button>
            </div>

            {inspectLoading ? (
              <div className="modal-loading">Loading saved engine parameters...</div>
            ) : !inspectData || Object.keys(inspectData).length === 0 ? (
              <div className="modal-empty">
                <span>📭 No financial data saved yet for this user.</span>
                <p>When this user runs any engine, their inputted values will automatically appear here.</p>
              </div>
            ) : (
              <div className="inspector-body">
                {/* Inspector Tabs */}
                <div className="inspector-tabs">
                  {inspectData.advisor && (
                    <button 
                      className={`inspector-tab-btn ${activeInspectTab === 'advisor' ? 'active' : ''}`}
                      onClick={() => setActiveInspectTab('advisor')}
                    >
                      🧠 Financial Advisor
                    </button>
                  )}
                  {inspectData.tax && (
                    <button 
                      className={`inspector-tab-btn ${activeInspectTab === 'tax' ? 'active' : ''}`}
                      onClick={() => setActiveInspectTab('tax')}
                    >
                      ⚖️ Tax Planner
                    </button>
                  )}
                  {inspectData.simulator && (
                    <button 
                      className={`inspector-tab-btn ${activeInspectTab === 'simulator' ? 'active' : ''}`}
                      onClick={() => setActiveInspectTab('simulator')}
                    >
                      🎯 Goal Simulator
                    </button>
                  )}
                  {inspectData.portfolio && (
                    <button 
                      className={`inspector-tab-btn ${activeInspectTab === 'portfolio' ? 'active' : ''}`}
                      onClick={() => setActiveInspectTab('portfolio')}
                    >
                      📈 Portfolio
                    </button>
                  )}
                  {inspectData.irregular_income && (
                    <button 
                      className={`inspector-tab-btn ${activeInspectTab === 'irregular_income' ? 'active' : ''}`}
                      onClick={() => setActiveInspectTab('irregular_income')}
                    >
                      🌊 Irregular Income
                    </button>
                  )}
                </div>

                {/* Tab Values Grid */}
                <div className="inspector-content">
                  {inspectData[activeInspectTab] ? (
                    <div className="inspector-fields-grid">
                      {Object.entries(inspectData[activeInspectTab]).map(([key, val]) => (
                        <div key={key} className="inspector-field-card">
                          <span className="field-key">{key.replace(/_/g, ' ')}</span>
                          <span className="field-val">
                            {typeof val === 'number' 
                              ? val.toLocaleString('en-IN') 
                              : typeof val === 'object' 
                                ? JSON.stringify(val) 
                                : String(val)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="modal-empty">Select an engine above to inspect stored parameters.</div>
                  )}
                </div>
              </div>
            )}

            <div className="admin-modal-footer">
              <span className="sync-note">🟢 Data is synchronized in real-time with the persistent storage engine.</span>
              <button className="modal-done-btn" onClick={() => setSelectedUser(null)}>Close Inspector</button>
            </div>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="admin-modal-overlay" onClick={() => setShowAddUserModal(false)}>
          <div className="admin-modal-card add-user-card" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <div className="modal-title-wrap">
                <span className="modal-icon">➕</span>
                <h3 className="modal-title">Create User Account</h3>
              </div>
              <button className="modal-close-btn" onClick={() => setShowAddUserModal(false)}>✕</button>
            </div>

            <form onSubmit={handleCreateUser} className="add-user-form">
              <div className="add-form-field">
                <label>Full Name</label>
                <input 
                  type="text" 
                  required 
                  placeholder="e.g. Priya Nair"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                />
              </div>

              <div className="add-form-field">
                <label>Email Address</label>
                <input 
                  type="email" 
                  required 
                  placeholder="priya@example.com"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                />
              </div>

              <div className="add-form-field">
                <label>Password</label>
                <input 
                  type="password" 
                  required 
                  placeholder="Temporary password"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                />
              </div>

              <div className="add-form-field">
                <label>Account Role</label>
                <select value={newUserRole} onChange={(e) => setNewUserRole(e.target.value)}>
                  <option value="user">Regular User (Standard Access)</option>
                  <option value="admin">Administrator (Full Admin Access)</option>
                </select>
              </div>

              <div className="admin-modal-footer">
                <button type="button" className="modal-cancel-btn" onClick={() => setShowAddUserModal(false)}>Cancel</button>
                <button type="submit" className="modal-done-btn" disabled={addLoading}>
                  {addLoading ? 'Creating User...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
