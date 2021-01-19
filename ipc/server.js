const { app, BrowserWindow } = require('electron');
const CP = require('child_process');
const IPC = require('node-ipc').IPC;
const constants = require('./constants')

const ipc = new IPC;
const backupIpc = new IPC;

function newClient() {
    const child = CP.spawn(process.execPath, ['ipc/index.js', '--client'], { detached: true });
    return child;
}
function newBackup() {
    const child = CP.spawn(process.execPath, ['ipc/index.js', '--backup'], { detached: true });
    return child;
}

const backupId = constants.ipc.backupId;
let isCreating = false;
let bound = false;
let serverBound = false;

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
    ipc.config.id = constants.ipc.id;
    ipc.config.retry = 1500;
    ipc.config.logger = function(...data) {
        window.webContents.send('message', data.join(';'));
    }
    ipc.serve(() => {
        ipc.server.on('new-client', (data, socket) => {
            const cid = newClient().pid;
            window.webContents.send('message', `client ${cid} was created`);
            ipc.server.emit(socket, 'new-client-created', cid);
            ipc.server.broadcast('new-client-created', 'xxxx');
        });
        ipc.server.on('connect', (socket) => {
            socket.id = `${parseInt(Math.random() * 10000, 10)}`;
            setTimeout(() => {
                window.webContents.send('message', `client ${socket.id} connected`);
            }, 500)
            if (serverBound) return;
            serverBound = true;
            ipc.server.on(
                'socket.disconnected',
                function(socket, destroyedSocketID) {
                    window.webContents.send('message', `client ${socket.id} has disconnected!`);
                }
            );
        });
    });
    ipc.server.start();

    backupIpc.config.id = 'server-guard';
    backupIpc.config.retry = 1500;
    backupIpc.connectTo(backupId, () => {
        backupIpc.of[backupId].on('connect', () => {
            isCreating = false;
            if (bound) return;
            bound = true;
            backupIpc.of[backupId].on('disconnect', () => {
                window.webContents.send('message', `backup is starting`)
                startBackup();
            })
        });
    })

    function resumeBackup(err) {
        window.webContents.send('message', `backup is starting`)
        if (['ENOENT', 'ECONNREFUSED'].includes(err.code)) {
            startBackup()
        }
        // backupIpc.of[backupId].off('error', resumeBackup);
    }

    function startBackup() {
        if (isCreating) return;
        isCreating = true;
        newBackup()
    }
    backupIpc.of[backupId].on('error', resumeBackup);
})
