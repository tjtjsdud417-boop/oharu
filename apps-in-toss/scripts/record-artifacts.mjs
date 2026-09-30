import fs from 'node:fs';
import crypto from 'node:crypto';
const filename='ARTIFACTS.json';
const report=JSON.parse(fs.readFileSync(filename,'utf8'));
report.createdAt=new Date().toISOString();
report.integrationBuild='Local rebuild after isolated main-tree import; no upload';
for(const item of report.files){
  const bytes=fs.readFileSync(item.file);
  item.bytes=bytes.length;
  item.sha256=crypto.createHash('sha256').update(bytes).digest('hex');
}
fs.writeFileSync(filename,JSON.stringify(report,null,2)+'\n');
