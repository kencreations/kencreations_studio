import React, { useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, Grid, Center } from '@react-three/drei';
import * as THREE from 'three';
import { FontLoader, Font } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import { Evaluator, Brush, SUBTRACTION } from 'three-bvh-csg';
import type { AppState } from '../types';
import { useDebounce } from '../hooks/useDebounce';

interface SceneProps {
  state: AppState;
  meshRef: React.RefObject<THREE.Group | null>;
  onBoundsChange?: (bounds: { x: number, y: number, z: number }) => void;
}

function createBaseShape(w: number, h: number, r: number, amp: number, wl: number, skipTopWave: boolean = false) {
  const shape = new THREE.Shape();
  const hw = w / 2; const hh = h / 2;
  const rSafe = Math.min(r, hw, hh);

  if (amp <= 0 || wl <= 0) {
    if (rSafe <= 0) {
      shape.moveTo(-hw, -hh); shape.lineTo(hw, -hh); shape.lineTo(hw, hh); shape.lineTo(-hw, hh); shape.lineTo(-hw, -hh);
      return shape;
    }
    shape.moveTo(-hw + rSafe, hh);
    shape.lineTo(hw - rSafe, hh);
    shape.absarc(hw - rSafe, hh - rSafe, rSafe, Math.PI / 2, 0, true);
    shape.lineTo(hw, -hh + rSafe);
    shape.absarc(hw - rSafe, -hh + rSafe, rSafe, 0, -Math.PI / 2, true);
    shape.lineTo(-hw + rSafe, -hh);
    shape.absarc(-hw + rSafe, -hh + rSafe, rSafe, -Math.PI / 2, -Math.PI, true);
    shape.lineTo(-hw, hh - rSafe);
    shape.absarc(-hw + rSafe, hh - rSafe, rSafe, -Math.PI, -Math.PI * 1.5, true);
    return shape;
  }

  // Wavy path with integer sine correction
  const resolution = 2; // segments per unit
  
  shape.moveTo(-hw + rSafe, hh);
  
  // Top Edge
  const topDist = w - 2*rSafe;
  if (topDist > 0) {
    if (skipTopWave) {
      shape.lineTo(hw - rSafe, hh);
    } else {
      const numWaves = Math.max(1, Math.round(topDist / wl));
      const actWl = topDist / numWaves;
      const steps = Math.max(2, Math.ceil(topDist * resolution));
      for(let i=1; i<=steps; i++) {
        const t = i / steps;
        const x = (-hw + rSafe) + topDist * t;
        const wave = Math.sin((topDist * t) / actWl * Math.PI * 2) * amp;
        shape.lineTo(x, hh + wave);
      }
    }
  }

  // Top Right Corner
  if (rSafe > 0) shape.absarc(hw - rSafe, hh - rSafe, rSafe, Math.PI / 2, 0, true);

  // Right Edge
  const rightDist = h - 2*rSafe;
  if (rightDist > 0) {
    const numWaves = Math.max(1, Math.round(rightDist / wl));
    const actWl = rightDist / numWaves;
    const steps = Math.max(2, Math.ceil(rightDist * resolution));
    for(let i=1; i<=steps; i++) {
      const t = i / steps;
      const y = (hh - rSafe) - rightDist * t;
      const wave = Math.sin((rightDist * t) / actWl * Math.PI * 2) * amp;
      shape.lineTo(hw + wave, y);
    }
  }

  // Bottom Right Corner
  if (rSafe > 0) shape.absarc(hw - rSafe, -hh + rSafe, rSafe, 0, -Math.PI / 2, true);

  // Bottom Edge
  if (topDist > 0) {
    const numWaves = Math.max(1, Math.round(topDist / wl));
    const actWl = topDist / numWaves;
    const steps = Math.max(2, Math.ceil(topDist * resolution));
    for(let i=1; i<=steps; i++) {
      const t = i / steps;
      const x = (hw - rSafe) - topDist * t;
      const wave = Math.sin((topDist * t) / actWl * Math.PI * 2) * amp;
      shape.lineTo(x, -hh - wave);
    }
  }

  // Bottom Left Corner
  if (rSafe > 0) shape.absarc(-hw + rSafe, -hh + rSafe, rSafe, -Math.PI / 2, -Math.PI, true);

  // Left Edge
  if (rightDist > 0) {
    const numWaves = Math.max(1, Math.round(rightDist / wl));
    const actWl = rightDist / numWaves;
    const steps = Math.max(2, Math.ceil(rightDist * resolution));
    for(let i=1; i<=steps; i++) {
      const t = i / steps;
      const y = (-hh + rSafe) + rightDist * t;
      const wave = Math.sin((rightDist * t) / actWl * Math.PI * 2) * amp;
      shape.lineTo(-hw - wave, y);
    }
  }

  // Top Left Corner
  if (rSafe > 0) shape.absarc(-hw + rSafe, hh - rSafe, rSafe, -Math.PI, -Math.PI * 1.5, true);

  return shape;
}

import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { TTFLoader } from 'three/examples/jsm/loaders/TTFLoader.js';

const Generator: React.FC<SceneProps> = ({ state, meshRef, onBoundsChange }) => {
  const [textGeos, setTextGeos] = useState<{g: THREE.BufferGeometry, color: string}[]>([]);
  const [baseGeo, setBaseGeo] = useState<THREE.BufferGeometry | null>(null);
  const [borderGeo, setBorderGeo] = useState<THREE.BufferGeometry | null>(null);
  
  const debouncedState = useDebounce(state, 200);

  useEffect(() => {
    let active = true;
    const s = debouncedState;
    const generate = async () => {
      const fontLoader = new FontLoader();
      const ttfLoader = new TTFLoader();
      try {
        const fontUrls = [...new Set(s.lines.map(l => l.font))];
        const loadedFonts: Record<string, Font> = {};
        for (const url of fontUrls) {
          if (url.endsWith('.ttf')) {
            loadedFonts[url] = await new Promise<Font>((res, rej) => {
              ttfLoader.load(url, (json) => res(fontLoader.parse(json)), undefined, rej);
            });
          } else {
            loadedFonts[url] = await new Promise<Font>((res, rej) => fontLoader.load(url, res, undefined, rej));
          }
        }
        
        if (!active) return;
        const evaluator = new Evaluator();

        // 1. Text Geometries (Merged securely via BufferGeometryUtils)
        const textGeometries: THREE.BufferGeometry[] = [];
        const totalTextHeight = s.lines.reduce((sum, l) => sum + l.size, 0) + (Math.max(0, s.lines.length - 1) * s.lineSpacing);
        let maxTextWidth = 0;

        const lineGeometries: {line: any, geo: THREE.BufferGeometry, tw: number}[] = [];

        for (const line of s.lines) {
          if (!line.text.trim()) continue;
          const geo = new TextGeometry(line.text, { font: loadedFonts[line.font], size: line.size, depth: line.depth, curveSegments: 4, bevelEnabled: false });
          geo.computeBoundingBox();
          const tw = geo.boundingBox!.max.x - geo.boundingBox!.min.x;
          maxTextWidth = Math.max(maxTextWidth, tw);
          lineGeometries.push({ line, geo, tw });
        }

        let bw = s.shape.width;
        let bh = s.shape.height;
        let textOffsetY = 0;

        if (s.shape.autoSize) {
          bw = maxTextWidth + s.shape.padding * 2;
          bh = totalTextHeight + s.shape.padding * 2;
          
          if (s.laceHole.enabled) {
            const holeSpace = s.laceHole.topMargin + s.laceHole.height;
            bh += holeSpace;
            bw = Math.max(bw, s.laceHole.width + s.shape.padding * 2);
            textOffsetY = -holeSpace / 2; // Shift text down
          }
        } else {
          // Manual size: still shift text down to avoid intersecting lace hole visually
          if (s.laceHole.enabled) {
            const holeSpace = s.laceHole.topMargin + s.laceHole.height;
            textOffsetY = -holeSpace / 2;
          }
        }

        let currentY = totalTextHeight / 2 + textOffsetY;

        for (const { line, geo, tw } of lineGeometries) {
          geo.translate(-tw/2, currentY - line.size, s.shape.baseThickness / 2);
          textGeometries.push(geo);
          currentY -= (line.size + s.lineSpacing);
        }

        // 2. Base Plate & Border
        
        const outerShape = createBaseShape(bw, bh, s.shape.cornerRadius, s.shape.amplitude, s.shape.wavelength, s.laceHole.enabled);

        // Base Plate: Fully solid block from bottom to middle (Layer 1 Color)
        const rawBaseGeo = new THREE.ExtrudeGeometry(outerShape, { depth: s.shape.baseThickness, bevelEnabled: false, curveSegments: 16 });
        rawBaseGeo.translate(0, 0, -s.shape.baseThickness / 2);
        let baseBrush = new Brush(rawBaseGeo);
        baseBrush.updateMatrixWorld();

        let borderBrush: Brush | null = null;
        if (s.shape.topBorder > 0) {
          // Border: Extruded starting exactly from the top of the Base Plate! (Layer 2 Color)
          const innerW = Math.max(1, bw - 4); 
          const innerH = Math.max(1, bh - 4);
          const innerR = Math.max(0, s.shape.cornerRadius - 2);
          const innerShape = createBaseShape(innerW, innerH, innerR, s.shape.amplitude, s.shape.wavelength, s.laceHole.enabled);

          const rawBorder = new THREE.ExtrudeGeometry(outerShape, { depth: s.shape.topBorder, bevelEnabled: false, curveSegments: 16 });
          rawBorder.translate(0, 0, s.shape.baseThickness / 2);
          
          const innerExtrude = new THREE.ExtrudeGeometry(innerShape, { depth: s.shape.topBorder + 2, bevelEnabled: false, curveSegments: 16 });
          innerExtrude.translate(0, 0, s.shape.baseThickness / 2 - 1);
          
          const outerB = new Brush(rawBorder);
          const innerB = new Brush(innerExtrude);
          outerB.updateMatrixWorld(); innerB.updateMatrixWorld();
          
          borderBrush = evaluator.evaluate(outerB, innerB, SUBTRACTION);
        }

        let holeBrush: Brush | null = null;
        if (s.laceHole.enabled) {
          const hw = s.laceHole.width;
          const hh = s.laceHole.height;
          const hr = hh / 2;
          const holeShape = createBaseShape(hw, hh, hr, 0, 0); 
          // Huge depth to ensure clean cuts through all coplanar faces
          const holeGeo = new THREE.ExtrudeGeometry(holeShape, { depth: s.shape.baseThickness * 10, curveSegments: 16, bevelEnabled: false });
          
          const hy = (bh / 2) - s.laceHole.topMargin - hr;
          holeGeo.translate(0, hy, -s.shape.baseThickness * 5);
          
          holeBrush = new Brush(holeGeo);
          holeBrush.updateMatrixWorld();
          
          baseBrush = evaluator.evaluate(baseBrush, holeBrush, SUBTRACTION);
          if (borderBrush) borderBrush = evaluator.evaluate(borderBrush, holeBrush, SUBTRACTION);
        }

        if (active) {
          // Recompute normals to ensure perfect rendering after CSG operations
          const finalBaseG = baseBrush.geometry.clone();
          finalBaseG.computeVertexNormals();
          setBaseGeo(finalBaseG);

          if (borderBrush) {
            const finalBorderG = borderBrush.geometry.clone();
            finalBorderG.computeVertexNormals();
            setBorderGeo(finalBorderG);
          } else {
            setBorderGeo(null);
          }

          const finalTexts: {g: THREE.BufferGeometry, color: string}[] = [];
          for (let i = 0; i < textGeometries.length; i++) {
             let tb = new Brush(textGeometries[i]);
             tb.updateMatrixWorld();
             if (holeBrush) {
                 tb = evaluator.evaluate(tb, holeBrush, SUBTRACTION);
             }
             const fg = tb.geometry.clone();
             fg.computeVertexNormals();
             finalTexts.push({ g: fg, color: lineGeometries[i].line.color || s.textColor });
          }
          setTextGeos(finalTexts);
          
          const maxZText = s.lines.reduce((max, l) => Math.max(max, l.depth), 0);
          const maxZ = Math.max(s.shape.topBorder, maxZText);
          onBoundsChange?.({
            x: bw,
            y: bh,
            z: s.shape.baseThickness + maxZ
          });
        }
      } catch (e) { console.error("Generation Error", e); }
    };

    generate();
    return () => { active = false; };
  }, [debouncedState]);

  return (
    <Center disableZ>
      <group ref={meshRef}>
        {baseGeo && <mesh geometry={baseGeo} castShadow receiveShadow><meshStandardMaterial color={debouncedState.baseColor} roughness={0.3} /></mesh>}
        {textGeos.map((tg, i) => (
          <mesh key={`txt-${i}`} geometry={tg.g} castShadow receiveShadow>
             <meshStandardMaterial color={tg.color} roughness={0.3} metalness={0.2} />
          </mesh>
        ))}
        {borderGeo && <mesh geometry={borderGeo} castShadow receiveShadow><meshStandardMaterial color={debouncedState.borderColor} roughness={0.3} /></mesh>}
      </group>
    </Center>
  );
};

const Scene: React.FC<SceneProps> = (props) => {
  const floorZ = -props.state.shape.baseThickness / 2;
  
  return (
    <Canvas shadows camera={{ position: [0, -60, 60], fov: 45 }}>
      <color attach="background" args={['transparent']} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, -10, 30]} intensity={1.2} castShadow shadow-mapSize={[1024, 1024]} />
      <directionalLight position={[-10, 10, -10]} intensity={0.4} />
      
      <Generator {...props} />
      
      {/* Floor to receive shadow, placed slightly below the grid to avoid z-fighting */}
      <mesh position={[0, 0, floorZ - 0.05]} receiveShadow>
        <planeGeometry args={[500, 500]} />
        <shadowMaterial transparent opacity={0.15} />
      </mesh>
      
      {/* Modern Grid - tweaked to fix visibility */}
      <Grid 
        infiniteGrid 
        fadeDistance={200} 
        fadeStrength={1.5}
        sectionColor="#94a3b8" 
        cellColor="#cbd5e1" 
        sectionSize={10}
        cellSize={2}
        position={[0, 0, floorZ]} 
        rotation={[Math.PI/2, 0, 0]} 
      />
      
      <OrbitControls makeDefault minDistance={10} maxDistance={150} />
      <Environment preset="city" />
    </Canvas>
  );
};

export default Scene;
