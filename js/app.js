function ps1Alert(message, callback) {
  const overlay = document.createElement('div');
  overlay.style.position = 'fixed';
  overlay.style.top = '0'; overlay.style.left = '0';
  overlay.style.width = '100vw'; overlay.style.height = '100vh';
  overlay.style.backgroundColor = 'rgba(0,0,0,0.85)';
  overlay.style.display = 'flex';
  overlay.style.justifyContent = 'center';
  overlay.style.alignItems = 'center';
  overlay.style.zIndex = '9999';

  const modal = document.createElement('div');
  modal.className = 'ps1-panel';
  modal.style.minWidth = '300px';
  modal.style.maxWidth = '500px';
  modal.style.textAlign = 'center';
  
  modal.innerHTML = `
    <h3 style="margin-bottom:20px; color:var(--ps1-text);">${message}</h3>
    <button id="ps1-alert-ok" style="min-width: 100px;">OK</button>
  `;
  
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  document.getElementById('ps1-alert-ok').focus();

  document.getElementById('ps1-alert-ok').addEventListener('click', () => {
    document.body.removeChild(overlay);
    if(callback) callback();
  });
}

function ps1Prompt(message, callback) {
  const overlay = document.createElement('div');
  overlay.style.position = 'fixed';
  overlay.style.top = '0'; overlay.style.left = '0';
  overlay.style.width = '100vw'; overlay.style.height = '100vh';
  overlay.style.backgroundColor = 'rgba(0,0,0,0.85)';
  overlay.style.display = 'flex';
  overlay.style.justifyContent = 'center';
  overlay.style.alignItems = 'center';
  overlay.style.zIndex = '9999';

  const modal = document.createElement('div');
  modal.className = 'ps1-panel';
  modal.style.minWidth = '300px';
  modal.style.textAlign = 'center';
  
  modal.innerHTML = `
    <h3 style="margin-bottom:15px; color:var(--ps1-text); font-size:20px;">${message}</h3>
    <input type="text" id="ps1-prompt-input" style="margin-bottom:20px;" autocomplete="off" />
    <div style="display:flex; justify-content:space-around;">
      <button id="ps1-prompt-ok">OK</button>
      <button id="ps1-prompt-cancel" style="color:red;">CANCEL</button>
    </div>
  `;
  
  overlay.appendChild(modal);
  document.body.appendChild(overlay);
  document.getElementById('ps1-prompt-input').focus();

  document.getElementById('ps1-prompt-ok').addEventListener('click', () => {
    const val = document.getElementById('ps1-prompt-input').value;
    document.body.removeChild(overlay);
    callback(val);
  });
  
  document.getElementById('ps1-prompt-cancel').addEventListener('click', () => {
    document.body.removeChild(overlay);
    callback(null);
  });
}

const AppState = {
  tasks: JSON.parse(localStorage.getItem('fomodoro_tasks')) || [],
  archivedTasks: JSON.parse(localStorage.getItem('fomodoro_archived_tasks')) || [],
  settings: JSON.parse(localStorage.getItem('fomodoro_settings')) || { segmentType: '25/5' },
  activeTaskId: null,
  view: 'dashboard', // 'dashboard', 'timer', or 'history'
  timer: {
    isRunning: false,
    mode: 'work', // 'work' or 'break'
    timeRemainingSeconds: 0,
    intervalId: null
  }
};

// Fallback for anyone testing migrating from old settings
if (typeof AppState.settings.segmentType === 'undefined') {
  AppState.settings = { segmentType: '25/5' };
}

// Migrate completed tasks to archives
const previouslyCompleted = AppState.tasks.filter(t => t.isCompleted);
if (previouslyCompleted.length > 0) {
  previouslyCompleted.forEach(t => t.completedAt = new Date().toISOString());
  AppState.archivedTasks.push(...previouslyCompleted);
  AppState.tasks = AppState.tasks.filter(t => !t.isCompleted);
  localStorage.setItem('fomodoro_tasks', JSON.stringify(AppState.tasks));
  localStorage.setItem('fomodoro_archived_tasks', JSON.stringify(AppState.archivedTasks));
}

function getSegmentConfig(task) {
  if (task && task.segmentType === '50/10') {
    return { work: 50, break: 10, grant: 60 };
  }
  return { work: 25, break: 5, grant: 30 };
}

function saveState() {
  localStorage.setItem('fomodoro_tasks', JSON.stringify(AppState.tasks));
  localStorage.setItem('fomodoro_archived_tasks', JSON.stringify(AppState.archivedTasks));
  localStorage.setItem('fomodoro_settings', JSON.stringify(AppState.settings));
}

function render() {
  const appDiv = document.getElementById('app');
  if (AppState.view === 'dashboard') {
    appDiv.innerHTML = renderDashboard();
    attachDashboardListeners();
  } else if (AppState.view === 'timer') {
    appDiv.innerHTML = renderTimer();
    attachTimerListeners();
  } else if (AppState.view === 'history') {
    appDiv.innerHTML = renderHistory();
    attachHistoryListeners();
  }
}

function renderDashboard() {
  const taskItems = AppState.tasks.map(task => {
    const hoursLeft = (task.remainingMinutes / 60).toFixed(1);
    return `
      <div class="task-list-item ${task.isCompleted ? 'completed' : ''}">
        <div>
          <strong>${task.name}</strong><br>
          <small>${hoursLeft}h / ${task.originalHours}h remaining</small>
        </div>
        <div>
          ${!task.isCompleted ? `<button class="start-task-btn" data-id="${task.id}">Start</button>` : '<span>DONE</span>'}
          <button class="delete-task-btn" data-id="${task.id}" style="margin-left: 5px; color: red;">X</button>
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="header-bar">
      <span>FOMODORO</span>
      <div>
        <button id="view-history-btn" style="font-size:14px; padding:2px 8px; margin-right: 10px;">HISTORY</button>
        <span>v1.0</span>
      </div>
    </div>
    
    <div class="ps1-panel">
      <h3>Add Task</h3>
      <form id="add-task-form" style="display:flex; flex-direction:column; gap:10px;">
        <div class="d-flex">
          <div class="form-group flex-1" style="margin-bottom:0;">
            <input type="text" id="task-name" placeholder="Task Name" required>
          </div>
          <div class="form-group" style="margin-bottom:0; width: 80px;">
            <input type="number" id="task-hours" placeholder="Hrs" min="0.5" step="0.5" required>
          </div>
        </div>
        <div class="d-flex" style="align-items: center; justify-content: space-between;">
          <div style="display:flex; gap:15px; font-size:14px;">
            <label style="cursor:pointer;">
              <input type="radio" name="task-segment" value="25/5" checked> 25m / 5m (Grants 0.5h)
            </label>
            <label style="cursor:pointer;">
              <input type="radio" name="task-segment" value="50/10"> 50m / 10m (Grants 1h)
            </label>
          </div>
          <button type="submit">ADD</button>
        </div>
      </form>
    </div>

    <div class="ps1-panel">
      <h3>Tasks</h3>
      <div id="task-list">
        ${taskItems.length === 0 ? '<p>No tasks yet. Load memory card...</p>' : taskItems}
      </div>
    </div>
  `;
}

function attachDashboardListeners() {
  document.getElementById('view-history-btn').addEventListener('click', () => {
    AppState.view = 'history';
    render();
  });

  document.getElementById('add-task-form').addEventListener('submit', (e) => {
    e.preventDefault();
    if (AppState.tasks.length >= 3) {
      ps1Alert('Maximum 3 tasks allowed at a time. Complete tasks to free up space!');
      return;
    }
    const name = document.getElementById('task-name').value;
    const hours = parseFloat(document.getElementById('task-hours').value);
    const segmentType = document.querySelector('input[name="task-segment"]:checked').value;
    
    AppState.tasks.push({
      id: Date.now().toString(),
      name,
      originalHours: hours,
      remainingMinutes: hours * 60,
      isCompleted: false,
      segmentType: segmentType
    });
    
    saveState();
    render();
  });

  document.querySelectorAll('.start-task-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const taskId = e.target.getAttribute('data-id');
      startTask(taskId);
    });
  });

  document.querySelectorAll('.delete-task-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const taskId = e.currentTarget.getAttribute('data-id');
      ps1Prompt('Enter password to delete task (hint: konamicode):', (password) => {
        if (password && password.trim().toLowerCase() === 'konamicode') {
          AppState.tasks = AppState.tasks.filter(t => t.id !== taskId);
          saveState();
          render();
        } else if (password !== null) {
          ps1Alert('Incorrect password!');
        }
      });
    });
  });
}

function startTask(taskId) {
  AppState.activeTaskId = taskId;
  AppState.view = 'timer';
  AppState.timer.mode = 'work';
  const task = AppState.tasks.find(t => t.id === taskId);
  const config = getSegmentConfig(task);
  AppState.timer.timeRemainingSeconds = config.work * 60;
  AppState.timer.isRunning = false;
  render();
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function renderTimer() {
  const task = AppState.tasks.find(t => t.id === AppState.activeTaskId);
  const hoursLeft = (task.remainingMinutes / 60).toFixed(1);
  
  const spriteClass = AppState.timer.mode === 'work' 
    ? (AppState.timer.isRunning ? 'dog-sprite-running' : 'dog-sprite-sitting')
    : 'dog-sprite-eating';
  
  return `
    <div class="header-bar">
      <span>FOMODORO</span>
      <span>SYS_TIMER</span>
    </div>

    <div class="ps1-panel" style="text-align: center;">
      <h3>${task.name}</h3>
      <p>Total Time Remaining: ${hoursLeft} hours</p>
      <p style="text-transform:uppercase; color: ${AppState.timer.mode === 'work' ? 'var(--ps1-blue)' : 'green'}; font-weight:bold;">
        MODE: ${AppState.timer.mode}
      </p>
      
      <div id="timer-display" class="timer-display">
        ${formatTime(AppState.timer.timeRemainingSeconds)}
      </div>

      <div class="dog-graphics-container">
        <div class="dog-sprite ${spriteClass}"></div>
      </div>

      <div class="timer-controls">
        <button id="toggle-timer-btn" ${AppState.timer.mode === 'break' ? 'disabled' : ''}>${AppState.timer.isRunning ? 'PAUSE' : 'START'}</button>
      </div>
      
      <p style="font-size: 14px; margin-top: 15px; border: 1px dotted red; padding:5px;">
        Warning: Leaving during a WORK segment aborts the segment, and you won't get credit for the time spent.
      </p>

      <div class="timer-controls" style="margin-top: 15px;">
        <button id="back-dashboard-btn" style="background:#ffcccc; color:black;">ABORT & BACK</button>
      </div>
    </div>
  `;
}

function attachTimerListeners() {
  document.getElementById('toggle-timer-btn').addEventListener('click', () => {
    AppState.timer.isRunning = !AppState.timer.isRunning;
    if (AppState.timer.isRunning) {
      AppState.timer.intervalId = setInterval(tick, 1000);
    } else {
      clearInterval(AppState.timer.intervalId);
    }
    render();
  });

  let abortClickCount = 0;
  document.getElementById('back-dashboard-btn').addEventListener('click', (e) => {
    if (AppState.timer.mode === 'work') {
      if (abortClickCount === 0) {
        e.target.innerText = "CONFIRM ABORT?";
        e.target.style.background = "red";
        e.target.style.color = "white";
        abortClickCount++;
        setTimeout(() => {
          abortClickCount = 0;
          const btn = document.getElementById('back-dashboard-btn');
          if (btn) {
             btn.innerText = "ABORT & BACK";
             btn.style.background = "#ffcccc";
             btn.style.color = "black";
          }
        }, 3000);
      } else {
        stopAndReturn();
      }
    } else {
       stopAndReturn();
    }
  });
}

function tick() {
  if (AppState.timer.timeRemainingSeconds > 0) {
    AppState.timer.timeRemainingSeconds--;
    document.getElementById('timer-display').innerText = formatTime(AppState.timer.timeRemainingSeconds);
  } else {
    handleTimerComplete();
  }
}

function handleTimerComplete() {
  clearInterval(AppState.timer.intervalId);
  AppState.timer.isRunning = false;
  const task = AppState.tasks.find(t => t.id === AppState.activeTaskId);
  const config = getSegmentConfig(task);
  
  if (AppState.timer.mode === 'work') {
    // Work block finished, grant the time!
    const task = AppState.tasks.find(t => t.id === AppState.activeTaskId);
    task.remainingMinutes -= config.grant;
    saveState();
    
    if (task.remainingMinutes <= 0) {
      task.isCompleted = true;
      task.remainingMinutes = 0;
      task.completedAt = new Date().toISOString();
      AppState.archivedTasks.push(task);
      AppState.tasks = AppState.tasks.filter(t => t.id !== task.id);
      saveState();
      ps1Alert('Task Complete! Great job! 🎉 It has been added to your Memory Card history.', () => {
        stopAndReturn();
      });
      return;
    } else {
      // Switch to break
      AppState.timer.mode = 'break';
      AppState.timer.timeRemainingSeconds = config.break * 60;
      ps1Alert(`Work segment complete! We subtracted ${config.grant / 60} hour(s) from your task. Time to take a break!`, () => {
        render();
      });
      return; // prevent double render
    }
  } else {
    // Break finished
    AppState.timer.mode = 'work';
    AppState.timer.timeRemainingSeconds = config.work * 60;
    ps1Alert('Break over. Back to the grind!', () => {
      render();
    });
    return; // prevent double render
  }
}

function stopAndReturn() {
  if (AppState.timer.intervalId) {
    clearInterval(AppState.timer.intervalId);
  }
  AppState.timer.isRunning = false;
  AppState.view = 'dashboard';
  AppState.activeTaskId = null;
  render();
}

function renderHistory() {
  const historyItems = AppState.archivedTasks.map(task => {
    const dateStr = task.completedAt ? new Date(task.completedAt).toLocaleDateString() : 'Unknown Date';
    return `
      <div class="task-list-item">
        <div>
          <strong>${task.name}</strong><br>
          <small>Completed: ${dateStr}</small>
        </div>
        <div>
          <span>${task.originalHours}h logged</span>
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="header-bar">
      <span>FOMODORO</span>
      <div>
        <button id="back-dash-btn" style="font-size:14px; padding:2px 8px; margin-right: 10px;">BACK</button>
        <span>SYS_ARCHIVE</span>
      </div>
    </div>
    
    <div class="ps1-panel">
      <h3>Memory Card - History</h3>
      <div id="task-list">
        ${historyItems.length === 0 ? '<p>No memory data found...</p>' : historyItems}
      </div>
      <div style="margin-top:20px; text-align:center;">
        <button id="clear-history-btn" style="color:red; font-size:14px;">FORMAT MEMORY CARD</button>
      </div>
    </div>
  `;
}

function attachHistoryListeners() {
  document.getElementById('back-dash-btn').addEventListener('click', () => {
    AppState.view = 'dashboard';
    render();
  });
  
  document.getElementById('clear-history-btn').addEventListener('click', () => {
    ps1Prompt('Enter password to format memory card (hint: konamicode):', (password) => {
      if (password && password.trim().toLowerCase() === 'konamicode') {
        AppState.archivedTasks = [];
        saveState();
        render();
        ps1Alert('Memory card formatted safely.');
      } else if (password !== null) {
        ps1Alert('Incorrect password! Format aborted.');
      }
    });
  });
}

// Start app
render();
