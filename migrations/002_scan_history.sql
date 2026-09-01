begin;

create table if not exists user_scan_history (
  id bigserial primary key,
  user_id integer not null references user_profiles(id) on delete cascade,
  image_url text,
  source_type text not null default 'url',
  face_count integer not null default 0,
  processing_time_ms integer not null default 0,
  face_summaries jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  constraint user_scan_history_source_type_check check (source_type in ('url', 'upload'))
);

create index if not exists user_scan_history_user_created_idx
  on user_scan_history (user_id, created_at desc);

commit;
