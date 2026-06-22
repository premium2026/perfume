-- Tabla de productos
create table products (
  id text primary key,
  name text not null,
  notes text,
  description text,
  price numeric not null default 0,
  stock integer not null default 0,
  image text
);

-- Tabla de códigos de autenticidad
create table codes (
  code text primary key,
  product_id text references products(id) on delete cascade,
  sold boolean not null default false,
  created_at timestamptz default now(),
  sold_at timestamptz,
  buyer_name text,
  buyer_email text
);

-- Tabla de pedidos
create table orders (
  id text primary key,
  buyer_name text not null,
  buyer_email text not null,
  items jsonb not null,
  total numeric not null,
  codes jsonb not null,
  created_at timestamptz default now()
);

-- Habilitar acceso público de lectura/escritura (anon key)
-- Nota: esto es permisivo para que la tienda funcione sin login de cliente.
-- Es razonable para esta etapa; lo endurecemos cuando conectemos pagos reales.
alter table products enable row level security;
alter table codes enable row level security;
alter table orders enable row level security;

create policy "public read products" on products for select using (true);
create policy "public write products" on products for all using (true) with check (true);

create policy "public read codes" on codes for select using (true);
create policy "public write codes" on codes for all using (true) with check (true);

create policy "public read orders" on orders for select using (true);
create policy "public write orders" on orders for all using (true) with check (true);

-- Productos iniciales (el catálogo que ya tenías)
insert into products (id, name, notes, description, price, stock, image) values
('p1', 'Ámbar Nocturno', 'Ámbar, vainilla, sándalo', 'Una fragancia envolvente para la noche. Cierra con un fondo cálido de vainilla y sándalo que permanece horas después del primer contacto.', 42000, 14, 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=800&q=80'),
('p2', 'Flor de Cedro', 'Cedro, jazmín, bergamota', 'Fresca y luminosa, con salida cítrica de bergamota y un corazón floral que se asienta sobre madera de cedro.', 38500, 9, 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=800&q=80'),
('p3', 'Cuero Salvaje', 'Cuero, pimienta negra, vetiver', 'Intensa y terrosa. Pimienta negra al frente, vetiver de fondo, y un acorde de cuero que da carácter sin gritar.', 47000, 6, 'https://images.unsplash.com/photo-1615634260167-c8cdede054de?w=800&q=80');
