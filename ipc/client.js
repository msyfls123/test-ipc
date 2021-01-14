const { app, BrowserWindow, ipcMain } = require('electron');
const CP = require('child_process');
const ipc = require('node-ipc');

function newClient() {
    const child = CP.spawn(process.execPath, ['ipc/client.js'], { detached: true });
    child.stdout.pipe(process.stdin);
}

const lock = app.requestSingleInstanceLock();
if (lock) {
    newClient()
}

app.whenReady().then(() => {
    const window = new BrowserWindow({
        webPreferences: {
            nodeIntegration: true,
            enableRemoteModule: true,
            devTools: true,
        }
    });
    window.loadURL(`file://${__dirname}/client.html`);
    // window.webContents.openDevTools({ mode: 'detach' });
    window.webContents.on('did-finish-load', () => {
        window.webContents.send('toggle-master', lock);
    })
    ipcMain.handle('fetch-master', () => {
        return app.requestSingleInstanceLock();
    })
    ipcMain.handle('new-client', () => {
        newClient();
    })
})