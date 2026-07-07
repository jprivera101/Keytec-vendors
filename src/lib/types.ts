export type UserRole = 'admin' | 'salesman'
export type WeekStatus = 'active' | 'completed'

export interface Profile {
  id: string
  full_name: string
  role: UserRole
  phone: string | null
  created_at: string
}

export interface Week {
  id: string
  salesman_id: string
  start_date: string
  end_date: string | null
  start_mileage_km: number
  end_mileage_km: number | null
  status: WeekStatus
  started_at: string
  ended_at: string | null
}

export interface Visit {
  id: string
  week_id: string
  store_name: string | null
  photo_path: string
  latitude: number
  longitude: number
  notes: string | null
  captured_at: string
}

export interface Sale {
  id: string
  visit_id: string
  amount: number
  photo_path: string | null
  created_at: string
}

export interface VisitWithSales extends Visit {
  sales: Sale[]
}
