-- Bearbeitungs-Übergabe, Speichern in einem Schritt, Entwurf, Einstellungen. Wiederholbar.

alter table app.angebote add column if not exists version integer not null default 1;
alter table app.angebote add column if not exists entwurf boolean not null default false;

-- Wer bearbeitet gerade welches Angebot? Eine Zeile je Angebot, läuft ohne Lebenszeichen von selbst ab.
create table if not exists app.angebot_sperren (
  angebot_id bigint primary key references app.angebote(id) on delete cascade,
  nutzer_id uuid not null,
  nutzer_name text,
  sitzung text not null,                 -- Zufallskennung des Browser-Fensters
  seit timestamptz not null default now(),
  zuletzt timestamptz not null default now(),   -- letztes Lebenszeichen
  angefragt_von uuid, angefragt_name text, angefragt_sitzung text, angefragt_am timestamptz
);
alter table app.angebot_sperren enable row level security;
revoke all on app.angebot_sperren from anon, authenticated;
grant select on app.angebot_sperren to authenticated;
grant all on app.angebot_sperren to service_role;
drop policy if exists lesen on app.angebot_sperren;
create policy lesen on app.angebot_sperren for select to authenticated using ((select app.ist_aktiv()));

-- Nach so vielen Sekunden ohne Lebenszeichen gilt die Bearbeitung als beendet.
create or replace function app.sperre_ablauf() returns interval language sql immutable as $$ select interval '60 seconds' $$;

/*
 Bearbeitung anfordern, halten, abgeben.
 p_modus:
   'holen'     – nehmen, wenn frei, abgelaufen oder schon meine
   'halten'    – Lebenszeichen; meldet, ob ich sie noch habe und ob jemand anfragt
   'anfragen'  – der aktuelle Bearbeiter wird gebeten, zu speichern und abzugeben
   'erzwingen' – sofort übernehmen (wenn der Bearbeiter nicht reagiert)
   'abgeben'   – freigeben
   'status'    – nur nachsehen
 Antwort: { habe, frei, nutzer_name, selber_nutzer, seit, anfrage_name, version }
*/
create or replace function app.sperre(p_angebot bigint, p_sitzung text, p_modus text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  s app.angebot_sperren%rowtype;
  ich uuid := (select auth.uid());
  mein_name text;
  v integer;
  aktiv boolean;
begin
  if not (select app.ist_aktiv()) then raise exception 'nicht angemeldet'; end if;
  select version into v from app.angebote where id = p_angebot;
  if v is null then return jsonb_build_object('habe', false, 'frei', false, 'fehlt', true); end if;
  select coalesce(nullif(name, ''), email) into mein_name from app.profile where id = ich;

  select * into s from app.angebot_sperren where angebot_id = p_angebot for update;
  aktiv := found and s.zuletzt > now() - app.sperre_ablauf();

  if p_modus = 'abgeben' then
    if found and s.sitzung = p_sitzung then delete from app.angebot_sperren where angebot_id = p_angebot; end if;
    return jsonb_build_object('habe', false, 'frei', true, 'version', v);
  end if;

  if p_modus = 'status' then
    return jsonb_build_object('habe', aktiv and s.sitzung = p_sitzung, 'frei', not aktiv, 'nutzer_name', case when aktiv then s.nutzer_name end,
      'selber_nutzer', aktiv and s.nutzer_id = ich, 'seit', case when aktiv then s.seit end, 'version', v);
  end if;

  if p_modus = 'halten' then
    if aktiv and s.sitzung = p_sitzung then
      update app.angebot_sperren set zuletzt = now() where angebot_id = p_angebot;
      return jsonb_build_object('habe', true, 'frei', false, 'version', v,
        'anfrage_name', case when s.angefragt_am > now() - interval '30 seconds' then s.angefragt_name end);
    elsif not aktiv then
      p_modus := 'holen';   -- abgelaufen (z. B. Rechner im Ruhezustand) und niemand sonst da: weiterarbeiten
    else
      return jsonb_build_object('habe', false, 'frei', false, 'nutzer_name', s.nutzer_name, 'selber_nutzer', s.nutzer_id = ich, 'seit', s.seit, 'version', v, 'uebernommen', true);
    end if;
  end if;

  if p_modus = 'anfragen' and aktiv and s.sitzung <> p_sitzung then
    update app.angebot_sperren set angefragt_von = ich, angefragt_name = mein_name, angefragt_sitzung = p_sitzung, angefragt_am = now() where angebot_id = p_angebot;
    return jsonb_build_object('habe', false, 'frei', false, 'nutzer_name', s.nutzer_name, 'selber_nutzer', s.nutzer_id = ich, 'seit', s.seit, 'version', v, 'angefragt', true);
  end if;

  if p_modus in ('holen', 'anfragen') and aktiv and s.sitzung <> p_sitzung then
    return jsonb_build_object('habe', false, 'frei', false, 'nutzer_name', s.nutzer_name, 'selber_nutzer', s.nutzer_id = ich, 'seit', s.seit, 'version', v);
  end if;

  -- frei, abgelaufen, schon meine oder erzwungen: Bearbeitung gehört jetzt mir
  insert into app.angebot_sperren (angebot_id, nutzer_id, nutzer_name, sitzung, seit, zuletzt)
    values (p_angebot, ich, mein_name, p_sitzung, now(), now())
  on conflict (angebot_id) do update set
    nutzer_id = excluded.nutzer_id, nutzer_name = excluded.nutzer_name,
    seit = case when app.angebot_sperren.sitzung = excluded.sitzung then app.angebot_sperren.seit else now() end,
    sitzung = excluded.sitzung, zuletzt = now(),
    angefragt_von = null, angefragt_name = null, angefragt_sitzung = null, angefragt_am = null;
  return jsonb_build_object('habe', true, 'frei', false, 'version', v);
end $$;
revoke execute on function app.sperre(bigint, text, text) from public, anon;
grant execute on function app.sperre(bigint, text, text) to authenticated, service_role;

/*
 Speichert ein Angebot mit Adressen, Positionen, Terminen und Checkliste in EINER Transaktion.
 p: { angebot: {spalte: wert, …}, adressen: {art: {…}}, positionen: […], termine: […], checkliste: […] } – fehlende Teile bleiben unverändert.
 p_version: Stand, den die Maske geladen hat (null = nicht prüfen). p_sitzung: Fenster-Kennung (null = keine).
 Antwort: { ok, version } oder { ok: false, grund: 'gesperrt' | 'veraltet' | 'fehlt', nutzer_name }
*/
create or replace function app.angebot_speichern(p_id bigint, p_sitzung text, p_version integer, p jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  v integer;
  s record;
  satz text;
  v_art text;
  wert jsonb;
begin
  select version into v from app.angebote where id = p_id for update;
  if v is null then return jsonb_build_object('ok', false, 'grund', 'fehlt'); end if;
  select nutzer_name, sitzung into s from app.angebot_sperren where angebot_id = p_id and zuletzt > now() - app.sperre_ablauf();
  if found and s.sitzung is distinct from p_sitzung then
    return jsonb_build_object('ok', false, 'grund', 'gesperrt', 'nutzer_name', s.nutzer_name);
  end if;
  if p_version is not null and p_version <> v then
    return jsonb_build_object('ok', false, 'grund', 'veraltet', 'version', v);
  end if;

  if jsonb_typeof(p->'angebot') = 'object' then
    select string_agg(format('%I = r.%I', k, k), ', ') into satz
      from jsonb_object_keys(p->'angebot') k
      where k in (select column_name::text from information_schema.columns where table_schema = 'app' and table_name = 'angebote')
        and k not in ('id', 'legacy_rowid', 'erstellt_am', 'geaendert_am', 'geaendert_von', 'version');
    if satz is not null then
      execute format('update app.angebote a set %s from jsonb_populate_record(null::app.angebote, $1) r where a.id = $2', satz) using p->'angebot', p_id;
    end if;
  end if;

  if jsonb_typeof(p->'adressen') = 'object' then
    for v_art, wert in select * from jsonb_each(p->'adressen') loop
      if v_art not in ('auftraggeber', 'beladestelle', 'entladestelle', 'zusatz1', 'zusatz2') or jsonb_typeof(wert) <> 'object' then continue; end if;
      insert into app.angebot_adressen (angebot_id, art) values (p_id, v_art) on conflict (angebot_id, art) do nothing;
      select string_agg(format('%I = r.%I', k, k), ', ') into satz
        from jsonb_object_keys(wert) k
        where k in ('bezeichnung', 'anrede', 'titel', 'vorname', 'name', 'name1', 'name2', 'zuhaenden', 'strasse', 'lkz', 'plz', 'ort', 'telefon');
      if satz is not null then
        execute format('update app.angebot_adressen a set %s from jsonb_populate_record(null::app.angebot_adressen, $1) r where a.angebot_id = $2 and a.art = $3', satz) using wert, p_id, v_art;
      end if;
    end loop;
  end if;

  if jsonb_typeof(p->'positionen') = 'array' then
    delete from app.angebot_positionen where angebot_id = p_id;
    insert into app.angebot_positionen (angebot_id, bereich, zeile, anzahl, text, einheiten, einzelpreis, prozent, art, beschreibung, ust, konto, kostenstelle, waehrung)
      select p_id, r.bereich, r.zeile, r.anzahl, r.text, r.einheiten, r.einzelpreis, r.prozent, r.art, r.beschreibung, r.ust, r.konto, r.kostenstelle, r.waehrung
      from jsonb_populate_recordset(null::app.angebot_positionen, p->'positionen') r
      where r.bereich is not null and r.zeile is not null;
  end if;

  if jsonb_typeof(p->'termine') = 'array' then
    delete from app.angebot_termine where angebot_id = p_id;
    insert into app.angebot_termine (angebot_id, zeile, text, datum, von, bis, gebucht)
      select p_id, r.zeile, r.text, r.datum, r.von, r.bis, coalesce(r.gebucht, false)
      from jsonb_populate_recordset(null::app.angebot_termine, p->'termine') r where r.zeile is not null;
  end if;

  if jsonb_typeof(p->'checkliste') = 'array' then
    delete from app.checklistenpunkte where angebot_id = p_id;
    insert into app.checklistenpunkte (angebot_id, zeile, aufgabe, erledigt, ignorieren, datentyp, wert, vorgaben, eintragen)
      select p_id, r.zeile, r.aufgabe, coalesce(r.erledigt, false), coalesce(r.ignorieren, false), r.datentyp, r.wert, r.vorgaben, coalesce(r.eintragen, false)
      from jsonb_populate_recordset(null::app.checklistenpunkte, p->'checkliste') r where r.zeile is not null;
  end if;

  update app.angebote set version = v + 1, geaendert_am = now(), geaendert_von = (select auth.uid()) where id = p_id;
  return jsonb_build_object('ok', true, 'version', v + 1);
end $$;
revoke execute on function app.angebot_speichern(bigint, text, integer, jsonb) from public, anon;
grant execute on function app.angebot_speichern(bigint, text, integer, jsonb) to authenticated, service_role;

-- Einstellungen (Firmenangaben für Briefkopf/Fußzeile, feste Texte). Lesen: alle aktiven Nutzer. Ändern: nur Admin.
create table if not exists app.einstellungen (
  schluessel text primary key,
  wert text,
  geaendert_am timestamptz not null default now()
);
alter table app.einstellungen enable row level security;
revoke all on app.einstellungen from anon;
revoke truncate, trigger, references on app.einstellungen from authenticated;
grant select, insert, update on app.einstellungen to authenticated;
drop policy if exists lesen on app.einstellungen;
create policy lesen on app.einstellungen for select to authenticated using ((select app.ist_aktiv()));
drop policy if exists anlegen on app.einstellungen;
create policy anlegen on app.einstellungen for insert to authenticated with check ((select app.ist_admin()));
drop policy if exists aendern on app.einstellungen;
create policy aendern on app.einstellungen for update to authenticated using ((select app.ist_admin())) with check ((select app.ist_admin()));

-- Kunden dürfen in der App bearbeitet werden; geaendert_am schützt sie vor dem nächsten Import.
notify pgrst, 'reload schema';
