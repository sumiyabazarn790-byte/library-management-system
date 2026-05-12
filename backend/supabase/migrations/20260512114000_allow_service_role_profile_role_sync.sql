create or replace function public.guard_profile_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role then
    if coalesce(auth.role(), '') <> 'service_role'
       and not public.is_admin() then
      raise exception 'Admin privileges required';
    end if;

    if old.role = 'admin'
       and new.role <> 'admin'
       and not exists (
         select 1
         from public.profiles
         where role = 'admin'
           and id <> old.id
       ) then
      raise exception 'At least one admin account must remain';
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$;
