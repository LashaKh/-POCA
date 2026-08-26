grant select on public.published_currency_settings,
  public.published_market_settings, public.published_promotions,
  public.published_delivery_options to service_role;

comment on view public.published_currency_settings is
  'Published currency projection is readable by public clients and trusted server-side storefront rendering.';
