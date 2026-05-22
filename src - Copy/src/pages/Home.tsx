import React from 'react';
import { Link } from 'react-router-dom';
import { Layers, FileText, Settings, Heart, Box, Circle, Type } from 'lucide-react';

const Home: React.FC = () => {
  const templates = [
    { id: 'canvas-studio', name: 'Canvas Studio', desc: 'Design from scratch with full creative control.', icon: <Box size={48} /> },
    { id: 'basic-name-tag', name: 'Basic Name Tag', desc: 'Simple, elegant name tag for any occasion.', icon: <Type size={48} /> },
    { id: 'id-name-tag', name: 'ID Name Tag', desc: 'Professional ID tag with subtext support.', icon: <FileText size={48} /> },
    { id: 'id-name-tag-2', name: 'ID Name Tag (Design 2)', desc: 'Hello My Name Is style tag with multi-layer text.', icon: <FileText size={48} /> },
    { id: 'cake-topper', name: 'Cake Topper', desc: 'Custom text topper for cakes and celebrations.', icon: <Layers size={48} /> },
    { id: 'keycap-maker', name: 'Keycap Set Maker', desc: 'Design your own custom mechanical keycaps.', icon: <Circle size={48} /> },
    { id: 'pet-tag', name: 'Pet Tag', desc: 'Durable and personalized tags for your pets.', icon: <Heart size={48} /> }
  ];

  return (
    <div className="home-container">
      <header className="home-header">
        <Link to="/" className="home-brand">
          <Layers className="brand-icon" size={28} color="var(--accent-color)" />
          Print Studio
        </Link>
        <nav className="home-nav">
          <a href="#" className="home-nav-link">Claim Free Downloads</a>
          {/* Pricing removed as per user request */}
          <a href="#" className="home-nav-link">Sign In</a>
          <a href="#" className="btn-outline">
            <Settings size={16} style={{display:'inline', verticalAlign:'middle', marginRight:'6px'}}/>
            Settings
          </a>
        </nav>
      </header>

      <main className="home-main">
        <section className="home-hero">
          <h1>What will you create today?</h1>
          <p>Create personalized 3D printables. Design keychains, toppers, and more—preview and export for 3D printing directly from your browser.</p>
        </section>

        <section className="templates-grid">
          {templates.map(tpl => (
            <Link to={`/editor/${tpl.id}`} key={tpl.id} className="template-card">
              <div className="template-card-image">
                {tpl.icon}
              </div>
              <div className="template-card-content">
                <h3 className="template-card-title">{tpl.name}</h3>
                <p className="template-card-desc">{tpl.desc}</p>
              </div>
            </Link>
          ))}
        </section>
      </main>
    </div>
  );
};

export default Home;
