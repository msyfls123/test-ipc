var gulp = require('gulp');
var electron = require('electron-connect').server.create();
 
gulp.task('serve', function () {
 
    // Start browser process
    electron.start();
    
    // Restart browser process
    gulp.watch([
        'ipc/index.js',
        'ipc/server.js',
        'ipc/client.js',
        'ipc/backup.js',
    ], electron.restart);
    
    // Reload renderer process
    gulp.watch([
        'ipc/server.html',
        'ipc/client.html'
    ], electron.reload);
});