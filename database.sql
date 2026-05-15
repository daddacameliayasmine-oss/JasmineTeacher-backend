-- Schéma initial de la base Jasmine Teacher.
-- Exécuter ce fichier après avoir créé la base : mysql -u root -p < database.sql

CREATE DATABASE IF NOT EXISTS jasmine_teacher
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE jasmine_teacher;

-- Table d'exemple utilisée par le module items.
CREATE TABLE IF NOT EXISTS items (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(255) NOT NULL
);

-- Utilisateurs : visiteurs qui se transforment en élèves après inscription.
-- Le rôle "admin" est réservé à Jasmine (à provisionner manuellement en BDD).
CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  lastname VARCHAR(100) NOT NULL,
  firstname VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('student', 'admin') NOT NULL DEFAULT 'student',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Cours / sessions proposées par Jasmine.
-- 4 types prévus selon la grille tarifaire (cf. wireframe "Découvrir les cours").
CREATE TABLE IF NOT EXISTS courses (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  type ENUM('collectif', 'individuel', 'enfant_collectif', 'enfant_individuel') NOT NULL,
  price DECIMAL(6, 2) NOT NULL,
  capacity INT NOT NULL DEFAULT 10,
  start_at DATETIME NOT NULL,
  duration_minutes INT NOT NULL DEFAULT 60,
  visio_url VARCHAR(500),
  created_by INT NOT NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Réservations : lien entre un élève (user) et un cours.
-- Une même paire (user, course) ne peut exister qu'une fois (anti-doublon).
-- pending = créée mais pas encore payée, confirmed = payée, cancelled = annulée par l'élève.
CREATE TABLE IF NOT EXISTS bookings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  course_id INT NOT NULL,
  status ENUM('pending', 'confirmed', 'cancelled') NOT NULL DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_user_course (user_id, course_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

-- Vidéos : démos publiques (visiteurs) ou contenus réservés (élèves connectés).
-- is_public = TRUE → vitrine sur la page "Découvrir les cours".
-- is_public = FALSE → accessibles seulement aux utilisateurs authentifiés.
CREATE TABLE IF NOT EXISTS videos (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(200) NOT NULL,
  url VARCHAR(500) NOT NULL,
  is_public BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Messages envoyés depuis le formulaire de contact (visiteurs).
-- L'email est optionnel pour ne pas bloquer si l'utilisateur n'est pas connecté.
CREATE TABLE IF NOT EXISTS contact_messages (
  id INT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255),
  message TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Paiements : trace de chaque transaction liée à une réservation.
-- Une fois payé, le booking associé passe en "confirmed".
-- Pour ce sprint, on utilise un mode "mock" (Stripe à brancher dans un sprint suivant).
CREATE TABLE IF NOT EXISTS payments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  booking_id INT NOT NULL,
  amount DECIMAL(6, 2) NOT NULL,
  status ENUM('pending', 'paid', 'refunded') NOT NULL DEFAULT 'pending',
  paid_at DATETIME,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
);
