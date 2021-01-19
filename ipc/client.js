const { app, BrowserWindow, ipcMain } = require('electron');
const CP = require('child_process');
const client = require('electron-connect').client;
const ipc = require('node-ipc');
const constants = require('./constants');

function newServer() {
    const child = CP.spawn(process.execPath, ['ipc/index.js', '--server'], { detached: true  });
    return child
}

function newClient() {
    const child = CP.spawn(process.execPath, ['ipc/index.js', '--client'], { detached: true });
    return child;
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

    const log = (message) => {
        if (window && !window.isDestroyed()) {
            window.webContents.send('message', message);
        }
    }
    if (process.env.NODE_ENV === 'development') {
        client.create(window);
    }
    const ipcId = constants.ipc.id;
    ipc.config.retry = 1500;
    ipc.config.silent = true;
    ipc.connectTo(ipcId, () => {
        setTimeout(() => {
            window.webContents.send('message', 'server connected');
        }, 500)
        ipc.of[ipcId].on('new-client-created', (data) => {
            window.webContents.send('message', `client ${data} was created`)
        });
    });
    if (!process.argv.includes('--client')) {
        newServer()
    }
    ipc.of[ipcId].on('error', (err) => {
        log(err.code);
    })
    ipcMain.handle('fetch-master', () => {
        return app.hasSingleInstanceLock();
    })
    ipcMain.handle('new-client', () => {
        ipc.of[constants.ipc.id].emit('new-client');
    })
})

app.on('will-quit', () => {
    app.releaseSingleInstanceLock();
});
