const fs = require('fs');
const path = require('path');

// 1. Refine main layout page padding
const layoutPath = path.join(__dirname, 'src', 'components', 'Layout.tsx');
if (fs.existsSync(layoutPath)) {
  console.log("Updating main page content padding in Layout.tsx...");
  let layoutContent = fs.readFileSync(layoutPath, 'utf8');
  layoutContent = layoutContent.replace(
    'className="flex-1 overflow-y-auto p-6 lg:p-8"',
    'className="flex-1 overflow-y-auto p-8 sm:p-12 lg:p-16 xl:p-20"'
  );
  fs.writeFileSync(layoutPath, layoutContent, 'utf8');
}

// 2. Refine page files
const pagesDir = path.join(__dirname, 'src', 'pages');

function refineSpacings(content) {
  // Title padding px-8 py-4 -> px-12 py-5
  content = content.replace(
    /className="font-black tracking-tighter leading-tight inline-block px-8 py-4 rounded-2xl shadow-xl shadow-purple-500\/20"/g,
    'className="font-black tracking-tighter leading-tight inline-block px-12 py-5 rounded-2xl shadow-2xl shadow-purple-500/30"'
  );

  // Subtitle padding px-6 py-3 -> px-10 py-4
  content = content.replace(
    /className="font-bold inline-block px-6 py-3 rounded-xl border border-white\/10 shadow-lg"/g,
    'className="font-bold inline-block px-10 py-4 rounded-2xl border border-white/10 shadow-2xl"'
  );

  // Card padding replacements (overview cards)
  content = content.replace(
    /className="group relative overflow-hidden rounded-3xl p-6 sm:p-8 transition-all duration-300 hover:scale-\[1\.05\] hover:shadow-2xl"/g,
    'className="group relative overflow-hidden rounded-3xl p-8 sm:p-10 transition-all duration-300 hover:scale-[1.05] hover:shadow-2xl"'
  );

  // Other card containers with p-6
  content = content.replace(
    /className="group rounded-2xl p-6 transition-all duration-300 hover:scale-\[1\.05\] hover:shadow-2xl border border-white\/5"/g,
    'className="group rounded-2xl p-8 sm:p-10 transition-all duration-300 hover:scale-[1.05] hover:shadow-2xl border border-white/5"'
  );
  
  // Dashboard panels
  content = content.replace(
    /className="rounded-2xl p-6"/g,
    'className="rounded-2xl p-8 sm:p-10"'
  );

  // Attendance cards
  content = content.replace(
    /className="rounded-2xl p-6" style=\{\{ backgroundColor: 'var\(--bg-card\)'/g,
    'className="rounded-2xl p-8 sm:p-10" style={{ backgroundColor: \'var(--bg-card)\''
  );

  // Settings card wrapper
  content = content.replace(
    /className="max-w-2xl rounded-2xl p-6"/g,
    'className="max-w-3xl rounded-3xl p-8 sm:p-10"'
  );

  // Sub-panel cards (Financial details, team billing, etc.)
  content = content.replace(
    /className="sm:col-span-2 p-6 rounded-3xl bg-white\/5 border border-white\/5 mt-4"/g,
    'className="sm:col-span-2 p-8 sm:p-10 rounded-3xl bg-white/5 border border-white/5 mt-4"'
  );
  content = content.replace(
    /className="w-full lg:w-72 p-6 rounded-3xl bg-black\/40 border border-white\/10 flex flex-col justify-center items-center text-center"/g,
    'className="w-full lg:w-72 p-8 sm:p-10 rounded-3xl bg-black/40 border border-white/10 flex flex-col justify-center items-center text-center"'
  );
  content = content.replace(
    /className="rounded-2xl p-6 text-center border-2 border-dashed border-white\/5"/g,
    'className="rounded-2xl p-8 sm:p-10 text-center border-2 border-dashed border-white/5"'
  );

  return content;
}

const files = fs.readdirSync(pagesDir);
files.forEach((file) => {
  if (file.endsWith('.tsx') && file !== 'Auth.tsx') {
    const filePath = path.join(pagesDir, file);
    console.log(`Applying spacing refinement to ${file}...`);
    let content = fs.readFileSync(filePath, 'utf8');
    content = refineSpacings(content);
    fs.writeFileSync(filePath, content, 'utf8');
  }
});

console.log("Global spacing refinement completed successfully! ✅");
