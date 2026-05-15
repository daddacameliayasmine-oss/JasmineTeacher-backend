import pool from "../../database/client.js";

// Type publique d'un cours (sans donnees techniques privees).
export type Course = {
  id: number;
  title: string;
  description: string | null;
  type: "collectif" | "individuel" | "enfant_collectif" | "enfant_individuel";
  price: number;
  capacity: number;
  start_at: Date;
  duration_minutes: number;
  visio_url: string | null;
  created_by: number;
};

// Donnees d'entree pour la creation / mise a jour (sans id ni created_by).
export type CourseInput = Omit<Course, "id" | "created_by">;

// Liste tous les cours, du plus prochain au plus lointain.
export const findAll = async (): Promise<Course[]> => {
  const [rows] = await pool.query("SELECT * FROM courses ORDER BY start_at ASC");
  return rows as Course[];
};

// Retourne un cours par id, ou null.
export const findById = async (id: number): Promise<Course | null> => {
  const [rows] = await pool.query("SELECT * FROM courses WHERE id = ?", [id]);
  return (rows as Course[])[0] ?? null;
};

// Cree un cours et renvoie son id auto-genere.
export const create = async (input: CourseInput, createdBy: number): Promise<number> => {
  const [result] = await pool.query(
    `INSERT INTO courses
      (title, description, type, price, capacity, start_at, duration_minutes, visio_url, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.title,
      input.description,
      input.type,
      input.price,
      input.capacity,
      input.start_at,
      input.duration_minutes,
      input.visio_url,
      createdBy,
    ],
  );
  return (result as { insertId: number }).insertId;
};

// Met a jour un cours existant. Renvoie le nombre de lignes affectees.
export const update = async (id: number, input: CourseInput): Promise<number> => {
  const [result] = await pool.query(
    `UPDATE courses
      SET title = ?, description = ?, type = ?, price = ?, capacity = ?,
          start_at = ?, duration_minutes = ?, visio_url = ?
      WHERE id = ?`,
    [
      input.title,
      input.description,
      input.type,
      input.price,
      input.capacity,
      input.start_at,
      input.duration_minutes,
      input.visio_url,
      id,
    ],
  );
  return (result as { affectedRows: number }).affectedRows;
};

// Supprime un cours. Renvoie le nombre de lignes supprimees.
export const remove = async (id: number): Promise<number> => {
  const [result] = await pool.query("DELETE FROM courses WHERE id = ?", [id]);
  return (result as { affectedRows: number }).affectedRows;
};
