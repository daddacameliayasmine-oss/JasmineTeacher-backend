import pool from "../../database/client.js";

// Type partage du module : structure brute d'un utilisateur en BDD.
export type User = {
  id: number;
  lastname: string;
  firstname: string;
  email: string;
  password_hash: string;
  role: "student" | "admin";
  created_at: Date;
};

// Recherche un utilisateur par email (utilise au login et a l'inscription).
export const findByEmail = async (email: string): Promise<User | null> => {
  const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);
  const users = rows as User[];
  return users[0] ?? null;
};

// Recherche un utilisateur par id (utilise dans le middleware auth).
export const findById = async (id: number): Promise<User | null> => {
  const [rows] = await pool.query("SELECT * FROM users WHERE id = ?", [id]);
  const users = rows as User[];
  return users[0] ?? null;
};

// Cree un utilisateur. Renvoie son id auto-genere.
export const create = async (data: {
  lastname: string;
  firstname: string;
  email: string;
  passwordHash: string;
}): Promise<number> => {
  const [result] = await pool.query(
    "INSERT INTO users (lastname, firstname, email, password_hash) VALUES (?, ?, ?, ?)",
    [data.lastname, data.firstname, data.email, data.passwordHash],
  );
  return (result as { insertId: number }).insertId;
};
