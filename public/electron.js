const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const fs = require('fs');
const os = require('os');

let mainWindow;

const dataPath = path.join(app.getPath('userData'), 'shop-accounts-data');

// Ensure data directory exists
if (!fs.existsSync(dataPath)) {
  fs.mkdirSync(dataPath, { recursive: true });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js'),
    },
    icon: path.join(__dirname, 'icon.png'),
  });

  const startUrl = isDev
    ? 'http://localhost:3000'
    : `file://${path.join(__dirname, '../build/index.html')}`;

  mainWindow.loadURL(startUrl);

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// IPC Handlers for data storage
ipcMain.handle('storage-get', async (event, key) => {
  const filePath = path.join(dataPath, `${key}.json`);
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8');
      return { value: data };
    }
    return null;
  } catch (error) {
    console.error('Error reading from storage:', error);
    return null;
  }
});

ipcMain.handle('storage-set', async (event, key, value) => {
  const filePath = path.join(dataPath, `${key}.json`);
  try {
    fs.writeFileSync(filePath, value, 'utf-8');
    return { success: true };
  } catch (error) {
    console.error('Error writing to storage:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('storage-remove', async (event, key) => {
  const filePath = path.join(dataPath, `${key}.json`);
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    return { success: true };
  } catch (error) {
    console.error('Error removing from storage:', error);
    return { success: false, error: error.message };
  }
});

// Create application menu
const template = [
  {
    label: 'ملف',
    submenu: [
      { role: 'quit', label: 'خروج' },
    ],
  },
  {
    label: 'تحرير',
    submenu: [
      { role: 'undo', label: 'تراجع' },
      { role: 'redo', label: 'إعادة' },
      { type: 'separator' },
      { role: 'cut', label: 'قص' },
      { role: 'copy', label: 'نسخ' },
      { role: 'paste', label: 'لصق' },
    ],
  },
  {
    label: 'عرض',
    submenu: [
      { role: 'reload', label: 'تحديث' },
      { role: 'forceReload', label: 'تحديث قسري' },
      { role: 'toggleDevTools', label: 'أدوات المطور' },
      { type: 'separator' },
      { role: 'resetZoom', label: 'إعادة تعيين الحجم' },
      { role: 'zoomIn', label: 'تكبير' },
      { role: 'zoomOut', label: 'تصغير' },
      { type: 'separator' },
      { role: 'togglefullscreen', label: 'ملء الشاشة' },
    ],
  },
];

const menu = Menu.buildFromTemplate(template);
Menu.setApplicationMenu(menu);
