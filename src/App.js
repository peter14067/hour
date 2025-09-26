import { useEffect, useMemo, useRef, useState } from 'react';
import './App.css';
import TodoList from './TodoList';

const CATEGORIES = [
  { key: 'work', label: '工作', color: '#4f46e5' },
  { key: 'study', label: '學習', color: '#16a34a' },
  { key: 'project', label: '專案', color: '#ea580c' },
  { key: 'life', label: '生活', color: '#0891b2' },
];

function formatDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDateDisplay(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const w = ['週日','週一','週二','週三','週四','週五','週六'][date.getDay()];
  return `${y}/${m}/${d}（${w}）`;
}

function parseTimeFromText(text) {
  const match = text.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  if (!match) return null;
  const [hh, mm] = [parseInt(match[1], 10), parseInt(match[2], 10)];
  return hh * 60 + mm;
}

function formatMinutesToTime(total) {
  const hh = String(Math.floor(total / 60)).padStart(2, '0');
  const mm = String(total % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}

function buildMonthMatrix(year, monthIndex) {
  const firstDay = new Date(year, monthIndex, 1);
  const lastDay = new Date(year, monthIndex + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startWeekday = firstDay.getDay();

  const cells = [];
  const totalCells = Math.ceil((startWeekday + daysInMonth) / 7) * 7;
  for (let i = 0; i < totalCells; i++) {
    const dayNum = i - startWeekday + 1;
    if (dayNum >= 1 && dayNum <= daysInMonth) {
      cells.push(dayNum);
    } else {
      cells.push(null);
    }
  }
  
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  return weeks;
}

function App() {
  // 狀態管理
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [showEditCategoryModal, setShowEditCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryEditMode, setCategoryEditMode] = useState(false);
  const [highlightedCategory, setHighlightedCategory] = useState(null);
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('calendarTheme') || 'dark';
    } catch (error) {
      return 'dark';
    }
  });

  // 自定義種類狀態
  const [customCategories, setCustomCategories] = useState(() => {
    try {
      const saved = localStorage.getItem('customCategories');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.error('載入自定義種類失敗:', error);
    }
    return [];
  });

  // 待辦事項狀態
  const [todos, setTodos] = useState(() => {
    try {
      const saved = localStorage.getItem('calendarTodos');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.error('載入待辦清單失敗:', error);
    }
    return [];
  });

  // 時間軸項目狀態
  const [items, setItems] = useState(() => {
    try {
      const saved = localStorage.getItem('calendarItems');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.error('載入時間軸項目失敗:', error);
    }
    return [
      { id: 1, date: '2025-01-15', category: 'work', text: '09:00 團隊站會', time: '09:00' },
      { id: 2, date: '2025-01-15', category: 'study', text: '20:00 React 練習', time: '20:00' },
      { id: 3, date: '2025-01-16', category: 'project', text: '14:30 作品集日曆 UI', time: '14:30' },
      { id: 4, date: '2025-01-17', category: 'life', text: '19:00 健身', time: '19:00' },
    ];
  });

  // 自動儲存
  useEffect(() => {
    try {
      localStorage.setItem('calendarTodos', JSON.stringify(todos));
    } catch (error) {
      console.error('儲存待辦清單失敗:', error);
    }
  }, [todos]);

  useEffect(() => {
    try {
      localStorage.setItem('calendarItems', JSON.stringify(items));
    } catch (error) {
      console.error('儲存時間軸項目失敗:', error);
    }
  }, [items]);

  useEffect(() => {
    try {
      localStorage.setItem('calendarTheme', theme);
    } catch (error) {
      console.error('儲存主題設定失敗:', error);
    }
  }, [theme]);

  useEffect(() => {
    try {
      localStorage.setItem('customCategories', JSON.stringify(customCategories));
    } catch (error) {
      console.error('儲存自定義種類失敗:', error);
    }
  }, [customCategories]);

  // 計算屬性
  const selectedDateKey = useMemo(() => formatDateKey(selectedDate), [selectedDate]);
  const todayKey = useMemo(() => formatDateKey(new Date()), []);
  const monthWeeks = useMemo(() => buildMonthMatrix(currentYear, currentMonth), [currentYear, currentMonth]);

  // 合併種類列表
  const allCategories = useMemo(() => {
    return [...CATEGORIES, ...customCategories];
  }, [customCategories]);


  // 選定日期的待辦事項
  const dayTodos = useMemo(() => {
    return items.filter(item => item.date === selectedDateKey);
  }, [items, selectedDateKey]);

  // 事件處理函數
  const handleDateClick = (day) => {
    if (!day) return;
    setSelectedDate(new Date(currentYear, currentMonth, day));
  };

  const handleYearChange = (year) => {
    setCurrentYear(year);
  };

  const handleMonthChange = (month) => {
    setCurrentMonth(month);
  };

  const handleAddTodo = (todoData) => {
    const newTodo = {
      id: Date.now(),
      ...todoData,
      date: selectedDateKey,
      createdAt: new Date().toISOString(),
    };
    setItems(prev => [...prev, newTodo]);
    setShowAddModal(false);
  };

  const handleDeleteTodo = (id) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const handleEditTodo = (id, updates) => {
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, ...updates } : item
    ));
  };

  const handleEditTodoComplete = (id, updatedData) => {
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, ...updatedData, editing: false } : item
    ));
  };

  const handleAddCustomCategory = (categoryData) => {
    const newCategory = {
      key: `custom_${Date.now()}`,
      label: categoryData.label,
      color: categoryData.color,
    };
    setCustomCategories(prev => [...prev, newCategory]);
  };

  const handleDeleteCustomCategory = (categoryKey) => {
    // 如果是自定義種類，從自定義種類列表中刪除
    if (categoryKey.startsWith('custom_')) {
      setCustomCategories(prev => prev.filter(cat => cat.key !== categoryKey));
    }
  };

  const handleEditCategory = (categoryKey) => {
    const category = allCategories.find(cat => cat.key === categoryKey);
    if (category) {
      setEditingCategory(category);
      setShowEditCategoryModal(true);
    }
  };

  const handleEditCategoryComplete = (updatedData) => {
    if (editingCategory) {
      if (editingCategory.key.startsWith('custom_')) {
        // 編輯自定義種類
        setCustomCategories(prev => prev.map(cat => 
          cat.key === editingCategory.key ? { ...cat, ...updatedData } : cat
        ));
      } else {
        // 編輯預設種類 - 創建一個新的自定義種類來替換
        const newCustomCategory = {
          key: `custom_${Date.now()}`,
          label: updatedData.label,
          color: updatedData.color,
        };
        setCustomCategories(prev => [...prev, newCustomCategory]);
      }
    }
    setShowEditCategoryModal(false);
    setEditingCategory(null);
  };

  const getCountForDate = (dateKey) => {
    return items.filter(item => item.date === dateKey).length;
  };

  const handleCategoryClick = (categoryKey) => {
    setHighlightedCategory(highlightedCategory === categoryKey ? null : categoryKey);
  };


  const getItemsForDate = (dateKey) => {
    return items.filter(item => item.date === dateKey);
  };

  const getItemsForDateByCategory = (dateKey, categoryKey) => {
    return items.filter(item => item.date === dateKey && item.category === categoryKey);
  };


  return (
    <div className={`app-root theme-${theme}`}>
      {/* 左側面板 */}
      <div className="left-panel">
        {/* Logo 和標題 */}
        <div className="diary-header">
          <div className="diary-logo">
            <div className="logo-icon">📅</div>
            <h1>未來日記</h1>
          </div>
        </div>

        <div className="category-management">
          <div className="category-header">
            <h3>種類管理</h3>
            <button
              className="category-edit-mode-btn"
              onClick={() => setCategoryEditMode(!categoryEditMode)}
              title={categoryEditMode ? "退出編輯模式" : "編輯種類"}
            >
              {categoryEditMode ? "完成" : "✎"}
            </button>
          </div>
          
          {categoryEditMode ? (
            <CategoryEditMode 
              allCategories={allCategories}
              items={items}
              onEditCategory={handleEditCategory}
              onDeleteCategory={handleDeleteCustomCategory}
              onAddCategory={() => setShowAddCategoryModal(true)}
            />
          ) : (
            <>
              <div className="category-list">
                {/* 全部種類選項 */}
                <div 
                  className={`category-item ${highlightedCategory === null ? 'highlighted' : ''}`}
                  onClick={() => setHighlightedCategory(null)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="category-color-dot all-categories" />
                  <span className="category-name">全部種類</span>
                  <span className="category-count">{items.length}</span>
                </div>
                
                {allCategories.map(category => {
                  const categoryCount = items.filter(item => item.category === category.key).length;
                  const isHighlighted = highlightedCategory === category.key;
                  return (
                    <div 
                      key={category.key} 
                      className={`category-item ${isHighlighted ? 'highlighted' : ''}`}
                      onClick={() => handleCategoryClick(category.key)}
                      style={{ cursor: 'pointer' }}
                    >
                      <div 
                        className="category-color-dot"
                        style={{ backgroundColor: category.color }}
                      />
                      <span className="category-name">{category.label}</span>
                      <span className="category-count">{categoryCount}</span>
                    </div>
                  );
                })}
              </div>
              <button
                className="add-category-header-btn"
                onClick={() => setShowAddCategoryModal(true)}
              >
                + 新增種類
              </button>
            </>
          )}
        </div>

        <div className="theme-toggle">
          <button
            className="theme-btn"
            onClick={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
            title="切換主題"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
      </div>

      {/* 中間面板 - 日曆 */}
      <div className="center-panel">
        <div className="calendar-header">
          <div className="date-controls">
            <select
              className="year-select"
              value={currentYear}
              onChange={(e) => handleYearChange(parseInt(e.target.value))}
            >
              {Array.from({ length: 10 }, (_, i) => currentYear - 5 + i).map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
            <select
              className="month-select"
              value={currentMonth}
              onChange={(e) => handleMonthChange(parseInt(e.target.value))}
            >
              {Array.from({ length: 12 }, (_, i) => i).map(month => (
                <option key={month} value={month}>
                  {month + 1}月
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="calendar-grid">
          <div className="weekdays">
            {['日','一','二','三','四','五','六'].map(day => (
              <div key={day} className="weekday">{day}</div>
            ))}
          </div>
          
          <div className="month-grid">
            {monthWeeks.map((week, weekIndex) => (
              <div key={weekIndex} className="week-row">
                {week.map((day, dayIndex) => {
                  const isSelected = day && formatDateKey(new Date(currentYear, currentMonth, day)) === selectedDateKey;
                  const isToday = day && formatDateKey(new Date(currentYear, currentMonth, day)) === todayKey;
                  const dateKey = day ? formatDateKey(new Date(currentYear, currentMonth, day)) : '';
                  
                  // 根據選中的種類篩選項目
                  const dayItems = highlightedCategory 
                    ? getItemsForDateByCategory(dateKey, highlightedCategory)
                    : getItemsForDate(dateKey);
                  
                  const hasEvents = dayItems.length > 0;
                  
                  return (
                    <button
                      key={dayIndex}
                      className={`day-cell ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''} ${hasEvents ? 'has-events' : ''}`}
                      onClick={() => handleDateClick(day)}
                      disabled={!day}
                    >
                      <div className="day-number">{day || ''}</div>
                      {day && hasEvents && (
                        <div className="day-indicators">
                          <div className="category-dots">
                            {dayItems.slice(0, 3).map((item, index) => {
                              const category = allCategories.find(c => c.key === item.category);
                              return (
                                <div
                                  key={index}
                                  className="category-dot"
                                  style={{ backgroundColor: category?.color || '#4f46e5' }}
                                />
                              );
                            })}
                            {dayItems.length > 3 && (
                              <span className="more-dots">+{dayItems.length - 3}</span>
                            )}
                          </div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 右側面板 */}
      <div className="right-panel">
        <div className="selected-date-header">
          <h2>{formatDateDisplay(selectedDate)}</h2>
          {dayTodos.length > 0 && (
            <div className="task-progress-overview">
              <div className="progress-stats">
                <span className="progress-text">
                  共 {dayTodos.length} 項任務
                </span>
                <div className="progress-bar">
                  <div 
                    className="progress-fill"
                    style={{ width: '100%' }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="todos-section">
          {dayTodos.length === 0 ? (
            <div className="empty-day">
              <p>這一天還沒有安排任何事項</p>
              <p>點擊下方按鈕新增待辦事項</p>
            </div>
          ) : (
            <div className="todos-list">
              {dayTodos.map(todo => {
                const category = allCategories.find(c => c.key === todo.category);
                
                if (todo.editing) {
                  return (
                    <EditTodoItem
                      key={todo.id}
                      todo={todo}
                      onSave={handleEditTodoComplete}
                      onCancel={() => handleEditTodo(todo.id, { editing: false })}
                      allCategories={allCategories}
                      onDelete={handleDeleteTodo}
                    />
                  );
                }
                
                return (
                  <div key={todo.id} className="todo-item">
                    <div className="todo-time">{todo.time || '--:--'}</div>
                    <div className="todo-content">
                      <div className="todo-text">{todo.text}</div>
                      <div className="todo-category" style={{ color: category?.color }}>
                        {category?.label}
                      </div>
                    </div>
                    <div className="todo-actions">
                      <button
                        className="edit-btn"
                        onClick={() => handleEditTodo(todo.id, { editing: true })}
                        title="編輯"
                      >
                        ✎
                      </button>
                      <button
                        className="delete-btn"
                        onClick={() => handleDeleteTodo(todo.id)}
                        title="刪除"
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="add-todo-section">
          <button
            className="add-todo-btn"
            onClick={() => setShowAddModal(true)}
          >
            <span className="add-icon">+</span>
            新增待辦事項
          </button>
        </div>
      </div>

      {/* 新增待辦事項模態視窗 */}
      {showAddModal && (
        <AddTodoModal
          selectedDate={selectedDate}
          onSave={handleAddTodo}
          onCancel={() => setShowAddModal(false)}
          allCategories={allCategories}
          onAddCustomCategory={handleAddCustomCategory}
        />
      )}

      {/* 新增種類模態視窗 */}
      {showAddCategoryModal && (
        <AddCategoryModal
          onSave={handleAddCustomCategory}
          onCancel={() => setShowAddCategoryModal(false)}
        />
      )}

      {/* 編輯種類模態視窗 */}
      {showEditCategoryModal && editingCategory && (
        <EditCategoryModal
          category={editingCategory}
          onSave={handleEditCategoryComplete}
          onCancel={() => {
            setShowEditCategoryModal(false);
            setEditingCategory(null);
          }}
        />
      )}
    </div>
  );
}

// 編輯待辦事項組件
function EditTodoItem({ todo, onSave, onCancel, allCategories, onDelete }) {
  const [formData, setFormData] = useState({
    text: todo.text,
    category: todo.category,
    time: todo.time || '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.text.trim()) return;
    onSave(todo.id, formData);
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleDelete = () => {
    if (window.confirm('確定要刪除這個任務嗎？')) {
      onDelete(todo.id);
    }
  };

  const selectedCategory = allCategories.find(c => c.key === formData.category);

  return (
    <div className="todo-item editing">
      <div className="edit-form-container">
        <form onSubmit={handleSubmit} className="edit-form">
          <div className="edit-form-header">
            <div className="edit-time-section">
              <label className="edit-label">時間</label>
              <input
                type="time"
                value={formData.time}
                onChange={(e) => handleInputChange('time', e.target.value)}
                className="time-input"
                placeholder="選擇時間"
              />
            </div>
            <div className="edit-category-section">
              <label className="edit-label">種類</label>
              <div className="category-select-container">
                <select
                  value={formData.category}
                  onChange={(e) => handleInputChange('category', e.target.value)}
                  className="category-select"
                >
                  {allCategories.map(category => (
                    <option key={category.key} value={category.key}>
                      {category.label}
                    </option>
                  ))}
                </select>
                <div 
                  className="category-indicator"
                  style={{ backgroundColor: selectedCategory?.color }}
                />
              </div>
            </div>
          </div>
          
          <div className="edit-content-section">
            <label className="edit-label">任務內容</label>
            <textarea
              value={formData.text}
              onChange={(e) => handleInputChange('text', e.target.value)}
              className="text-input"
              placeholder="輸入任務內容..."
              rows="2"
              autoFocus
            />
          </div>
          
          <div className="edit-actions">
            <button type="submit" className="save-btn" title="保存變更">
              <span className="btn-icon">✓</span>
              <span className="btn-text">保存</span>
            </button>
            <button type="button" className="cancel-btn" onClick={onCancel} title="取消編輯">
              <span className="btn-icon">✕</span>
              <span className="btn-text">取消</span>
            </button>
            <button type="button" className="delete-btn" onClick={handleDelete} title="刪除任務">
              <span className="btn-icon">🗑</span>
              <span className="btn-text">刪除</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// 新增待辦事項模態視窗組件
function AddTodoModal({ selectedDate, onSave, onCancel, allCategories, onAddCustomCategory }) {
  const [formData, setFormData] = useState({
    text: '',
    category: 'work',
    time: '',
    notes: '',
    date: formatDateKey(selectedDate)
  });

  const [showCustomCategory, setShowCustomCategory] = useState(false);
  const [customCategoryData, setCustomCategoryData] = useState({
    label: '',
    color: '#4f46e5'
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.text.trim()) return;
    
    onSave(formData);
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddCustomCategorySubmit = () => {
    if (!customCategoryData.label.trim()) return;
    
    onAddCustomCategory(customCategoryData);
    setFormData(prev => ({ ...prev, category: `custom_${Date.now()}` }));
    setShowCustomCategory(false);
    setCustomCategoryData({ label: '', color: '#4f46e5' });
  };

  const handleCustomCategoryInputChange = (field, value) => {
    setCustomCategoryData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>新增待辦事項</h3>
          <button className="close-btn" onClick={onCancel}>✕</button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label>任務名稱</label>
            <input
              type="text"
              value={formData.text}
              onChange={(e) => handleInputChange('text', e.target.value)}
              placeholder="輸入任務名稱..."
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label>日期</label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => handleInputChange('date', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>時間</label>
            <input
              type="time"
              value={formData.time}
              onChange={(e) => handleInputChange('time', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>種類</label>
            <select
              value={formData.category}
              onChange={(e) => handleInputChange('category', e.target.value)}
            >
              {allCategories.map(category => (
                <option key={category.key} value={category.key}>
                  {category.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="add-category-btn"
              onClick={() => setShowCustomCategory(true)}
            >
              + 新增種類
            </button>
          </div>

          {showCustomCategory && (
            <div className="custom-category-form">
              <h4>新增自定義種類</h4>
              <div className="form-group">
                <label>種類名稱</label>
                <input
                  type="text"
                  value={customCategoryData.label}
                  onChange={(e) => handleCustomCategoryInputChange('label', e.target.value)}
                  placeholder="輸入種類名稱..."
                />
              </div>
              <div className="form-group">
                <label>顏色</label>
                <input
                  type="color"
                  value={customCategoryData.color}
                  onChange={(e) => handleCustomCategoryInputChange('color', e.target.value)}
                />
              </div>
              <div className="custom-category-actions">
                <button
                  type="button"
                  className="save-custom-btn"
                  onClick={handleAddCustomCategorySubmit}
                >
                  新增
                </button>
                <button
                  type="button"
                  className="cancel-custom-btn"
                  onClick={() => setShowCustomCategory(false)}
                >
                  取消
                </button>
              </div>
            </div>
          )}

          <div className="form-group">
            <label>備註</label>
            <textarea
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="可選的備註..."
              rows="3"
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="cancel-btn" onClick={onCancel}>
              取消
            </button>
            <button type="submit" className="save-btn">
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// 新增種類模態視窗組件
function AddCategoryModal({ onSave, onCancel }) {
  const [formData, setFormData] = useState({
    label: '',
    color: '#4f46e5'
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.label.trim()) return;
    
    onSave(formData);
    setFormData({ label: '', color: '#4f46e5' });
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>新增種類</h3>
          <button className="close-btn" onClick={onCancel}>✕</button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label>種類名稱</label>
            <input
              type="text"
              value={formData.label}
              onChange={(e) => handleInputChange('label', e.target.value)}
              placeholder="輸入種類名稱..."
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label>顏色</label>
            <input
              type="color"
              value={formData.color}
              onChange={(e) => handleInputChange('color', e.target.value)}
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="cancel-btn" onClick={onCancel}>
              取消
            </button>
            <button type="submit" className="save-btn">
              新增
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// 編輯種類模態視窗組件
function EditCategoryModal({ category, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    label: category.label,
    color: category.color
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.label.trim()) return;
    
    onSave(formData);
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>編輯種類</h3>
          <button className="close-btn" onClick={onCancel}>✕</button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label>種類名稱</label>
            <input
              type="text"
              value={formData.label}
              onChange={(e) => handleInputChange('label', e.target.value)}
              placeholder="輸入種類名稱..."
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label>顏色</label>
            <input
              type="color"
              value={formData.color}
              onChange={(e) => handleInputChange('color', e.target.value)}
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="cancel-btn" onClick={onCancel}>
              取消
            </button>
            <button type="submit" className="save-btn">
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// 種類編輯模式組件
function CategoryEditMode({ allCategories, items, onEditCategory, onDeleteCategory, onAddCategory }) {
  return (
    <div className="category-edit-mode">
      <div className="category-edit-grid">
        {allCategories.map(category => {
          const categoryCount = items.filter(item => item.category === category.key).length;
          return (
            <div key={category.key} className="category-edit-item">
              <div className="category-edit-header">
                <div 
                  className="category-color-dot"
                  style={{ backgroundColor: category.color }}
                />
                <span className="category-name">{category.label}</span>
                <span className="category-count">{categoryCount}</span>
              </div>
              <div className="category-edit-actions">
                <button
                  className="edit-category-btn"
                  onClick={() => onEditCategory(category.key)}
                  title="編輯種類"
                >
                  ✎
                </button>
                <button
                  className="delete-category-btn"
                  onClick={() => onDeleteCategory(category.key)}
                  title="刪除種類"
                >
                  ×
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <button
        className="add-category-edit-btn"
        onClick={onAddCategory}
      >
        + 新增種類
      </button>
    </div>
  );
}

export default App;