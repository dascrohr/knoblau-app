-- Angebote aus legacy.f02_umzug (+ f02_umzug1 über ANGEBOTNR). Upsert auf legacy_rowid.
-- In der App geänderte Angebote (geaendert_von is not null) bleiben unberührt.

-- f02_umzug1 hat für 13 Nummern mehrere Zeilen. Befund: fast immer ist die ÄLTESTE Zeile die befüllte,
-- die späteren sind leer. Deshalb: die am stärksten befüllte Zeile, bei Gleichstand die höchste rowid.
drop table if exists imp_u1;
create temp table imp_u1 as
select distinct on (nr) x.*
from (
  select pg_temp.t(t.angebotnr) as nr, t.*,
         (select count(*) from jsonb_each_text(to_jsonb(t)) e
           where e.key ~ '^(nl|pack|maut_|quadrat)' and e.value is not null and e.value not in ('', '0')) as _fuell
  from legacy.f02_umzug1 t
  where pg_temp.t(t.angebotnr) is not null
) x
order by nr, _fuell desc, _rowid desc;
create unique index on imp_u1 (nr);
analyze imp_u1;

drop table if exists imp_angebote;
create temp table imp_angebote as
select
  u._rowid                                   as legacy_rowid,
  pg_temp.t(u.angebotnr)                     as angebotnr,
  coalesce(extract(year from pg_temp.d(u.angdatum))::int,
           case when pg_temp.t(u.angebotnr) ~ '^220\d{4}' then 2000 + substr(pg_temp.t(u.angebotnr), 4, 2)::int end) as jahr,
  pg_temp.d(u.angdatum)                      as angebotsdatum,
  pg_temp.t(u.status)                        as status,
  nullif(u.kundennr, 0)::int                 as kundennr,
  pg_temp.t(u.auftragnr)                     as auftragnr,
  pg_temp.d(u.auftrag_da)                    as auftragsdatum,
  pg_temp.t(u.sachbearb)                     as sachbearbeiter,
  pg_temp.t(u.akquisi)                       as akquisiteur,
  pg_temp.t(u.herkunft)                      as herkunft,
  pg_temp.t(u.bereich)                       as bereich,
  pg_temp.t(u.verkehrart)                    as umzugsart,
  pg_temp.t(u.wohnung)                       as wohnung_buero,
  pg_temp.t(u.telefon1)                      as telefon_auftraggeber,
  pg_temp.t(u.telefax1)                      as telefax,
  pg_temp.t(u.telefon2)                      as telefon_beladestelle,
  pg_temp.t(u.telefon3)                      as telefon_entladestelle,
  pg_temp.t(u.email)                         as email,
  pg_temp.d(u.besuchtag)                     as besichtigung_datum,
  pg_temp.t(u.besuchzeit)                    as besichtigung_zeit,
  pg_temp.t(u.besuch_art)                    as besichtigung_art,
  pg_temp.t(u.termin)                        as umzugstermin,
  pg_temp.t(u.b_ge_text) as b_etage, u.b_geschoss::numeric as b_geschosse, u.b_stufen::numeric as b_stufen,
  u.b_abtrage::numeric as b_tragweg, u1.quadratmet::numeric as b_wohnflaeche,
  pg_temp.b(u.b_aufzug::numeric) as b_aussenaufzug, pg_temp.b(u.b_hvz::numeric) as b_hvz, u.b_fahrstuh::numeric as b_aufzug,
  pg_temp.t(u.e_ge_text) as e_etage, u.e_geschoss::numeric as e_geschosse, u.e_stufen::numeric as e_stufen,
  u.e_abtrage::numeric as e_tragweg, u1.quadrat_es::numeric as e_wohnflaeche,
  pg_temp.b(u.e_aufzug::numeric) as e_aussenaufzug, pg_temp.b(u.e_hvz::numeric) as e_hvz, u.e_fahrstuh::numeric as e_aufzug,
  pg_temp.b(u.klavier::numeric) as klavier, u.klav_anz::numeric as klavier_anzahl, u.klav_ep::numeric as klavier_preis,
  pg_temp.b(u.fluegel::numeric) as fluegel, u.flue_anz::numeric as fluegel_anzahl, u.flue_ep::numeric as fluegel_preis,
  pg_temp.b(u.schwergut::numeric) as schwergut, u.schw_anz::numeric as schwergut_kilo, u.schw_ep::numeric as schwergut_preis,
  pg_temp.b(u.einzelfahr::numeric)           as einzelfahrt,
  pg_temp.t(u.zahlbeding)                    as zahlungsbedingung,
  u.volumen::numeric                         as volumen,
  pg_temp.t(u.voleinheit)                    as volumen_einheit,
  pg_temp.t(u.erm_angabe)                    as volumen_ermittlung,
  pg_temp.t(u.gestellt)                      as gestellt,
  pg_temp.t(u.gewicht::text)                 as gewicht,
  u.verswert::numeric                        as versicherungswert,
  u.zeitwert::numeric                        as zeitwert,
  u.t_promille::numeric                      as promille_zeitwert,
  u.promille::numeric                        as promille_neuwert,
  u.utv_neu::numeric                         as utv,
  u1.utv_wahl::numeric                       as utv_wahl,
  u.trspvers::numeric                        as versicherungsbetrag,
  u.v_steuer::numeric                        as versicherungssteuer,
  coalesce(pg_temp.t(u.waehrung), 'EUR')     as waehrung,
  pg_temp.t(u.waehrung2)                     as waehrung2,
  coalesce(u.mwst::numeric, 19)              as ust_satz,
  u.marge::numeric                           as generalrabatt,
  u.km::numeric                              as km,
  u.autobahnkm::numeric                      as autobahn_km,
  u.autobahnct::numeric                      as autobahn_ct,
  pg_temp.b(u.autobahnre::numeric)           as autobahn_doppelt,
  u.nettosum::numeric                        as netto_summe,
  pg_temp.b(u1.maut_inang::numeric)          as maut_in_angebot,
  pg_temp.b(u1.maut_dopp::numeric)           as maut_doppelt,
  pg_temp.b(u1.maut_in_fl::numeric)          as maut_in_freie_leistung,
  pg_temp.b(u1.maut_in_tl::numeric)          as maut_in_transport,
  u1.maut_anz::numeric                       as maut_anzahl,
  u1.maut_st::numeric                        as maut_einheiten,
  u1.maut_ep::numeric                        as maut_einzelpreis,
  pg_temp.t(u1.maut_text)                    as maut_text,
  u1.mautgesamt::numeric                     as maut_gesamt,
  pg_temp.t(u1.mautinhalt)                   as maut_inhalt,
  pg_temp.t(u1.maut_kfz)                     as maut_fahrzeug,
  u1.maut_eigk::numeric                      as maut_eigenkosten,
  u1.maut_proz::numeric                      as maut_aufschlag,
  pg_temp.b(u1.maut_anh::numeric)            as maut_anhaenger,
  pg_temp.t(u.zusatzvb)                      as vereinbarungen,
  pg_temp.t(u.info)                          as info,
  pg_temp.t(u.packarbeit)                    as packarbeit,
  pg_temp.t(u.spezmon)                       as handwerker,
  pg_temp.t(u.terminfrei)                    as termine_frei,
  pg_temp.t(u.textnetto)                     as text_netto,
  pg_temp.t(u.textbrutto)                    as text_brutto,
  pg_temp.t(u.bez_druck1) as ueberschrift1, pg_temp.t(u.bez_druck2) as ueberschrift2,
  pg_temp.t(u.bez_druck3) as ueberschrift3, pg_temp.t(u.bez_druck4) as ueberschrift4,
  pg_temp.t(u.ustid)                         as ustid,
  pg_temp.such(u.angebotnr,
    u.name1, u.vorname1, u.name11, u.name2, u.vorname2, u.name21, u.name3, u.vorname3, u.name31,
    u.name4, u.vorname4, u.name41, u.name5, u.vorname5, u.name51,
    u.ort1, u.ort2, u.ort3, u.ort4, u.ort5, u.plz1, u.plz2, u.plz3, u.plz4, u.plz5, u.strasse1) as suchtext
from legacy.f02_umzug u
left join imp_u1 u1 on u1.nr = pg_temp.t(u.angebotnr);

select pg_temp.upsert('app.angebote', 'imp_angebote', 'legacy_rowid', 'z.geaendert_von is null');

-- Arbeitsliste: importierte, in der App unveränderte Angebote (nur deren Kindzeilen werden neu geschrieben).
drop table if exists imp_ziel;
create temp table imp_ziel as
select a.id as angebot_id, a.legacy_rowid, a.angebotnr
from app.angebote a
where a.legacy_rowid is not null and a.geaendert_von is null;
create unique index on imp_ziel (legacy_rowid);
create unique index on imp_ziel (angebot_id);
analyze imp_ziel;

-- Angebotsnummer -> Angebot (bei doppelter Nummer das mit der niedrigsten rowid), für alle Verweise über ANGEBOTNR.
drop table if exists imp_nr;
create temp table imp_nr as
select distinct on (angebotnr) angebotnr, id as angebot_id, geaendert_von is null as frei
from app.angebote
where legacy_rowid is not null and angebotnr is not null
order by angebotnr, legacy_rowid;
create unique index on imp_nr (angebotnr);
analyze imp_nr;
