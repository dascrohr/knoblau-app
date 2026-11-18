-- Stammdaten. Nur neue Zeilen werden angelegt (on conflict do nothing): die Stammdaten werden in der App gepflegt,
-- ein wiederholter Import darf dortige Änderungen nicht zurückdrehen. legacy_key = '<quelle>:<rowid>'.

drop table if exists imp_s;
create temp table imp_s as
select 'nebleist:' || _rowid as legacy_key, pg_temp.t(such) as suchbegriff, coalesce(pg_temp.t(nltext1), '') as text, pg_temp.t(text) as beschreibung,
       nlan1::numeric as anzahl, nlst1::numeric as einheiten, nlep1::numeric as einzelpreis, nlmarge1::numeric as prozent,
       eigen_kost::numeric as eigenkosten, mwst::numeric as ust, pg_temp.t(konto) as konto, pg_temp.t(kostenstel) as kostenstelle,
       _rowid as sortierung
from legacy.stamm_nebleist;
select pg_temp.upsert('app.stamm_leistungen', 'imp_s', 'legacy_key', null, true);

drop table if exists imp_s;
create temp table imp_s as
select 'packmat:' || _rowid as legacy_key, pg_temp.t(such) as suchbegriff, coalesce(pg_temp.t(pack1), '') as text, pg_temp.t(text) as beschreibung,
       pg_temp.t(packart1) as art, packst1::numeric as einheiten, packep1::numeric as einzelpreis, packm1::numeric as prozent,
       einkauf::numeric as einkaufspreis, mwst::numeric as ust, pg_temp.t(konto) as konto, pg_temp.t(kostenstel) as kostenstelle,
       _rowid as sortierung
from legacy.stamm_packmat;
select pg_temp.upsert('app.stamm_packmaterial', 'imp_s', 'legacy_key', null, true);

drop table if exists imp_s;
create temp table imp_s as
select 'barcstam:' || _rowid as legacy_key, pg_temp.t(artnr) as artnr, coalesce(pg_temp.t(gegenstand), '') as gegenstand, pg_temp.t(zimmer) as zimmer,
       pg_temp.t(kennung) as kennung, pg_temp.t(kenntext) as kenntext, re::numeric as re, pg_temp.b(packmittel::numeric) as packmittel,
       montage::numeric as montage, demontage::numeric as demontage, einpacken::numeric as einpacken, auspacken::numeric as auspacken,
       einladen::numeric as einladen, ausladen::numeric as ausladen, _rowid as sortierung
from legacy.stamm_barcstam;
select pg_temp.upsert('app.stamm_umzugsgut', 'imp_s', 'legacy_key', null, true);

drop table if exists imp_s;
create temp table imp_s as
select 'zimmer:' || _rowid as legacy_key, pg_temp.t(kurz) as kurz, coalesce(pg_temp.t(zimmer), '') as zimmer, pg_temp.t(art) as art,
       pg_temp.b(button::numeric) as knopf, _rowid as sortierung
from legacy.stamm_zimmer;
select pg_temp.upsert('app.stamm_zimmer', 'imp_s', 'legacy_key', null, true);

drop table if exists imp_s;
create temp table imp_s as
select 'cl_vorlage:' || _rowid as legacy_key, coalesce(pg_temp.t(aufgabe), '') as aufgabe, pg_temp.t(datentyp) as datentyp, pg_temp.t(vorgaben) as vorgaben,
       pg_temp.b(eintragen::numeric) as eintragen, coalesce(rf::int, _rowid) as sortierung
from legacy.stamm_cl_vorlage;
select pg_temp.upsert('app.stamm_checkliste', 'imp_s', 'legacy_key', null, true);

-- Fahrzeuge (Quelle ist im Altbestand leer; Zuordnung vorbereitet)
drop table if exists imp_s;
create temp table imp_s as
select 'fahrzeug:' || _rowid as legacy_key, coalesce(pg_temp.t(kfzkenn), '') as kennzeichen, pg_temp.t(kfztype) as typ, pg_temp.t(fabrikat) as fabrikat,
       pg_temp.t(coalesce(info, kfzinfo)) as info, nutzlast::numeric as nutzlast, gesgewicht::numeric as gesamtgewicht, kfzmwm::numeric as ladevolumen,
       achsen::numeric as achsen, nlaenge::numeric as laenge, nbreite::numeric as breite, nhoehe::numeric as hoehe,
       kost_km1::numeric as kosten_km, kost_std1::numeric as kosten_stunde, kost_tag::numeric as kosten_tag, _rowid as sortierung
from legacy.stamm_fahrzeug;
select pg_temp.upsert('app.stamm_fahrzeuge', 'imp_s', 'legacy_key', null, true);

-- Textbausteine: stamm_texte ist leer; f02_ausdruck/stamm_ausdruck sind Druckformular-Verweise und stamm_buchtext
-- Buchungstexte je Umzugsgut – keine Textbausteine, daher nichts übernommen.

-- Auswahllisten (unique (liste, wert); vorhandene bleiben unverändert)
insert into app.stamm_auswahl (liste, wert, zusatz, sortierung)
select liste, wert, zusatz, sortierung from (
  select 'herkunft' as liste, pg_temp.t(herkunft) as wert, null::text as zusatz, min(_rowid)::int as sortierung
    from legacy.stamm_herkunft group by 2
  union all
  select 'umzugsart', pg_temp.t(umzugsart), max(pg_temp.t(art)), min(_rowid)::int
    from (select * from legacy.f02_umzugsart union all select * from legacy.stamm_umzugsart) u group by 2
  union all
  select 'mwst', trim_scale(s)::text, null, (row_number() over (order by s desc))::int
    from (select ust_satz as s from app.angebote where legacy_rowid is not null
          union select ust_satz from app.rechnungen where ust_satz is not null) m
  union all
  select l.liste, l.wert, null, (row_number() over (partition by l.liste order by l.n desc, l.wert))::int
    from (
      select v.liste, v.wert, count(*) as n
      from app.angebote a
      cross join lateral (values ('zahlungsbedingung', a.zahlungsbedingung), ('sachbearbeiter', a.sachbearbeiter),
                                 ('besichtigung_art', a.besichtigung_art), ('volumen_ermittlung', a.volumen_ermittlung)) v(liste, wert)
      where a.legacy_rowid is not null and v.wert is not null
      group by 1, 2 having count(*) >= 5
    ) l
) x
where wert is not null
on conflict (liste, wert) do nothing;
