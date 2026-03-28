// Empire Bridge - Popup Script
const statusBox = document.getElementById('statusBox');
const toggleBtn = document.getElementById('toggleBtn');
const logDiv = document.getElementById('log');

function addLog(msg) {
  logDiv.innerHTML = new Date().toLocaleTimeString() + ' ' + msg + '<br>' + logDiv.innerHTML;
}

// Check status
browser.runtime.sendMessage({ type: 'status' }).then(resp => {
  if (resp && resp.active) {
    statusBox.textContent = '🟢 Active - Polling';
    statusBox.className = 'status active';
  } else {
    statusBox.textContent = '🔴 Inactive';
    statusBox.className = 'status inactive';
  }
}).catch(() => {
  statusBox.textContent = '⚠️ Error';
});

toggleBtn.addEventListener('click', () => {
  browser.runtime.sendMessage({ type: 'status' }).then(resp => {
    if (resp && resp.active) {
      browser.runtime.sendMessage({ type: 'stop' });
      statusBox.textContent = '🔴 Stopped';
      statusBox.className = 'status inactive';
      addLog('Stopped polling');
    } else {
      browser.runtime.sendMessage({ type: 'start' });
      statusBox.textContent = '🟢 Active - Polling';
      statusBox.className = 'status active';
      addLog('Started polling');
    }
  });
});

addLog('Extension ready');
