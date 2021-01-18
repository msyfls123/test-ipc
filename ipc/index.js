const args = process.argv;

if (args.includes('--server')) {
    require('./server');
} else {
    require('./client')
}