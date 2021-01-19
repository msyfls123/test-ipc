const args = process.argv;

if (args.includes('--server')) {
    require('./server');
} else if (args.includes('--backup')) {
    require('./backup')
} else {
    require('./client')
}