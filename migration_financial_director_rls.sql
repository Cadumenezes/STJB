-- 1. Políticas para Mensalidades (monthly_payments) - Permitir visualização e alteração para Diretor e Equipe Financeira/Secretaria/Coordenação
drop policy if exists "Users can manage their own monthly payments" on public.monthly_payments;
drop policy if exists "Users and staff can manage monthly payments" on public.monthly_payments;
create policy "Users and staff can manage monthly payments" on public.monthly_payments
  for all using (
    auth.uid() = user_id 
    or public.is_secretary_of(user_id) 
    or public.is_coordinator_of(user_id) 
    or public.is_financial_director_of(user_id)
  )
  with check (
    auth.uid() = user_id 
    or public.is_secretary_of(user_id) 
    or public.is_coordinator_of(user_id) 
    or public.is_financial_director_of(user_id)
  );

-- 2. Políticas para Eventos (events) - Permitir visualização por toda a equipe (para a galeria de fotos e cronogramas)
drop policy if exists "Users can manage their own events" on public.events;
drop policy if exists "Users and staff can view events" on public.events;
create policy "Users and staff can view events" on public.events
  for select using (
    auth.uid() = user_id 
    or public.is_teacher_of(user_id) 
    or public.is_secretary_of(user_id) 
    or public.is_coordinator_of(user_id) 
    or public.is_financial_director_of(user_id)
  );

-- 3. Políticas para Contas Fixas (fixed_bills) - Permitir gerenciamento total ao Diretor Geral e ao Diretor Financeiro
drop policy if exists "Users can manage their own fixed bills" on public.fixed_bills;
drop policy if exists "Users and financial directors can manage fixed bills" on public.fixed_bills;
create policy "Users and financial directors can manage fixed bills" on public.fixed_bills
  for all using (
    auth.uid() = user_id 
    or public.is_financial_director_of(user_id)
  )
  with check (
    auth.uid() = user_id 
    or public.is_financial_director_of(user_id)
  );

-- 4. Políticas para Produtos/Estoque (products) - Permitir visualização e gerenciamento
drop policy if exists "Users can manage their own products" on public.products;
drop policy if exists "Users and staff can view products" on public.products;
create policy "Users and staff can view products" on public.products
  for select using (
    auth.uid() = user_id 
    or public.is_secretary_of(user_id) 
    or public.is_coordinator_of(user_id) 
    or public.is_financial_director_of(user_id)
  );

drop policy if exists "Users and financial directors can manage products" on public.products;
create policy "Users and financial directors can manage products" on public.products
  for all using (
    auth.uid() = user_id 
    or public.is_financial_director_of(user_id)
  )
  with check (
    auth.uid() = user_id 
    or public.is_financial_director_of(user_id)
  );
