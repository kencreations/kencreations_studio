const fs = require('fs');

const files = [
  'src/components/Scene.tsx',
  'src/components/Scene2.tsx',
  'src/components/Scene3.tsx',
  'src/components/ScenePencil.tsx',
  'src/components/SceneClicker.tsx'
];

for (const f of files) {
  if (!fs.existsSync(f)) continue;
  let txt = fs.readFileSync(f, 'utf8');

  // 1. Remove props from interface
  txt = txt.replace(/    activeLayer\?: number;\n/g, '');
  txt = txt.replace(/    totalLayers\?: number;\n/g, '');
  txt = txt.replace(/    slicerPathProgress\?: number;\n/g, '');
  txt = txt.replace(/    isSlicing\?: boolean;\n/g, '');
  txt = txt.replace(/    activeLayer: number;\n/g, '');
  txt = txt.replace(/    totalLayers: number;\n/g, '');
  txt = txt.replace(/    slicerPathProgress: number;\n/g, '');

  // 2. Remove destructured props
  txt = txt.replace(/    activeLayer,\n/g, '');
  txt = txt.replace(/    totalLayers,\n/g, '');
  txt = txt.replace(/    slicerPathProgress,\n/g, '');
  txt = txt.replace(/    isSlicing,\n/g, '');
  
  // inline destructures
  txt = txt.replace(/const { activeLayer, totalLayers, slicerPathProgress, isSlicing } = props;\n?/g, '');
  txt = txt.replace(/const { activeLayer, totalLayers, slicerPathProgress } = props;\n?/g, '');
  txt = txt.replace(/const { activeLayer, totalLayers, bounds, slicerPathProgress } = props;/g, 'const { bounds } = props;');

  // 3. Remove memo blocks
  txt = txt.replace(/    const cutoffZ = React\.useMemo\(\(\) => \{[\s\S]*?\}, \[.*?\]\);\n\n/g, '');
  txt = txt.replace(/    const clippingPlanes = React\.useMemo\(\(\) => \{[\s\S]*?\}, \[.*?\]\);\n\n/g, '');
  txt = txt.replace(/    const ghostClippingPlanes = React\.useMemo\(\(\) => \{[\s\S]*?\}, \[.*?\]\);\n\n/g, '');
  txt = txt.replace(/    const striatedTexture = React\.useMemo\(\(\) => \{[\s\S]*?\}, \[\]\);\n\n/g, '');
  txt = txt.replace(/    const toolpathTexture = React\.useMemo\(\(\) => \{[\s\S]*?\}, \[.*?\]\);\n\n/g, '');

  // PrintNozzle usages
  txt = txt.replace(/import PrintNozzle from ".*?";\n/g, '');
  txt = txt.replace(/                \{slicerPathProgress !== undefined && \([\s\S]*?\}\)\}\n/g, '');
  txt = txt.replace(/                <PrintNozzle[\s\S]*?\/>\n/g, '');
  
  // clipping planes props
  txt = txt.replace(/\s*clippingPlanes: clippingPlanes,?\n/g, '\n');
  txt = txt.replace(/\s*clippingPlanes=\{clippingPlanes\}\n/g, '\n');

  fs.writeFileSync(f, txt, 'utf8');
}
console.log("Cleanup complete!");
