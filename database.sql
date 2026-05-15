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
