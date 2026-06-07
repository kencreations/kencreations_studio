import fs from 'fs';
const xml = fs.readFileSync('C:/Users/Ken/Desktop/playground/web/temp_3mf_02/3D/3dmodel.model', 'utf8');
const regex = /<vertex x="([^"]+)" y="([^"]+)"/g;
let match;
let bottomPoints = [];
while(match = regex.exec(xml)) {
    let x = parseFloat(match[1]);
    let y = parseFloat(match[2]);
    if(y < 5) bottomPoints.push({x,y});
}
bottomPoints.sort((a,b)=>a.x-b.x);
let tips = [];
let window = 5;
for(let x=-70; x<70; x+=window) {
    let pts = bottomPoints.filter(p => p.x >= x && p.x < x+window);
    if(pts.length > 0) {
        let minY = Math.min(...pts.map(p=>p.y));
        if (minY < 1) tips.push({x: x+window/2, minY});
    }
}
console.log('Model 2 bottom tips (max outward extent):', tips.map(t=> Math.round(t.x)));
