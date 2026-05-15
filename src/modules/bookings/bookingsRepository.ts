import pool from "../../database/client.js";

// Statuts possibles d'une réservation.
export type BookingStatus = "pending" | "confirmed" | "cancelled";

export type Booking = {
  id: number;
  user_id: number;
  course_id: number;
  status: BookingStatus;
  created_at: Date;
};

// Type enrichi : booking + infos du cours (utile pour l'espace eleve).
export type BookingWithCourse = Booking & {
  course_title: string;
  course_start_at: Date;
  course_price: number;
  course_visio_url: string | null;
};

// Compte les reservations actives (non annulees) pour un cours donne.
// Utilise pour verifier la capacite avant d'accepter une nouvelle reservation.
export const countActiveByCourse = async (courseId: number): Promise<number> => {
  const [rows] = await pool.query(
    "SELECT COUNT(*) AS total FROM bookings WHERE course_id = ? AND status <> 'cancelled'",
    [courseId],
  );
  return (rows as { total: number }[])[0].total;
};

// Verifie qu'un utilisateur n'a pas deja une reservation active sur ce cours.
export const findActiveByUserAndCourse = async (
  userId: number,
  courseId: number,
): Promise<Booking | null> => {
  const [rows] = await pool.query(
    "SELECT * FROM bookings WHERE user_id = ? AND course_id = ? AND status <> 'cancelled'",
    [userId, courseId],
  );
  return (rows as Booking[])[0] ?? null;
};

// Liste les reservations d'un utilisateur, avec les infos du cours associe.
export const findByUserWithCourse = async (userId: number): Promise<BookingWithCourse[]> => {
  const [rows] = await pool.query(
    `SELECT b.*, c.title AS course_title, c.start_at AS course_start_at,
            c.price AS course_price, c.visio_url AS course_visio_url
     FROM bookings b
     JOIN courses c ON c.id = b.course_id
     WHERE b.user_id = ?
     ORDER BY c.start_at DESC`,
    [userId],
  );
  return rows as BookingWithCourse[];
};

// Liste TOUTES les reservations avec les infos eleve + cours (admin).
export type BookingFull = BookingWithCourse & {
  user_firstname: string;
  user_lastname: string;
  user_email: string;
};

export const findAllWithDetails = async (): Promise<BookingFull[]> => {
  const [rows] = await pool.query(
    `SELECT b.*,
            c.title AS course_title, c.start_at AS course_start_at,
            c.price AS course_price, c.visio_url AS course_visio_url,
            u.firstname AS user_firstname, u.lastname AS user_lastname, u.email AS user_email
     FROM bookings b
     JOIN courses c ON c.id = b.course_id
     JOIN users u ON u.id = b.user_id
     ORDER BY c.start_at DESC`,
  );
  return rows as BookingFull[];
};

export const findById = async (id: number): Promise<Booking | null> => {
  const [rows] = await pool.query("SELECT * FROM bookings WHERE id = ?", [id]);
  return (rows as Booking[])[0] ?? null;
};

export const create = async (userId: number, courseId: number): Promise<number> => {
  const [result] = await pool.query(
    "INSERT INTO bookings (user_id, course_id) VALUES (?, ?)",
    [userId, courseId],
  );
  return (result as { insertId: number }).insertId;
};

export const updateStatus = async (id: number, status: BookingStatus): Promise<number> => {
  const [result] = await pool.query("UPDATE bookings SET status = ? WHERE id = ?", [status, id]);
  return (result as { affectedRows: number }).affectedRows;
};
