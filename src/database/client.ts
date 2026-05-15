import mysql from "mysql2/promise";

// Pool de connexions MySQL partagé par toute l'application.
// Le pool évite d'ouvrir une nouvelle connexion à chaque requête (perf + limite serveur).
const pool = mysql.createPool({
  host: process.env.DB_HOST ?? "localhost",
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER ?? "root",
  password: process.env.DB_PASSWORD ?? "",
  database: process.env.DB_NAME ?? "jasmine_teacher",
  waitForConnections: true,
  connectionLimit: 10,
});

export default pool;
