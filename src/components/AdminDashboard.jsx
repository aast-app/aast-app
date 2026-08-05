import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import Loader from './Loader';
const { ipcRenderer } = window.require('electron');

export default function AdminDashboard() {
  const { user, login } = useAuth();
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [message, setMessage] = useState('');
  const [isBackingUp, setIsBackingUp] = useState(false);

  // Create User State
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('user');

  // Edit User State
  const [editingUser, setEditingUser] = useState(null);
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editRole, setEditRole] = useState('user');
  const [isEditing, setIsEditing] = useState(false);

  // Delete User State
  const [userToDelete, setUserToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const response = await ipcRenderer.invoke('admin-get-users', { adminUsername: user.username });
      if (response.success) {
        setUsers(response.users);
      } else {
        setMessage(`Error: ${response.message}`);
      }
    } catch (error) {
      setMessage('Failed to fetch users.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualBackup = async () => {
    setMessage('');
    setIsBackingUp(true);
    try {
      const response = await ipcRenderer.invoke('admin-export-db', {
        adminUsername: user.username,
        mode: 'manual'
      });
      if (response.success) {
        setMessage(response.message);
      } else {
        if (response.message !== 'Export canceled by user.') {
          setMessage(`Error: ${response.message}`);
        }
      }
    } catch (error) {
      setMessage('Failed to export database.');
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setMessage('');
    setIsCreating(true);
    try {
      const response = await ipcRenderer.invoke('admin-create-user', {
        adminUsername: user.username,
        newUsername,
        newPassword,
        newRole
      });

      if (response.success) {
        setMessage(response.message);
        setNewUsername('');
        setNewPassword('');
        setNewRole('user');
        fetchUsers();
      } else {
        setMessage(`Error: ${response.message}`);
      }
    } catch (error) {
      setMessage('Failed to create user.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleEditUser = (targetUser) => {
    setEditingUser(targetUser.username);
    setEditUsername(targetUser.username);
    setEditRole(targetUser.role);
    setEditPassword('');
    setMessage('');
  };

  const submitEditUser = async (e) => {
    e.preventDefault();
    setMessage('');
    setIsEditing(true);
    try {
      const response = await ipcRenderer.invoke('admin-edit-user', {
        adminUsername: user.username,
        targetUsername: editingUser,
        newUsername: editUsername,
        newPassword: editPassword,
        newRole: editRole
      });

      if (response.success) {
        // If the admin successfully changed their own username, update the live session!
        if (response.newUsername && response.newUsername !== user.username && editingUser === user.username) {
          login({ ...user, username: response.newUsername });
        }
        setMessage(response.message);
        setEditingUser(null);
        fetchUsers();
      } else {
        setMessage(`Error: ${response.message}`);
      }
    } catch (error) {
      setMessage('Failed to edit user.');
    } finally {
      setIsEditing(false);
    }
  };

  const cancelEdit = () => {
    setEditingUser(null);
    setMessage('');
  };

  const handleDeleteUserClick = (targetUsername) => {
    setUserToDelete(targetUsername);
    setMessage('');
  };

  const cancelDelete = () => {
    setUserToDelete(null);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    try {
      const response = await ipcRenderer.invoke('admin-delete-user', {
        adminUsername: user.username,
        targetUsername: userToDelete
      });

      if (response.success) {
        setMessage(response.message);
        setUserToDelete(null);
        fetchUsers();
      } else {
        setMessage(`Error: ${response.message}`);
      }
    } catch (error) {
      setMessage('Failed to delete user.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="header-container" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-hero-title">
            Admin <span className="gradient-text">Dashboard</span>
          </h1>
          <p className="text-muted" style={{ fontSize: '1rem', marginTop: '0.5rem' }}>
            Manage System Users
          </p>
        </div>
        <button 
          onClick={handleManualBackup} 
          className="gradient-btn secondary" 
          style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
          disabled={isBackingUp}
        >
          {isBackingUp ? 'EXPORTING...' : 'BACKUP DATABASE'}
        </button>
      </div>

      {message && (
        <div className={`admin-message-box ${message.startsWith('Error') ? 'error' : 'success'}`}>
          {message}
        </div>
      )}

      <div className="admin-content-wrapper">
        
        {/* Left Column: Create User Form */}
        <div className="admin-sidebar">
          <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
            <h2 className="glass-card-title">Create Account</h2>
            {isCreating ? (
              <div style={{ padding: '2rem' }}><Loader /></div>
            ) : (
              <form onSubmit={handleCreateUser} className="create-user-form">
                <div className="admin-form-row">
                  <div className="modern-input-container">
                    <label className="modern-label">Username</label>
                    <input 
                      type="text" 
                      className="modern-input" 
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      required
                    />
                  </div>
                  <div className="modern-input-container">
                    <label className="modern-label">Password</label>
                    <input 
                      type="password" 
                      className="modern-input" 
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                    />
                  </div>
                  <div className="modern-input-container role-select-container">
                    <label className="modern-label">Role</label>
                    <select 
                      className="modern-input"
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value)}
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                </div>
                <button type="submit" className="gradient-btn admin-submit-btn" style={{ marginTop: '1rem' }}>
                  CREATE USER
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Right Column: User Roster */}
        <div className="admin-main-area">
          <div className="glass-card user-roster-card">
            <h2 className="glass-card-title">User Roster</h2>
            <div className="admin-table-container">
              {isLoading ? (
                <div style={{ padding: '4rem' }}><Loader /></div>
              ) : (
                <table className="admin-users-table">
                  <thead>
                    <tr>
                      <th>Username</th>
                      <th>Role</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id}>
                        <td>{u.username}</td>
                        <td>
                          <span className={`role-badge ${u.role === 'admin' ? 'role-admin' : 'role-user'}`}>
                            {u.role.toUpperCase()}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            {(u.role !== 'admin' || u.username === user.username) && (
                              <button 
                                className="gradient-btn secondary edit-btn-small" 
                                onClick={() => handleEditUser(u)}
                                style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}
                              >
                                EDIT
                              </button>
                            )}
                            {u.role !== 'admin' && (
                              <button 
                                className="solid-danger-btn edit-btn-small" 
                                onClick={() => handleDeleteUserClick(u.username)}
                                style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}
                              >
                                DELETE
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit User Modal (Overlay) */}
      <AnimatePresence>
        {editingUser && (
          <motion.div 
            className="admin-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div 
              className="admin-modal-card"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
            >
              <h2 className="glass-card-title">Edit {editingUser}</h2>
              {isEditing ? (
                <div style={{ padding: '2rem' }}><Loader /></div>
              ) : (
                <form onSubmit={submitEditUser} className="flex flex-col edit-user-form">
                  
                  <div className="modern-input-container">
                    <label className="modern-label">Username</label>
                    <input 
                      type="text" 
                      className="modern-input" 
                      value={editUsername}
                      onChange={(e) => setEditUsername(e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="modern-input-container">
                    <label className="modern-label">New Password (leave blank to keep current)</label>
                    <input 
                      type="password" 
                      className="modern-input" 
                      value={editPassword}
                      onChange={(e) => setEditPassword(e.target.value)}
                    />
                  </div>
                  
                  <div className="modern-input-container role-select-container">
                    <label className="modern-label">Role</label>
                    <select 
                      className="modern-input"
                      value={editRole}
                      onChange={(e) => setEditRole(e.target.value)}
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  
                  <div className="modal-action-row">
                    <button type="button" className="gradient-btn secondary" onClick={cancelEdit}>
                      CANCEL
                    </button>
                    <button type="submit" className="gradient-btn">
                      SAVE CHANGES
                    </button>
                  </div>

                </form>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete User Modal (Overlay) */}
      <AnimatePresence>
        {userToDelete && (
          <motion.div 
            className="admin-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div 
              className="admin-modal-card"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
            >
              <h2 className="glass-card-title">Delete {userToDelete}?</h2>
              {isDeleting ? (
                <div style={{ padding: '2rem' }}><Loader /></div>
              ) : (
                <>
                  <p className="text-muted" style={{ marginBottom: '2rem' }}>
                    Are you sure you want to delete this user? This action cannot be undone.
                  </p>
                  
                  <div className="modal-action-row">
                    <button type="button" className="gradient-btn secondary" onClick={cancelDelete}>
                      CANCEL
                    </button>
                    <button type="button" className="solid-danger-btn" onClick={confirmDeleteUser}>
                      CONFIRM DELETE
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
