#!/usr/bin/env node

const fs = require('fs');
const qs = require('querystring');
const { program } = require('commander');
const { YJKFileConverter } = require('../index');

program
.version(require('../package.json').version, '-v, --version')
.usage('<input file> <output file> --compress <raw|deflate|gz>')
.description('Convert midi file to yjk file')
.option('-c, --compress <raw|deflate|gz>', 'compression algorithm')
.option('-p, --param <querystring>', 'parameters')
.parse(process.argv);

let [ input,output ] = program.args;
let opts = program.opts();

if(!input){
    console.error('Input file(first argument) required');
    process.exit();
}
if(!output){
    console.error('Output file(second argument) required');
    process.exit();
}

let params = Object.assign({
    // 'trackName'은 트랙 이름에서
    // 가장 처음 나오는 숫자로 구별(숫자가 2개이상인 경우 한정)
    // 'portPrefixMeta' 는 midi port prefix meta event(0x21)로 구별(없는경우 0)
    portSeparate:'portPrefixMeta',
    
    // 파일 볼륨(0~200)
    // 볼륨 평준화용으로 기본값은 최대값인 200
    // 적용방법(channel volume은 자주 쓰이므로 expression을 조절)
    // expression *= (fileVolume/maxFileVolume)
    fileVolume:200
},qs.decode(opts.param));

fs.writeFileSync(output,YJKFileConverter.midi2yjk(fs.readFileSync(input),{
    compress:opts.compress || 'raw',
    portSeparate:params.portSeparate,
    fileVolume:params.fileVolume
}));