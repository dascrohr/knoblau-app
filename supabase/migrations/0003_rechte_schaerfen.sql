-- Rechte auch in der Datenbank nach Rolle trennen (nicht nur in der App). Wiederholbar.
-- lesen/anlegen/ändern: aktive Nutzer. Löschen von Angeboten, Kunden, Stammdaten: nur Admin.
-- Tabellen ohne Schreibfunktion in der App: nur lesen.
do $$
declare t text;
  nur_lesen text[] := array['rechnungen','rechnungspositionen','kasse','arbeitsscheine','arbeitsschein_positionen','halteverbotszonen','umzugsgut'];
  kind text[] := array['angebot_adressen','angebot_positionen','angebot_termine','checklistenpunkte']; -- werden beim Speichern eines Angebots ersetzt
begin
  for t in select tablename from pg_tables where schemaname = 'app' and tablename <> 'profile' loop
    execute format('drop policy if exists eingeloggt_alles on app.%I', t);
    execute format('drop policy if exists lesen on app.%I', t);
    execute format('drop policy if exists anlegen on app.%I', t);
    execute format('drop policy if exists aendern on app.%I', t);
    execute format('drop policy if exists loeschen on app.%I', t);
    execute format('create policy lesen on app.%I for select to authenticated using ((select app.ist_aktiv()))', t);
    execute format('revoke truncate, trigger, references on app.%I from authenticated', t);
    if t = any(nur_lesen) then
      execute format('revoke insert, update, delete on app.%I from authenticated', t);
    else
      execute format('create policy anlegen on app.%I for insert to authenticated with check ((select app.ist_aktiv()))', t);
      execute format('create policy aendern on app.%I for update to authenticated using ((select app.ist_aktiv())) with check ((select app.ist_aktiv()))', t);
      if t = any(kind) then
        execute format('create policy loeschen on app.%I for delete to authenticated using ((select app.ist_aktiv()))', t);
      else
        execute format('create policy loeschen on app.%I for delete to authenticated using ((select app.ist_admin()))', t);
      end if;
    end if;
  end loop;
end $$;
revoke truncate, trigger, references on app.profile from authenticated;
alter default privileges in schema app revoke truncate, trigger, references on tables from authenticated;
notify pgrst, 'reload schema';
