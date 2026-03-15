import React, { useState, useEffect } from 'react';

const TaskBoard = ({ tasks, onMoveTask, onEditTask, onDeleteTask, onAssignTask }) => {
  const [draggedTask, setDraggedTask] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);

  const statusColumns = [
    { id: 'backlog', title: 'Backlog', icon: '📋' },
    { id: 'todo', title: 'TODO', icon: '📝' },
    { id: 'in_progress', title: 'In Progress', icon: '🔄' },
    { id: 'complete', title: 'Complete', icon: '✅' }
  ];

  const priorityColors = {
    low: '#6b7280',
    medium: '#3b82f6',
    high: '#f59e0b',
    critical: '#ef4444'
  };

  const handleDragStart = (e, task) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, columnId) => {
    e.preventDefault();
    setDragOverColumn(columnId);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = (e, columnId) => {
    e.preventDefault();
    if (draggedTask && draggedTask.status !== columnId) {
      onMoveTask(draggedTask.id, columnId);
    }
    setDraggedTask(null);
    setDragOverColumn(null);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getTasksByStatus = (status) => {
    return tasks.filter(t => t.status === status);
  };

  return (
    <div className="task-board">
      <div className="board-columns">
        {statusColumns.map(column => (
          <div
            key={column.id}
            className={`board-column ${dragOverColumn === column.id ? 'drag-over' : ''}`}
            onDragOver={(e) => handleDragOver(e, column.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, column.id)}
          >
            <div className="column-header">
              <span className="column-icon">{column.icon}</span>
              <span className="column-title">{column.title}</span>
              <span className="column-count">{getTasksByStatus(column.id).length}</span>
            </div>
            <div className="column-content">
              {getTasksByStatus(column.id).map(task => (
                <div
                  key={task.id}
                  className={`task-card ${draggedTask?.id === task.id ? 'dragging' : ''}`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, task)}
                >
                  <div className="task-header">
                    <span
                      className="task-priority"
                      style={{ backgroundColor: priorityColors[task.priority] || priorityColors.medium }}
                      title={`Priority: ${task.priority}`}
                    />
                    <span className="task-title">{task.title}</span>
                    <button
                      className="task-menu-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Could open a menu, for now just edit
                        onEditTask(task);
                      }}
                    >
                      ⋮
                    </button>
                  </div>
                  {task.description && (
                    <p className="task-description">{task.description}</p>
                  )}
                  <div className="task-footer">
                    <div className="task-labels">
                      {task.labels && task.labels.slice(0, 2).map((label, idx) => (
                        <span key={idx} className="task-label">{label}</span>
                      ))}
                    </div>
                    <div className="task-meta">
                      {task.assignedAgent ? (
                        <span className="task-agent" title={`Assigned to: ${task.assignedAgent}`}>
                          🤖 {task.assignedAgent}
                        </span>
                      ) : (
                        <button
                          className="assign-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            onAssignTask(task);
                          }}
                        >
                          Assign
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="task-dates">
                    <span className="task-date">Created: {formatDate(task.createdAt)}</span>
                    {task.completedAt && (
                      <span className="task-date completed">Completed: {formatDate(task.completedAt)}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TaskBoard;