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
  status: 'active' | 'inactive'
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
  role: 'instructor' | 'staff' | 'admin'
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
  title_font_size: number
  subtitle_font_size: number
  created_at: string
  updated_at: string
}
