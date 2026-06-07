import fs from 'fs';
let c = fs.readFileSync('src/components/Scene4.tsx', 'utf8');
const idx = c.indexOf('const Scene4: React.FC<SceneProps> = (props) => {');
c = c.substring(0, idx) + 'const Scene4: React.FC<SceneProps> = (props) => {\n' +
'    const { bounds } = props;\n' +
'    const baseThickness = props.state.shape.baseThickness || 3.0;\n' +
'    const floorZ = -baseThickness / 2;\n' +
'\n' +
'    return (\n' +
'        <div style={{ width: "100%", height: "100%", position: "relative" }}>\n' +
'            <Canvas\n' +
'                shadows\n' +
'                camera={{ position: [0, -90, 80], fov: 40 }}\n' +
'                gl={{ localClippingEnabled: true, preserveDrawingBuffer: true }}\n' +
'                style={{ background: "radial-gradient(circle at center, #1b2030 0%, #0d0f17 100%)" }}\n' +
'            >\n' +
'                <ambientLight intensity={0.5} />\n' +
'                <directionalLight\n' +
'                    position={[15, -30, 40]}\n' +
'                    intensity={1.2}\n' +
'                    castShadow\n' +
'                    shadow-mapSize={[2048, 2048]}\n' +
'                    shadow-bias={-0.0001}\n' +
'                />\n' +
'                <directionalLight position={[-15, 30, 20]} intensity={0.4} />\n' +
'                <pointLight position={[0, 0, 25]} intensity={0.5} />\n' +
'\n' +
'                <group position={[0, 0, 0]}>\n' +
'                    <Generator4 {...props} />\n' +
'                </group>\n' +
'\n' +
'                <OrbitControls\n' +
'                    enableDamping\n' +
'                    dampingFactor={0.05}\n' +
'                    maxPolarAngle={Math.PI / 2 + 0.1}\n' +
'                    minDistance={30}\n' +
'                    maxDistance={250}\n' +
'                />\n' +
'                \n' +
'                <Grid\n' +
'                    position={[0, 0, floorZ - 0.05]}\n' +
'                    args={[180, 180]}\n' +
'                    cellSize={10}\n' +
'                    cellThickness={1.0}\n' +
'                    cellColor="#1e293b"\n' +
'                    sectionSize={50}\n' +
'                    sectionThickness={1.5}\n' +
'                    sectionColor="#334155"\n' +
'                    fadeDistance={180}\n' +
'                    infiniteGrid\n' +
'                />\n' +
'                <Environment preset="city" />\n' +
'            </Canvas>\n' +
'        </div>\n' +
'    );\n' +
'};\n' +
'\n' +
'export { Generator4 };\n' +
'export default Scene4;\n';
fs.writeFileSync('src/components/Scene4.tsx', c);
