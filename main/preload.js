const { ipcRenderer } = require('electron');
const fs = require('fs');

// Since we disabled nodeIntegration we can reintroduce
// needed node functionality here
process.once('loaded', () => {
  const remote = require('electron').remote;
  const { dialog } = remote;
  const { v4: uuidv4 } = require('uuid');
  global.ipcRenderer = ipcRenderer;
  global.dialog = dialog;
  global.fs = require('fs');
  global.path = require('path');
  global.uuid = uuidv4;
});
