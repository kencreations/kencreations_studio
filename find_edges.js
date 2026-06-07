import fs from 'fs';
const xml = fs.readFileSync('C:/Users/Ken/Desktop/playground/web/temp_3mf_01/3D/3dmodel.model', 'utf8');
const regex = /<vertex x="([^"]+)" y="([^"]+)"/g;
let match;
let ys = [];
let xs = [];
while(match = regex.exec(xml)) {
    let x = Math.round(parseFloat(match[1]));
    let y = Math.round(parseFloat(match[2]));
    xs.push(x);
    ys.push(y);
}
const yFreq = {};
ys.forEach(y => yFreq[y] = (yFreq[y] || 0) + 1);
console.log('Y Frequencies:', Object.entries(yFreq).sort((a,b)=>b[1]-a[1]).slice(0, 10));

const xFreq = {};
xs.forEach(x => xFreq[x] = (xFreq[x] || 0) + 1);
console.log('X Frequencies:', Object.entries(xFreq).sort((a,b)=>b[1]-a[1]).slice(0, 10));
