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

let bound = false;

let isCreatingServer = false;
let timeout = null;

let id = 0;

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
    client.create(window);
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
        ipc.of[ipcId].on('connect', () => {
            isCreatingServer = false;
            ipc.of[ipcId].emit('connect-id');

            if (!process.argv.includes('--client')) {
                ipc.of[ipcId].off('error', startServer);
            }
            
            if (timeout) {
                clearTimeout(timeout);
            }
            timeout = null;

            if (bound) return;
            bound = true;

            ipc.of[ipcId].on('disconnect', () => {
                if (isCreatingServer) {
                    return;
                }
                // 过快的 kill serve 可能出现 timeout 错误被清除的现象
                if (timeout) {
                    clearTimeout(timeout);
                }
                isCreatingServer = true;
                timeout = setTimeout(() => {
                    if (app.requestSingleInstanceLock()) {
                        window.webContents.send('message', 'server is dead, help');
                        newServer();
                    }
                }, 1000 * id);
            });
            ipc.of[ipcId].on('your-id', (mineId) => {
                id = mineId;
            })
        });
        
    });
    function startServer(err) {
        if (['ENOENT', 'ECONNREFUSED'].includes(err.code)) {
            newServer();
        }
    }
    if (!process.argv.includes('--client')) {
        ipc.of[ipcId].on('error', startServer)
    }
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
