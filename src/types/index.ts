export interface Student {
  id: string
  name: string
  email: string
  phone: string
  birth_date: string
  cpf: string
  address: string
  guardian_name: string
  photo_url: string | null
  class_id: string | null
  class_ids: string[] | null
  status: 'active' | 'inactive' | 'scholarship' | 'locked'
  monthly_fee: number
  enrollment_fee: number
  notes: string
  created_at: string
  updated_at: string
}

export interface MonthlyPayment {
  id: string
  student_id: string
  amount: number
  due_date: string
  paid_date: string | null
  status: 'paid' | 'pending' | 'overdue'
  reference_month: string
  payment_method: string | null
  notes: string
  created_at: string
}

export interface DanceClass {
  id: string
  name: string
  description: string
  instructor_id: string | null
  schedule: string
  max_students: number
  style: string
  created_at: string
}

export interface Attendance {
  id: string
  class_id: string
  student_id: string | null
  instructor_id: string | null
  date: string
  status: 'present' | 'absent' | 'late'
  type: 'student' | 'instructor'
  created_at: string
}

export interface FinancialEntry {
  id: string
  type: 'income' | 'expense'
  category: string
  description: string
  amount: number
  date: string
  is_fixed: boolean
  fixed_bill_id?: string | null
  created_at: string
}

export interface Product {
  id: string
  name: string
  description: string
  price: number
  cost_price: number
  quantity: number
  category: string
  photo_url: string | null
  created_at: string
  updated_at: string
}

export interface TeamMember {
  id: string
  name: string
  email: string
  phone: string
  role: 'Secretário' | 'Diretor' | 'Professor' | 'Zelador' | 'Porteiro' | 'Coordenador' | 'instructor' | 'staff' | 'admin'
  specialty: string
  photo_url: string | null
  salary: number
  hourly_rate: number
  daily_transport: number
  hire_date: string
  status: 'active' | 'inactive'
  created_at: string
}

export interface SchoolSettings {
  id: string
  school_name: string
  logo_url: string | null
  bg_color: string
  text_color: string
  accent_color: string
  bg_card: string
  title_font_size: number
  subtitle_font_size: number
  cnpj: string | null
  address: string | null
  director: string | null
  created_at: string
  updated_at: string
}

export interface TrialClass {
  id: string
  user_id: string
  student_name: string
  phone: string | null
  class_id: string | null
  trial_date: string
  status: 'scheduled' | 'attended' | 'no_show' | 'enrolled'
  notes: string | null
  created_at: string
}

export interface FixedBillMonth {
  id: string
  fixed_bill_id: string
  month: string
  amount: number
  created_at: string
}

export interface Event {
  id: string
  name: string
  date: string
  location: string | null
  description: string | null
  ticket_price?: number
  cost?: number
  base_choreography_price?: number
  base_clothes_cost?: number
  created_at: string
}

export interface Installment {
  id: string
  value: number
  paid: boolean
}

export interface EventParticipant {
  id: string
  event_id: string
  student_id: string
  has_ticket: boolean
  ticket_quantity: number
  total_value: number
  amount_paid: number
  kit: boolean
  payment_method: string | null
  choreography_count: number
  clothes_cost: number
  installments: Installment[]
  created_at: string
}

export interface Profile {
  id: string
  email: string
  phone: string | null
  role: 'admin' | 'user' | 'teacher' | 'secretary'
  status: 'pending' | 'active' | 'suspended'
  plan: 'gratis' | 'prata' | 'ouro' | 'diamante'
  expires_at: string | null
  created_at: string
}
