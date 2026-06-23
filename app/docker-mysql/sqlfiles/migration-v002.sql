-- migration-v002.sql : table utilisateur (les 6 champs du formulaire).
-- email UNIQUE = base de la detection de doublon (409).
USE ynov_ci;

CREATE TABLE IF NOT EXISTS utilisateur (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  nom              VARCHAR(100) NOT NULL,
  prenom           VARCHAR(100) NOT NULL,
  email            VARCHAR(255) NOT NULL UNIQUE,
  date_naissance   DATE NOT NULL,
  ville            VARCHAR(100) NOT NULL,
  code_postal      VARCHAR(5)   NOT NULL,
  date_inscription TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
