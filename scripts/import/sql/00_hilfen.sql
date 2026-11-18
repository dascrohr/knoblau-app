-- Hilfsfunktionen für den Import (nur für die Dauer der Verbindung, Schema pg_temp).
create or replace function pg_temp.t(x text) returns text language sql immutable as
$$ select nullif(btrim(x, E' \t\r\n'), '') $$;

-- ISO-Datum; leere oder ungültige Werte -> null
create or replace function pg_temp.d(x text) returns date language plpgsql immutable as $$
declare r date;
begin
  if x is null or x !~ '^\s*\d{4}-\d{2}-\d{2}' then return null; end if;
  begin r := substr(btrim(x), 1, 10)::date; exception when others then return null; end;
  if r < date '1950-01-01' or r > date '2100-12-31' then return null; end if;
  return r;
end $$;

create or replace function pg_temp.b(x numeric) returns boolean language sql immutable as
$$ select coalesce(x, 0) <> 0 $$;

create or replace function pg_temp.n(x text) returns numeric language plpgsql immutable as $$
begin
  if x is null or btrim(x) = '' then return null; end if;
  return replace(btrim(x), ',', '.')::numeric;
exception when others then return null;
end $$;

-- Suchtext: Teile kleingeschrieben, mit Leerzeichen verbunden
create or replace function pg_temp.such(variadic teile text[]) returns text language sql immutable as
$$ select nullif(lower(regexp_replace(btrim(array_to_string(teile, ' ')), '\s+', ' ', 'g')), '') $$;

-- Normalisierung für den Kundenschlüssel
create or replace function pg_temp.norm(x text) returns text language sql immutable as
$$ select lower(regexp_replace(btrim(coalesce(x, ''), E' \t\r\n'), '\s+', ' ', 'g')) $$;

-- Upsert einer Temp-Tabelle (Spaltennamen = Zielspalten) in eine Zieltabelle.
-- bedingung: optionale WHERE-Bedingung für das Update (Alias z = Zielzeile), z. B. 'z.geaendert_von is null'.
-- nur_neu: true = vorhandene Zeilen nicht überschreiben (in der App gepflegte Stammdaten).
create or replace function pg_temp.upsert(ziel text, quelle text, schluessel text, bedingung text default null, nur_neu boolean default false)
returns bigint language plpgsql as $$
declare spalten text; setzen text; alt text; neu text; n bigint;
begin
  select string_agg(quote_ident(attname), ', ' order by attnum),
         string_agg(quote_ident(attname) || ' = excluded.' || quote_ident(attname), ', ' order by attnum) filter (where attname <> schluessel),
         string_agg('z.' || quote_ident(attname), ', ' order by attnum) filter (where attname <> schluessel),
         string_agg('excluded.' || quote_ident(attname), ', ' order by attnum) filter (where attname <> schluessel)
    into spalten, setzen, alt, neu
    from pg_attribute where attrelid = ('pg_temp.' || quelle)::regclass and attnum > 0 and not attisdropped;
  -- Nur tatsächlich geänderte Zeilen schreiben (sonst erzeugt jeder Lauf tote Zeilen und bläht die Tabelle auf).
  execute format('insert into %s as z (%s) select %s from pg_temp.%I on conflict (%I) do %s',
    ziel, spalten, spalten, quelle, schluessel,
    case when nur_neu then 'nothing'
         else 'update set ' || setzen || ' where (' || alt || ') is distinct from (' || neu || ')' || coalesce(' and (' || bedingung || ')', '') end);
  get diagnostics n = row_count;
  return n;
end $$;
