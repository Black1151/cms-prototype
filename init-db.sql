-- Create database if it doesn't exist
SELECT 'CREATE DATABASE cms_dev'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'cms_dev')\gexec

-- Connect to the database
\c cms_dev;

-- Create extensions if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- You can add any additional initialization SQL here
-- For example, creating initial tables or inserting seed data
