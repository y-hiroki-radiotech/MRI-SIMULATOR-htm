// エンジン一式を Node で読み込む（ファントムは src/ph/*.js をすべて）
global.window=global; const fs=require('fs'), path=require('path'); const S=path.join(__dirname,'..','src');
['tissues','phantom'].forEach(f=>require(path.join(S,f+'.js')));
fs.readdirSync(path.join(S,'ph')).filter(f=>f.endsWith('.js')).sort().forEach(f=>require(path.join(S,'ph',f)));
['engine','seqs','vendors','state','meta','learn'].forEach(f=>{ const q=path.join(S,f+'.js'); if(fs.existsSync(q)) require(q); });
if(fs.existsSync(path.join(S,'seq'))) fs.readdirSync(path.join(S,'seq')).filter(f=>f.endsWith('.js')).sort().forEach(f=>require(path.join(S,'seq',f)));
module.exports=global.MS;
