import React, { useState, useEffect } from 'react';
import { getHealth, getMetrics, getBoardTasks, createBoardTask, updateBoardTask, moveBoardTask, deleteBoardTask, assignBoardTask } from './api';
import TaskBoard from './TaskBoard';
import TaskModal from './TaskModal';
import './App.css';

function App() {
  const [backendStatus, setBackendStatus] = useState('connecting');
  const [metrics, setMetrics] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [boardTasks, setBoardTasks] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [modalMode, setModalMode] = useState('create');

  useEffect(() => {
    checkBackendHealth();
    const metricsInterval = setInterval(fetchMetrics, 5000);
    return () => {
      clearInterval(metricsInterval);
    };
  }, []);

  useEffect(() => {
    if (backendStatus === 'connected') {
      fetchBoardTasks();
    }
  }, [backendStatus]);

  const checkBackendHealth = async () => {
    try {
      const response = await getHealth();
      if (response.data && response.data.status === 'OK') {
        setBackendStatus('connected');
        setError(null);
        fetchMetrics();
      } else {
        setBackendStatus('error');
        setError('Backend returned unexpected response');
      }
    } catch (err) {
      setBackendStatus('disconnected');
      setError(err.message || 'Cannot connect to backend');
    }
  };

  const fetchMetrics = async () => {
    if (backendStatus === 'disconnected') return;
    try {
      const response = await getMetrics();
      setMetrics(response.data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch metrics:', err);
    }
  };

  const fetchBoardTasks = async () => {
    try {
      const response = await getBoardTasks();
      setBoardTasks(response.data);
    } catch (err) {
      console.error('Failed to fetch board tasks:', err);
    }
  };

  const handleMoveTask = async (taskId, newStatus) => {
    try {
      await moveBoardTask(taskId, newStatus);
      await fetchBoardTasks();
    } catch (err) {
      console.error('Failed to move task:', err);
    }
  };

  const handleEditTask = (task) => {
    setEditingTask(task);
    setModalMode('edit');
    setIsModalOpen(true);
  };

  const handleDeleteTask = async (taskId) => {
    try {
      await deleteBoardTask(taskId);
      await fetchBoardTasks();
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  };

  const handleAssignTask = async (task) => {
    const agentName = prompt('Enter agent name to assign:');
    if (agentName !== null) {
      try {
        await assignBoardTask(task.id, agentName.trim() || null);
        await fetchBoardTasks();
      } catch (err) {
        console.error('Failed to assign task:', err);
      }
    }
  };

  const handleSaveTask = async (taskData) => {
    try {
      if (modalMode === 'create') {
        await createBoardTask(taskData);
      } else {
        await updateBoardTask(editingTask.id, taskData);
      }
      await fetchBoardTasks();
    } catch (err) {
      console.error('Failed to save task:', err);
    }
  };

  const handleCreateTask = () => {
    setEditingTask(null);
    setModalMode('create');
    setIsModalOpen(true);
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatUptime = (ms) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Mission Control</h1>
        <p className="subtitle">OpenClaw Monitoring Dashboard</p>
      </header>

      <nav className="tab-nav">
        <button
          className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('dashboard')}
        >
          Dashboard
        </button>
        <button
          className={`tab-btn ${activeTab === 'tasks' ? 'active' : ''}`}
          onClick={() => setActiveTab('tasks')}
        >
          Tasks
        </button>
      </nav>

      <main className="dashboard">
        {/* Connection Status */}
        <section className="status-bar">
          <div className={`status-indicator ${backendStatus}`}>
            <span className="status-dot"></span>
            <span className="status-text">
              {backendStatus === 'connecting' && 'Connecting...'}
              {backendStatus === 'connected' && 'Connected'}
              {backendStatus === 'disconnected' && 'Disconnected'}
              {backendStatus === 'error' && 'Error'}
            </span>
          </div>
          {error && <span className="error-text">{error}</span>}
        </section>

        {activeTab === 'dashboard' && backendStatus === 'connected' && metrics && (
          <>
            {/* System Metrics */}
            <section className="metrics-grid">
              <h2>System Metrics</h2>
              <div className="metrics-cards">
                {/* CPU Usage */}
                <div className="metric-card">
                  <div className="metric-icon">🖥️</div>
                  <div className="metric-content">
                    <h3>CPU Usage</h3>
                    <div className="metric-value">{metrics.cpuUsage?.percent || 0}%</div>
                    <div className="metric-detail">
                      {metrics.cpuUsage?.count || 0} cores
                    </div>
                  </div>
                  <div className="metric-bar">
                    <div
                      className="metric-bar-fill"
                      style={{ width: `${metrics.cpuUsage?.percent || 0}%` }}
                    ></div>
                  </div>
                </div>

                {/* Memory Usage */}
                <div className="metric-card">
                  <div className="metric-icon">💾</div>
                  <div className="metric-content">
                    <h3>Memory Usage</h3>
                    <div className="metric-value">{metrics.memoryUsage?.percent || 0}%</div>
                    <div className="metric-detail">
                      {formatBytes(metrics.memoryUsage?.used || 0)} / {formatBytes(metrics.memoryUsage?.total || 0)}
                    </div>
                  </div>
                  <div className="metric-bar">
                    <div
                      className="metric-bar-fill"
                      style={{ width: `${metrics.memoryUsage?.percent || 0}%` }}
                    ></div>
                  </div>
                </div>

                {/* Disk Usage */}
                <div className="metric-card">
                  <div className="metric-icon">💿</div>
                  <div className="metric-content">
                    <h3>Disk Usage</h3>
                    <div className="metric-value">{metrics.diskUsage?.percent || 0}%</div>
                    <div className="metric-detail">
                      {formatBytes(metrics.diskUsage?.used || 0)} / {formatBytes(metrics.diskUsage?.total || 0)}
                    </div>
                  </div>
                  <div className="metric-bar">
                    <div
                      className="metric-bar-fill"
                      style={{ width: `${metrics.diskUsage?.percent || 0}%` }}
                    ></div>
                  </div>
                </div>

                {/* Uptime */}
                <div className="metric-card">
                  <div className="metric-icon">⏱️</div>
                  <div className="metric-content">
                    <h3>Uptime</h3>
                    <div className="metric-value">{formatUptime(metrics.uptime || 0)}</div>
                    <div className="metric-detail">
                      Since {new Date().toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Alerts */}
            {metrics.alerts && metrics.alerts.length > 0 && (
              <section className="alerts-section">
                <h2>Alerts</h2>
                <div className="alerts-list">
                  {metrics.alerts.slice(-5).map((alert, index) => (
                    <div key={index} className={`alert-item ${alert.severity}`}>
                      <span className="alert-type">{alert.type}</span>
                      <span className="alert-message">{alert.message}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {activeTab === 'tasks' && (
          <section className="tasks-section">
            <div className="tasks-header">
              <h2>Task Board</h2>
              <button className="create-task-btn" onClick={handleCreateTask}>
                + New Task
              </button>
            </div>
            <TaskBoard
              tasks={boardTasks}
              onMoveTask={handleMoveTask}
              onEditTask={handleEditTask}
              onDeleteTask={handleDeleteTask}
              onAssignTask={handleAssignTask}
            />
          </section>
        )}

        {backendStatus === 'disconnected' && (
          <section className="error-section">
            <h2>Connection Error</h2>
            <p>Cannot connect to the Mission Control backend.</p>
            <p>Make sure the backend is running on port 3001.</p>
            <button onClick={checkBackendHealth}>Retry Connection</button>
          </section>
        )}
      </main>

      <TaskModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTask(null);
        }}
        onSave={handleSaveTask}
        onDelete={handleDeleteTask}
        task={editingTask}
        mode={modalMode}
      />

      <footer className="App-footer">
        <p>Mission Control Tool v1.0.0</p>
      </footer>
    </div>
  );
}

export default App;