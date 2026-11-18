-- Arbeitsscheine: f02_arbeit (Kopf) + f02_arbeit1 (Einsatzdaten) über ANGEBOTNR + ARBNR
drop table if exists imp_arbeit;
create temp table imp_arbeit as
select
  a._rowid as legacy_rowid, n.angebot_id,
  pg_temp.t(a.angebotnr) as angebotnr, pg_temp.t(a.arbnr) as arbnr, pg_temp.t(a.art) as art,
  pg_temp.d(a.arbdatum) as datum, pg_temp.t(a.arbuhrzeit) as uhrzeit,
  pg_temp.d(a.arbdatum2) as datum_bis, pg_temp.t(a.arbuhrzei2) as uhrzeit_bis,
  pg_temp.t(a.status) as status, pg_temp.t(a.personal) as personal, pg_temp.t(a.fahrzeug) as fahrzeug,
  pg_temp.t(a.mat_verbr) as material, pg_temp.t(a.sonst) as sonstiges, pg_temp.t(a.anlage) as anlage,
  pg_temp.t(a.name1) as name1, pg_temp.t(a.name2) as name2, pg_temp.t(a.strasse) as strasse,
  pg_temp.t(a.plz) as plz, pg_temp.t(a.ort) as ort, pg_temp.t(a.telefon) as telefon,
  b.volumen::numeric as volumen, b.kilometer::numeric as kilometer, b.lkw_anz::numeric as lkw_anzahl,
  b.fahrer::numeric as fahrer, b.traeger::numeric as traeger, b.packer::numeric as packer, b.schreiner::numeric as schreiner,
  pg_temp.t(b.sonst_per) as sonstiges_personal,
  pg_temp.t(b.lkw_kz1) as lkw1, pg_temp.t(b.lkw_kz2) as lkw2, pg_temp.t(b.lkw_kz3) as lkw3
from legacy.f02_arbeit a
left join imp_nr n on n.angebotnr = pg_temp.t(a.angebotnr)
left join lateral (
  select * from legacy.f02_arbeit1 b
  where pg_temp.t(b.angebotnr) = pg_temp.t(a.angebotnr) and pg_temp.t(b.arbnr) is not distinct from pg_temp.t(a.arbnr)
  order by b._rowid limit 1
) b on true;
select pg_temp.upsert('app.arbeitsscheine', 'imp_arbeit', 'legacy_rowid');

drop table if exists imp_arbnr;
create temp table imp_arbnr as
select distinct on (angebotnr, arbnr) angebotnr, arbnr, id as arbeitsschein_id
from app.arbeitsscheine where legacy_rowid is not null
order by angebotnr, arbnr, legacy_rowid;

drop table if exists imp_arbpos;
create temp table imp_arbpos as
select
  p._rowid as legacy_rowid, s.arbeitsschein_id,
  pg_temp.t(p.angebotnr) as angebotnr, pg_temp.t(p.arbnr) as arbnr, p.rf::numeric as zeile,
  p.anzahl::numeric as anzahl, pg_temp.t(p.text) as text, p.stueck::numeric as einheiten, p.ep::numeric as einzelpreis,
  p.marge::numeric as prozent, p.mwst::numeric as ust, p.summe::numeric as summe, pg_temp.t(p.leistung) as leistung
from legacy.f02_arbeit2 p
left join imp_arbnr s on s.angebotnr = pg_temp.t(p.angebotnr) and s.arbnr is not distinct from pg_temp.t(p.arbnr);
select pg_temp.upsert('app.arbeitsschein_positionen', 'imp_arbpos', 'legacy_rowid');

-- Kasse (f02_kasse = laufendes Kassenbuch)
drop table if exists imp_kasse;
create temp table imp_kasse as
select k._rowid as legacy_rowid, pg_temp.t(k.jjmm) as periode, k.beleg::numeric as beleg, pg_temp.d(k.datum) as datum,
       k.eingang::numeric as eingang, k.ausgang::numeric as ausgang, pg_temp.t(k.text) as text, pg_temp.t(k.longtext) as langtext,
       pg_temp.t(k.konto) as konto, pg_temp.t(k.kostenstel) as kostenstelle, k.mwst::numeric as ust,
       pg_temp.t(k.auftragnr) as auftragnr, pg_temp.b(k.gebucht::numeric) as gebucht
from legacy.f02_kasse k;
select pg_temp.upsert('app.kasse', 'imp_kasse', 'legacy_rowid');

-- Halteverbotszonen
drop table if exists imp_hvz;
create temp table imp_hvz as
select h._rowid as legacy_rowid, n.angebot_id,
       pg_temp.t(h.angebotnr) as angebotnr, pg_temp.t(h.auftragnr) as auftragnr, pg_temp.t(h.adressart) as adressart,
       pg_temp.t(h.strasse) as strasse, pg_temp.t(h.plz) as plz, pg_temp.t(h.ort) as ort,
       h.laenge::numeric as laenge, pg_temp.d(h.von_dat) as von_datum, pg_temp.d(h.bis_dat) as bis_datum,
       pg_temp.t(h.von_uhr) as von_uhr, pg_temp.t(h.bis_uhr) as bis_uhr,
       pg_temp.t(h.anfragedat) as anfrage_datum, pg_temp.t(h.gueltigbis) as gueltig_bis, pg_temp.t(h.anfrageerg) as anfrage_ergebnis,
       pg_temp.t(h.buchdat) as buchung_datum, pg_temp.t(h.buchergeb) as buchung_ergebnis, pg_temp.t(h.order_id) as order_id
from legacy.f02_platzda h
left join imp_nr n on n.angebotnr = pg_temp.t(h.angebotnr);
select pg_temp.upsert('app.halteverbotszonen', 'imp_hvz', 'legacy_rowid');
