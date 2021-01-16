//dependencies
const electron = require('electron')
const { app, Menu, Tray, BrowserWindow, globalShortcut, clipboard, ipcMain, nativeImage, Notification } = require('electron')
const settings = require('electron-settings');
const path = require('path')
const fs = require('fs')
const request = require('request')
const activeWin = require('active-win');
const isJson = require('is-json')
const shell = require('shelljs')
shell.config.execPath = shell.which('node')

//variables
const icon = path.join(__dirname, 'assets/icons/icon.png')
let tray = null
let win = null
let settingsWin = null
let notif_clip = null
let notif_upload = null
let notif_error = null
let temp_img_path = path.join(app.getPath('home') + '/screenshot.png')
//commands
let fullscreen_cmd = 'screencapture ' + temp_img_path
let selection_cmd = 'screencapture -i ' + temp_img_path
let window_cmd = 'screencapture -l$id ' + temp_img_path

//ready
app.on('ready', (event) => {
  app.dock.hide();
  //settings
  if (!settings.has('config')) {
    settings.set('config', {
      'save': 'imgur',
      'c_fs': 'Command+7',
      'c_s': 'Command+8',
      'c_w': 'Command+9'
    })
  }
  let conf = settings.get('config')
  //load notifications
  notif_clip = new Notification({
    title: 'Screenshot Taken',
    body: 'Screenshot has been copied to your clipboard'
  })

  notif_upload = new Notification({
    title: 'Screenshot Uploaded',
    body: 'Screenshot link has been copied to your clipboard'
  })

  notif_error = new Notification({
    title: 'Error',
    body: 'Something went wrong while uploading'
  })


  //tray
  tray = new Tray(icon)

  //tray menu
  const contextMenu = trayMenu(conf)

  tray.setToolTip('ScreenShotX')
  tray.setContextMenu(contextMenu)


  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
  //Shortcuts
  globalShortcut.register(conf.c_fs, () => {
    let child = shell.exec(fullscreen_cmd, { async: true })
  })
  globalShortcut.register(conf.c_s, async () => {
    let child = shell.exec(selection_cmd, { async: true })
  })
  globalShortcut.register(conf.c_w, async () => {
    let active = await activeWin()
    if (!active) return

    shell.exec(window_cmd.replace('$id', active.id), { async: true })
  })

})

app.on('window-all-closed', (event) => {
  event.preventDefault()
  app.dock.hide();
})

ipcMain.on('settings:update', async (e, item) => {
  let conf = item
  globalShortcut.unregisterAll()
  globalShortcut.register(conf.c_fs, () => {
    let child = shell.exec(fullscreen_cmd, { async: true })
  })
  globalShortcut.register(conf.c_s, () => {
    let child = shell.exec(selection_cmd, { async: true })
  })
  globalShortcut.register(conf.c_w, async () => {
    let active = await activeWin()
    if (!active) return

    shell.exec(window_cmd.replace('$id', active.id), { async: true })
  })
  settings.set('config', item)
})

//notification types






let file = `${app.getPath('home')}/screenshot.png`;
function watchFile() {

  let exist = fs.existsSync(file)
  if (!exist) {
    setTimeout(() => {
      watchFile()
    }, 1000)
    return
  }
  let date = new Date()
  let filename = `Screen Shot ${date.getDate()}-${date.getMonth()}-${date.getFullYear()} (${date.getHours()}.${date.getMinutes()}.${date.getSeconds()}).png`
  let conf = settings.get('config')

  if (conf.save === 'clipboard') {
    let image = nativeImage.createFromPath(`${app.getPath('home')}/screenshot.png`)
    clipboard.writeImage(image)
    notif_clip.show()
    fs.unlinkSync(file)
    watchFile()
    return
  }
  fs.readFile(file, function read(err, data) {
    if (conf.save === 'imgur') {
      let req = request.post({ url: 'https://api.imgur.com/3/upload', qs: { name: filename, image: data.toString('base64') }, headers: { 'Authorization': 'Client-ID 6a5400948b3b376' } }, function (err, resp, body) {
        if (err) return console.error(err)
        if (!isJson(body)) return notif_error.show()
        let json = JSON.parse(body)
        if (conf.open === true) require("electron").shell.openExternal(json.data.link);
        clipboard.writeText(json.data.link)
        notif_upload.show()
      });
    } else if (conf.save === "local") {
      let file_path = `${app.getPath('documents')}/screenshots/` + filename
      if (!fs.existsSync(`${app.getPath('documents')}/screenshots`)) {
        fs.mkdirSync(`${app.getPath('documents')}/screenshots`)
      }
      fs.writeFile(file_path, data, function (err) {
        if (err) console.log(err)
      })
    } else if (conf.save === "custom") {
      let header = {}
      header[conf['custom_settings']['key']] = conf['custom_settings']['auth']

      let req = request.post({ url: conf['custom_settings']['url'], headers: header }, function (err, resp, body) {
        if (err) return console.error(err)
        if (!isJson(body)) return notif_error.show()
        let json = JSON.parse(body)
        if (json.error) return
        if (conf.open === true) require("electron").shell.openExternal(json[conf['custom_settings']['rurl']]);
        clipboard.writeText(json[conf['custom_settings']['rurl']])
        notif_upload.show()
      });
      let form = req.form()
      form.append('file', data, {
        filename: filename,
        type: 'image/png'
      })
    }
  });
  setTimeout(() => {
    fs.unlinkSync(file)
    watchFile()
  }, 1000)
}


watchFile()


function trayMenu(config) {
  return Menu.buildFromTemplate([
    {
      label: 'Capture Full Screen',
      accelerator: config.c_fs,
      click: function () {
        shell.exec(selection_cmd, { async: true })
      }
    },
    {
      label: 'Capture Selection',
      accelerator: config.c_s,
      click: function () {
        shell.exec(selection_cmd, { async: true })
      }
    },
    {
      label: 'Capture Window',
      accelerator: config.c_w,
      click: async () => {
        let active = await activeWin()
        if (!active) return

        shell.exec(window_cmd.replace('$id', active.id), { async: true })
      }
    },
    { type: 'separator' },
    {
      label: 'Settings',
      click: async () => {
        if (settingsWin) return settingsWin.moveTop()
        let x = 0;
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
        })
        settingsWin.loadURL(`file://${__dirname}/static/settings.html`)

        settingsWin.webContents.on('dom-ready', () => {
          console.log('yes')
          let conf = settings.get('config')
          app.dock.show();
          settingsWin.webContents.send('settings:start', conf);
          settingsWin.moveTop()
        });
        //events
        settingsWin.on('closed', function () {
          settingsWin = null
        })
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      accelerator: 'Command+Q',
      selector: 'terminate:'
    }
  ])
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
]

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
  })

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
  )

  // Window menu
  template[3].submenu = [
    { role: 'close' },
    { role: 'minimize' },
    { role: 'zoom' },
    { type: 'separator' },
    { role: 'front' }
  ]
}
