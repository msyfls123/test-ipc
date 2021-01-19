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
let exit = false;

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

    const log = (message) => {
        if (window && !window.isDestroyed()) {
            window.webContents.send('message', message);
        }
    }

    ipc.config.id = backupId;
    ipc.config.retry = 1500;
    ipc.serve(() => {
        
        ipc.server.on('connect', () => {
            setTimeout(() => {
                log('server connected');
            }, 500)
            isCreating = false;
            if (bound) return;
            bound = true;
            ipc.server.on('socket.disconnected', () => {
                if (exit) {
                    return;
                }
                log('server disconnect');

                if (isCreating) return;
                isCreating = true;
                newServer();
            })
        });
        ipc.server.on('force-exit', () => {
            exit = true;
            app.exit();
        });
    });
    ipc.server.start();
})
