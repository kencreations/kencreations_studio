import fs from 'fs';
const xml = fs.readFileSync('C:/Users/Ken/Desktop/playground/web/temp_3mf_02/3D/3dmodel.model', 'utf8');
const regex = /<vertex x="([^"]+)" y="([^"]+)"/g;
let match;
let xs = [];
while(match = regex.exec(xml)) {
    let x = parseFloat(match[1]);
    let y = parseFloat(match[2]);
    // Top edge of the base shape is near Y=54. Look for peaks in Y.
    // Or just look at the bottom edge, Y near 0
    if(y < 5) xs.push(x);
}
xs.sort((a,b)=>a-b);
// Count how many peaks/valleys there are by looking at the density
let buckets = Array(140).fill(0);
xs.forEach(x => {
    let b = Math.floor(x + 70);
    if(b >= 0 && b < 140) buckets[b]++;
});
console.log('Bottom edge density:', buckets.map(c => c > 10 ? 'X' : ' ').join(''));
