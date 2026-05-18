import pool from "../../database/client.js";

// Helper : execute un SELECT scalaire (COUNT, SUM…) et renvoie la valeur.
const queryScalar = async (sql: string): Promise<number> => {
  const [rows] = await pool.query(sql);
  const result = (rows as { value: number | string | null }[])[0]?.value ?? 0;
  return Number(result);
};

// Aggrege les KPIs pour le dashboard admin en une seule passe.
export type AdminStats = {
  total_students: number;
  total_courses: number;
  upcoming_courses: number;
  active_bookings: number;
  revenue_paid: number;
};

export const computeAdminStats = async (): Promise<AdminStats> => {
  // Les requetes sont independantes, on parallelise pour reduire la latence.
  const [students, courses, upcoming, bookings, revenue] = await Promise.all([
    queryScalar("SELECT COUNT(*) AS value FROM users WHERE role = 'student'"),
    queryScalar("SELECT COUNT(*) AS value FROM courses"),
    queryScalar("SELECT COUNT(*) AS value FROM courses WHERE start_at > NOW()"),
    queryScalar("SELECT COUNT(*) AS value FROM bookings WHERE status <> 'cancelled'"),
    queryScalar("SELECT COALESCE(SUM(amount), 0) AS value FROM payments WHERE status = 'paid'"),
  ]);

  return {
    total_students: students,
    total_courses: courses,
    upcoming_courses: upcoming,
    active_bookings: bookings,
    revenue_paid: revenue,
  };
};
