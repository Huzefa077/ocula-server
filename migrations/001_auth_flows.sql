begin;

alter table user_auth
  alter column hash drop not null;

alter table user_auth
  add column if not exists password_auth_enabled boolean not null default true,
  add column if not exists email_verification_token_hash text,
  add column if not exists email_verification_expires_at timestamptz,
  add column if not exists password_reset_token_hash text,
  add column if not exists password_reset_expires_at timestamptz;

alter table user_profiles
  add column if not exists role text not null default 'user',
  add column if not exists auth_provider text not null default 'password',
  add column if not exists google_sub text,
  add column if not exists is_email_verified boolean not null default true,
  add column if not exists email_verified_at timestamptz;

create unique index if not exists user_profiles_google_sub_unique
  on user_profiles (google_sub)
  where google_sub is not null;

create index if not exists user_auth_email_verification_token_idx
  on user_auth (email_verification_token_hash);

create index if not exists user_auth_password_reset_token_idx
  on user_auth (password_reset_token_hash);

commit;
