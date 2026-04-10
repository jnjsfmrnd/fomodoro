const AppState = {
  tasks: JSON.parse(localStorage.getItem('fomodoro_tasks')) || [],
  settings: JSON.parse(localStorage.getItem('fomodoro_settings')) || { segmentType: '25/5' },
  activeTaskId: null,
  view: 'dashboard', // 'dashboard' or 'timer'
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

function getSegmentConfig(task) {
  if (task && task.segmentType === '50/10') {
    return { work: 50, break: 10, grant: 60 };
  }
  return { work: 25, break: 5, grant: 30 };
}

function saveState() {
  localStorage.setItem('fomodoro_tasks', JSON.stringify(AppState.tasks));
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
        ${!task.isCompleted ? `<button class="start-task-btn" data-id="${task.id}">Start</button>` : '<span>DONE</span>'}
      </div>
    `;
  }).join('');

  return `
    <div class="header-bar">
      <span>FOMODORO</span>
      <span>v1.0</span>
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
  document.getElementById('add-task-form').addEventListener('submit', (e) => {
    e.preventDefault();
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

      <div class="timer-controls">
        <button id="toggle-timer-btn">${AppState.timer.isRunning ? 'PAUSE' : 'START'}</button>
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
      saveState();
      alert('Task Complete! Great job! 🎉');
      stopAndReturn();
      return;
    } else {
      // Switch to break
      AppState.timer.mode = 'break';
      AppState.timer.timeRemainingSeconds = config.break * 60;
      alert(`Work segment complete! We subtracted ${config.grant / 60} hour(s) from your task. Time to take a break!`);
    }
  } else {
    // Break finished
    AppState.timer.mode = 'work';
    AppState.timer.timeRemainingSeconds = config.work * 60;
    alert('Break over. Back to the grind!');
  }
  
  render();
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

// Start app
render();
