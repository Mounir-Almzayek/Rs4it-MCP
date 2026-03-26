export interface System2030LoginResponse {
  success: boolean;
  message?: string;
  data?: {
    user?: { id: number; email: string; created_at?: string };
    token?: string;
    notificationToken?: string;
  };
}

export interface System2030Programmer {
  id: number;
  programmer_gitlab_id?: number | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  description?: string | null;
  work_start_time?: string | null;
  work_end_time?: string | null;
  salary?: number | null;
  work_hours?: number | null;
  resign_date?: string | null;
  difficulty_level?: string | null;
  personal_picture_url?: string | null;
  status?: string | null;
  user_id?: number | null;
  join_date?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  [k: string]: unknown;
}

export interface System2030MeResponse {
  success?: boolean;
  message?: string;
  data?: System2030Programmer;
  // Some APIs return programmer directly at top-level; keep tolerant.
  id?: number;
  [k: string]: unknown;
}

