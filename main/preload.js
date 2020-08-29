const { ipcRenderer } = require('electron');
const fs = require('fs');

// Since we disabled nodeIntegration we can reintroduce
// needed node functionality here
process.once('loaded', () => {
  const remote = require('electron').remote;
  const { dialog } = remote;
  global.ipcRenderer = ipcRenderer;
  global.dialog = dialog;
  global.fs = require('fs');
});
