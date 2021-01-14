const { app, BrowserWindow } = require('electron');
const CP = require('child_process');
const client = require('electron-connect').client;

const lock = app.requestSingleInstanceLock();
if (lock) {
    setTimeout(() => {
        const child = CP.spawn(process.execPath, ['ipc/client.js'], { detached: true });
        child.stdout.pipe(process.stdin);
    })
}

app.whenReady().then(() => {
    const window = new BrowserWindow({
        webPreferences: {
            nodeIntegration: true,
            enableRemoteModule: true,
            devTools: true,
        }
    });
    window.loadURL(`file://${__dirname}/server.html`);
    // window.webContents.openDevTools({ mode: 'detach' });
    client.create(window);
})