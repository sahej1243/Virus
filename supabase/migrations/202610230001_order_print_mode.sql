-- Preserve each student's black-and-white or colour choice with the order.
alter table public.orders
  add column print_mode text not null default 'bw'
    check (print_mode in ('bw', 'color'));

comment on column public.orders.print_mode is
  'Student-selected print mode. Colour pages use the colour price captured in unit_price_paise.';
