import pool from "../../database/client.js";

// Repository : seul endroit du module qui parle directement à la BDD.
// Les actions ne doivent JAMAIS écrire du SQL elles-mêmes.

export type Item = {
  id: number;
  title: string;
};

// Retourne tous les items, triés par id décroissant (plus récents d'abord).
export const findAll = async (): Promise<Item[]> => {
  const [rows] = await pool.query("SELECT * FROM items ORDER BY id DESC");
  return rows as Item[];
};

// Retourne un item par son id, ou null si introuvable.
export const findById = async (id: number): Promise<Item | null> => {
  const [rows] = await pool.query("SELECT * FROM items WHERE id = ?", [id]);
  const items = rows as Item[];
  return items[0] ?? null;
};

// Insère un item et renvoie son id auto-généré.
export const create = async (title: string): Promise<number> => {
  const [result] = await pool.query("INSERT INTO items (title) VALUES (?)", [title]);
  return (result as { insertId: number }).insertId;
};
