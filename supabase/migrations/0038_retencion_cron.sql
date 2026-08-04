-- Programa el job diario que llama a la Edge Function retention-cleanup. El secreto que
-- autentica esa llamada se genera server-side con gen_random_bytes y se guarda en Supabase
-- Vault -- nunca aparece en texto plano en este archivo ni en el historial de git. Tanto el
-- cron (para enviarlo) como la Edge Function (para verificarlo, vía obtener_cron_secret)
-- lo leen del mismo lugar en el momento, así no hay que sincronizar el valor a mano.

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

do $$
begin
  if not exists (select 1 from vault.decrypted_secrets where name = 'retention_cron_secret') then
    perform vault.create_secret(
      encode(extensions.gen_random_bytes(32), 'hex'),
      'retention_cron_secret',
      'Autentica la llamada de pg_cron a la Edge Function retention-cleanup'
    );
  end if;
end $$;

create or replace function public.obtener_cron_secret()
returns text
language sql
stable
security definer
set search_path = public, vault
as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'retention_cron_secret';
$$;

revoke execute on function public.obtener_cron_secret() from public;
grant execute on function public.obtener_cron_secret() to service_role;

select cron.schedule(
  'retention-cleanup-diario',
  '0 6 * * *',
  $$
  select net.http_post(
    url := 'https://ebwmgpaokvrgyjrkutlm.supabase.co/functions/v1/retention-cleanup',
    headers := jsonb_build_object(
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'retention_cron_secret'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  ) as request_id;
  $$
);
