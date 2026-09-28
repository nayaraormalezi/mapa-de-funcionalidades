-- Central de notificações do PRISMA (retenção 15 dias).

create table if not exists public.notifications (
  id text primary key,
  recipient_user_id uuid not null references public.profiles(id) on delete cascade,
  actor_user_id uuid references public.profiles(id) on delete set null,
  type text not null,
  title text not null,
  message text not null default '',
  entity_type text,
  entity_id text,
  href text,
  metadata jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint notifications_type_not_blank check (length(trim(type)) > 0),
  constraint notifications_title_not_blank check (length(trim(title)) > 0)
);

create index if not exists notifications_recipient_created_idx
  on public.notifications (recipient_user_id, created_at desc);

create index if not exists notifications_recipient_unread_idx
  on public.notifications (recipient_user_id, created_at desc)
  where read_at is null;

create index if not exists notifications_created_idx
  on public.notifications (created_at);

create index if not exists notifications_recipient_read_idx
  on public.notifications (recipient_user_id, read_at);

alter table public.notifications enable row level security;

drop policy if exists notifications_select_own on public.notifications;
create policy notifications_select_own
  on public.notifications for select to authenticated
  using (recipient_user_id = auth.uid());

drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own
  on public.notifications for update to authenticated
  using (recipient_user_id = auth.uid())
  with check (recipient_user_id = auth.uid());

drop policy if exists notifications_delete_own on public.notifications;
create policy notifications_delete_own
  on public.notifications for delete to authenticated
  using (recipient_user_id = auth.uid());

-- Inserts via service role (notificationService). Sem policy INSERT para authenticated.

comment on table public.notifications is
  'Notificações in-app por usuário. Retenção máxima: 15 dias.';

create table if not exists public.notification_preferences (
  id text primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  notification_type text not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notification_preferences_unique unique (user_id, notification_type),
  constraint notification_preferences_type_not_blank
    check (length(trim(notification_type)) > 0)
);

create index if not exists notification_preferences_user_idx
  on public.notification_preferences (user_id);

drop trigger if exists trg_notification_preferences_updated
  on public.notification_preferences;
create trigger trg_notification_preferences_updated
  before update on public.notification_preferences
  for each row execute function set_updated_at();

alter table public.notification_preferences enable row level security;

drop policy if exists notification_preferences_select_own
  on public.notification_preferences;
create policy notification_preferences_select_own
  on public.notification_preferences for select to authenticated
  using (user_id = auth.uid());

drop policy if exists notification_preferences_insert_own
  on public.notification_preferences;
create policy notification_preferences_insert_own
  on public.notification_preferences for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists notification_preferences_update_own
  on public.notification_preferences;
create policy notification_preferences_update_own
  on public.notification_preferences for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

comment on table public.notification_preferences is
  'Preferências por tipo. Ausência de linha = habilitado (default).';

-- Limpeza sob demanda (também chamada pelo cron da aplicação).
create or replace function public.cleanup_expired_notifications()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer;
begin
  delete from public.notifications
  where created_at < now() - interval '15 days';
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

revoke all on function public.cleanup_expired_notifications() from public;
grant execute on function public.cleanup_expired_notifications() to service_role;
