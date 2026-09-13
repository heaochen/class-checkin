-- ClassHub groups and members schema
create extension if not exists pgcrypto;

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  student_id text not null,
  name text not null,
  created_at timestamptz not null default now(),
  constraint members_group_id_student_id_key unique (group_id, student_id)
);

create table if not exists public.meetings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  group_id uuid not null references public.groups(id) on delete restrict,
  meeting_date date not null,
  checkin_start timestamptz not null,
  checkin_end timestamptz not null,
  feedback_enabled boolean not null default false,
  status text not null default 'not_started',
  checkin_token text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.attendance (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  checkin_time timestamptz not null default now(),
  checkin_method text not null default 'qr',
  created_at timestamptz not null default now(),
  constraint attendance_meeting_id_member_id_key unique (meeting_id, member_id)
);

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  member_id uuid references public.members(id) on delete set null,
  rating integer check (rating >= 1 and rating <= 5),
  content text check (content is null or char_length(content) <= 1000),
  anonymous boolean not null default false,
  created_at timestamptz not null default now(),
  constraint feedback_meeting_id_member_id_key unique (meeting_id, member_id)
);

-- Authenticated administrators can access these tables during the current phase.
-- No data-isolation policy is applied between authenticated users yet.
alter table public.groups enable row level security;
alter table public.members enable row level security;
alter table public.meetings enable row level security;
alter table public.attendance enable row level security;
alter table public.feedback enable row level security;

revoke all on table public.groups from anon;
revoke all on table public.members from anon;
revoke all on table public.meetings from anon;
revoke all on table public.attendance from anon;
revoke all on table public.feedback from anon;
grant select, insert, update, delete on table public.groups to authenticated;
grant select, insert, update, delete on table public.members to authenticated;
grant select, insert, update, delete on table public.meetings to authenticated;
grant select, insert, delete on table public.attendance to authenticated;
grant select on table public.feedback to authenticated;

drop policy if exists "groups_select_public" on public.groups;
drop policy if exists "groups_insert_public" on public.groups;
drop policy if exists "groups_update_public" on public.groups;
drop policy if exists "groups_delete_public" on public.groups;
drop policy if exists "members_select_public" on public.members;
drop policy if exists "members_insert_public" on public.members;
drop policy if exists "members_update_public" on public.members;
drop policy if exists "members_delete_public" on public.members;
drop policy if exists "meetings_select_public" on public.meetings;
drop policy if exists "meetings_insert_public" on public.meetings;
drop policy if exists "meetings_update_public" on public.meetings;
drop policy if exists "meetings_delete_public" on public.meetings;
drop policy if exists "attendance_select_public" on public.attendance;
drop policy if exists "attendance_insert_public" on public.attendance;
drop policy if exists "attendance_update_public" on public.attendance;
drop policy if exists "attendance_delete_public" on public.attendance;
drop policy if exists "feedback_select_public" on public.feedback;
drop policy if exists "feedback_insert_public" on public.feedback;
drop policy if exists "feedback_update_public" on public.feedback;
drop policy if exists "feedback_delete_public" on public.feedback;

drop policy if exists "groups_select_authenticated" on public.groups;
drop policy if exists "groups_insert_authenticated" on public.groups;
drop policy if exists "groups_update_authenticated" on public.groups;
drop policy if exists "groups_delete_authenticated" on public.groups;
drop policy if exists "members_select_authenticated" on public.members;
drop policy if exists "members_insert_authenticated" on public.members;
drop policy if exists "members_update_authenticated" on public.members;
drop policy if exists "members_delete_authenticated" on public.members;
drop policy if exists "meetings_select_authenticated" on public.meetings;
drop policy if exists "meetings_insert_authenticated" on public.meetings;
drop policy if exists "meetings_update_authenticated" on public.meetings;
drop policy if exists "meetings_delete_authenticated" on public.meetings;
drop policy if exists "attendance_select_authenticated" on public.attendance;
drop policy if exists "attendance_insert_authenticated" on public.attendance;
drop policy if exists "attendance_delete_authenticated" on public.attendance;
drop policy if exists "feedback_select_authenticated" on public.feedback;
drop policy if exists "feedback_insert_authenticated" on public.feedback;
drop policy if exists "feedback_update_authenticated" on public.feedback;
drop policy if exists "feedback_delete_authenticated" on public.feedback;

create policy "groups_select_authenticated"
on public.groups for select to authenticated
using (true);

create policy "groups_insert_authenticated"
on public.groups for insert to authenticated
with check (true);

create policy "groups_update_authenticated"
on public.groups for update to authenticated
using (true) with check (true);

create policy "groups_delete_authenticated"
on public.groups for delete to authenticated
using (true);

create policy "members_select_authenticated"
on public.members for select to authenticated
using (true);

create policy "members_insert_authenticated"
on public.members for insert to authenticated
with check (true);

create policy "members_update_authenticated"
on public.members for update to authenticated
using (true) with check (true);

create policy "members_delete_authenticated"
on public.members for delete to authenticated
using (true);

create policy "meetings_select_authenticated"
on public.meetings for select to authenticated
using (true);

create policy "meetings_insert_authenticated"
on public.meetings for insert to authenticated
with check (true);

create policy "meetings_update_authenticated"
on public.meetings for update to authenticated
using (true) with check (true);

create policy "meetings_delete_authenticated"
on public.meetings for delete to authenticated
using (true);

create policy "attendance_select_authenticated"
on public.attendance for select to authenticated
using (true);

create policy "attendance_insert_authenticated"
on public.attendance for insert to authenticated
with check (true);

create policy "attendance_delete_authenticated"
on public.attendance for delete to authenticated
using (true);

create policy "feedback_select_authenticated"
on public.feedback for select to authenticated
using (true);

drop function if exists public.get_checkin_meeting(text);

create function public.get_checkin_meeting(p_meeting_token text)
returns table (
  title text,
  meeting_date date,
  checkin_start timestamptz,
  checkin_end timestamptz,
  feedback_enabled boolean
)
language sql
security definer
set search_path = public, pg_temp
as $$
  select m.title, m.meeting_date, m.checkin_start, m.checkin_end, m.feedback_enabled
  from public.meetings as m
  where m.checkin_token = p_meeting_token;
$$;

revoke all on function public.get_checkin_meeting(text) from public;
grant execute on function public.get_checkin_meeting(text) to anon, authenticated;

create or replace function public.verify_meeting_member(
  p_meeting_token text,
  p_student_id text,
  p_name text
)
returns boolean
language sql
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.meetings as meeting
    join public.members as member on member.group_id = meeting.group_id
    where meeting.checkin_token = p_meeting_token
      and now() between meeting.checkin_start and meeting.checkin_end
      and member.student_id = p_student_id
      and member.name = p_name
  );
$$;

revoke all on function public.verify_meeting_member(text, text, text) from public;
grant execute on function public.verify_meeting_member(text, text, text) to anon, authenticated;

create or replace function public.check_in_meeting(
  meeting_token text,
  input_student_id text,
  input_name text
)
returns table (
  status text,
  checkin_time timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_meeting public.meetings%rowtype;
  target_member public.members%rowtype;
  existing_checkin timestamptz;
begin
  select * into target_meeting
  from public.meetings as meeting
  where meeting.checkin_token = $1;

  if not found then
    return query select 'invalid_meeting'::text, null::timestamptz;
    return;
  end if;

  if now() < target_meeting.checkin_start then
    return query select 'not_started'::text, null::timestamptz;
    return;
  end if;

  if now() > target_meeting.checkin_end then
    return query select 'ended'::text, null::timestamptz;
    return;
  end if;

  select member.* into target_member
  from public.members as member
  where member.group_id = target_meeting.group_id
    and member.student_id = $2
    and member.name = $3;

  if not found then
    return query select 'member_not_found'::text, null::timestamptz;
    return;
  end if;

  select attendance.checkin_time into existing_checkin
  from public.attendance
  where attendance.meeting_id = target_meeting.id
    and attendance.member_id = target_member.id;

  if found then
    return query select 'already_checked_in'::text, existing_checkin;
    return;
  end if;

  insert into public.attendance (meeting_id, member_id, checkin_method)
  values (target_meeting.id, target_member.id, 'qr')
  returning attendance.checkin_time into existing_checkin;

  return query select 'success'::text, existing_checkin;
exception
  when unique_violation then
    select attendance.checkin_time into existing_checkin
    from public.attendance
    where attendance.meeting_id = target_meeting.id
      and attendance.member_id = target_member.id;
    return query select 'already_checked_in'::text, existing_checkin;
end;
$$;

revoke all on function public.check_in_meeting(text, text, text) from public;
grant execute on function public.check_in_meeting(text, text, text) to anon, authenticated;

create or replace function public.submit_meeting_feedback(
  meeting_token text,
  input_student_id text,
  input_name text,
  input_rating integer,
  input_content text,
  input_anonymous boolean
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_meeting public.meetings%rowtype;
  target_member public.members%rowtype;
begin
  if input_rating is null or input_rating < 1 or input_rating > 5 then
    raise exception 'rating must be between 1 and 5';
  end if;

  if char_length(coalesce(input_content, '')) > 1000 then
    raise exception 'feedback content is too long';
  end if;

  select * into target_meeting
  from public.meetings as meeting
  where meeting.checkin_token = $1;

  if not found then
    return 'invalid_meeting';
  end if;

  if not target_meeting.feedback_enabled then
    return 'feedback_disabled';
  end if;

  select member.* into target_member
  from public.members as member
  where member.group_id = target_meeting.group_id
    and member.student_id = $2
    and member.name = $3;

  if not found then
    return 'member_not_found';
  end if;

  if exists (
    select 1
    from public.feedback as existing_feedback
    where existing_feedback.meeting_id = target_meeting.id
      and existing_feedback.member_id = target_member.id
  ) then
    return 'already_submitted';
  end if;

  insert into public.feedback (
    meeting_id,
    member_id,
    rating,
    content,
    anonymous
  )
  values (
    target_meeting.id,
    target_member.id,
    input_rating,
    nullif(trim(coalesce(input_content, '')), ''),
    coalesce(input_anonymous, false)
  );

  return 'success';
exception
  when unique_violation then
    return 'already_submitted';
end;
$$;

revoke all on function public.submit_meeting_feedback(text, text, text, integer, text, boolean) from public;
grant execute on function public.submit_meeting_feedback(text, text, text, integer, text, boolean) to anon;
