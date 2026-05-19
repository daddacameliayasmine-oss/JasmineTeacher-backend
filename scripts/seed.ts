import "dotenv/config";
import pool from "../src/database/client.js";
import { hashPassword } from "../src/utils/hash.js";

// Script de seed reproductible : reset toutes les tables puis insere
// un jeu de donnees fixtures complet pour demontrer les 15 user stories.
// Lance : npm run seed
//
// Comptes crees (tous avec le meme mot de passe "motdepasse123") :
//   - jasmine@danse.com         (admin)
//   - bob@example.com           (student, 2 reservations dont 1 confirmed)
//   - charlie@example.com       (student, 1 reservation cancelled)
//   - diana@example.com         (student, aucune reservation)

const SEED_PASSWORD = "motdepasse123";

const inDays = (n: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 19).replace("T", " ");
};

const truncate = async () => {
  // L'ordre respecte les FK : payments -> bookings -> courses/users.
  await pool.query("SET FOREIGN_KEY_CHECKS = 0");
  for (const table of ["payments", "bookings", "videos", "contact_messages", "courses", "users"]) {
    await pool.query(`TRUNCATE TABLE ${table}`);
  }
  await pool.query("SET FOREIGN_KEY_CHECKS = 1");
  console.info("✓ Tables videes");
};

const seedUsers = async (): Promise<Record<string, number>> => {
  const hash = await hashPassword(SEED_PASSWORD);
  const users = [
    { lastname: "Daddacamelia", firstname: "Jasmine", email: "jasmine@danse.com", role: "admin" },
    { lastname: "Martin", firstname: "Bob", email: "bob@example.com", role: "student" },
    { lastname: "Tester", firstname: "Charlie", email: "charlie@example.com", role: "student" },
    { lastname: "Diana", firstname: "Prince", email: "diana@example.com", role: "student" },
  ];
  const ids: Record<string, number> = {};
  for (const u of users) {
    const [r] = await pool.query(
      "INSERT INTO users (lastname, firstname, email, password_hash, role) VALUES (?, ?, ?, ?, ?)",
      [u.lastname, u.firstname, u.email, hash, u.role],
    );
    ids[u.email] = (r as { insertId: number }).insertId;
  }
  console.info(`✓ ${users.length} users crees (mot de passe : ${SEED_PASSWORD})`);
  return ids;
};

const seedCourses = async (adminId: number): Promise<number[]> => {
  // 5 cours : 1 trop proche (J-7 doit refuser), 4 valides (10, 20, 30, 45 jours).
  const courses = [
    { title: "Cours imminent", type: "collectif", price: 20, capacity: 10, days: 2, dur: 60 },
    { title: "Initiation danse orientale", type: "collectif", price: 20, capacity: 10, days: 10, dur: 60 },
    { title: "Stage technique avance", type: "individuel", price: 40, capacity: 1, days: 20, dur: 90 },
    { title: "Eveil enfants 6-10 ans", type: "enfant_collectif", price: 10, capacity: 8, days: 30, dur: 45 },
    { title: "Cours particulier enfant", type: "enfant_individuel", price: 20, capacity: 1, days: 45, dur: 45 },
  ];
  const ids: number[] = [];
  for (const c of courses) {
    const [r] = await pool.query(
      "INSERT INTO courses (title, description, type, price, capacity, start_at, duration_minutes, visio_url, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [c.title, `Description du cours "${c.title}"`, c.type, c.price, c.capacity, inDays(c.days), c.dur, `https://meet.example.com/${c.title.toLowerCase().replace(/ /g, "-")}`, adminId],
    );
    ids.push((r as { insertId: number }).insertId);
  }
  console.info(`✓ ${courses.length} cours crees`);
  return ids;
};

const seedVideos = async () => {
  // 2 publiques (vitrine visiteur) + 1 privee (eleves seulement).
  const videos = [
    { title: "Decouverte de la danse orientale", url: "https://www.youtube.com/watch?v=demo1", is_public: true },
    { title: "Les bases du Shimmy", url: "https://www.youtube.com/watch?v=demo2", is_public: true },
    { title: "Choregraphie complete (reserve eleves)", url: "https://www.youtube.com/watch?v=private", is_public: false },
  ];
  for (const v of videos) {
    await pool.query("INSERT INTO videos (title, url, is_public) VALUES (?, ?, ?)", [v.title, v.url, v.is_public]);
  }
  console.info(`✓ ${videos.length} videos creees (2 publiques, 1 privee)`);
};

const seedBookings = async (userIds: Record<string, number>, courseIds: number[]) => {
  // Bob : 1 confirmed (avec paiement) + 1 pending. Charlie : 1 cancelled.
  const bookings = [
    { user: userIds["bob@example.com"], course: courseIds[1], status: "confirmed", pay: true },
    { user: userIds["bob@example.com"], course: courseIds[3], status: "pending", pay: false },
    { user: userIds["charlie@example.com"], course: courseIds[2], status: "cancelled", pay: false },
  ];
  for (const b of bookings) {
    const [r] = await pool.query(
      "INSERT INTO bookings (user_id, course_id, status) VALUES (?, ?, ?)",
      [b.user, b.course, b.status],
    );
    const bookingId = (r as { insertId: number }).insertId;
    if (b.pay) {
      await pool.query(
        "INSERT INTO payments (booking_id, amount, status, paid_at) VALUES (?, ?, 'paid', NOW())",
        [bookingId, 20],
      );
    }
  }
  console.info(`✓ ${bookings.length} bookings (1 confirmed+payee, 1 pending, 1 cancelled)`);
};

const seedContact = async () => {
  await pool.query(
    "INSERT INTO contact_messages (email, message) VALUES (?, ?)",
    ["visiteur@example.com", "Bonjour, je souhaite m'inscrire a un cours collectif. Merci."],
  );
  console.info("✓ 1 message de contact ajoute");
};

const main = async () => {
  console.info("Seed Jasmine Teacher\n");
  await truncate();
  const userIds = await seedUsers();
  const courseIds = await seedCourses(userIds["jasmine@danse.com"]);
  await seedVideos();
  await seedBookings(userIds, courseIds);
  await seedContact();
  console.info("\nSeed termine. Lance npm run dev pour demarrer le serveur.");
  await pool.end();
};

main().catch((err) => {
  console.error("Seed echoue :", err);
  process.exit(1);
});
