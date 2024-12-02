CREATE TABLE IF NOT EXISTS refresh_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users (id),
    token CHAR(60) NOT NULL,
    expires_at BIGINT NOT NULL,
    created_at timestamp(0) with time zone NOT NULL DEFAULT NOW(),
    updated_at timestamp(0) with time zone NOT NULL DEFAULT NOW()
)
