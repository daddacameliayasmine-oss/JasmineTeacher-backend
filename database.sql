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
