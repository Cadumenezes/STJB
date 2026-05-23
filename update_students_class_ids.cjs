const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'Students.tsx');
let content = fs.readFileSync(filePath, 'utf-8');

// 1. Initial State
content = content.replace(
  "monthly_fee: '', enrollment_fee: '', class_id: '',",
  "monthly_fee: '', enrollment_fee: '', class_ids: [] as string[],"
);

// 2. handleAddStudent payload
content = content.replace(
  "class_id: formData.class_id || null,",
  "class_ids: formData.class_ids || [],"
);

// 3. handleEditStudent payload
content = content.replace(
  "class_id: formData.class_id || null,",
  "class_ids: formData.class_ids || [],"
);

// 4. openEditModal
content = content.replace(
  "class_id: student.class_id || '',",
  "class_ids: student.class_ids || (student.class_id ? [student.class_id] : []),"
);

// 5. resetForm
content = content.replace(
  "class_id: '' }",
  "class_ids: [] as string[] }"
);
// just in case it had exactly what was there:
content = content.replace(
  "setFormData({ name: '', email: '', phone: '', birth_date: '', cpf: '', address: '', guardian_name: '', notes: '', monthly_fee: '', enrollment_fee: '', class_id: '' })",
  "setFormData({ name: '', email: '', phone: '', birth_date: '', cpf: '', address: '', guardian_name: '', notes: '', monthly_fee: '', enrollment_fee: '', class_ids: [] as string[] })"
);

// 6. Annual Report Class render
content = content.replace(
  "<p className=\"text-sm\"><b>Turma:</b> {classes.find(c => c.id === selectedStudent.class_id)?.name || 'Sem turma'}</p>",
  "<p className=\"text-sm\"><b>Turmas:</b> {selectedStudent.class_ids?.length ? selectedStudent.class_ids.map(id => classes.find(c => c.id === id)?.name).filter(Boolean).join(', ') : 'Nenhuma'}</p>"
);

// 7. Form UI
const oldSelect = `<label className="text-sm font-bold block mb-1.5 text-purple-400 uppercase tracking-widest">Turma Vinculada</label>
            <div className="relative">
              <select
                value={formData.class_id}
                onChange={(e) => setFormData({ ...formData, class_id: e.target.value })}
                className="w-full rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 appearance-none"
                style={inputStyle}
              >
                <option value="">-- Selecione uma turma --</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.schedule})</option>
                ))}
              </select>
              <Music className="absolute right-4 top-1/2 -translate-y-1/2 text-purple-400 opacity-50" size={18} />
            </div>`;

const newSelect = `<label className="text-sm font-bold block mb-3 text-purple-400 uppercase tracking-widest">Turmas Vinculadas</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl" style={{ backgroundColor: 'var(--bg-input)', border: '1px solid var(--border-color)' }}>
              {classes.map(c => (
                <label key={c.id} className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative flex items-center justify-center w-5 h-5 rounded border border-purple-500/30 group-hover:border-purple-500/60 transition-colors" style={{ backgroundColor: formData.class_ids.includes(c.id) ? 'var(--accent-color)' : 'transparent' }}>
                    {formData.class_ids.includes(c.id) && <CheckCircle size={14} color="#fff" />}
                  </div>
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={formData.class_ids.includes(c.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData({ ...formData, class_ids: [...formData.class_ids, c.id] })
                      } else {
                        setFormData({ ...formData, class_ids: formData.class_ids.filter(id => id !== c.id) })
                      }
                    }}
                  />
                  <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{c.name}</span>
                </label>
              ))}
              {classes.length === 0 && <span className="text-sm opacity-50" style={{ color: 'var(--text-muted)' }}>Nenhuma turma cadastrada</span>}
            </div>`;

content = content.replace(oldSelect, newSelect);

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Students.tsx updated.');
