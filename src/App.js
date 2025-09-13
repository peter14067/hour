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
  // monthIndex: 0-11
  const firstDay = new Date(year, monthIndex, 1);
  const lastDay = new Date(year, monthIndex + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startWeekday = firstDay.getDay(); // 0=Sun

  const cells = [];
  // We want weeks starting on Sun → Sat (7 columns)
  const totalCells = Math.ceil((startWeekday + daysInMonth) / 7) * 7;
  for (let i = 0; i < totalCells; i++) {
    const dayNum = i - startWeekday + 1;
    if (dayNum >= 1 && dayNum <= daysInMonth) {
      cells.push(dayNum);
    } else {
      cells.push(null);
    }
  }
  // chunk into weeks
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  return weeks;
}

function App() {
  const [year] = useState(2025);
  const [monthIndex] = useState(8); // 0-based: 8 = September

  const [selectedDate, setSelectedDate] = useState(() => new Date(2025, 8, 1));
  const [items, setItems] = useState([
    // sample data
    { id: 1, date: '2025-09-01', category: 'work', text: '09:00 團隊站會', time: '09:00', hasTimeField: true },
    { id: 2, date: '2025-09-01', category: 'study', text: '20:00 React 練習', time: '20:00', hasTimeField: true },
    { id: 3, date: '2025-09-05', category: 'project', text: '14:30 作品集日曆 UI', time: '14:30', hasTimeField: true },
    { id: 4, date: '2025-09-10', category: 'life', text: '19:00 健身', time: '19:00', hasTimeField: true },
  ]);

  const [filter, setFilter] = useState(null); // null = all
  const [quickText, setQuickText] = useState('');
  const [quickCategory, setQuickCategory] = useState(CATEGORIES[0].key);
  const [quickTime, setQuickTime] = useState(''); // HH:MM
  const quickInputRef = useRef(null);
  const [lastSavedTime, setLastSavedTime] = useState(() => {
    try {
      return localStorage.getItem('cornerTime') || '';
    } catch (_) {
      return '';
    }
  });
  const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);
  const [editing, setEditing] = useState(null); // { id, text, category, time, open }
  const [theme, setTheme] = useState('dark'); // 'dark' | 'light'
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverDate, setDragOverDate] = useState(null);
  const [todos, setTodos] = useState([]); // 待辦清單
  const [isDragging, setIsDragging] = useState(false);
  const [editingTimeField, setEditingTimeField] = useState(null); // { id, time }

  const monthWeeks = useMemo(() => buildMonthMatrix(year, monthIndex), [year, monthIndex]);
  const selectedDateKey = useMemo(() => formatDateKey(selectedDate), [selectedDate]);
  const todayKey = useMemo(() => formatDateKey(new Date()), []);

  const dayItems = useMemo(() => {
    const list = items.filter(it => it.date === selectedDateKey && (!filter || it.category === filter));
    return list
      .map(it => ({ ...it, minutes: parseTimeFromText(it.text) ?? 24 * 60 }))
      .sort((a, b) => a.minutes - b.minutes);
  }, [items, selectedDateKey, filter]);

  async function shareSelectedDay() {
    const title = `我的行程 ${selectedDateKey}`;
    const lines = dayItems.length > 0
      ? dayItems.map(it => {
          const time = it.minutes !== 24 * 60 ? formatMinutesToTime(it.minutes) : '--:--';
          const categoryLabel = CATEGORIES.find(c => c.key === it.category)?.label || '';
          return `${time} · ${categoryLabel} · ${it.text.replace(/^\s*([01]?\d|2[0-3]):([0-5]\d)\s+/, '')}`;
        })
      : ['（當日無行程）'];
    const text = [title, ...lines].join('\n');
    try {
      if (navigator.share) {
        await navigator.share({ title, text });
        return;
      }
    } catch (_) {}
    try {
      await navigator.clipboard.writeText(text);
      alert('已複製當日行程到剪貼簿');
    } catch (_) {
      // 最後退路：顯示在提示框
      prompt('無法自動分享，請手動複製', text);
    }
  }

  function handleClickDay(day) {
    if (!day) return;
    setSelectedDate(new Date(year, monthIndex, day));
  }

  function handleAddQuick() {
    const trimmed = quickText.trim();
    if (!trimmed) return;
    
    // 自動檢測時間和內容
    const timeMatch = trimmed.match(/^(\d{1,2}:\d{2})\s+(.+)$/);
    const timePrefix = timeMatch ? `${timeMatch[1]} ` : '';
    const content = timeMatch ? timeMatch[2] : trimmed;
    
    const newItem = {
      id: Date.now(),
      date: selectedDateKey,
      category: 'work', // 預設為工作類別
      text: `${timePrefix}${content}`,
    };
    setItems(prev => [...prev, newItem]);
    setQuickText('');
  }

  function extractTimeAndContent(text) {
    const match = text.match(/^\s*([01]?\d|2[0-3]):([0-5]\d)\s+(.+)$/);
    if (!match) return { time: '', content: text.trim() };
    return { time: `${match[1].padStart(2,'0')}:${match[2]}`, content: match[3].trim() };
  }

  function beginEdit(item) {
    const { time, content } = extractTimeAndContent(item.text);
    setEditing({ id: item.id, text: content, category: item.category, time, open: false });
  }

  function cancelEdit() { setEditing(null); }

  function saveEdit() {
    if (!editing) return;
    const trimmed = editing.text.trim();
    if (!trimmed) { setEditing(null); return; }
    const timePrefix = editing.time ? `${editing.time} ` : '';
    setItems(prev => prev.map(it => it.id === editing.id ? {
      ...it,
      category: editing.category,
      text: `${timePrefix}${trimmed}`,
    } : it));
    // update last corner time if a time is set
    const saved = editing.time || (parseTimeFromText(trimmed) != null ? formatMinutesToTime(parseTimeFromText(trimmed)) : '');
    setLastSavedTime(saved);
    try { localStorage.setItem('cornerTime', saved); } catch(_) {}
    setEditing(null);
  }

  function deleteItem(id) {
    setItems(prev => prev.filter(it => it.id !== id));
    if (editing?.id === id) setEditing(null);
  }

  function getCountForDateKey(dateKey) {
    const list = items.filter(it => it.date === dateKey && (!filter || it.category === filter));
    return list.length;
  }

  function getCategoryKeysForDate(dateKey) {
    const set = new Set(items.filter(it => it.date === dateKey).map(it => it.category));
    return Array.from(set);
  }

  // 拖拽处理函数
  function handleDragStart(e, item) {
    e.dataTransfer.effectAllowed = 'move';
    const dragData = {
      ...item,
      source: 'timeaxis' // 標記來源為時間軸
    };
    e.dataTransfer.setData('text/plain', JSON.stringify(dragData));
    setDraggedItem(item);
    setIsDragging(true);
    console.log('開始拖曳時間軸項目:', dragData); // 調試用
  }

  function handleDragOver(e, dateKey) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverDate(dateKey);
    console.log('拖曳懸停日期:', dateKey); // 調試用
  }

  function handleDragLeave() {
    setDragOverDate(null);
  }

  function handleDrop(e, targetDateKey) {
    e.preventDefault();
    
    try {
      const data = JSON.parse(e.dataTransfer.getData('text/plain'));
      console.log('拖曳數據:', data); // 調試用
      console.log('目標日期鍵:', targetDateKey); // 調試用
      
      if (data.source === 'todoList' && targetDateKey) {
        // 從待辦清單拖到月曆 - 創建新的時間軸項目
        const timePrefix = data.time ? `${data.time} ` : '';
        const newItem = {
          id: Date.now(),
          date: targetDateKey,
          category: data.category,
          text: `${timePrefix}${data.text}`,
          duration: 60, // 預設1小時
          time: data.time || '', // 添加時間欄位
          hasTimeField: true // 標記有時間欄位
        };
        
        console.log('創建新項目:', newItem); // 調試用
        
        // 添加到時間軸項目
        setItems(prev => {
          const updated = [...prev, newItem];
          console.log('更新後的項目列表:', updated); // 調試用
          return updated;
        });
        
        // 更新待辦事項狀態為已安排
        setTodos(prev => prev.map(todo => 
          todo.id === data.id 
            ? { ...todo, status: 'scheduled', scheduledDate: targetDateKey }
            : todo
        ));
        
        console.log('拖曳完成，已添加到日期:', targetDateKey);
        
        // 自動切換到目標日期以顯示結果
        const targetDate = new Date(targetDateKey);
        setSelectedDate(targetDate);
        
        // 顯示成功提示
        alert(`已將「${data.text}」安排到 ${targetDateKey}`);
      } else if (data.source === 'timeaxis' && targetDateKey) {
        // 從時間軸拖到月曆
        setItems(prev => prev.map(item => 
          item.id === data.id 
            ? { ...item, date: targetDateKey }
            : item
        ));
        console.log('已移動時間軸項目到日期:', targetDateKey);
        
        // 自動切換到目標日期以顯示結果
        const targetDate = new Date(targetDateKey);
        setSelectedDate(targetDate);
      } else {
        console.warn('拖曳處理失敗：', { data, targetDateKey });
      }
    } catch (error) {
      console.error('拖拽處理錯誤:', error);
      alert('拖曳失敗，請重試');
    }
    
    setDraggedItem(null);
    setDragOverDate(null);
    setIsDragging(false);
  }

  function handleDragEnd() {
    setDraggedItem(null);
    setDragOverDate(null);
    setIsDragging(false);
  }

  // 根據時間文字獲取時間範圍
  function getTimeRangeFromTime(text) {
    const timeMatch = text.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
    if (!timeMatch) return null;
    
    const hour = parseInt(timeMatch[1], 10);
    
    if (hour >= 6 && hour < 14) return 'morning';
    if (hour >= 14 && hour < 22) return 'afternoon';
    return 'night';
  }

  function handleItemUpdate(itemId, updates) {
    setItems(prev => prev.map(item => 
      item.id === itemId 
        ? { ...item, ...updates }
        : item
    ));
  }

  function handleItemCreate(item) {
    const newItem = {
      id: Date.now(),
      date: selectedDateKey,
      category: item.category || 'work',
      text: item.text,
      duration: item.duration || 60
    };
    setItems(prev => [...prev, newItem]);
  }

  // 待辦清單處理函數
  function handleTodoCreate(todo) {
    setTodos(prev => [...prev, todo]);
  }

  function handleTodoUpdate(todoId, updates) {
    setTodos(prev => prev.map(todo => 
      todo.id === todoId 
        ? { ...todo, ...updates }
        : todo
    ));
  }

  function handleTodoDelete(todoId) {
    setTodos(prev => prev.filter(todo => todo.id !== todoId));
  }

  // 時間欄位處理函數
  function handleTimeFieldClick(item) {
    setEditingTimeField({ id: item.id, time: item.time || '' });
  }

  function handleTimeFieldChange(itemId, newTime) {
    setItems(prev => prev.map(item => 
      item.id === itemId 
        ? { ...item, time: newTime, text: newTime ? `${newTime} ${item.text.replace(/^\s*([01]?\d|2[0-3]):([0-5]\d)\s+/, '')}` : item.text }
        : item
    ));
  }

  function handleTimeFieldSave(itemId) {
    if (editingTimeField && editingTimeField.id === itemId) {
      handleTimeFieldChange(itemId, editingTimeField.time);
      setEditingTimeField(null);
    }
  }

  function handleTimeFieldCancel() {
    setEditingTimeField(null);
  }


  const monthTitle = `${year}/` + String(monthIndex + 1).padStart(2, '0');

  return (
    <div className={`app-root theme-${theme}`}>
      <header className="app-header">
        <h1>📅 我的日曆</h1>
        <p className="app-subtitle">簡單管理你的待辦事項和行程</p>
      </header>

      <div className="toolbar">
        <div className="quick-add">
          <input
            className="quick-input"
            type="text"
            placeholder="輸入待辦事項，例如：09:00 開會 或 買菜"
            value={quickText}
            onChange={(e) => setQuickText(e.target.value)}
            ref={quickInputRef}
            onKeyPress={(e) => e.key === 'Enter' && handleAddQuick()}
          />
          <button className="btn add" aria-label="新增" title="新增" onClick={handleAddQuick}>＋</button>
        </div>

        <div className="filters">
          <button
            className={`btn filter ${filter === null ? 'active' : ''}`}
            onClick={() => setFilter(null)}
          >全部</button>
          {CATEGORIES.map(c => (
            <button
              key={c.key}
              className={`btn filter ${filter === c.key ? 'active' : ''}`}
              onClick={() => setFilter(c.key)}
              style={{
                borderColor: c.color,
                color: filter === c.key ? '#fff' : c.color,
                backgroundColor: filter === c.key ? c.color : 'transparent',
              }}
            >{c.label}</button>
          ))}
          <button
            className="btn theme-toggle"
            onClick={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
            title="主題切換"
          >{theme === 'dark' ? '☀️' : '🌙'}</button>
        </div>
      </div>

      <main className="main-layout">
        <section className="calendar">
          <div className="calendar-header">
            <span>月曆（{monthTitle}）</span>
            <div className="calendar-stats">
              <span className="stat-item">
                有安排：{monthWeeks.flat().filter(day => day && getCountForDateKey(formatDateKey(new Date(year, monthIndex, day))) > 0).length} 天
              </span>
              <span className="stat-item">
                空閒：{monthWeeks.flat().filter(day => day && getCountForDateKey(formatDateKey(new Date(year, monthIndex, day))) === 0).length} 天
              </span>
            </div>
          </div>
          <div className="weekdays">
            {['日','一','二','三','四','五','六'].map(d => (
              <div key={d} className="weekday">{d}</div>
            ))}
          </div>
          <div className="month-grid">
            {monthWeeks.map((week, wi) => (
              <div key={wi} className="week-row">
                {week.map((day, di) => {
                  const isSelected = day && formatDateKey(new Date(year, monthIndex, day)) === selectedDateKey;
                  const dateKey = day ? formatDateKey(new Date(year, monthIndex, day)) : '';
                  const count = day ? getCountForDateKey(dateKey) : 0;
                  const cats = day ? getCategoryKeysForDate(dateKey).slice(0, 3) : [];
                  return (
                    <button
                      key={di}
                      className={`day-cell ${isSelected ? 'selected' : ''} ${day ? '' : 'empty'} ${day && dateKey === todayKey ? 'today' : ''} ${day && count === 0 ? 'empty-day' : ''} ${dragOverDate === dateKey ? 'drag-over' : ''}`}
                      onClick={() => handleClickDay(day)}
                      onDragOver={day ? (e) => {
                        e.preventDefault();
                        handleDragOver(e, dateKey);
                      } : undefined}
                      onDragLeave={day ? handleDragLeave : undefined}
                      onDrop={day ? (e) => {
                        e.preventDefault();
                        handleDrop(e, dateKey);
                      } : undefined}
                      onDragEnd={handleDragEnd}
                      disabled={!day}
                      title={day ? `${formatDateDisplay(new Date(year, monthIndex, day))}` : ''}
                    >
                      <span className="day-number">{day ?? ''}</span>
                      {day && (
                        <div className="day-info">
                          {count > 0 && (
                            <span className="day-count" aria-label={`${count} 件待辦`} title={`${count} 件待辦`}>
                              {count}
                            </span>
                          )}
                          {count === 0 && (
                            <span className="day-empty" title="無待辦事項">
                              空
                            </span>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </section>

        <div className="right-panel">
          <aside className="day-view">
            <div className="day-view-header">
              <span>我的一天（{formatDateDisplay(new Date(selectedDateKey))}）</span>
              <div className="day-view-header-actions">
                <button className="btn share" onClick={shareSelectedDay}>分享</button>
              </div>
            </div>
            {dayItems.length === 0 ? (
              <div className="empty-day">尚無待辦，添加一條試試！</div>
            ) : (
              <ul className="schedule-list">
                {dayItems.map(it => (
                  <li 
                    key={it.id} 
                    className={`schedule-item ${editing?.id === it.id ? 'editing' : ''}`}
                    draggable={editing?.id !== it.id}
                    onDragStart={(e) => handleDragStart(e, it)}
                    onDragEnd={handleDragEnd}
                    onDoubleClick={() => beginEdit(it)}
                  >
                    <span
                      className="dot"
                      style={{ backgroundColor: CATEGORIES.find(c => c.key === it.category)?.color }}
                    />
                    <span className="text">{it.text}</span>
                    {it.hasTimeField && (
                      <div className="time-field">
                        {editingTimeField?.id === it.id ? (
                          <div className="time-field-editing">
                            <TimeScrollPicker
                              value={editingTimeField.time}
                              onChange={(time) => setEditingTimeField(prev => ({ ...prev, time }))}
                              open={true}
                              onOpen={() => {}}
                              onClose={() => {}}
                              ariaLabel="選擇時間"
                            />
                            <div className="time-field-actions">
                              <button className="btn small primary" onClick={() => handleTimeFieldSave(it.id)}>✓</button>
                              <button className="btn small secondary" onClick={handleTimeFieldCancel}>✕</button>
                            </div>
                          </div>
                        ) : (
                          <div className="time-field-display" onClick={() => handleTimeFieldClick(it)}>
                            <span className="time-icon">🕒</span>
                            <span className="time-value">{it.time || 'HH:MM'}</span>
                          </div>
                        )}
                      </div>
                    )}
                    <div className="actions">
                      <button className="btn icon" title="編輯" onClick={() => beginEdit(it)}>✎</button>
                      <button className="btn icon" title="刪除" onClick={() => deleteItem(it.id)}>🗑</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            
            {/* 內聯編輯表單 */}
            {editing && (
              <div className="edit-form">
                <div className="edit-form-header">
                  <span>編輯行程</span>
                  <button className="btn icon" onClick={cancelEdit} title="取消">✕</button>
                </div>
                <div className="edit-form-content">
                  <div className="edit-fields">
                    <input
                      className="edit-input"
                      type="text"
                      value={editing.text}
                      onChange={(e) => setEditing(prev => ({ ...prev, text: e.target.value }))}
                      placeholder="輸入行程內容"
                      autoFocus
                      onKeyPress={(e) => e.key === 'Enter' && saveEdit()}
                      onKeyDown={(e) => e.key === 'Escape' && cancelEdit()}
                    />
                    <select
                      className="edit-category"
                      value={editing.category}
                      onChange={(e) => setEditing(prev => ({ ...prev, category: e.target.value }))}
                    >
                      {CATEGORIES.map(c => (
                        <option key={c.key} value={c.key}>{c.label}</option>
                      ))}
                    </select>
                    <TimeScrollPicker
                      value={editing.time}
                      onChange={(time) => setEditing(prev => ({ ...prev, time }))}
                      open={editing.open}
                      onOpen={() => setEditing(prev => ({ ...prev, open: true }))}
                      onClose={() => setEditing(prev => ({ ...prev, open: false }))}
                      ariaLabel="選擇時間"
                    />
                    <button className="btn save" onClick={saveEdit}>保存</button>
                  </div>
                </div>
              </div>
            )}
          </aside>


          <div className="todo-panel">
            <TodoList
              todos={todos}
              onTodoCreate={handleTodoCreate}
              onTodoUpdate={handleTodoUpdate}
              onTodoDelete={handleTodoDelete}
            />
          </div>
        </div>
      </main>
      <CornerTimeDisplay time={lastSavedTime} />
    </div>
  );
}

export default App;

function TimeScrollPicker({ value, onChange, open, onOpen, onClose, ariaLabel }) {
  const containerRef = useRef(null);
  const hoursRef = useRef(null);
  const minutesRef = useRef(null);
  const [internal, setInternal] = useState(() => parseValue(value));

  useEffect(() => {
    setInternal(parseValue(value));
  }, [value]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (!open) return;
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        onClose?.();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open, onClose]);

  // Position the time panel using fixed positioning
  useEffect(() => {
    if (open && containerRef.current) {
      const trigger = containerRef.current.querySelector('.time-trigger');
      const panel = containerRef.current.querySelector('.time-panel');
      
      if (trigger && panel) {
        const rect = trigger.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        const panelHeight = 300; // max-height from CSS
        
        // Calculate position - move left to avoid blocking save button
        let top = rect.bottom + 6;
        let left = rect.left - 200; // Move 200px to the left
        
        // Adjust if panel would go off screen
        if (top + panelHeight > viewportHeight) {
          top = rect.top - panelHeight - 6;
        }
        
        // Ensure panel doesn't go off the left side of screen
        if (left < 8) {
          left = 8;
        }
        
        // If still too far right, adjust further left
        if (left + 320 > window.innerWidth) {
          left = window.innerWidth - 320 - 16;
        }
        
        panel.style.position = 'fixed';
        panel.style.top = `${Math.max(8, top)}px`;
        panel.style.left = `${Math.max(8, left)}px`;
        panel.style.right = 'auto';
        panel.style.width = '320px';
      }
    }
  }, [open]);

  // 自動滾動到選中的時間
  useEffect(() => {
    if (open && hoursRef.current && minutesRef.current) {
      const hourElement = hoursRef.current.querySelector(`[data-hour="${internal.h}"]`);
      const minuteElement = minutesRef.current.querySelector(`[data-minute="${internal.m}"]`);
      
      if (hourElement) {
        hourElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      if (minuteElement) {
        minuteElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [open, internal.h, internal.m]);

  function parseValue(v) {
    if (!v) return { h: 9, m: 0 };
    const [hh, mm] = v.split(':').map(n => parseInt(n, 10));
    return { h: clamp(hh, 0, 23), m: clamp(mm, 0, 59) };
  }

  function clamp(n, min, max) { return Math.max(min, Math.min(max, isNaN(n) ? min : n)); }

  function commit(val) {
    const hh = String(val.h).padStart(2, '0');
    const mm = String(val.m).padStart(2, '0');
    onChange?.(`${hh}:${mm}`);
  }

  function handlePickHour(h) {
    const next = { ...internal, h };
    setInternal(next);
    commit(next);
  }

  function handlePickMinute(m) {
    const next = { ...internal, m };
    setInternal(next);
    commit(next);
  }

  function setNow() {
    const now = new Date();
    const next = { h: now.getHours(), m: now.getMinutes() };
    setInternal(next);
    commit(next);
  }

  function clearTime() {
    onChange?.('');
  }

  // 生成更智能的時間選項
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 60 }, (_, i) => i);

  return (
    <div className="time-picker" ref={containerRef}>
      <button
        type="button"
        className="time-trigger quick-time modern"
        aria-label={ariaLabel}
        onClick={() => (open ? onClose?.() : onOpen?.())}
      >
        <span className="time-icon">🕐</span>
        <span className="time-text">{value ? value : '選擇時間'}</span>
        <span className="chevron">⌄</span>
      </button>
      {open && (
        <div className="time-panel modern-scroll">
          <div className="time-panel-header">
            <span className="time-display">
              {String(internal.h).padStart(2, '0')}:{String(internal.m).padStart(2, '0')}
            </span>
          </div>
          <div className="scroll-container">
            <div className="scroll-column">
              <div className="scroll-header">小時</div>
              <div className="scroll-list hours-scroll" ref={hoursRef}>
                {hours.map((h) => (
                  <button
                    key={h}
                    type="button"
                    className={`scroll-item ${internal.h === h ? 'active' : ''}`}
                    data-hour={h}
                    onClick={() => handlePickHour(h)}
                  >
                    {String(h).padStart(2, '0')}
                  </button>
                ))}
              </div>
            </div>
            <div className="scroll-column">
              <div className="scroll-header">分鐘</div>
              <div className="scroll-list minutes-scroll" ref={minutesRef}>
                {minutes.map((m) => (
                  <button
                    key={m}
                    type="button"
                    className={`scroll-item ${internal.m === m ? 'active' : ''}`}
                    data-minute={m}
                    onClick={() => handlePickMinute(m)}
                  >
                    {String(m).padStart(2, '0')}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="panel-footer">
            <button type="button" className="btn small primary" onClick={setNow}>
              <span className="btn-icon">⏰</span>
              現在
            </button>
            <button type="button" className="btn small secondary" onClick={clearTime}>
              <span className="btn-icon">🗑</span>
              清除
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function CornerTimeDisplay({ time }) {
  if (!time) return null;
  return (
    <div className="corner-time" title="最後儲存的開始時間">
      {time}
    </div>
  );
}
