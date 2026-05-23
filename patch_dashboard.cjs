const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'Dashboard.tsx');
let content = fs.readFileSync(filePath, 'utf-8');

// 1. Add recharts imports
content = content.replace(
  "import { supabase } from '../lib/supabase'",
  "import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, AreaChart, Area, Cell } from 'recharts'\nimport { supabase } from '../lib/supabase'"
);

// 2. Add monthlyChartData to interface
content = content.replace(
  "  birthdaysThisWeek: { name: string; birth_date: string }[]\n}",
  "  birthdaysThisWeek: { name: string; birth_date: string }[]\n  monthlyChartData: any[]\n}"
);

// 3. Add to initialState
content = content.replace(
  "    birthdaysThisWeek: [],\n  })",
  "    birthdaysThisWeek: [],\n    monthlyChartData: [],\n  })"
);

// 4. Update loadDashboard to fetch chart data
const oldFetch = `      setData({
        totalStudents: studentCount || 0,
        overduePayments: overdueCount || 0,
        cashFlowToday: todayIncome - todayExpense,
        todayIncome,
        todayExpense,
        birthdaysThisWeek,
      })`;

const newFetch = `      // Fetch last 6 months for chart
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
      sixMonthsAgo.setDate(1);
      const { data: allFinances } = await supabase
        .from('financial_entries')
        .select('*')
        .gte('date', sixMonthsAgo.toISOString().split('T')[0]);

      const monthlyDataMap: Record<string, any> = {};
      
      // Initialize last 6 months
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const monthStr = d.toISOString().slice(0, 7);
        const monthLabel = d.toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase();
        monthlyDataMap[monthStr] = { name: monthLabel, Entradas: 0, Saídas: 0, fullMonth: monthStr };
      }

      if (allFinances) {
        allFinances.forEach(entry => {
          const monthStr = entry.date.slice(0, 7);
          if (monthlyDataMap[monthStr]) {
            if (entry.type === 'income') monthlyDataMap[monthStr].Entradas += Number(entry.amount);
            else if (entry.type === 'expense') monthlyDataMap[monthStr].Saídas += Number(entry.amount);
          }
        });
      }

      const monthlyChartData = Object.values(monthlyDataMap).sort((a, b) => a.fullMonth.localeCompare(b.fullMonth));

      setData({
        totalStudents: studentCount || 0,
        overduePayments: overdueCount || 0,
        cashFlowToday: todayIncome - todayExpense,
        todayIncome,
        todayExpense,
        birthdaysThisWeek,
        monthlyChartData,
      })`;

content = content.replace(oldFetch, newFetch);

// 5. Add charts to the UI
const chartsUI = `
      {/* Charts Section */}
      <div className="grid grid-cols-1 gap-6 mb-12">
        <div className="rounded-3xl p-8 sm:p-10" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
          <h2 className="text-lg font-bold mb-6 flex items-center gap-3" style={{ color: 'var(--text-primary)' }}>
            <div className="p-2 rounded-xl bg-purple-500/20">
              <TrendingUp size={20} className="text-purple-400" />
            </div>
            Faturamento Mensal (Últimos 6 meses)
          </h2>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.monthlyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => \`R$ \${v}\`} />
                <RechartsTooltip 
                  cursor={{ fill: 'var(--border-color)', opacity: 0.4 }}
                  contentStyle={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)' }}
                  itemStyle={{ fontSize: '14px', fontWeight: 'bold' }}
                />
                <Bar dataKey="Entradas" fill="#10b981" radius={[4, 4, 0, 0]}>
                  {data.monthlyChartData.map((entry, index) => (
                    <Cell key={\`cell-in-\${index}\`} fill="url(#colorEntradas)" />
                  ))}
                </Bar>
                <Bar dataKey="Saídas" fill="#f43f5e" radius={[4, 4, 0, 0]}>
                  {data.monthlyChartData.map((entry, index) => (
                    <Cell key={\`cell-out-\${index}\`} fill="url(#colorSaidas)" />
                  ))}
                </Bar>
                <defs>
                  <linearGradient id="colorEntradas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#34d399" stopOpacity={0.9}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.6}/>
                  </linearGradient>
                  <linearGradient id="colorSaidas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#fb7185" stopOpacity={0.9}/>
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.6}/>
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
`;

content = content.replace(
  "{/* Today's Flow Detail + Birthdays */}",
  chartsUI + "\n      {/* Today's Flow Detail + Birthdays */}"
);

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Done patching Dashboard.tsx.');
