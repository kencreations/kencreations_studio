import fs from 'fs';
const xml = fs.readFileSync('C:/Users/Ken/Desktop/playground/web/temp_3mf_03/3D/3dmodel.model', 'utf8');
const regex = /<vertex x="([^"]+)" y="([^"]+)"/g;
let match;
let xs = [];
let ys = [];
while(match = regex.exec(xml)) {
    let x = parseFloat(match[1]);
    let y = parseFloat(match[2]);
    if(y < 5) xs.push(x);
    if(x > 65) ys.push(y);
}
let bucketsX = Array(140).fill(0);
xs.forEach(x => { let b = Math.floor(x + 70); if(b >= 0 && b < 140) bucketsX[b]++; });
console.log('Model 3 X density:', bucketsX.map(c => c > 10 ? 'X' : ' ').join(''));

let bucketsY = Array(70).fill(0);
ys.forEach(y => { let b = Math.floor(y); if(b >= 0 && b < 70) bucketsY[b]++; });
console.log('Model 3 Y density:', bucketsY.map(c => c > 5 ? 'X' : ' ').join(''));
