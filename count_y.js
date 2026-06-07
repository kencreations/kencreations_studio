import fs from 'fs';
const xml = fs.readFileSync('C:/Users/Ken/Desktop/playground/web/temp_3mf_02/3D/3dmodel.model', 'utf8');
const regex = /<vertex x="([^"]+)" y="([^"]+)"/g;
let match;
let ys = [];
while(match = regex.exec(xml)) {
    let x = parseFloat(match[1]);
    let y = parseFloat(match[2]);
    if(x > 65) ys.push(y); // Right edge
}
let buckets = Array(70).fill(0);
ys.forEach(y => {
    let b = Math.floor(y);
    if(b >= 0 && b < 70) buckets[b]++;
});
console.log('Right edge density:', buckets.map(c => c > 10 ? 'X' : ' ').join(''));
