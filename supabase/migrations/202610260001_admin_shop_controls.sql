-- Fields maintained through the private Printify admin controls.
alter table public.shops
  add column if not exists color_price_per_page_paise integer not null default 1000
    check (color_price_per_page_paise > 0),
  add column if not exists contact_phone text,
  add column if not exists opening_hours text;

comment on column public.shops.color_price_per_page_paise is
  'Colour printing price per page, in paise.';
