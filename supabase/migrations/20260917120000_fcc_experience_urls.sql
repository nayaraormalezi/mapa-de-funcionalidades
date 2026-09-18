-- Experience links on implementations (FCC)
alter table feature_channel_contexts
  add column if not exists figma_url text,
  add column if not exists experience_image_url text,
  add column if not exists experience_url text;
