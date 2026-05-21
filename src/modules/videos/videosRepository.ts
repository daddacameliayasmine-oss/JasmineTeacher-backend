import pool from "../../database/client.js";

export type Video = {
  id: number;
  title: string;
  url: string;
  is_public: boolean;
  created_at: Date;
};

export type VideoInput = {
  title: string;
  url: string;
  is_public: boolean;
};

// Liste les videos visibles publiquement (vitrine visiteur).
export const findPublic = async (): Promise<Video[]> => {
  const [rows] = await pool.query(
    "SELECT * FROM videos WHERE is_public = TRUE ORDER BY created_at DESC",
  );
  return rows as Video[];
};

// Liste TOUTES les videos (publiques + reservees), utilise par l'admin et les eleves.
export const findAll = async (): Promise<Video[]> => {
  const [rows] = await pool.query("SELECT * FROM videos ORDER BY created_at DESC");
  return rows as Video[];
};

export const create = async (input: VideoInput): Promise<number> => {
  const [result] = await pool.query("INSERT INTO videos (title, url, is_public) VALUES (?, ?, ?)", [
    input.title,
    input.url,
    input.is_public,
  ]);
  return (result as { insertId: number }).insertId;
};

export const update = async (id: number, input: VideoInput): Promise<number> => {
  const [result] = await pool.query(
    "UPDATE videos SET title = ?, url = ?, is_public = ? WHERE id = ?",
    [input.title, input.url, input.is_public, id],
  );
  return (result as { affectedRows: number }).affectedRows;
};

export const remove = async (id: number): Promise<number> => {
  const [result] = await pool.query("DELETE FROM videos WHERE id = ?", [id]);
  return (result as { affectedRows: number }).affectedRows;
};
