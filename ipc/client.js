const { app, BrowserWindow, ipcMain } = require('electron');
const CP = require('child_process');
const client = require('electron-connect').client;
const ipc = require('node-ipc');
const constants = require('./constants');

function newServer() {
    const child = CP.spawn(process.execPath, ['ipc/index.js', '--server'], { detached: true  });
    // child.stdout.pipe(process.stdin);
    return child
}

function newClient() {
    const child = CP.spawn(process.execPath, ['ipc/index.js', '--client'], { detached: true });
    // child.stdout.pipe(process.stdin);
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
            
            if (timeout) {
                clearTimeout(timeout);
            }
            timeout = null;
        //     console.log('created');
            if (bound) return;
            bound = true;
        //     console.log('boound');
            ipc.of[ipcId].on('disconnect', () => {
                if (isCreatingServer) {
                    return;
                }
                if (timeout) {
                    clearTimeout(timeout);
                }
                isCreatingServer = true;
                timeout = setTimeout(() => {
                    if (app.requestSingleInstanceLock()) {
                        window.webContents.send('message', 'server is dead, help');
                        console.log(123);
                        newServer();
                    }
                }, 1000 * id);
            });
            ipc.of[ipcId].on('your-id', (iid) => {
                id = iid;
            })
        });
        
    });
    function startServer() {
        // console.log(data.code);
        // if (app.requestSingleInstanceLock()) {
        //     isCreatingServer = true;
        //     window.webContents.send('message', 'server is dead, help');
        //     newServer();
        // } else {
        //     window.webContents.send('message', 'i am not master');
        // }
        if (!process.argv.includes('--client')) {
            newServer();
            console.log(124);
        }
        ipc.of[ipcId].off('error', startServer);
    }
    ipc.of[ipcId].on('error', startServer)
    ipcMain.handle('fetch-master', () => {
        // app.requestSingleInstanceLock();
        return app.hasSingleInstanceLock();
    })
    ipcMain.handle('new-client', () => {
        ipc.of[constants.ipc.id].emit('new-client');
        // newClient();
    })
})

app.on('will-quit', () => {
    app.releaseSingleInstanceLock();
});