import React, { useState, useEffect } from 'react';

const TaskModal = ({ isOpen, onClose, onSave, onDelete, task, mode = 'create' }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'backlog',
    priority: 'medium',
    labels: [],
    assignedAgent: ''
  });
  const [labelInput, setLabelInput] = useState('');

  useEffect(() => {
    if (task && mode === 'edit') {
      setFormData({
        title: task.title || '',
        description: task.description || '',
        status: task.status || 'backlog',
        priority: task.priority || 'medium',
        labels: task.labels || [],
        assignedAgent: task.assignedAgent || ''
      });
    } else {
      setFormData({
        title: '',
        description: '',
        status: 'backlog',
        priority: 'medium',
        labels: [],
        assignedAgent: ''
      });
    }
    setLabelInput('');
  }, [task, mode, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddLabel = () => {
    if (labelInput.trim() && !formData.labels.includes(labelInput.trim())) {
      setFormData(prev => ({
        ...prev,
        labels: [...prev.labels, labelInput.trim()]
      }));
      setLabelInput('');
    }
  };

  const handleRemoveLabel = (labelToRemove) => {
    setFormData(prev => ({
      ...prev,
      labels: prev.labels.filter(l => l !== labelToRemove)
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    const taskData = {
      ...formData,
      assignedAgent: formData.assignedAgent.trim() || null
    };

    onSave(taskData);
    onClose();
  };

  const handleDelete = () => {
    if (task && window.confirm('Are you sure you want to delete this task?')) {
      onDelete(task.id);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{mode === 'create' ? 'Create New Task' : 'Edit Task'}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit} className="task-form">
          <div className="form-group">
            <label htmlFor="title">Title *</label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Task title..."
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Task description..."
              rows={3}
            />
          </div>

          <div className="form-group">
            <label htmlFor="status">Status</label>
            <select
              id="status"
              name="status"
              value={formData.status}
              onChange={handleChange}
            >
              <option value="backlog">Backlog</option>
              <option value="todo">TODO</option>
              <option value="in_progress">In Progress</option>
              <option value="complete">Complete</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="priority">Priority</label>
            <select
              id="priority"
              name="priority"
              value={formData.priority}
              onChange={handleChange}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          <div className="form-group">
            <label>Labels</label>
            <div className="labels-input">
              <input
                type="text"
                value={labelInput}
                onChange={e => setLabelInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddLabel();
                  }
                }}
                placeholder="Add label..."
              />
              <button type="button" className="add-label-btn" onClick={handleAddLabel}>Add</button>
            </div>
            <div className="labels-list">
              {formData.labels.map((label, idx) => (
                <span key={idx} className="label-tag">
                  {label}
                  <button type="button" onClick={() => handleRemoveLabel(label)}>×</button>
                </span>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="assignedAgent">Assigned Agent</label>
            <input
              type="text"
              id="assignedAgent"
              name="assignedAgent"
              value={formData.assignedAgent}
              onChange={handleChange}
              placeholder="Agent name (optional)..."
            />
          </div>

          <div className="form-actions">
            {mode === 'edit' && (
              <button type="button" className="delete-btn" onClick={handleDelete}>
                Delete Task
              </button>
            )}
            <div className="right-actions">
              <button type="button" className="cancel-btn" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="save-btn">
                {mode === 'create' ? 'Create Task' : 'Save Changes'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskModal;