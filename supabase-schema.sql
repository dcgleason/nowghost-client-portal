create table if not exists public.portal_clients (
  id text primary key,
  name text not null,
  contact_name text,
  vertical text
);

create table if not exists public.portal_users (
  id text primary key,
  email text unique not null,
  password_salt text not null,
  password_hash text not null,
  name text not null,
  role text not null check (role in ('admin', 'client')),
  client_id text references public.portal_clients(id) on delete set null
);

create table if not exists public.portal_posts (
  id text primary key,
  client_id text not null references public.portal_clients(id) on delete cascade,
  title text not null,
  content text not null default '',
  publish_date date not null,
  status text not null check (status in ('draft', 'in_review', 'approved')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.portal_comments (
  id text primary key,
  post_id text not null references public.portal_posts(id) on delete cascade,
  author_name text not null,
  role text not null check (role in ('admin', 'client')),
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_portal_posts_client_id on public.portal_posts(client_id);
create index if not exists idx_portal_posts_publish_date on public.portal_posts(publish_date);
create index if not exists idx_portal_comments_post_id on public.portal_comments(post_id);

insert into public.portal_clients (id, name, contact_name, vertical) values
  ('client-bettera', 'Bettera', 'David Holstein', 'ServiceNow Partner'),
  ('client-ventureco', 'VentureCo', 'Alex Carter', 'VC-Backed Startup')
on conflict (id) do nothing;

insert into public.portal_users (id, email, password_salt, password_hash, name, role, client_id) values
  ('user-admin', 'admin@thenowghost.com', 'salt-admin', 'ff44263acdf8f7ec4b924553fea49875e603a40cf3547bc7193186d0610da8c9', 'Danny Gleason', 'admin', null),
  ('user-bettera', 'david@bettera.com', 'salt-bettera', '86018da066fc64379a7404c0dd10860d6373056e6485fc4787f0a0c393756eca', 'David Holstein', 'client', 'client-bettera'),
  ('user-venture', 'founder@ventureco.com', 'salt-venture', '525324bd2929dbdaed404d5785693eb6a0172117a616f13a3302f596e04a7497', 'Alex Carter', 'client', 'client-ventureco')
on conflict (id) do nothing;

insert into public.portal_posts (id, client_id, title, content, publish_date, status, created_at, updated_at) values
  ('post-1', 'client-bettera', 'Why ServiceNow Partners Need Founder Signal', 'Most ServiceNow firms sound interchangeable online. The firms that win trust faster are the ones whose founders show how they think before the call ever happens.

That means clearer opinions on workflow transformation, sharper stories from the field, and a point of view buyers can remember.', '2026-03-20', 'draft', '2026-03-18T09:00:00.000Z', '2026-03-18T09:00:00.000Z'),
  ('post-2', 'client-bettera', 'The Best ServiceNow Content is Specific', 'Generic thought leadership does not move enterprise buyers. Specificity does.

Specific lessons from delivery. Specific mistakes. Specific customer pain. Specific tradeoffs. That is what makes founder-led LinkedIn work.', '2026-03-24', 'approved', '2026-03-18T10:00:00.000Z', '2026-03-18T12:00:00.000Z'),
  ('post-3', 'client-ventureco', 'Why Founder-Led Content Still Matters in AI', 'In AI, products move fast and features get copied even faster. Founder-led content is how you show the market you understand the deeper problem, not just the latest launch.

That trust compounds long before a demo request shows up.', '2026-03-21', 'in_review', '2026-03-18T08:30:00.000Z', '2026-03-18T08:30:00.000Z')
on conflict (id) do nothing;

insert into public.portal_comments (id, post_id, author_name, role, body, created_at) values
  ('comment-1', 'post-1', 'Danny Gleason', 'admin', 'Drafted for your March content batch. Curious if you want this more partner-side or buyer-side.', '2026-03-18T09:30:00.000Z'),
  ('comment-2', 'post-2', 'David Holstein', 'client', 'Approved. Good to post next week.', '2026-03-18T12:00:00.000Z'),
  ('comment-3', 'post-3', 'Danny Gleason', 'admin', 'Queued this for your thought-leadership slot next week.', '2026-03-18T08:35:00.000Z')
on conflict (id) do nothing;
