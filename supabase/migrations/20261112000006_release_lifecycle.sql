-- Retiring a published release keeps its record and provenance but removes it
-- from the public repository and blocks further downloads.
create or replace function public.retire_release(p_release_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'Administrator role required' using errcode = '42501';
  end if;
  update public.dataset_releases set status = 'retired' where id = p_release_id;
  if not found then raise exception 'Release not found' using errcode = 'P0002'; end if;
end $$;
grant execute on function public.retire_release(uuid) to authenticated;
