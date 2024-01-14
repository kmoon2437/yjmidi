module.exports = {
    context: `${__dirname}/src`,
    entry: `${__dirname}/index.js`,
    mode: 'production',
    output: {
        library: 'yjmidi',
        libraryTarget: 'umd',
        path: `${__dirname}/dist`,
        filename: 'yjmidi.min.js'
    }
};