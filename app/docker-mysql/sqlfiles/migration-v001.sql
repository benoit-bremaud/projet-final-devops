-- migration-v001.sql : creation de la base applicative.
-- Execute automatiquement au premier demarrage (/docker-entrypoint-initdb.d).
CREATE DATABASE IF NOT EXISTS ynov_ci;
