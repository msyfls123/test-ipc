const { app, BrowserWindow } = require('electron');
const CP = require('child_process');
const ipc = require('node-ipc');
const constants = require('./constants')

function newClient() {
    const child = CP.spawn(process.execPath, ['ipc/index.js', '--client'], { detached: true });
    // child.stdout.pipe(process.stdin);
    return child;
}

const lock = app.requestSingleInstanceLock();

// if (!lock) {
//     app.quit();
// }

let id = 0;

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
    ipc.serve(() => {
        ipc.server.on('new-client', (data, socket) => {
            const cid = newClient().pid;
            window.webContents.send('message', `client ${cid} was created`)
            ipc.server.emit(socket, 'new-client-created', cid);
            ipc.server.broadcast('new-client-created', 'xxxx');
        });
        ipc.server.on('connect-id', (data, socket) => {
            window.webContents.send('message', `client index ${id} was connected`)
            ipc.server.emit(socket, 'your-id', id++);
        })
    });
    ipc.server.start();
})

// app.on('will-quit', () => {
//     app.releaseSingleInstanceLock();
// });