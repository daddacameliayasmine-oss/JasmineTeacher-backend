import pool from "../../database/client.js";

export type ContactMessage = {
  id: number;
  email: string | null;
  message: string;
  created_at: Date;
};

// Insere un message recu via le formulaire de contact.
export const create = async (email: string | null, message: string): Promise<number> => {
  const [result] = await pool.query("INSERT INTO contact_messages (email, message) VALUES (?, ?)", [
    email,
    message,
  ]);
  return (result as { insertId: number }).insertId;
};

// Liste tous les messages, du plus recent au plus ancien (admin uniquement).
export const findAll = async (): Promise<ContactMessage[]> => {
  const [rows] = await pool.query("SELECT * FROM contact_messages ORDER BY created_at DESC");
  return rows as ContactMessage[];
};
