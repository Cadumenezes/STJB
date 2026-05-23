const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'Settings.tsx');
let content = fs.readFileSync(filePath, 'utf-8');

// Normalize line endings
content = content.replace(/\r\n/g, '\n');

// 1. Update initial formData
content = content.replace(
  `  const [formData, setFormData] = useState({
    school_name: 'DanceFlow',
    logo_url: '',
    bg_color: '#0a0a0f',
    bg_card: '#1a1a2e',
    text_color: '#f0f0ff',
    accent_color: '#8b5cf6',
    title_font_size: 32,
    subtitle_font_size: 16,
  })`,
  `  const [formData, setFormData] = useState({
    school_name: 'DanceFlow',
    logo_url: '',
    bg_color: '#0a0a0f',
    bg_card: '#1a1a2e',
    text_color: '#f0f0ff',
    accent_color: '#8b5cf6',
    title_font_size: 32,
    subtitle_font_size: 16,
    cnpj: '',
    address: '',
    director: '',
  })`
);

// 2. Update loadSettings
content = content.replace(
  `        title_font_size: data.title_font_size || 32,
        subtitle_font_size: data.subtitle_font_size || 16,
      })`,
  `        title_font_size: data.title_font_size || 32,
        subtitle_font_size: data.subtitle_font_size || 16,
        cnpj: data.cnpj || '',
        address: data.address || '',
        director: data.director || '',
      })`
);

// 3. Update the UI Form fields
const schoolNameField = `            <div>
              <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>Nome da Escola</label>
              <input 
                value={formData.school_name} 
                onChange={(e) => setFormData({ ...formData, school_name: e.target.value })} 
                className="w-full rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50" 
                style={inputStyle} 
              />
            </div>`;

const extraFields = `
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>CNPJ</label>
                <input 
                  value={formData.cnpj} 
                  onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })} 
                  placeholder="00.000.000/0001-00"
                  className="w-full rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50" 
                  style={inputStyle} 
                />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>Direção / Responsável</label>
                <input 
                  value={formData.director} 
                  onChange={(e) => setFormData({ ...formData, director: e.target.value })} 
                  placeholder="Nome do Diretor(a)"
                  className="w-full rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50" 
                  style={inputStyle} 
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium block mb-1.5" style={{ color: 'var(--text-secondary)' }}>Endereço Completo</label>
              <input 
                value={formData.address} 
                onChange={(e) => setFormData({ ...formData, address: e.target.value })} 
                placeholder="Rua, Número, Bairro, Cidade - UF"
                className="w-full rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50" 
                style={inputStyle} 
              />
            </div>`;

content = content.replace(schoolNameField, schoolNameField + extraFields);

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Done patching Settings.tsx');
