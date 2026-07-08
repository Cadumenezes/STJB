import { useState } from 'react'
import { X, Shield, FileText } from 'lucide-react'

interface PrivacyPolicyModalProps {
  isOpen: boolean
  onClose: () => void
  initialTab?: 'terms' | 'privacy'
}

export default function PrivacyPolicyModal({ isOpen, onClose, initialTab = 'terms' }: PrivacyPolicyModalProps) {
  const [activeTab, setActiveTab] = useState<'terms' | 'privacy'>(initialTab)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div 
        className="relative w-full max-w-3xl h-[80vh] flex flex-col rounded-3xl border border-white/10 shadow-2xl overflow-hidden"
        style={{ backgroundColor: 'var(--bg-card)' }}
      >
        {/* Subtle Background Accent */}
        <div className="absolute top-[-20%] left-[-20%] w-[50%] h-[50%] rounded-full bg-purple-600/10 blur-[120px] pointer-events-none" />

        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center relative z-10">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg flex items-center justify-center bg-purple-600/20 text-purple-400">
              {activeTab === 'terms' ? <FileText size={18} /> : <Shield size={18} />}
            </div>
            <div>
              <h2 className="text-lg font-black uppercase tracking-tight text-white">
                {activeTab === 'terms' ? 'Termos de Uso' : 'Política de Privacidade'}
              </h2>
              <p className="text-[10px] text-[var(--text-muted)] font-semibold uppercase tracking-wider">
                DanceFlow-Escola Platform • Conformidade LGPD
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-[var(--text-muted)] hover:text-white rounded-xl hover:bg-white/5 transition-all cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-6 py-3 border-b border-white/5 flex gap-2 relative z-10 bg-black/20">
          <button
            onClick={() => setActiveTab('terms')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'terms' 
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/20' 
                : 'text-[var(--text-muted)] hover:text-white hover:bg-white/5'
            }`}
          >
            Termos de Uso
          </button>
          <button
            onClick={() => setActiveTab('privacy')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'privacy' 
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/20' 
                : 'text-[var(--text-muted)] hover:text-white hover:bg-white/5'
            }`}
          >
            Política de Privacidade
          </button>
        </div>

        {/* Modal Content (Scrollable) */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6 text-sm leading-relaxed text-gray-300 relative z-10 scrollbar-thin">
          {activeTab === 'terms' ? (
            <div className="space-y-4">
              <p className="text-xs text-purple-400 font-bold uppercase tracking-wider">Última atualização: Junho de 2026</p>
              
              <section className="space-y-2">
                <h3 className="text-base font-black text-white">1. Objeto e Aceite</h3>
                <p>
                  Estes Termos de Uso regulam o acesso e utilização da plataforma <strong>DanceFlow-Escola</strong>, um software como serviço (SaaS) dedicado à gestão administrativa, financeira e de fluxo escolar de estúdios e escolas de dança. Ao criar uma conta comercial, registrar funcionários ou inserir dados de alunos, o Diretor e/ou Administrador declara estar ciente e concordar integralmente com estas regras.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-base font-black text-white">2. Responsabilidade pelos Dados Cadastrados</h3>
                <p>
                  O contratante (escola de dança) é o **Controlador** dos dados pessoais inseridos na plataforma (tais como nomes de alunos, CPFs, datas de nascimento, fotos e frequências), sendo a DanceFlow-Escola exclusivamente a **Operadora** técnica desses dados.
                </p>
                <p>
                  A escola obriga-se a obter o consentimento dos alunos (ou de seus responsáveis legais, em caso de menores de idade) para o cadastro e tratamento dos dados dentro do sistema, isentando a DanceFlow-Escola de qualquer responsabilidade decorrente de cadastros indevidos ou sem autorização prévia.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-base font-black text-white">3. Contas, Senhas e Acesso Delegado</h3>
                <p>
                  O acesso à conta comercial é pessoal e intransferível. A plataforma permite a delegação de acesso a funcionários (Secretários, Professores). O Diretor é inteiramente responsável pelas ações realizadas pelos usuários que ele próprio cadastrar e autorizar na plataforma. 
                </p>
                <p>
                  Recomendamos fortemente o uso de senhas seguras e a ativação da Autenticação de Duas Etapas (MFA) disponível nas configurações de segurança.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-base font-black text-white">4. Planos, Cobrança e Faturamento</h3>
                <p>
                  O DanceFlow-Escola é distribuído sob modelo de assinatura recorrente (Bronze, Prata, Ouro, Diamante). O não pagamento da assinatura acarreta a suspensão temporária do acesso à plataforma após o vencimento do prazo de tolerância. O cancelamento pode ser efetuado a qualquer momento e interromperá as cobranças do ciclo seguinte.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-base font-black text-white">5. Limitação de Responsabilidade</h3>
                <p>
                  A DanceFlow-Escola envida seus melhores esforços para garantir a estabilidade do sistema e a segurança das informações. Contudo, não nos responsabilizamos por interrupções causadas por falhas de conexão à internet do usuário, problemas nos servidores globais do banco de dados (Supabase/Netlify) ou uso indevido de credenciais.
                </p>
              </section>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-purple-400 font-bold uppercase tracking-wider">Última atualização: Junho de 2026</p>

              <section className="space-y-2">
                <h3 className="text-base font-black text-white">1. Compromisso com a LGPD</h3>
                <p>
                  A DanceFlow-Escola tem como prioridade máxima a privacidade e a segurança dos dados pessoais. Esta Política explica de forma transparente como coletamos, usamos, armazenamos e protegemos as informações em conformidade com a <strong>Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018 - LGPD)</strong>.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-base font-black text-white">2. Dados Pessoais Coletados e Finalidade</h3>
                <p>
                  Para o funcionamento e prestação de serviços da plataforma, tratamos os seguintes dados pessoais:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-gray-400">
                  <li><strong>Dados do Contratante (Diretor)</strong>: Nome, e-mail, telefone comercial, senha criptografada e dados de pagamento. <em>Finalidade: Faturamento do plano SaaS e autenticação na plataforma.</em></li>
                  <li><strong>Dados de Alunos/Responsáveis</strong>: Nome completo, CPF, e-mail, telefone, endereço, data de nascimento e responsável financeiro. <em>Finalidade: Gestão escolar de matrículas, emissão de cobranças Pix/Boleto e chamada de presença.</em></li>
                  <li><strong>Dados da Equipe (Professores/Secretários)</strong>: Nome, telefone, e-mail, cargo, remuneração/hora-aula e vale-transporte. <em>Finalidade: Controle de folha de pagamento e chamadas.</em></li>
                </ul>
              </section>

              <section className="space-y-2">
                <h3 className="text-base font-black text-white">3. Segurança da Informação</h3>
                <p>
                  Todos os dados trafegam por criptografia de ponta (HTTPS/SSL) e são guardados em servidores seguros gerenciados pelo Supabase Database. Nós implementamos práticas avançadas, como Headers de Segurança HTTP e o recurso de Autenticação de Duas Etapas (MFA) por aplicativo autenticador, a fim de mitigar riscos de vazamento ou acesso não autorizado.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-base font-black text-white">4. Uso de Cookies e Armazenamento Local</h3>
                <p>
                  Utilizamos **cookies técnicos estritamente necessários** (armazenamento local) no seu navegador para controlar as sessões de login dos usuários e lembrar as preferências de navegação (como a escolha do tema escuro/claro e pular o tour de boas-vindas). Não compartilhamos esses cookies com parceiros publicitários ou terceiros.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-base font-black text-white">5. Seus Direitos sob a LGPD</h3>
                <p>
                  Como titular dos dados pessoais (ou representante do aluno), você possui os seguintes direitos garantidos por lei:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-gray-400">
                  <li>Confirmar a existência do tratamento de seus dados.</li>
                  <li>Acessar seus dados pessoais cadastrados no sistema.</li>
                  <li>Solicitar a correção de dados incompletos, inexatos ou desatualizados.</li>
                  <li>Solicitar a exclusão definitiva de dados do banco de dados (observadas as obrigações legais de retenção financeira/fiscal).</li>
                </ul>
                <p>
                  Essas requisições devem ser enviadas diretamente à administração da sua escola de dança (Controlador) ou, em caso de contas comerciais de diretores, por meio do suporte técnico do DanceFlow-Escola.
                </p>
              </section>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-white/5 flex justify-end relative z-10 bg-black/10">
          <button
            onClick={onClose}
            className="rounded-xl px-5 py-2.5 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 transition-all cursor-pointer shadow-lg shadow-purple-900/20"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  )
}
