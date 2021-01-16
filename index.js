// Dependencies
const { app, Menu, Tray, BrowserWindow, globalShortcut, clipboard, ipcMain, nativeImage, Notification } = require('electron');
const { execSync } = require('child_process');
const settings = require('electron-settings');
const activeWin = require('active-win');
const FormData = require('form-data');
const fetch = require('node-fetch');
const path = require('path');
const fs = require('fs');

// Functions
const { notif_clip, notif_upload, notif_saved, customError } = require('./functions/notifications');
const createFileName = require('./functions/createFileName');
const template = require('./functions/template');

//variables
let file = `${app.getPath('home')}/screenshot.png`;
let settingsWin = null;
let tray = null;

// Commands
// Get tmp file path
let temp_img_path = path.join(app.getPath('home') + '/screenshot.png');
// Create commands as variables
let fullscreen_cmd = 'screencapture ' + temp_img_path;
let selection_cmd = 'screencapture -i ' + temp_img_path;
let window_cmd = 'screencapture -l$id ' + temp_img_path;
// Create functions for easy access
function screenshotFullscreen() {
  // Run fullscreen command
  execSync(fullscreen_cmd);
}
function screenshotSelection() {
  // Run selection command
  execSync(selection_cmd);
}
async function screenshotWindow() {
  // Get active window
  let active = await activeWin();
  // Return if no active window
  if (!active) return customError('No active window found');
  // Otherwise, run he command with the correct ID
  execSync(window_cmd.replace('$id', active.id), { async: true });
}

// Ready
app.on('ready', (event) => {
  // Set Settings
  if (!settings.has('config')) {
    settings.set('config', {
      'save': 'local',
      'c_fs': 'Command+7',
      'c_s': 'Command+8',
      'c_w': 'Command+9',
      'o_se': 'Command+Shift+i',
    });
    openSettings();
  } else app.dock.hide();

  fs.watch(app.getPath('home'), {}, (e, s) => {
    if (s === 'screenshot.png' && fs.existsSync(file)) handleFile();
  });

  let conf = settings.get('config');

  // Tray
  tray = new Tray(path.join(__dirname, 'assets/icons/icon.png'));
  tray.setToolTip('ScreenShotX');
  tray.setContextMenu(trayMenu(conf));
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));

  // Shortcuts
  registerShortcuts(conf);
});

// When window closes
app.on('window-all-closed', (event) => {
  event.preventDefault();
  app.dock.hide();
});

// When settings update
ipcMain.on('settings:update', async (e, item) => {
  registerShortcuts(item);
  settings.set('config', item);
});

// Function to watch the file
function handleFile() {
  let exist = fs.existsSync(file);
  if (!exist) { return customError('The handleFile function was called, but no file exists'); }
  const filename = createFileName(new Date());
  let conf = settings.get('config');

  if (conf.save === 'clipboard') {
    let image = nativeImage.createFromPath(file);
    try {
      fs.unlinkSync(file);
    } catch (err) {
      customError(err.toString());
    }
    clipboard.writeImage(image);
    notif_clip();
  } else if (conf.save === "local") {
    let file_path = `${app.getPath('documents')}/screenshots/` + filename;
    if (!fs.existsSync(`${app.getPath('documents')}/screenshots`)) {
      fs.mkdirSync(`${app.getPath('documents')}/screenshots`);
    }
    try {
      fs.renameSync(file, file_path);
    } catch (err) {
      customError(err.toString());
    }
    notif_saved();
  } else if (conf.save === 'custom') {
    fs.readFile(file, (err, data) => {
      if (err) return customError(err.toString());
      const formData = new FormData();
      formData.append('file', data, 'image/png');

      let headers = formData.getHeaders();
      headers[conf['custom_settings']['key']] = conf['custom_settings']['auth'];

      fetch(conf['custom_settings']['url'], {
        method: 'POST',
        headers: headers,
        body: formData
      }).then(async (res) => {
        const text = await res.text();
        const rurl = conf['custom_settings']['rurl'].toString();
        if (rurl === 'response') {
          clipboard.writeText(text);
          notif_upload();
        } else if (rurl.startsWith('json.')) {
          rurl.replace('json.', '');
          let json;
          try {
            json = JSON.parse(text);
          } catch (err) {
            return customError(err.toString());
          }
          const args = rurl.split('.');
          const url = args.reduce((T, A) => (T = (json[A] || {}), T), null);
          clipboard.writeText(url);
          notif_upload();
          try {
            fs.unlinkSync(file);
          } catch (err) {
            customError(err.toString());
          }
        } else {
          return customError('Response URL not acceptable');
        }
      }).catch(e => {
        return customError(e.toString());
      });
    });
  } else customError(`Save method ${conf.save} is not accepted.`);
}

// Function to create the menu
function trayMenu(config) {
  return Menu.buildFromTemplate([
    {
      label: 'Capture Full Screen',
      accelerator: config.c_fs,
      click: screenshotFullscreen
    },
    {
      label: 'Capture Selection',
      accelerator: config.c_s,
      click: screenshotSelection
    },
    {
      label: 'Capture Window',
      accelerator: config.c_w,
      click: screenshotWindow
    },
    { type: 'separator' },
    {
      label: 'Settings',
      accelerator: config.o_se,
      click: openSettings
    },
    { type: 'separator' },
    {
      label: 'Quit',
      accelerator: 'Command+Q',
      selector: 'terminate:'
    }
  ]);
}

// Open settings
async function openSettings() {
  if (settingsWin) return settingsWin.show();
  settingsWin = new BrowserWindow({
    show: false,
    title: "ScreenShotX",
    width: 600,
    height: 500,
    resizeable: false,
    maximizable: false,
    webPreferences: {
      nodeIntegration: true
    }
  });
  settingsWin.loadURL(`file://${__dirname}/static/settings.html`);

  settingsWin.webContents.on('dom-ready', () => {
    settingsWin.webContents.send('settings:start', settings.get('config'));
    settingsWin.moveTop();
    settingsWin.show();
    app.dock.show();
  });

  settingsWin.on('closed', () => {
    settingsWin = null;
  });
}

// Register shortcuts
function registerShortcuts(conf) {
  globalShortcut.register(conf.c_fs, screenshotFullscreen);
  globalShortcut.register(conf.c_s, screenshotSelection);
  globalShortcut.register(conf.c_w, screenshotWindow);
  globalShortcut.register(conf.o_se, openSettings);
}
