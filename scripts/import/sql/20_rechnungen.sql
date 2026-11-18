-- Rechnungen (nur lesend in der App) und Rechnungspositionen. Upsert auf legacy_rowid.
drop table if exists imp_rechnungen;
create temp table imp_rechnungen as
select
  r._rowid as legacy_rowid,
  pg_temp.t(r.rechnungnr) as rechnungnr, pg_temp.t(r.angebotnr) as angebotnr,
  n.angebot_id,
  pg_temp.t(r.auftragnr) as auftragnr, nullif(r.kundennr, 0)::int as kundennr,
  pg_temp.d(r.rechdat) as rechnungsdatum, extract(year from pg_temp.d(r.rechdat))::int as jahr,
  coalesce(pg_temp.t(r.leistdatum), pg_temp.t(r.leistmonat)) as leistungsdatum,
  pg_temp.d(r.faellig) as faellig,
  pg_temp.t(r.anrede) as anrede, pg_temp.t(r.titel) as titel, pg_temp.t(r.vorname) as vorname, pg_temp.t(r.name) as name,
  pg_temp.t(r.name1) as name1, pg_temp.t(r.name2) as name2, pg_temp.t(r.zuhaenden) as zuhaenden,
  pg_temp.t(r.strasse) as strasse, pg_temp.t(r.lkz) as lkz, pg_temp.t(r.plz) as plz, pg_temp.t(r.ort) as ort,
  pg_temp.t(r.betreff1) as betreff1, pg_temp.t(r.betreff2) as betreff2, pg_temp.t(r.betr_text) as betreff_text, pg_temp.t(r.endetext) as endetext,
  pg_temp.t(r.zahlbeding) as zahlungsbedingung,
  r.marge::numeric as generalrabatt, r.mwst::numeric as ust_satz,
  r.netto::numeric as netto, r.gessumme::numeric as gesamtsumme, r.aconto::numeric as aconto, pg_temp.d(r.aconto_dat) as aconto_datum,
  pg_temp.b(r.gebucht::numeric) as gebucht,
  pg_temp.t(r.sachbearb) as sachbearbeiter, pg_temp.t(r.akquisi) as akquisiteur, pg_temp.t(r.herkunft) as herkunft,
  pg_temp.t(r.waehrung) as waehrung, pg_temp.t(r.ustid) as ustid, pg_temp.t(r.email) as email,
  pg_temp.such(r.rechnungnr, r.angebotnr, r.name, r.vorname, r.name1, r.name2, r.ort, r.plz, r.strasse) as suchtext
from legacy.f02_rechnung r
left join imp_nr n on n.angebotnr = pg_temp.t(r.angebotnr);
select pg_temp.upsert('app.rechnungen', 'imp_rechnungen', 'legacy_rowid');

-- Rechnungsnummer -> erste Rechnung mit dieser Nummer (eine Nummer kommt doppelt vor)
drop table if exists imp_rnr;
create temp table imp_rnr as
select distinct on (rechnungnr) rechnungnr, id as rechnung_id
from app.rechnungen where legacy_rowid is not null and rechnungnr is not null
order by rechnungnr, legacy_rowid;
create unique index on imp_rnr (rechnungnr);

drop table if exists imp_repos;
create temp table imp_repos as
select
  p._rowid as legacy_rowid,
  n.rechnung_id,                           -- null bei 88 verwaisten Positionen (Rechnung existiert nicht mehr)
  pg_temp.t(p.rechnungnr) as rechnungnr,
  pg_temp.n(p.rf::text)::int as zeile,
  pg_temp.t(p.l_dat) as leistungsdatum,
  p.anzahl::numeric as anzahl, pg_temp.t(p.text) as text, p.st::numeric as einheiten, p.ep::numeric as einzelpreis,
  p.marge::numeric as prozent, p.mwst::numeric as ust, p.nettosum::numeric as netto,
  pg_temp.t(p.konto) as konto, pg_temp.t(p.kostenstel) as kostenstelle, pg_temp.t(p.inhalt) as inhalt
from legacy.f02_rechnun1 p
left join imp_rnr n on n.rechnungnr = pg_temp.t(p.rechnungnr);
select pg_temp.upsert('app.rechnungspositionen', 'imp_repos', 'legacy_rowid');
