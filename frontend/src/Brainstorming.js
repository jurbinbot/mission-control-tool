import React, { useState } from 'react';
import {
  createBrainstorm,
  updateBrainstorm,
  processBrainstorm,
  convertBrainstorm,
  deleteBrainstorm
} from './api';
import './Brainstorming.css';

function Brainstorming({ brainstorms, onRefresh }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState(null);
  const [modalMode, setModalMode] = useState('create');
  const [title, setTitle] = useState('');
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isConverting, setIsConverting] = useState(false);

  const handleCreateNew = () => {
    setEditingSession(null);
    setTitle('');
    setInput('');
    setOutput('');
    setModalMode('create');
    setIsModalOpen(true);
  };

  const handleEdit = (session) => {
    setEditingSession(session);
    setTitle(session.title);
    setInput(session.input);
    setOutput(session.output || '');
    setModalMode(session.status === 'draft' ? 'edit' : 'view');
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      alert('Title is required');
      return;
    }

    try {
      if (modalMode === 'create') {
        await createBrainstorm({ title: title.trim(), input: input.trim() });
      } else if (editingSession) {
        await updateBrainstorm(editingSession.id, {
          title: title.trim(),
          input: input.trim()
        });
      }
      setIsModalOpen(false);
      onRefresh();
    } catch (err) {
      console.error('Failed to save brainstorm:', err);
      alert('Failed to save brainstorm');
    }
  };

  const handleProcess = async () => {
    if (!editingSession) return;

    setIsProcessing(true);
    try {
      const response = await processBrainstorm(editingSession.id);
      setOutput(response.data.output);
      onRefresh();
    } catch (err) {
      console.error('Failed to process brainstorm:', err);
      alert('Failed to process brainstorm: ' + (err.response?.data?.error || err.message));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConvert = async () => {
    if (!editingSession) return;

    const confirmed = window.confirm('This will create tasks from the processed output. Continue?');
    if (!confirmed) return;

    setIsConverting(true);
    try {
      const response = await convertBrainstorm(editingSession.id);
      setIsModalOpen(false);
      onRefresh();
      alert(`Created ${response.data.tasks.length} tasks from this brainstorm`);
    } catch (err) {
      console.error('Failed to convert brainstorm:', err);
      alert('Failed to convert brainstorm: ' + (err.response?.data?.error || err.message));
    } finally {
      setIsConverting(false);
    }
  };

  const handleDelete = async (id) => {
    const confirmed = window.confirm('Are you sure you want to delete this brainstorm?');
    if (!confirmed) return;

    try {
      await deleteBrainstorm(id);
      onRefresh();
    } catch (err) {
      console.error('Failed to delete brainstorm:', err);
      alert('Failed to delete brainstorm');
    }
  };

  const getStatusBadge = (status) => {
    const statusStyles = {
      draft: { bg: '#e3f2fd', color: '#1565c0' },
      processed: { bg: '#fff3e0', color: '#ef6c00' },
      converted: { bg: '#e8f5e9', color: '#2e7d32' }
    };
    const style = statusStyles[status] || statusStyles.draft;
    return (
      <span className="status-badge" style={style}>
        {status}
      </span>
    );
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="brainstorming">
      <div className="brainstorming-header">
        <h2>Brainstorming</h2>
        <button className="create-btn" onClick={handleCreateNew}>
          + New Session
        </button>
      </div>

      <div className="brainstorms-list">
        {brainstorms.length === 0 ? (
          <div className="empty-state">
            <p>No brainstorming sessions yet.</p>
            <p>Click "New Session" to start capturing your ideas.</p>
          </div>
        ) : (
          brainstorms.map((session) => (
            <div key={session.id} className="brainstorm-card">
              <div className="brainstorm-header-row">
                <h3>{session.title}</h3>
                {getStatusBadge(session.status)}
              </div>
              <div className="brainstorm-meta">
                <span>Created: {formatDate(session.createdAt)}</span>
                {session.convertedTo && session.convertedTo.length > 0 && (
                  <span>Tasks: {session.convertedTo.length}</span>
                )}
              </div>
              <div className="brainstorm-actions">
                <button className="action-btn view" onClick={() => handleEdit(session)}>
                  {session.status === 'draft' ? 'Edit' : 'View'}
                </button>
                <button
                  className="action-btn delete"
                  onClick={() => handleDelete(session.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal brainstorm-modal">
            <div className="modal-header">
              <h3>
                {modalMode === 'create' ? 'New Brainstorming Session' : editingSession?.title}
              </h3>
              <button className="close-btn" onClick={() => setIsModalOpen(false)}>
                ×
              </button>
            </div>

            <div className="modal-body">
              {modalMode === 'create' || modalMode === 'edit' ? (
                <>
                  <div className="form-group">
                    <label>Title</label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Enter a title for your brainstorm"
                    />
                  </div>
                  <div className="form-group">
                    <label>Your Ideas</label>
                    <textarea
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Dump your ideas here... Let your thoughts flow freely."
                      rows={10}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="view-section">
                    <h4>Input</h4>
                    <div className="content-box input-box">
                      {editingSession?.input || 'No input provided'}
                    </div>
                  </div>
                  <div className="view-section">
                    <h4>Agent Analysis</h4>
                    <div className="content-box output-box">
                      {output || editingSession?.output || 'Not yet processed'}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="modal-footer">
              {modalMode === 'create' || modalMode === 'edit' ? (
                <>
                  <button className="btn secondary" onClick={() => setIsModalOpen(false)}>
                    Cancel
                  </button>
                  <button className="btn primary" onClick={handleSave}>
                    {modalMode === 'create' ? 'Create' : 'Save'}
                  </button>
                </>
              ) : (
                <>
                  <button className="btn secondary" onClick={() => setIsModalOpen(false)}>
                    Close
                  </button>
                  {editingSession?.status === 'draft' && (
                    <button
                      className="btn primary"
                      onClick={handleProcess}
                      disabled={isProcessing}
                    >
                      {isProcessing ? 'Processing...' : 'Process with Agent'}
                    </button>
                  )}
                  {editingSession?.status === 'processed' && (
                    <button
                      className="btn success"
                      onClick={handleConvert}
                      disabled={isConverting}
                    >
                      {isConverting ? 'Converting...' : 'Create Tasks'}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Brainstorming;