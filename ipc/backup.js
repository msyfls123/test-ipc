const { app, BrowserWindow } = require('electron');
const CP = require('child_process');
const ipc = require('node-ipc');
const constants = require('./constants')

function newServer() {
    const child = CP.spawn(process.execPath, ['ipc/index.js', '--server'], { detached: true });
    return child;
}

const { backupId } = constants.ipc;

let isCreating = false;
let bound = false;

app.whenReady().then(() => {

    const window = new BrowserWindow({
        webPreferences: {
            nodeIntegration: true,
            enableRemoteModule: true,
            devTools: true,
        }
    });
    window.loadURL(`file://${__dirname}/backup.html`);
    // window.webContents.openDevTools({ mode: 'detach' });
    ipc.config.id = backupId;
    ipc.config.retry = 1500;
    ipc.serve(() => {
        
        ipc.server.on('connect', () => {
            setTimeout(() => {
                window.webContents.send('message', 'server connected');
            }, 500)
            isCreating = false;
            if (bound) return;
            bound = true;
            ipc.server.on('socket.disconnected', () => {
                window.webContents.send('message', 'server disconnect');
                if (isCreating) return;
                isCreating = true;
                newServer();
            })
        })
    });
    ipc.server.start();
})
