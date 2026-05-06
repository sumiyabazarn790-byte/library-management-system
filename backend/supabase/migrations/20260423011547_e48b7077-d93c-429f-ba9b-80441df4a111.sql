create schema if not exists extensions;
alter extension vector set schema extensions;
alter extension pg_trgm set schema extensions;
grant usage on schema extensions to postgres, anon, authenticated, service_role;