import React, { useEffect, useMemo, useState } from 'react';
import './App.css';

function App() {
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [error, setError] = useState('');

  // Load tasks from localStorage on first render
  useEffect(() => {
    try {
      const saved = localStorage.getItem('dayViewTasks');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setTasks(parsed);
        }
      }
    } catch (e) {
      // ignore corrupted storage
    }
  }, []);

  // Persist tasks when they change
  useEffect(() => {
    try {
      localStorage.setItem('dayViewTasks', JSON.stringify(tasks));
    } catch (e) {
      // ignore quota/storage errors
    }
  }, [tasks]);

  const hours = useMemo(() => Array.from({ length: 24 }, (_, i) => i), []);

  function timeToMinutes(hhmm) {
    const [hh, mm] = hhmm.split(':').map(Number);
    const hoursNum = Number.isFinite(hh) ? hh : 0;
    const minutesNum = Number.isFinite(mm) ? mm : 0;
    return Math.max(0, Math.min(24 * 60, hoursNum * 60 + minutesNum));
  }

  function handleAddTask(e) {
    e.preventDefault();
    setError('');
    const start = timeToMinutes(startTime);
    const end = timeToMinutes(endTime);
    if (!title.trim()) {
      setError('請輸入標題');
      return;
    }
    if (end <= start) {
      setError('結束時間需晚於開始時間');
      return;
    }
    const newTask = {
      id: `${Date.now()}`,
      title: title.trim(),
      start,
      end,
    };
    setTasks(prev => [...prev, newTask]);
    setTitle('');
    setStartTime('09:00');
    setEndTime('10:00');
  }

  function handleDeleteTask(id) {
    setTasks(prev => prev.filter(t => t.id !== id));
  }

  function formatLabel(minutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    const hh = String(h).padStart(2, '0');
    const mm = String(m).padStart(2, '0');
    return `${hh}:${mm}`;
  }

  return (
    <div className="app-container">
      <h1 className="app-title">未來日記</h1>

      <form className="task-form" onSubmit={handleAddTask}>
        <div className="form-row">
          <label className="label" htmlFor="title">標題</label>
          <input
            id="title"
            className="input"
            type="text"
            placeholder="例如：專案會議"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
        </div>
        <div className="form-row">
          <label className="label" htmlFor="start">開始</label>
          <input
            id="start"
            className="input"
            type="time"
            step="300"
            value={startTime}
            onChange={e => setStartTime(e.target.value)}
          />
          <span className="tilde">~</span>
          <label className="label" htmlFor="end">結束</label>
          <input
            id="end"
            className="input"
            type="time"
            step="300"
            value={endTime}
            onChange={e => setEndTime(e.target.value)}
          />
          <button className="btn" type="submit">新增</button>
        </div>
        {error ? <div className="error-text">{error}</div> : null}
      </form>

      <div className="day-view">
        <div className="time-column">
          {hours.map(h => (
            <div className="time-cell" key={h}>
              <span className="time-label">{String(h).padStart(2, '0')}:00</span>
            </div>
          ))}
        </div>

        <div className="grid-column">
          <div className="grid" style={{ height: 24 * 60 }}>
            {hours.map(h => (
              <div className="grid-hour" key={h} />
            ))}
            {tasks
              .slice()
              .sort((a, b) => a.start - b.start)
              .map(task => {
                const top = task.start; // 1px per minute
                const height = Math.max(24, task.end - task.start);
                return (
                  <div
                    key={task.id}
                    className="event"
                    style={{ top, height }}
                    title={`${formatLabel(task.start)} - ${formatLabel(task.end)}`}
                  >
                    <div className="event-time">{`${formatLabel(task.start)} - ${formatLabel(task.end)}`}</div>
                    <div className="event-title">{task.title}</div>
                    <button className="event-delete" onClick={() => handleDeleteTask(task.id)} aria-label="刪除">×</button>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
