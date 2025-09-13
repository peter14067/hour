import { useState, useRef, useEffect } from 'react';
import './TodoList.css';

const CATEGORIES = [
  { key: 'work', label: '工作', color: '#4f46e5' },
  { key: 'study', label: '學習', color: '#16a34a' },
  { key: 'project', label: '專案', color: '#ea580c' },
  { key: 'life', label: '生活', color: '#0891b2' },
];

function TodoList({ todos, onTodoUpdate, onTodoCreate, onTodoDelete }) {
  const [newTodo, setNewTodo] = useState('');
  const [newCategory, setNewCategory] = useState('work');
  const [editingId, setEditingId] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [draggedTodo, setDraggedTodo] = useState(null);
  const inputRef = useRef(null);

  // 根據時間範圍篩選待辦事項
  const filteredTodos = todos.filter(todo => {
    // 只顯示未排程的待辦事項
    return todo.status === 'unscheduled';
  });

  const handleAddTodo = () => {
    const trimmed = newTodo.trim();
    if (!trimmed) return;
    
    const todo = {
      id: Date.now(),
      text: trimmed, // 不添加時間前綴，讓用戶拖拽到時間軸時再添加
      category: newCategory,
      status: 'unscheduled', // 未排程
      createdAt: new Date().toISOString(),
    };

    onTodoCreate(todo);
    setNewTodo('');
  };

  const handleEditStart = (todo) => {
    setEditingId(todo.id);
    setEditingText(todo.text); // 直接使用原始文字，因為沒有時間前綴
  };

  const handleEditSave = () => {
    if (!editingId) return;
    
    const updatedText = editingText.trim();
    
    onTodoUpdate(editingId, { text: updatedText });
    setEditingId(null);
    setEditingText('');
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditingText('');
  };

  const handleDragStart = (e, todo) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', JSON.stringify({
      ...todo,
      source: 'todoList'
    }));
    setDraggedTodo(todo);
  };

  const handleDragEnd = () => {
    setDraggedTodo(null);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      if (editingId) {
        handleEditSave();
      } else {
        handleAddTodo();
      }
    } else if (e.key === 'Escape' && editingId) {
      handleEditCancel();
    }
  };

  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editingId]);

  return (
    <div className="todo-list-container">
      <div className="todo-list-header">
        <h3>待辦清單</h3>
      </div>

      <div className="todo-input-section">
        <div className="todo-input-group">
          <input
            ref={inputRef}
            type="text"
            className="todo-input"
            placeholder="新增待辦事項..."
            value={editingId ? editingText : newTodo}
            onChange={(e) => editingId ? setEditingText(e.target.value) : setNewTodo(e.target.value)}
            onKeyPress={handleKeyPress}
          />
          <select
            className="todo-category-select"
            value={editingId ? todos.find(t => t.id === editingId)?.category || 'work' : newCategory}
            onChange={(e) => editingId ? null : setNewCategory(e.target.value)}
            disabled={!!editingId}
          >
            {CATEGORIES.map(cat => (
              <option key={cat.key} value={cat.key}>{cat.label}</option>
            ))}
          </select>
          {editingId ? (
            <div className="todo-edit-actions">
              <button className="btn-save" onClick={handleEditSave}>✓</button>
              <button className="btn-cancel" onClick={handleEditCancel}>✕</button>
            </div>
          ) : (
            <button className="btn-add" onClick={handleAddTodo}>+</button>
          )}
        </div>
      </div>

      <div className="todo-list">
        {filteredTodos.length === 0 ? (
          <div className="empty-todos">
            尚無待辦事項
          </div>
        ) : (
          filteredTodos.map(todo => {
            const category = CATEGORIES.find(c => c.key === todo.category);
            
            return (
              <div
                key={todo.id}
                className={`todo-item ${todo.status} ${draggedTodo?.id === todo.id ? 'dragging' : ''}`}
                draggable
                onDragStart={(e) => handleDragStart(e, todo)}
                onDragEnd={handleDragEnd}
              >
                <div className="todo-drag-handle">⋮⋮</div>
                <div 
                  className="todo-category-dot"
                  style={{ backgroundColor: category?.color || '#94a3b8' }}
                />
                <div className="todo-content">
                  <div className="todo-text">{todo.text}</div>
                </div>
                <div className="todo-status">
                  {todo.status === 'scheduled' ? '已安排' : '未排程'}
                </div>
                <div className="todo-actions">
                  <button 
                    className="btn-edit"
                    onClick={() => handleEditStart(todo)}
                    title="編輯"
                  >
                    ✎
                  </button>
                  <button 
                    className="btn-delete"
                    onClick={() => onTodoDelete(todo.id)}
                    title="刪除"
                  >
                    🗑
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="todo-stats">
        <span>總計：{todos.length} 項</span>
        <span>已安排：{todos.filter(t => t.status === 'scheduled').length} 項</span>
        <span>未排程：{todos.filter(t => t.status === 'unscheduled').length} 項</span>
      </div>
    </div>
  );
}

export default TodoList;
