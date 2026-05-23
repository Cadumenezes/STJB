const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'Students.tsx');
let content = fs.readFileSync(filePath, 'utf-8');

// 1. Add Icons
content = content.replace(
  'Edit, Trash2, CreditCard, X, ChevronDown, Music, FileText, Calendar\n}',
  'Edit, Trash2, CreditCard, X, ChevronDown, Music, FileText, Calendar, MessageCircle, Printer\n}'
);

// 2. Add State
content = content.replace(
  'const [reportData, setReportData] = useState<{ payments: any[], attendance: any[], school: any } | null>(null)',
  'const [reportData, setReportData] = useState<{ payments: any[], attendance: any[], school: any } | null>(null)\n  const [receiptData, setReceiptData] = useState<{ payment: any, school: any } | null>(null)'
);

// 3. Add generateReceipt function
const receiptFunc = `
  async function generateReceipt(student: Student, payment: MonthlyPayment) {
    const { data: school } = await supabase.from('school_settings').select('*').limit(1).single()
    setReceiptData({
      payment,
      school: school || { school_name: 'DanceFlow' }
    })
    setSelectedStudent(student)
    setTimeout(() => {
      window.print()
      setReceiptData(null)
    }, 500)
  }
`;
content = content.replace(
  '  function getStudentPaymentStatus(studentId: string): \'paid\' | \'pending\' | \'overdue\' | \'none\' {',
  receiptFunc + '\n  function getStudentPaymentStatus(studentId: string): \'paid\' | \'pending\' | \'overdue\' | \'none\' {'
);

// 4. Add Receipt Printable Block
const printableBlock = `
      {receiptData && selectedStudent && (
        <div id="printable-report" className="hidden print:block font-sans text-black">
          <div className="flex items-center justify-between border-b-2 border-black pb-6 mb-8">
            <div className="flex items-center gap-6">
              {receiptData.school.logo_url && (
                <img src={receiptData.school.logo_url} alt="Logo" className="w-24 h-24 object-contain" />
              )}
              <div>
                <h1 className="text-3xl font-black uppercase tracking-tighter">{receiptData.school.school_name}</h1>
                <p className="text-sm font-bold">Recibo de Pagamento</p>
              </div>
            </div>
            <div className="text-right text-xs">
              <p>Data: {new Date((receiptData.payment.paid_date || receiptData.payment.due_date) + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
              <p>Recibo Nº: {receiptData.payment.id.split('-')[0].toUpperCase()}</p>
            </div>
          </div>

          <div className="mb-10 p-12 bg-gray-50 border border-black/10 text-center rounded-2xl">
            <p className="text-xl">Recebemos de <strong className="uppercase">{selectedStudent.name}</strong></p>
            <p className="text-lg mt-4">A importância de <strong className="text-4xl block mt-2">R\$ {Number(receiptData.payment.amount).toLocaleString('pt-BR', {minimumFractionDigits: 2})}</strong></p>
            <p className="text-sm mt-6 text-gray-600">Referente à mensalidade do mês: <strong className="uppercase text-black">{new Date(receiptData.payment.reference_month + '-01').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</strong></p>
          </div>

          <div className="mt-32 pt-12 flex flex-col items-center">
            <div className="w-96 border-t-2 border-black mb-2"></div>
            <p className="text-sm font-black uppercase">{receiptData.school.school_name}</p>
            <p className="text-xs">Assinatura / Carimbo do Responsável</p>
          </div>
        </div>
      )}
`;
content = content.replace(
  '      {/* Header Section with Dynamic Style */}',
  printableBlock + '      {/* Header Section with Dynamic Style */}'
);

// 5. Add WhatsApp Button
const whatsAppBtn = `                          <button
                            onClick={() => {
                              const phone = (student.phone || '').replace(/\\D/g, '');
                              if (!phone) {
                                alert('Aluno sem telefone cadastrado.');
                                return;
                              }
                              const msg = encodeURIComponent(\`Olá \${student.name.split(' ')[0]}! Tudo bem? Passando para lembrar da sua mensalidade da DanceFlow. Qualquer dúvida, estou à disposição!\`);
                              window.open(\`https://wa.me/55\${phone}?text=\${msg}\`, '_blank');
                            }}
                            className="rounded-2xl p-2 transition-all hover:bg-green-500/10 active:scale-90"
                            style={{ color: '#22c55e' }}
                            title="Cobrar via WhatsApp"
                          >
                            <MessageCircle size={18} />
                          </button>
`;
content = content.replace(
  '                          <button\n                            onClick={() => openPaymentModal(student)}',
  whatsAppBtn + '                          <button\n                            onClick={() => openPaymentModal(student)}'
);

// 6. Update Payment Modal Logic (Remove '!== paid' filter and adjust string)
content = content.replace(
  "const studentPayments = payments.filter((p) => p.student_id === selectedStudent.id && p.status !== 'paid')",
  "const studentPayments = payments.filter((p) => p.student_id === selectedStudent.id)"
);
content = content.replace(
  "Nenhuma mensalidade pendente encontrada para este aluno.",
  "Nenhuma mensalidade encontrada para este aluno."
);

// 7. Update Payment Modal Rendering
// Regex to precisely match the payment rendering block
const oldPaymentBlockRegex = /<div\\s+key=\{payment\.id\}[\\s\\S]*?<CheckCircle size=\{16\} \/>\\s*Confirmar\\s*<\/button>\\s*<\/div>/;

const newPaymentBlock = `<div
                      key={payment.id}
                      className="flex items-center justify-between rounded-2xl p-4 shadow-lg"
                      style={{ 
                        backgroundColor: 'var(--bg-secondary)', 
                        border: \`1px solid \${payment.status === 'paid' ? 'rgba(16,185,129,0.3)' : 'var(--border-color)'}\` 
                      }}
                    >
                      <div>
                        <p className={\`text-xs font-bold uppercase tracking-widest \${payment.status === 'paid' ? 'text-emerald-400' : 'text-purple-400'}\`}>
                          Referência: {payment.reference_month}
                          {payment.status === 'paid' && ' (PAGO)'}
                        </p>
                        <p className="text-[10px] opacity-60" style={{ color: 'var(--text-muted)' }}>
                          Vencimento: {new Date(payment.due_date + 'T12:00:00').toLocaleDateString('pt-BR')}
                        </p>
                        <p className={\`text-lg font-black mt-1 \${payment.status === 'paid' ? 'text-emerald-500' : 'text-rose-400'}\`}>
                          R$ {Number(payment.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      
                      {payment.status === 'paid' ? (
                        <button
                          onClick={() => generateReceipt(selectedStudent, payment)}
                          className="flex items-center gap-2 rounded-2xl px-6 py-3 text-xs font-black uppercase tracking-tighter text-emerald-400 transition-all hover:bg-emerald-500/10 active:scale-95 border border-dashed border-emerald-500/30"
                        >
                          <Printer size={16} />
                          Recibo
                        </button>
                      ) : (
                        <button
                          onClick={() => handlePayment(selectedStudent.id, payment.id)}
                          className="flex items-center gap-2 rounded-2xl px-6 py-3 text-xs font-black uppercase tracking-tighter text-white transition-all hover:scale-105 active:scale-95 shadow-lg shadow-emerald-500/20"
                          style={{ background: 'linear-gradient(135deg, #10b981, #000)' }}
                        >
                          <CheckCircle size={16} />
                          Confirmar
                        </button>
                      )}
                    </div>`;

if (oldPaymentBlockRegex.test(content)) {
  content = content.replace(oldPaymentBlockRegex, newPaymentBlock);
} else {
  console.log('Regex for payment block did not match.');
}

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Students.tsx updated.');
