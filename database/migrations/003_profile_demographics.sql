-- ChessMaster Pro - Profile demographics (date of birth, gender, country region)
-- Safe to run on existing PostgreSQL (idempotent)

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gender VARCHAR(20);
-- country stores indian | outside_indian | prefer_not_to_say (legacy ISO codes may remain in old rows)
