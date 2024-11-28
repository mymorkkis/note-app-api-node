CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email citext UNIQUE NOT NULL,
    password CHAR(60) NOT NULL,
    created_at timestamp(0) with time zone NOT NULL DEFAULT NOW(),
    updated_at timestamp(0) with time zone NOT NULL DEFAULT NOW()
);
