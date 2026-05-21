import pool from "../../database/client.js";

// Type publique (sans password_hash, jamais expose dans une reponse API).
export type PublicUser = {
  id: number;
  lastname: string;
  firstname: string;
  email: string;
  role: "student" | "admin";
  created_at: Date;
};

// Liste tous les utilisateurs (admin uniquement).
// Le champ password_hash n'est volontairement PAS selectionne.
export const findAll = async (): Promise<PublicUser[]> => {
  const [rows] = await pool.query(
    `SELECT id, lastname, firstname, email, role, created_at
     FROM users
     ORDER BY created_at DESC`,
  );
  return rows as PublicUser[];
};

// Retourne un user (sans password_hash) par id, ou null.
// Utilise apres un update pour renvoyer l'etat a jour au client.
export const findPublicById = async (id: number): Promise<PublicUser | null> => {
  const [rows] = await pool.query(
    `SELECT id, lastname, firstname, email, role, created_at
     FROM users WHERE id = ?`,
    [id],
  );
  return (rows as PublicUser[])[0] ?? null;
};

// Met a jour le prenom et le nom d'un user (self ou admin).
// L'email et le role restent intouchables ici : email = identifiant unique,
// role = privilege admin uniquement (cf. updateRole).
export const updateProfile = async (
  id: number,
  firstname: string,
  lastname: string,
): Promise<number> => {
  const [result] = await pool.query("UPDATE users SET firstname = ?, lastname = ? WHERE id = ?", [
    firstname,
    lastname,
    id,
  ]);
  return (result as { affectedRows: number }).affectedRows;
};

// Met a jour le role d'un user (admin uniquement) — promouvoir / retrograder.
export const updateRole = async (id: number, role: "student" | "admin"): Promise<number> => {
  const [result] = await pool.query("UPDATE users SET role = ? WHERE id = ?", [role, id]);
  return (result as { affectedRows: number }).affectedRows;
};

// Supprime un user (admin uniquement). CASCADE supprime bookings/courses associes.
export const remove = async (id: number): Promise<number> => {
  const [result] = await pool.query("DELETE FROM users WHERE id = ?", [id]);
  return (result as { affectedRows: number }).affectedRows;
};
