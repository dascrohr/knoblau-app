-- Kennwörter, Bankdaten und Schlüssel gehören nicht in die Cloud-Kopie, auch nicht in legacy.
-- Leert alle betroffenen Spalten (die Quelle in der SQLite-Datei bleibt unverändert). Wiederholbar.
do $$
declare c record;
begin
  for c in
    select table_name, column_name from information_schema.columns
    where table_schema = 'legacy'
      and (column_name ~* '(passw|kennw|pwd|iban|swift|token|apikey|api_key|secret)'
        or column_name ~* '^(bank[0-9]*|blz[0-9]*|bic[0-9]*|key)$'
        or (table_name in ('stamm_um_init','f02_um_init') and column_name ~* '^konto[0-9]+$'))
  loop
    execute format('update legacy.%I set %I = null where %I is not null', c.table_name, c.column_name, c.column_name);
  end loop;
end $$;
