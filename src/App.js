import { useEffect, useMemo, useRef, useState } from 'react';
import './App.css';

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
    { id: 1, date: '2025-09-01', category: 'work', text: '09:00 團隊站會' },
    { id: 2, date: '2025-09-01', category: 'study', text: '20:00 React 練習' },
    { id: 3, date: '2025-09-05', category: 'project', text: '14:30 作品集日曆 UI' },
    { id: 4, date: '2025-09-10', category: 'life', text: '19:00 健身' },
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
    const timePrefix = quickTime ? `${quickTime} ` : '';
    const newItem = {
      id: Date.now(),
      date: selectedDateKey,
      category: quickCategory,
      text: `${timePrefix}${trimmed}`,
    };
    setItems(prev => [...prev, newItem]);
    setQuickText('');
    setQuickTime('');
    // update corner time display and persist
    const saved = quickTime || (parseTimeFromText(trimmed) != null ? formatMinutesToTime(parseTimeFromText(trimmed)) : '');
    setLastSavedTime(saved);
    try {
      localStorage.setItem('cornerTime', saved);
    } catch (_) {}
    setIsTimePickerOpen(false);
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

  const monthTitle = `${year}/` + String(monthIndex + 1).padStart(2, '0');

  return (
    <div className={`app-root theme-${theme}`}>
      <header className="app-header">
        <h1>我的作品集日曆</h1>
      </header>

      <div className="toolbar">
        <div className="quick-add">
          <input
            className="quick-input"
            type="text"
            placeholder="待辦事項快速新增，例如：09:00 與客戶開會"
            value={quickText}
            onChange={(e) => setQuickText(e.target.value)}
            ref={quickInputRef}
          />
          <TimeScrollPicker
            value={quickTime}
            onChange={setQuickTime}
            open={isTimePickerOpen}
            onOpen={() => setIsTimePickerOpen(true)}
            onClose={() => setIsTimePickerOpen(false)}
            ariaLabel="幾點開始"
          />
          <select
            className="quick-category"
            value={quickCategory}
            onChange={(e) => setQuickCategory(e.target.value)}
          >
            {CATEGORIES.map(c => (
              <option key={c.key} value={c.key}>{c.label}</option>
            ))}
          </select>
          <button className="btn add" aria-label="新增" title="新增" onClick={handleAddQuick}>＋</button>
        </div>

        <div className="filters">
          <span className="filter-label">篩選器：</span>
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
            className="btn"
            onClick={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
            title="主題切換"
          >{theme === 'dark' ? '淺色' : '深色'}</button>
        </div>
      </div>

      <main className="main-layout">
        <section className="calendar">
          <div className="calendar-header">月曆（{monthTitle}）</div>
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
                      className={`day-cell ${isSelected ? 'selected' : ''} ${day ? '' : 'empty'} ${day && dateKey === todayKey ? 'today' : ''}`}
                      onClick={() => handleClickDay(day)}
                      disabled={!day}
                      title={day ? `${formatDateDisplay(new Date(year, monthIndex, day))}` : ''}
                    >
                      <span className="day-number">{day ?? ''}</span>
                      {day && count > 0 && (
                        <span className="dots" aria-label={`${count} 件待辦`} title={`${count} 件待辦`}>
                          {cats.map((ck) => {
                            const color = CATEGORIES.find(c => c.key === ck)?.color || '#94a3b8';
                            return <span key={ck} className="dot small" style={{ backgroundColor: color }} />;
                          })}
                          {getCategoryKeysForDate(dateKey).length > 3 && <span className="more">＋</span>}
                        </span>
                      )}
                      {day && (
                        <span
                          className="add-bubble"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleClickDay(day);
                            setTimeout(() => quickInputRef.current?.focus(), 0);
                          }}
                          title="快速新增"
                          aria-label="快速新增"
                        >＋</span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </section>

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
                <li key={it.id} className={`schedule-item ${editing?.id === it.id ? 'editing' : ''}`}>
                  {editing?.id === it.id ? (
                    <>
                      <span
                        className="dot"
                        style={{ backgroundColor: CATEGORIES.find(c => c.key === editing.category)?.color }}
                      />
                      <div className="edit-time">
                        <TimeScrollPicker
                          value={editing.time}
                          onChange={(v) => setEditing(ed => ({ ...ed, time: v }))}
                          open={editing.open}
                          onOpen={() => setEditing(ed => ({ ...ed, open: true }))}
                          onClose={() => setEditing(ed => ({ ...ed, open: false }))}
                          ariaLabel="編輯時間"
                        />
                      </div>
                      <div className="edit-fields">
                        <input
                          className="edit-input"
                          type="text"
                          placeholder="待辦內容"
                          value={editing.text}
                          onChange={(e) => setEditing(ed => ({ ...ed, text: e.target.value }))}
                        />
                        <select
                          className="edit-category"
                          value={editing.category}
                          onChange={(e) => setEditing(ed => ({ ...ed, category: e.target.value }))}
                        >
                          {CATEGORIES.map(c => (
                            <option key={c.key} value={c.key}>{c.label}</option>
                          ))}
                        </select>
                      </div>
                      <div className="actions">
                        <button className="btn save" onClick={saveEdit}>儲存</button>
                        <button className="btn" onClick={cancelEdit}>取消</button>
                      </div>
                    </>
                  ) : (
                    <>
                      <span
                        className="dot"
                        style={{ backgroundColor: CATEGORIES.find(c => c.key === it.category)?.color }}
                      />
                      <span className="time">
                        {it.minutes !== 24 * 60 ? formatMinutesToTime(it.minutes) : '--:--'}
                      </span>
                      <span className="text">{it.text}</span>
                      <div className="actions">
                        <button className="btn icon" title="編輯" onClick={() => beginEdit(it)}>✎</button>
                        <button className="btn icon" title="刪除" onClick={() => deleteItem(it.id)}>🗑</button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </aside>
      </main>
      <CornerTimeDisplay time={lastSavedTime} />
    </div>
  );
}

export default App;

function TimeScrollPicker({ value, onChange, open, onOpen, onClose, ariaLabel }) {
  const containerRef = useRef(null);
  const [internal, setInternal] = useState(() => parseValue(value));
  const [mode, setMode] = useState('h'); // 'h' or 'm'

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

  // Build ticks for dial
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minuteTicks = Array.from({ length: 60 }, (_, i) => i); // 0..59 every minute
  const minuteLabelSteps = Array.from({ length: 12 }, (_, i) => i * 5); // labels at every 5 minutes

  function polarToCartesian(cx, cy, radius, angleDeg) {
    const rad = (angleDeg - 90) * Math.PI / 180;
    return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
  }

  function angleFromPoint(cx, cy, x, y) {
    const ang = Math.atan2(y - cy, x - cx) * 180 / Math.PI + 90;
    return (ang + 360) % 360;
  }

  function handleDialClick(e) {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const x = e.clientX;
    const y = e.clientY;
    const ang = angleFromPoint(cx, cy, x, y);
    if (mode === 'h') {
      const idx = Math.round(ang / (360 / 24)) % 24;
      handlePickHour(idx);
      setMode('m');
    } else {
      const idx = Math.round(ang / (360 / 60)) % 60; // 1-min steps
      handlePickMinute(idx);
    }
  }

  function handAngleH(h) { return (h % 24) * (360 / 24); }
  function handAngleM(m) { return (m % 60) * (360 / 60); }

  return (
    <div className="time-picker" ref={containerRef}>
      <button
        type="button"
        className="time-trigger quick-time"
        aria-label={ariaLabel}
        onClick={() => (open ? onClose?.() : onOpen?.())}
      >
        {value ? value : '選擇時間'}
        <span className="chevron">▾</span>
      </button>
      {open && (
        <div className="time-panel dial">
          <div className="panel-header tabs">
            <button type="button" className={`tab ${mode === 'h' ? 'active' : ''}`} onClick={() => setMode('h')}>小時</button>
            <button type="button" className={`tab ${mode === 'm' ? 'active' : ''}`} onClick={() => setMode('m')}>分鐘</button>
          </div>
          <div className="dial-area">
            <svg className="time-dial" viewBox="0 0 200 200" onClick={handleDialClick} role="application" aria-label="時間圓盤">
              <circle cx="100" cy="100" r="88" className="dial-ring" />
              {/* hour ticks */}
              {hours.map((h) => {
                const angle = h * (360 / 24);
                const p1 = polarToCartesian(100, 100, 78, angle);
                const p2 = polarToCartesian(100, 100, 88, angle);
                const isActive = internal.h === h && mode === 'h';
                return (
                  <line key={`h-${h}`} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} className={`tick hour ${isActive ? 'active' : ''}`} />
                );
              })}
              {/* minute ticks (every 1 minute) */}
              {minuteTicks.map((m) => {
                const angle = (m / 60) * 360;
                const p1 = polarToCartesian(100, 100, 64, angle);
                const p2 = polarToCartesian(100, 100, 72, angle);
                const isActive = internal.m === m && mode === 'm';
                return (
                  <line key={`m-${m}`} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} className={`tick minute ${isActive ? 'active' : ''}`} />
                );
              })}
              {/* hands */}
              {(() => {
                const ah = handAngleH(internal.h);
                const am = handAngleM(internal.m);
                const hp = polarToCartesian(100, 100, 60, ah);
                const mp = polarToCartesian(100, 100, 80, am);
                return (
                  <g className="hands">
                    <line x1="100" y1="100" x2={hp.x} y2={hp.y} className={`hand hour ${mode === 'h' ? 'active' : ''}`} />
                    <line x1="100" y1="100" x2={mp.x} y2={mp.y} className={`hand minute ${mode === 'm' ? 'active' : ''}`} />
                    <circle cx="100" cy="100" r="3" className="pivot" />
                  </g>
                );
              })()}
              {/* labels */}
              {hours.filter(h => h % 3 === 0).map((h) => {
                const ang = h * (360 / 24);
                const p = polarToCartesian(100, 100, 94, ang);
                return (
                  <text key={`hl-${h}`} x={p.x} y={p.y} className="label hour" textAnchor="middle" dominantBaseline="middle">{String(h).padStart(2,'0')}</text>
                );
              })}
              {minuteLabelSteps.map((m) => {
                const ang = (m / 60) * 360;
                const p = polarToCartesian(100, 100, 50, ang);
                return (
                  <text key={`ml-${m}`} x={p.x} y={p.y} className="label minute" textAnchor="middle" dominantBaseline="middle">{String(m).padStart(2,'0')}</text>
                );
              })}
            </svg>
          </div>
          <div className="panel-footer">
            <button type="button" className="btn small" onClick={setNow}>現在</button>
            <button type="button" className="btn small" onClick={clearTime}>清除</button>
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
