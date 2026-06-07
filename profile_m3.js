import fs from 'fs';
const xml = fs.readFileSync('C:/Users/Ken/Desktop/playground/web/temp_3mf_03/3D/3dmodel.model', 'utf8');
const regex = /<vertex x="([^"]+)" y="([^"]+)"/g;
let match;
let bottomPoints = [];
while(match = regex.exec(xml)) {
    let x = parseFloat(match[1]);
    let y = parseFloat(match[2]);
    if(y < 10) bottomPoints.push({x: Math.round(x*10)/10, y: Math.round(y*10)/10});
}
let profile = {};
bottomPoints.forEach(p => {
    if(!profile[p.x] || p.y < profile[p.x]) profile[p.x] = p.y;
});
let xs = Object.keys(profile).map(Number).sort((a,b)=>a-b);
for(let i=0; i<xs.length; i++) {
    if(xs[i] > -70 && xs[i] < -30) console.log(xs[i].toFixed(1), profile[xs[i]]);
}
