import pool from "../../database/client.js";

export type PaymentStatus = "pending" | "paid" | "refunded";

export type Payment = {
  id: number;
  booking_id: number;
  amount: number;
  status: PaymentStatus;
  paid_at: Date | null;
};

// Cree un paiement deja marque "paid" (mode mock).
// Stripe sera branche dans un sprint suivant, on stocke alors la transaction reelle.
export const createPaid = async (bookingId: number, amount: number): Promise<number> => {
  const [result] = await pool.query(
    "INSERT INTO payments (booking_id, amount, status, paid_at) VALUES (?, ?, 'paid', NOW())",
    [bookingId, amount],
  );
  return (result as { insertId: number }).insertId;
};

// Liste tous les paiements (admin).
export const findAll = async (): Promise<Payment[]> => {
  const [rows] = await pool.query("SELECT * FROM payments ORDER BY paid_at DESC");
  return rows as Payment[];
};
