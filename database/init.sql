-- =====================================================================
--  PrimeClone database
--  This file runs AUTOMATICALLY the first time the MySQL container
--  starts (anything in /docker-entrypoint-initdb.d/ is executed once).
-- =====================================================================

CREATE DATABASE IF NOT EXISTS primevideo;
USE primevideo;

-- ---------- Categories (the horizontal rows on the home page) ----------
CREATE TABLE IF NOT EXISTS categories (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  slug        VARCHAR(100) NOT NULL UNIQUE,
  sort_order  INT DEFAULT 0
);

-- ---------- Movies / Shows ----------
CREATE TABLE IF NOT EXISTS movies (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  title         VARCHAR(200) NOT NULL,
  description   TEXT,
  type          ENUM('movie','series') DEFAULT 'movie',
  release_year  INT,
  duration      VARCHAR(30),
  age_rating    VARCHAR(10),
  imdb_score    DECIMAL(3,1),
  genre         VARCHAR(100),
  language      VARCHAR(50),
  category_id   INT,
  color_from    VARCHAR(7) DEFAULT '#1a2a3a',   -- poster gradient start
  color_to      VARCHAR(7) DEFAULT '#00a8e1',   -- poster gradient end
  is_featured   BOOLEAN DEFAULT FALSE,
  is_prime      BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- ---------- Users ----------
CREATE TABLE IF NOT EXISTS users (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  name           VARCHAR(100) NOT NULL,
  email          VARCHAR(150) NOT NULL UNIQUE,
  password_hash  VARCHAR(255) NOT NULL,
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ---------- Watchlist (many-to-many: users <-> movies) ----------
CREATE TABLE IF NOT EXISTS watchlist (
  user_id   INT NOT NULL,
  movie_id  INT NOT NULL,
  added_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, movie_id),
  FOREIGN KEY (user_id)  REFERENCES users(id)  ON DELETE CASCADE,
  FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE
);

-- =====================================================================
--  Seed data (fictional titles for the demo)
-- =====================================================================
INSERT INTO categories (name, slug, sort_order) VALUES
  ('Trending Now',          'trending',  1),
  ('PrimeClone Originals',  'originals', 2),
  ('Action & Adventure',    'action',    3),
  ('Comedy',                'comedy',    4),
  ('Malayalam & Indian',    'indian',    5),
  ('Sci-Fi & Fantasy',      'scifi',     6);

INSERT INTO movies
 (title, description, type, release_year, duration, age_rating, imdb_score, genre, language, category_id, color_from, color_to, is_featured) VALUES
 ('The Last Signal',     'A lone engineer on a remote space relay picks up a message that should not exist - and it is addressed to her.', 'movie', 2025, '2h 08m', 'U/A 13+', 8.4, 'Sci-Fi Thriller', 'English', 1, '#0f2027', '#2c5364', TRUE),
 ('Monsoon Express',     'Strangers on an overnight train through the Western Ghats discover they are all connected to the same missing man.', 'movie', 2024, '2h 21m', 'U/A 16+', 7.9, 'Mystery', 'Malayalam', 5, '#134e5e', '#71b280', FALSE),
 ('Kernel Panic',        'A burnt-out DevOps engineer must save a fintech launch when production goes down at 2 AM on release night.', 'series', 2025, '2 Seasons', 'U/A 13+', 8.7, 'Tech Drama', 'English', 2, '#000428', '#004e92', FALSE),
 ('Iron Coast',          'A retired coast guard captain returns for one last rescue mission in the middle of a cyclone.', 'movie', 2023, '2h 15m', 'U/A 16+', 7.4, 'Action', 'English', 3, '#232526', '#414345', FALSE),
 ('Chai & Chaos',        'Three friends open a tea stall next to an IT park. What could possibly go wrong?', 'series', 2024, '1 Season', 'U/A 7+', 8.1, 'Comedy', 'Hindi', 4, '#f12711', '#f5af19', FALSE),
 ('Backwaters',          'A family houseboat business in Alleppey hides a secret that three generations have kept.', 'movie', 2025, '2h 02m', 'U/A 13+', 8.2, 'Drama', 'Malayalam', 5, '#11998e', '#38ef7d', FALSE),
 ('Quantum Divide',      'Twin sisters wake up in parallel worlds and must swap places before both realities collapse.', 'series', 2025, '1 Season', 'U/A 13+', 8.5, 'Sci-Fi', 'English', 6, '#41295a', '#2f0743', TRUE),
 ('Velocity',            'An underground street racer becomes the getaway driver for the wrong crew.', 'movie', 2024, '1h 56m', 'A', 7.1, 'Action', 'English', 3, '#cb2d3e', '#ef473a', FALSE),
 ('The Office Pod',      'A mockumentary about a startup that runs entirely out of a co-working capsule.', 'series', 2023, '3 Seasons', 'U/A 13+', 8.0, 'Comedy', 'English', 4, '#ff9966', '#ff5e62', FALSE),
 ('Shadow Protocol',     'A cyber-security analyst uncovers a backdoor in the national power grid.', 'series', 2025, '1 Season', 'U/A 16+', 8.6, 'Thriller', 'English', 2, '#200122', '#6f0000', FALSE),
 ('Dune Riders',         'Nomads cross a dying desert planet carrying the last seed vault of their people.', 'movie', 2024, '2h 34m', 'U/A 13+', 7.8, 'Fantasy', 'English', 6, '#c79081', '#dfa579', FALSE),
 ('Thrissur Pooram Nights','A crime story set during the biggest festival night of the year.', 'movie', 2023, '2h 12m', 'U/A 16+', 7.6, 'Crime', 'Malayalam', 5, '#8e2de2', '#4a00e0', FALSE),
 ('Cloud Nine',          'A pilot and an air-traffic controller fall in love - over the radio.', 'movie', 2025, '1h 49m', 'U/A 7+', 7.3, 'Romance', 'English', 1, '#56ccf2', '#2f80ed', FALSE),
 ('Stack Overflow',      'An anthology series: every episode is one developer and one impossible bug.', 'series', 2024, '2 Seasons', 'U/A 13+', 8.3, 'Comedy', 'English', 2, '#1d4350', '#a43931', FALSE),
 ('The Ninth Planet',    'Astronomers detect a planet that appears only once every 400 years.', 'movie', 2023, '2h 10m', 'U', 7.7, 'Sci-Fi', 'English', 6, '#0b486b', '#f56217', FALSE),
 ('Last Bench Boys',     'Five college friends reunite after 15 years for a wedding that goes completely off-script.', 'movie', 2024, '2h 18m', 'U/A 13+', 8.0, 'Comedy', 'Malayalam', 4, '#f7971e', '#ffd200', FALSE),
 ('Red Sand',            'A border patrol officer and a smuggler are stranded together in a sandstorm.', 'movie', 2025, '1h 58m', 'U/A 16+', 7.5, 'Action', 'Hindi', 3, '#870000', '#190a05', FALSE),
 ('Northern Lights',     'A documentary-style drama following a family that moves to the Arctic.', 'series', 2025, '1 Season', 'U', 8.1, 'Drama', 'English', 1, '#43cea2', '#185a9d', FALSE);
