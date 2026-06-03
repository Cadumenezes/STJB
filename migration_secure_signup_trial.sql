-- Migration: Secure Signup with Automatic 7-Day Trial & Temp-Mail Blocking

create or replace function public.handle_new_user()
returns trigger as $$
declare
  member_role text;
  email_domain text;
begin
  -- Extrai o domínio do e-mail e converte para minúsculas
  email_domain := lower(split_part(new.email, '@', 2));

  -- Lista negra de domínios de e-mail temporários/descartáveis
  if email_domain in (
    '10minutemail.com', 'yopmail.com', 'mailinator.com', 'tempmail.com', 
    'guerrillamail.com', 'dispostable.com', 'getairmail.com', 'throwawaymail.com',
    'temp-mail.org', 'maildrop.cc', 'mail-temporary.com', 'sharklasers.com',
    'guerillamailblock.com', 'guerillamail.net', 'guerillamail.org', 'guerillamail.biz',
    'pokemail.net', 'grr.la', 'guerillamail.de', 'tempmail.net', 'tempmailo.com',
    'mohmal.com', 'crazymailing.com', 'zillamail.com', 'disposable.com', 'mailasia.com'
  ) then
    raise exception 'Uso de e-mail temporário não é permitido. Por favor, use um e-mail válido.';
  end if;

  -- Verifica se o e-mail cadastrado pertence a algum membro ativo da equipe
  select role from public.team_members 
  where email = new.email and status = 'active'
  limit 1
  into member_role;

  -- Se for um Secretário ou Professor, cria o perfil correspondente já ativo e sem expiração padrão
  if member_role = 'Secretário' or member_role = 'secretary' then
    insert into public.profiles (id, email, phone, role, status, plan, expires_at)
    values (new.id, new.email, new.raw_user_meta_data->>'phone', 'secretary', 'active', 'gratis', '2099-12-31');
  elsif member_role = 'instructor' or member_role = 'Professor' then
    insert into public.profiles (id, email, phone, role, status, plan, expires_at)
    values (new.id, new.email, new.raw_user_meta_data->>'phone', 'teacher', 'active', 'gratis', '2099-12-31');
  else
    -- Usuário comum (escola nova) inicia ATIVO com 7 dias grátis de teste
    insert into public.profiles (id, email, phone, role, status, plan, expires_at)
    values (new.id, new.email, new.raw_user_meta_data->>'phone', 'user', 'active', 'gratis', (current_date + interval '7 days')::date);
  end if;
  
  return new;
end;
$$ language plpgsql security definer;
