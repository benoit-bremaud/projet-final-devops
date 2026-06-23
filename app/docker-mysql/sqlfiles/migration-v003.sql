-- migration-v003.sql : table admin, SANS mot de passe.
-- Le hash bcrypt est ecrit au demarrage de l'API (UPSERT idempotent, cf. ADR 0001).
USE ynov_ci;

CREATE TABLE IF NOT EXISTS admin (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL
);
