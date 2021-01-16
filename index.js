// Dependencies
const { app, Menu, Tray, BrowserWindow, globalShortcut, clipboard, ipcMain, nativeImage, Notification } = require('electron');
const settings = require('electron-settings');
const activeWin = require('active-win');
const FormData = require('form-data');
const fetch = require('node-fetch');
const shell = require('shelljs');
const path = require('path');
const fs = require('fs');

// Functions
const createFileName = require('./functions/createFileName');

// Set node
shell.config.execPath = shell.which('node');

//variables
let settingsWin = null;
let tray = null;

// Load notifications
const notif_clip = () => new Notification({ title: 'Screenshot Taken', body: 'Screenshot has been copied to your clipboard' }).show();
const notif_upload = () => new Notification({ title: 'Screenshot Uploaded', body: 'Screenshot link has been copied to your clipboard' }).show();
const notif_saved = () => new Notification({ title: 'Screenshot Uploaded', body: 'Screenshot has been saved to file' }).show();
const customError = (t) => new Notification({ title: 'Error', body: t }).show();

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
  shell.exec(fullscreen_cmd, { async: true });
}
function screenshotSelection() {
  // Run selection command
  shell.exec(selection_cmd, { async: true });
}
async function screenshotWindow() {
  // Get active window
  let active = await activeWin();
  // Return if no active window
  if (!active) return customError('No active window found');
  // Otherwise, run he command with the correct ID
  else shell.exec(window_cmd.replace('$id', active.id), { async: true });
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

  let conf = settings.get('config');

  // Tray
  tray = new Tray(path.join(__dirname, 'assets/icons/icon.png'));
  tray.setToolTip('ScreenShotX');
  tray.setContextMenu(trayMenu(conf));
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));

  // Shortcuts
  registerShortcuts(conf);
  watchFile();
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

let file = `${app.getPath('home')}/screenshot.png`;

// Function to watch the file
function watchFile() {
  if (!fs.existsSync(file)) return setTimeout(() => { watchFile(); }, 1000);

  const filename = createFileName(new Date());
  let conf = settings.get('config');

  if (conf.save === 'clipboard') {
    let image = nativeImage.createFromPath(`${app.getPath('home')}/screenshot.png`);
    clipboard.writeImage(image);
    notif_clip();
  } else fs.readFile(file, (err, data) => {
    if (err) return customError(err.toString());
    if (conf.save === "local") {
      let file_path = `${app.getPath('documents')}/screenshots/` + filename;
      if (!fs.existsSync(`${app.getPath('documents')}/screenshots`)) {
        fs.mkdirSync(`${app.getPath('documents')}/screenshots`);
      }
      fs.writeFile(file_path, data, (err) => {
        if (err) console.log(err);
      });
      notif_saved();
    } else if (conf.save === "custom") {
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
            customError(err.toString());
          }
          const args = rurl.split('.');
          const url = args.reduce((T, A) => (T = (json[A] || {}), T), null);
          clipboard.writeText(url);
          notif_upload();
        } else {
          customError('Response URL not acceptable');
        }
      }).catch(e => {
        customError(e.toString());
      });
    } else customError('Save method is not accepted yet.');
  });
  setTimeout(() => { fs.unlinkSync(file); watchFile(); }, 1000);
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
  if (settingsWin) return settingsWin.moveTop();
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

//menu
const template = [
  {
    label: 'Edit',
    submenu: [
      { role: 'undo' },
      { role: 'redo' },
      { type: 'separator' },
      { role: 'cut' },
      { role: 'copy' },
      { role: 'paste' },
      { role: 'pasteandmatchstyle' },
      { role: 'delete' },
      { role: 'selectall' }
    ]
  },
  {
    label: 'View',
    submenu: [
      { role: 'reload' },
      { role: 'forcereload' },
      { role: 'toggledevtools' },
      { type: 'separator' },
      { role: 'resetzoom' },
      { role: 'zoomin' },
      { role: 'zoomout' },
      { type: 'separator' },
      { role: 'togglefullscreen' }
    ]
  },
  {
    role: 'window',
    submenu: [
      { role: 'minimize' },
      { role: 'close' }
    ]
  }
];

if (process.platform === 'darwin') {
  template.unshift({
    label: app.name,
    submenu: [
      { role: 'about' },
      { type: 'separator' },
      { role: 'services' },
      { type: 'separator' },
      { role: 'hide' },
      { role: 'hideothers' },
      { role: 'unhide' },
      { type: 'separator' },
      { role: 'quit' }
    ]
  });

  // Edit menu
  template[1].submenu.push(
    { type: 'separator' },
    {
      label: 'Speech',
      submenu: [
        { role: 'startspeaking' },
        { role: 'stopspeaking' }
      ]
    }
  );

  // Window menu
  template[3].submenu = [
    { role: 'close' },
    { role: 'minimize' },
    { role: 'zoom' },
    { type: 'separator' },
    { role: 'front' }
  ];
}
