module.exports = {
    context:`${__dirname}/src`,
    entry:`${__dirname}/index.js`,
    mode:'production',
    output:{
        path:`${__dirname}/dist`,
        filename:'yjmidi.min.js'
    }
};