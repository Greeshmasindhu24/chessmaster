-- One-time ChessMaster Pro database setup (run as postgres superuser)
-- psql -U postgres -h localhost -p 5432 -f scripts/setup-postgres.sql

CREATE USER chess WITH PASSWORD 'chess';
CREATE DATABASE chessmaster OWNER chess;
GRANT ALL PRIVILEGES ON DATABASE chessmaster TO chess;
