-- Schéma initial de la base Jasmine Teacher.
-- Exécuter ce fichier après avoir créé la base : mysql -u root -p < database.sql

CREATE DATABASE IF NOT EXISTS jasmine_teacher
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE jasmine_teacher;

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
-- created_by est en ON DELETE RESTRICT (et non CASCADE) : un cours a TOUJOURS
-- un créateur (cardinalité (1,1) côté COURS dans le MCD), donc on interdit de
-- supprimer un admin tant qu'il lui reste des cours — sinon la suppression
-- cascaderait sur toutes les bookings/paiements liés à ces cours et détruirait
-- un historique financier. Il faut réassigner ou supprimer les cours d'abord.
CREATE TABLE IF NOT EXISTS courses (
  id INT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  type ENUM('collectif', 'individuel', 'enfant_collectif', 'enfant_individuel') NOT NULL,
  price DECIMAL(6, 2) NOT NULL CHECK (price >= 0),
  capacity INT NOT NULL DEFAULT 10 CHECK (capacity >= 1),
  start_at DATETIME NOT NULL,
  duration_minutes INT NOT NULL DEFAULT 60 CHECK (duration_minutes >= 15),
  visio_url VARCHAR(500),
  created_by INT NOT NULL,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
);

-- Réservations : lien entre un élève (user) et un cours.
-- pending = créée mais pas encore payée, confirmed = payée, cancelled = annulée par l'élève.
--
-- active_course_id est une colonne virtuelle (générée, non stockée) qui vaut
-- course_id quand la réservation est active (pending/confirmed), et NULL quand
-- elle est annulée. MySQL autorise plusieurs NULL dans un index UNIQUE : l'index
-- ci-dessous n'empêche donc QUE les doublons actifs, conformément à la RG4
-- ("un même élève ne peut pas avoir deux réservations ACTIVES sur le même
-- cours") et au code applicatif (bookingsRepository.findActiveByUserAndCourse
-- ignore déjà les réservations annulées). Avant cette correction, l'ancien
-- UNIQUE(user_id, course_id) bloquait AUSSI les lignes annulées : un élève qui
-- annulait puis tentait de se réinscrire au même cours provoquait une erreur
-- SQL ER_DUP_ENTRY non gérée (500 au lieu de la réservation attendue).
CREATE TABLE IF NOT EXISTS bookings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  course_id INT NOT NULL,
  status ENUM('pending', 'confirmed', 'cancelled') NOT NULL DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  active_course_id INT GENERATED ALWAYS AS (IF(status = 'cancelled', NULL, course_id)) VIRTUAL,
  UNIQUE KEY uniq_user_active_course (user_id, active_course_id),
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
-- Cardinalité RÉSERVATION(1,1) — PAIEMENT(0,N) : une réservation peut n'avoir
-- aucun paiement (encore pending), ou PLUSIEURS au fil de sa vie (un paiement
-- initial, puis un remboursement qui repasse la réservation en pending côté
-- admin, puis un nouveau paiement pour la même booking_id). Il n'y a donc PAS
-- de contrainte UNIQUE(booking_id) ici : volontaire, pour ne pas bloquer ce
-- flux de re-paiement après remboursement. Ne pas la rajouter sans adapter le
-- code de paymentsActions.refund / editStatus en conséquence.
--
-- booking_id est NULLABLE et en ON DELETE SET NULL (et non CASCADE) : un
-- paiement est une trace financière qui ne doit JAMAIS disparaître comme
-- simple effet de bord de la suppression d'un cours ou d'un compte élève.
-- Supprimer un cours (DELETE /api/courses/:id) ou un utilisateur
-- (DELETE /api/users/:id) supprime logiquement en cascade les bookings
-- concernées (comportement voulu, comme l'annulation d'un abonnement), mais
-- la ligne payments correspondante est conservée avec booking_id = NULL
-- plutôt que détruite : le montant, le statut et la date restent consultables
-- pour l'historique/la compta, même si la réservation d'origine n'existe plus.
CREATE TABLE IF NOT EXISTS payments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  booking_id INT NULL,
  amount DECIMAL(6, 2) NOT NULL CHECK (amount >= 0),
  status ENUM('pending', 'paid', 'refunded') NOT NULL DEFAULT 'pending',
  paid_at DATETIME,
  FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL
);
