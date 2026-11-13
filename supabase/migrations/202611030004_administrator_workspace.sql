-- Least-privilege operational views for administrators; sensitive mutations
-- remain in narrowly scoped database functions.
-- Add the technician role after migration 003 has used text-based checks, so
-- PostgreSQL commits the enum label before later migrations/functions cast it.
alter type public.account_role add value if not exists 'contractor';

create policy "administrators read platform roles" on public.profile_roles for select to authenticated
 using (public.has_role('admin'));

create or replace function public.admin_platform_overview()
returns table(total_users bigint,total_properties bigint,active_listings bigint,active_tenancies bigint,pending_approvals bigint,total_transactions bigint,open_maintenance bigint,open_support_issues bigint)
language plpgsql stable security definer set search_path=public
as $$
begin
  if not public.has_role('admin') then raise exception 'Administrator role required'; end if;
  return query select
    (select count(*) from public.profiles),
    (select count(*) from public.properties),
    (select count(*) from public.rental_listings where status='published'),
    (select count(*) from public.tenancies where status='active'),
    (select count(*) from public.rental_listings where status='pending_review'),
    (select count(*) from public.payments),
    (select count(*) from public.maintenance_requests where status not in ('resolved','rejected','cancelled')),
    (select count(*) from public.tenant_complaints where status not in ('resolved','closed'));
end;
$$;
revoke all on function public.admin_platform_overview() from public,anon;
grant execute on function public.admin_platform_overview() to authenticated;

create or replace function public.admin_review_listing(p_listing_id uuid,p_decision text,p_reason text default '')
returns void language plpgsql security definer set search_path=public
as $$
declare v_listing public.rental_listings; v_owner uuid; v_new_status text;
begin
  if not public.has_role('admin') then raise exception 'Administrator role required'; end if;
  if p_decision not in ('approve','reject') then raise exception 'Choose approve or reject'; end if;
  if p_decision='reject' and length(trim(coalesce(p_reason,'')))<5 then raise exception 'A rejection reason is required'; end if;
  select l.* into v_listing from public.rental_listings l where l.id=p_listing_id for update;
  if not found or v_listing.status<>'pending_review' then raise exception 'This listing is not awaiting review'; end if;
  select owner_id into v_owner from public.properties where id=v_listing.property_id;
  v_new_status:=case when p_decision='approve' then 'published' else 'rejected' end;
  update public.rental_listings set status=v_new_status where id=p_listing_id;
  insert into public.workflow_audit_events(actor_id,entity_type,entity_id,action,details)
   values(auth.uid(),'rental_listing',p_listing_id,'listing_'||p_decision,jsonb_build_object('previous_status',v_listing.status,'new_status',v_new_status,'reason',left(trim(coalesce(p_reason,'')),2000)));
  insert into public.notifications(recipient_id,title,body,action_path)
   values(v_owner,case when p_decision='approve' then 'Property listing approved' else 'Property listing needs attention' end,
    case when p_decision='approve' then 'Your property listing is now published.' else left(trim(p_reason),180) end,'/manage-rentals');
end;
$$;
revoke all on function public.admin_review_listing(uuid,text,text) from public,anon;
grant execute on function public.admin_review_listing(uuid,text,text) to authenticated;
