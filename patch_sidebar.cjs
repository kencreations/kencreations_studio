const fs = require('fs');
const file = 'src/components/Sidebar.tsx';
let code = fs.readFileSync(file, 'utf8');

// 1. Add imports
code = code.replace(/import React from 'react';/, "import React, { useState, useRef, useEffect } from 'react';");

// 2. Add isDesign2 to SidebarProps
code = code.replace(/interface SidebarProps \{/, "interface SidebarProps {\n  isDesign2?: boolean;");

// 3. Add custom components right after BAMBU_COLORS
const customComponents = `
const EditableNumber = ({ value, onChange, min, max, step }: { value: number, onChange: (val: number) => void, min?: number, max?: number, step?: number }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value.toString());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    setTempValue(value.toString());
  }, [value]);

  const commit = () => {
    let num = parseFloat(tempValue);
    if (isNaN(num)) num = value;
    if (min !== undefined) num = Math.max(min, num);
    if (max !== undefined) num = Math.min(max, num);
    onChange(num);
    setTempValue(num.toString());
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="number"
        value={tempValue}
        onChange={e => setTempValue(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setIsEditing(false); }}
        step={step || "any"}
        className="editable-number-input"
        style={{ width: '40px', fontSize: '11px', padding: '0', border: '1px solid #3b82f6', borderRadius: '2px', outline: 'none', background: 'transparent' }}
      />
    );
  }

  return (
    <span className="control-value" onDoubleClick={() => setIsEditing(true)} onClick={() => setIsEditing(true)} style={{ cursor: 'pointer', borderBottom: '1px dashed #cbd5e1' }} title="Click to edit">
      {value.toFixed(1)}
    </span>
  );
};

const ColorSelect = ({ value, onChange, colors }: { value: string, onChange: (val: string) => void, colors: {name: string, hex: string}[] }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedColor = colors.find(c => c.hex.toUpperCase() === (value || '').toUpperCase()) || colors[0];

  return (
    <div ref={containerRef} style={{ position: 'relative', flexGrow: 1 }}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: '4px', cursor: 'pointer', backgroundColor: '#fff', fontSize: '12px', height: '28px' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: selectedColor.hex, border: '1px solid rgba(0,0,0,0.1)', flexShrink: 0 }} />
          <span>{selectedColor.name}</span>
        </div>
        <ChevronLeft size={14} style={{ transform: isOpen ? 'rotate(90deg)' : 'rotate(-90deg)', transition: 'transform 0.2s' }} />
      </div>
      
      {isOpen && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, maxHeight: '200px', overflowY: 'auto', backgroundColor: '#fff', border: '1px solid #d1d5db', borderRadius: '4px', marginTop: '4px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
          {colors.map(c => (
            <div 
              key={c.hex} 
              onClick={() => { onChange(c.hex); setIsOpen(false); }}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', cursor: 'pointer', backgroundColor: c.hex.toUpperCase() === (value || '').toUpperCase() ? '#f3f4f6' : 'transparent' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = c.hex.toUpperCase() === (value || '').toUpperCase() ? '#f3f4f6' : 'transparent'}
            >
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: c.hex, border: '1px solid rgba(0,0,0,0.1)', flexShrink: 0 }} />
              <span style={{ fontSize: '12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
`;

code = code.replace(/];\s*interface SidebarProps/, '];\n' + customComponents + '\ninterface SidebarProps');

// 4. Update Sidebar destructuring
code = code.replace(/const Sidebar: React.FC<SidebarProps> = \(\{ state, updateState, bounds \}\) => \{/, "const Sidebar: React.FC<SidebarProps> = ({ state, updateState, bounds, isDesign2 }) => {");

// 5. Replace Line specific color selects
code = code.replace(
  /<select value=\{\(line\.color \|\| state\.textColor\)\.toUpperCase\(\)\} onChange=\{e => updateLine\(idx, \{ color: e\.target\.value \}\)\} style=\{\{ flexGrow: 1, padding: '4px' \}\}>\s*\{BAMBU_COLORS\.map\(c => <option key=\{c\.hex\} value=\{c\.hex\}>\{c\.name\}<\/option>\)\}\s*<\/select>/g,
  "<ColorSelect value={line.color || state.textColor} onChange={val => updateLine(idx, { color: val })} colors={BAMBU_COLORS} />"
);

// 6. Replace Global Base Plate color select
code = code.replace(
  /<select value=\{state\.baseColor\.toUpperCase\(\)\} onChange=\{e => updateState\(\{ baseColor: e\.target\.value \}\)\} style=\{\{ flexGrow: 1, padding: '4px' \}\}>\s*\{BAMBU_COLORS\.map\(c => <option key=\{c\.hex\} value=\{c\.hex\}>\{c\.name\}<\/option>\)\}\s*<\/select>/g,
  "<ColorSelect value={state.baseColor} onChange={val => updateState({ baseColor: val })} colors={BAMBU_COLORS} />"
);

// 7. Replace Global Border color select
code = code.replace(
  /<select value=\{state\.borderColor\.toUpperCase\(\)\} onChange=\{e => updateState\(\{ borderColor: e\.target\.value \}\)\} style=\{\{ flexGrow: 1, padding: '4px' \}\}>\s*\{BAMBU_COLORS\.map\(c => <option key=\{c\.hex\} value=\{c\.hex\}>\{c\.name\}<\/option>\)\}\s*<\/select>/g,
  "<ColorSelect value={state.borderColor} onChange={val => updateState({ borderColor: val })} colors={BAMBU_COLORS} />"
);

// 8. Replace Editable values (Size, Depth, Spacing)
code = code.replace(/<label><span>Size<\/span><span className="control-value">\{line\.size\.toFixed\(1\)\}<\/span><\/label>/g, '<label><span>Size</span><EditableNumber value={line.size} onChange={val => updateLine(idx, { size: val })} min={2} max={30} step={0.5} /></label>');
code = code.replace(/<label><span>Depth<\/span><span className="control-value">\{line\.depth\.toFixed\(1\)\}<\/span><\/label>/g, '<label><span>Depth</span><EditableNumber value={line.depth} onChange={val => updateLine(idx, { depth: val })} min={0.5} max={10} step={0.1} /></label>');
code = code.replace(/<label><span>Spacing<\/span><span className="control-value">\{\(line\.letterSpacing \|\| 0\)\.toFixed\(1\)\}<\/span><\/label>/g, '<label><span>Spacing</span><EditableNumber value={line.letterSpacing || 0} onChange={val => updateLine(idx, { letterSpacing: val })} min={-5} max={20} step={0.5} /></label>');

// Globals
code = code.replace(/<label><span>Line spacing<\/span><span className="control-value">\{state\.lineSpacing\.toFixed\(1\)\}<\/span><\/label>/g, '<label><span>Line spacing</span><EditableNumber value={state.lineSpacing} onChange={val => updateState({ lineSpacing: val })} min={0} max={10} step={0.5} /></label>');

code = code.replace(/<label><span>Width \(mm\)<\/span><span className="control-value">\{state\.shape\.width\.toFixed\(1\)\}<\/span><\/label>/g, '<label><span>Width (mm)</span><EditableNumber value={state.shape.width} onChange={val => updateShape({ width: val })} min={20} max={300} step={1} /></label>');
code = code.replace(/<label><span>Height \(mm\)<\/span><span className="control-value">\{state\.shape\.height\.toFixed\(1\)\}<\/span><\/label>/g, '<label><span>Height (mm)</span><EditableNumber value={state.shape.height} onChange={val => updateShape({ height: val })} min={10} max={200} step={1} /></label>');
code = code.replace(/<label><span>Corner Radius<\/span><span className="control-value">\{state\.shape\.cornerRadius\.toFixed\(1\)\}<\/span><\/label>/g, '<label><span>Corner Radius</span><EditableNumber value={state.shape.cornerRadius} onChange={val => updateShape({ cornerRadius: val })} min={0} max={50} step={1} /></label>');
code = code.replace(/<label><span>Base Thickness<\/span><span className="control-value">\{state\.shape\.baseThickness\.toFixed\(1\)\}<\/span><\/label>/g, '<label><span>Base Thickness</span><EditableNumber value={state.shape.baseThickness} onChange={val => updateShape({ baseThickness: val })} min={0.5} max={10} step={0.1} /></label>');
code = code.replace(/<label><span>Border Thickness<\/span><span className="control-value">\{state\.shape\.topBorder\.toFixed\(1\)\}<\/span><\/label>/g, '<label><span>Border Thickness</span><EditableNumber value={state.shape.topBorder} onChange={val => updateShape({ topBorder: val })} min={0} max={10} step={0.1} /></label>');
code = code.replace(/<label><span>Padding<\/span><span className="control-value">\{state\.shape\.padding\.toFixed\(1\)\}<\/span><\/label>/g, '<label><span>Padding</span><EditableNumber value={state.shape.padding} onChange={val => updateShape({ padding: val })} min={0} max={50} step={1} /></label>');

code = code.replace(/<label><span>Amplitude<\/span><span className="control-value">\{state\.shape\.amplitude\.toFixed\(1\)\}<\/span><\/label>/g, '<label><span>Amplitude</span><EditableNumber value={state.shape.amplitude} onChange={val => updateShape({ amplitude: val })} min={0} max={20} step={0.5} /></label>');
code = code.replace(/<label><span>Wavelength<\/span><span className="control-value">\{state\.shape\.wavelength\.toFixed\(1\)\}<\/span><\/label>/g, '<label><span>Wavelength</span><EditableNumber value={state.shape.wavelength} onChange={val => updateShape({ wavelength: val })} min={0} max={100} step={1} /></label>');

code = code.replace(/<label><span>Width<\/span><span className="control-value">\{state\.laceHole\.width\.toFixed\(1\)\}<\/span><\/label>/g, '<label><span>Width</span><EditableNumber value={state.laceHole.width} onChange={val => updateLaceHole({ width: val })} min={2} max={50} step={1} /></label>');
code = code.replace(/<label><span>Height<\/span><span className="control-value">\{state\.laceHole\.height\.toFixed\(1\)\}<\/span><\/label>/g, '<label><span>Height</span><EditableNumber value={state.laceHole.height} onChange={val => updateLaceHole({ height: val })} min={2} max={50} step={1} /></label>');
code = code.replace(/<label><span>Top Margin<\/span><span className="control-value">\{state\.laceHole\.topMargin\.toFixed\(1\)\}<\/span><\/label>/g, '<label><span>Top Margin</span><EditableNumber value={state.laceHole.topMargin} onChange={val => updateLaceHole({ topMargin: val })} min={0} max={20} step={1} /></label>');


// 9. Hide options based on isDesign2
// Waves block
const wavesStart = '<h2 className="control-title" style={{ display: \'flex\', alignItems: \'center\', gap: \'6px\' }}><CircleDashed size={14}/> Waves</h2>';
code = code.replace(wavesStart, '{!isDesign2 && <>\n        ' + wavesStart);

// find the end of the waves block. The waves block ends with the div closing the control-group
// it's followed by "LACE HOLE SECTION".
code = code.replace(/<\/div>\s*\{\/\* LACE HOLE SECTION \*\/\}/g, '</div>\n        </>}\n\n        {/* LACE HOLE SECTION */}');

// Lace Hole block
code = code.replace(/<div className="control-group">\s*<h2 className="control-title" style=\{\{ display: 'flex', alignItems: 'center', gap: '6px' \}\}>\s*<CircleDashed size=\{14\}\/> Lace Hole<\/h2>/, '{!isDesign2 && <div className="control-group">\n          <h2 className="control-title" style={{ display: \'flex\', alignItems: \'center\', gap: \'6px\' }}><CircleDashed size={14}/> Lace Hole</h2>');

// Find the end of the Lace hole section. It's followed by "COLORS SECTION"
code = code.replace(/<\/div>\s*\{\/\* COLORS SECTION \*\/\}/g, '</div>}\n\n        {/* COLORS SECTION */}');

fs.writeFileSync(file, code);
