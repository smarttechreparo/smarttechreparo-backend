create extension if not exists pgcrypto;
create table if not exists public.system_users (
  id uuid primary key default gen_random_uuid(), name varchar(150) not null,
  email varchar(255) not null unique, password_hash text not null,
  role varchar(30) not null default 'admin' check (role in ('admin','atendente','tecnico','financeiro')),
  permissions jsonb not null default '{}'::jsonb, active boolean not null default true,
  last_login_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
insert into public.system_users (name,email,password_hash,role,permissions)
values ('Administrador','admin@smarttechreparo.com.br',crypt('TroqueEstaSenha@2026',gen_salt('bf',12)),'admin','{"all":true}'::jsonb)
on conflict (email) do update set password_hash=excluded.password_hash,active=true,updated_at=now();
