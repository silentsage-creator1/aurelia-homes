-- Extend the existing maintenance request workflow for assigned technicians.
-- No job pool or technician compensation model is introduced.
alter table public.maintenance_requests
  add column if not exists scheduled_at timestamptz,
  add column if not exists completion_notes text,
  add column if not exists materials_used text,
  add column if not exists labour_hours numeric(7,2),
  add column if not exists after_attachment_path text,
  add column if not exists assignment_response text,
  add column if not exists assignment_responded_at timestamptz;

alter table public.maintenance_requests drop constraint if exists maintenance_requests_status_check;
alter table public.maintenance_requests add constraint maintenance_requests_status_check
  check (status in ('submitted','under_review','assigned','accepted','scheduled','in_progress','awaiting_materials','pending_verification','resolved','rejected_for_rework','rejected','cancelled'));

create table if not exists public.maintenance_activity (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.maintenance_requests(id) on delete cascade,
  actor_id uuid not null references public.profiles(id),
  activity_type text not null,
  note text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists maintenance_activity_request_idx on public.maintenance_activity(request_id,created_at desc);
alter table public.maintenance_activity enable row level security;
revoke all on public.maintenance_activity from anon,authenticated;
grant select,insert on public.maintenance_activity to authenticated;
create policy "maintenance participants read activity" on public.maintenance_activity for select to authenticated
 using (public.can_access_maintenance_request(request_id));
create policy "assigned technician adds activity" on public.maintenance_activity for insert to authenticated
 with check (actor_id=auth.uid() and exists(select 1 from public.maintenance_requests m where m.id=request_id and m.assigned_to=auth.uid() and exists(select 1 from public.profile_roles r where r.profile_id=auth.uid() and r.role::text='contractor')));

create or replace function public.technician_update_maintenance(
  p_request_id uuid, p_action text, p_note text default '', p_scheduled_at timestamptz default null,
  p_completion_notes text default null, p_materials_used text default null,
  p_labour_hours numeric default null, p_after_attachment_path text default null
) returns void language plpgsql security definer set search_path=public
as $$
declare v_request public.maintenance_requests;
begin
  if not exists(select 1 from public.profile_roles r where r.profile_id=auth.uid() and r.role::text='contractor') then raise exception 'Technician role required'; end if;
  select * into v_request from public.maintenance_requests where id=p_request_id and assigned_to=auth.uid() for update;
  if not found then raise exception 'This maintenance assignment is not available to your account'; end if;
  if p_action='accept' and v_request.status='assigned' then
    update public.maintenance_requests set status='accepted',assignment_response='accepted',assignment_responded_at=now(),updated_at=now() where id=p_request_id;
  elsif p_action='decline' and v_request.status='assigned' and length(trim(coalesce(p_note,'')))>=5 then
    update public.maintenance_requests set status='rejected',assignment_response=left(trim(p_note),2000),assignment_responded_at=now(),updated_at=now() where id=p_request_id;
  elsif p_action='schedule' and v_request.status in ('accepted','scheduled') and p_scheduled_at>now() then
    update public.maintenance_requests set status='scheduled',scheduled_at=p_scheduled_at,updated_at=now() where id=p_request_id;
  elsif p_action in ('start','progress','awaiting_materials') and v_request.status in ('accepted','scheduled','in_progress','awaiting_materials') then
    update public.maintenance_requests set status=case when p_action='start' then 'in_progress' when p_action='awaiting_materials' then 'awaiting_materials' else v_request.status end,updated_at=now() where id=p_request_id;
  elsif p_action='submit' and v_request.status in ('in_progress','awaiting_materials','rejected_for_rework') and length(trim(coalesce(p_completion_notes,'')))>=10 then
    if p_labour_hours is not null and p_labour_hours<0 then raise exception 'Labour hours cannot be negative'; end if;
    if p_after_attachment_path is not null and p_after_attachment_path not like 'maintenance/'||p_request_id::text||'/%' then raise exception 'Invalid completion attachment'; end if;
    update public.maintenance_requests set status='pending_verification',completion_notes=left(trim(p_completion_notes),10000),materials_used=left(coalesce(p_materials_used,''),5000),labour_hours=p_labour_hours,after_attachment_path=p_after_attachment_path,updated_at=now() where id=p_request_id;
  else
    raise exception 'That action is not allowed for the current assignment status';
  end if;
  insert into public.maintenance_activity(request_id,actor_id,activity_type,note)
    values(p_request_id,auth.uid(),p_action,left(trim(coalesce(p_note,p_completion_notes,'')),2000));
  insert into public.notifications(recipient_id,title,body,action_path)
    select distinct recipient,'Maintenance assignment updated',left(v_request.title||': technician '||replace(p_action,'_',' '),180),'/dashboard'
    from (select v_request.requested_by as recipient union select p.owner_id from public.properties p where p.id=v_request.property_id) recipients
    where recipient is not null and recipient<>auth.uid();
end;
$$;
revoke all on function public.technician_update_maintenance(uuid,text,text,timestamptz,text,text,numeric,text) from public,anon;
grant execute on function public.technician_update_maintenance(uuid,text,text,timestamptz,text,text,numeric,text) to authenticated;

create policy "assigned technicians read maintenance attachments" on storage.objects for select to authenticated
 using(bucket_id='rental-documents' and split_part(name,'/',1)='maintenance' and exists(select 1 from public.maintenance_requests m where m.id=split_part(name,'/',2)::uuid and (m.assigned_to=auth.uid() or public.can_access_maintenance_request(m.id))));
create policy "assigned technicians upload maintenance evidence" on storage.objects for insert to authenticated
 with check(bucket_id='rental-documents' and split_part(name,'/',1)='maintenance' and exists(select 1 from public.maintenance_requests m where m.id=split_part(name,'/',2)::uuid and m.assigned_to=auth.uid() and exists(select 1 from public.profile_roles r where r.profile_id=auth.uid() and r.role::text='contractor')) and coalesce(metadata->>'mimetype','') in ('image/jpeg','image/png','image/webp','application/pdf'));

grant update (attachment_path,after_attachment_path) on public.maintenance_requests to authenticated;

create or replace function public.property_manager_technicians()
returns table(technician_id uuid,technician_name text)
language sql stable security definer set search_path=public
as $$
  select p.id,p.full_name from public.profiles p join public.profile_roles r on r.profile_id=p.id
  where r.role::text='contractor' and public.has_role('property_manager') order by p.full_name;
$$;
revoke all on function public.property_manager_technicians() from public,anon;
grant execute on function public.property_manager_technicians() to authenticated;

create or replace function public.property_manager_assign_technician(p_request_id uuid,p_technician_id uuid)
returns void language plpgsql security definer set search_path=public
as $$
declare v_request public.maintenance_requests;
begin
  if not public.has_role('property_manager') then raise exception 'Property manager role required'; end if;
  select * into v_request from public.maintenance_requests where id=p_request_id for update;
  if not found or not public.can_manage_property(v_request.property_id) then raise exception 'Maintenance request is outside your assigned properties'; end if;
  if v_request.status not in ('submitted','under_review') or v_request.assigned_to is not null then raise exception 'This request is not available for assignment'; end if;
  if not exists(select 1 from public.profile_roles r where r.profile_id=p_technician_id and r.role::text='contractor') then raise exception 'Select an active technician account'; end if;
  update public.maintenance_requests set assigned_to=p_technician_id,status='assigned',assignment_response=null,assignment_responded_at=null,updated_at=now() where id=p_request_id;
end;
$$;
revoke all on function public.property_manager_assign_technician(uuid,uuid) from public,anon;
grant execute on function public.property_manager_assign_technician(uuid,uuid) to authenticated;

create policy "assigned technicians read work property details" on public.properties for select to authenticated
 using (exists(select 1 from public.maintenance_requests m where m.property_id=properties.id and m.assigned_to=auth.uid() and exists(select 1 from public.profile_roles r where r.profile_id=auth.uid() and r.role::text='contractor')));

create policy "assigned property managers read maintenance activity" on public.maintenance_activity for select to authenticated
 using (exists(select 1 from public.maintenance_requests m where m.id=request_id and exists(select 1 from public.property_manager_assignments a where a.property_id=m.property_id and a.manager_id=auth.uid() and a.status='active')));

create or replace function public.notify_maintenance_status_change()
returns trigger language plpgsql security definer set search_path=public
as $$
begin
  if old.status is distinct from new.status and old.assigned_to is not null and auth.uid() is distinct from new.assigned_to then
    insert into public.notifications(recipient_id,title,body,action_path)
      values(new.assigned_to,case when new.status='assigned' then 'New maintenance assignment' else 'Maintenance job updated' end,left(new.title||' · '||replace(new.status,'_',' '),180),'/dashboard');
    insert into public.maintenance_activity(request_id,actor_id,activity_type,note)
      values(new.id,coalesce(auth.uid(),new.assigned_to),case when new.status='assigned' then 'assigned' when new.status='resolved' then 'verified' when new.status='rejected_for_rework' then 'rework_required' else 'status_changed' end,left(coalesce(new.resolution_notes,new.status),2000));
  end if;
  return new;
end;
$$;
drop trigger if exists maintenance_status_notification on public.maintenance_requests;
create trigger maintenance_status_notification after update of status on public.maintenance_requests
for each row execute procedure public.notify_maintenance_status_change();
