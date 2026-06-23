-- migration-v004.sql : quelques inscrits de demonstration (avec les nouvelles colonnes).
USE ynov_ci;

INSERT INTO utilisateur (nom, prenom, email, date_naissance, ville, code_postal) VALUES
  ('Curie',    'Marie', 'marie.curie@ynov.com',  '1867-11-07', 'Paris',   '75005'),
  ('Turing',   'Alan',  'alan.turing@ynov.com',  '1912-06-23', 'Londres', '75001'),
  ('Lovelace', 'Ada',   'ada.lovelace@ynov.com', '1815-12-10', 'Londres', '75002');
