-- Kunden. Firmenkunden aus f02_um_stamm ('F:'||KUNDENNR), Privatkunden aus den Auftraggeber-Adressen ('P:'||md5(schlüssel)).
-- Keine Bankdaten. Stammfelder eines Kunden werden nur überschrieben, solange er in der App nicht bearbeitet wurde
-- (geaendert_am = erstellt_am); Zähler und Zeitraum werden immer neu berechnet.

drop table if exists imp_firmen;
create temp table imp_firmen as
select
  'firma'::text as art, 'F:' || s.kundennr::bigint as legacy_key, s.kundennr::int as kundennr,
  pg_temp.t(s.anrede) as anrede, pg_temp.t(s.titel) as titel, pg_temp.t(s.vorname) as vorname,
  pg_temp.t(s.name1) as name, pg_temp.t(s.name2) as name1, pg_temp.t(s.name3) as name2, pg_temp.t(s.zuhaenden) as zuhaenden,
  pg_temp.t(s.strasse) as strasse, pg_temp.t(s.lkz) as lkz, pg_temp.t(s.plz) as plz, pg_temp.t(s.ort) as ort,
  pg_temp.t(s.telefon) as telefon, pg_temp.t(s.telefon2) as telefon2, pg_temp.t(s.telefon3) as mobil,
  pg_temp.t(s.telefax) as telefax, pg_temp.t(s.e_mail) as email, pg_temp.t(s.internet) as internet,
  pg_temp.t(s.ustid) as ustid, pg_temp.t(s.zahlbeding) as zahlungsbedingung, pg_temp.t(s.info) as info,
  pg_temp.d(s.erstmals) as erstmals, pg_temp.d(s.letzter) as letzter,
  s.umsatz::numeric as umsatz, s.umsatzvj::numeric as umsatz_vj,
  not pg_temp.b(s.ausblenden::numeric) as aktiv,
  pg_temp.such(s.name1, s.vorname, s.name2, s.name3, s.strasse, s.plz, s.ort, s.kundennr::bigint::text) as suchtext
from legacy.f02_um_stamm s
where s.kundennr > 0;
select pg_temp.upsert('app.kunden', 'imp_firmen', 'legacy_key', 'z.geaendert_am = z.erstellt_am');

-- Privatkunden: Schlüssel aus name|vorname|plz|strasse des Auftraggebers; Stammdaten aus dem neuesten Angebot.
drop table if exists imp_ag;
create temp table imp_ag as
select a.id as angebot_id, a.angebotsdatum, a.legacy_rowid, a.kundennr,
       a.telefon_auftraggeber, a.telefax, a.email,
       x.anrede, x.titel, x.vorname, x.name, x.name1, x.name2, x.zuhaenden, x.strasse, x.lkz, x.plz, x.ort,
       case when coalesce(x.name, x.vorname, x.name1) is not null
            then 'P:' || md5(pg_temp.norm(coalesce(x.name, x.name1)) || '|' || pg_temp.norm(x.vorname) || '|' || pg_temp.norm(x.plz) || '|' || pg_temp.norm(x.strasse)) end as legacy_key
from app.angebote a
join app.angebot_adressen x on x.angebot_id = a.id and x.art = 'auftraggeber'
where a.legacy_rowid is not null and a.geaendert_von is null
  and not exists (select 1 from app.kunden k where k.legacy_key = 'F:' || a.kundennr);

drop table if exists imp_privat;
create temp table imp_privat as
select distinct on (legacy_key)
  'privat'::text as art, legacy_key,
  anrede, titel, vorname, coalesce(name, name1) as name, case when name is not null then name1 end as name1, name2, zuhaenden,
  strasse, lkz, plz, ort,
  first_value(telefon_auftraggeber) over w_tel as telefon,
  telefax,
  first_value(email) over w_mail as email,
  pg_temp.such(name, vorname, name1, strasse, plz, ort) as suchtext
from imp_ag
where legacy_key is not null
window w_tel  as (partition by legacy_key order by (telefon_auftraggeber is null), angebotsdatum desc nulls last, legacy_rowid desc),
       w_mail as (partition by legacy_key order by (email is null), angebotsdatum desc nulls last, legacy_rowid desc)
order by legacy_key, angebotsdatum desc nulls last, legacy_rowid desc;
select pg_temp.upsert('app.kunden', 'imp_privat', 'legacy_key', 'z.geaendert_am = z.erstellt_am');

-- Angebote -> Kunde (nur importierte, unveränderte Angebote)
update app.angebote a set kunde_id = k.id
from app.kunden k
where a.legacy_rowid is not null and a.geaendert_von is null
  and k.legacy_key = 'F:' || a.kundennr
  and a.kunde_id is distinct from k.id;

update app.angebote a set kunde_id = k.id
from imp_ag g join app.kunden k on k.legacy_key = g.legacy_key
where a.id = g.angebot_id and a.kunde_id is distinct from k.id;

-- Rechnungen -> Kunde: Firmenkunde über KUNDENNR, sonst Kunde des Angebots, sonst gleicher Adressschlüssel
update app.rechnungen r set kunde_id = q.kunde_id
from (
  select r.id,
         coalesce(kf.id, a.kunde_id, kp.id) as kunde_id
  from app.rechnungen r
  left join app.kunden kf on kf.legacy_key = 'F:' || r.kundennr
  left join app.angebote a on a.id = r.angebot_id
  left join app.kunden kp on kp.legacy_key = 'P:' || md5(pg_temp.norm(coalesce(r.name, r.name1)) || '|' || pg_temp.norm(r.vorname) || '|' || pg_temp.norm(r.plz) || '|' || pg_temp.norm(r.strasse))
  where r.legacy_rowid is not null
) q
where q.id = r.id and r.kunde_id is distinct from q.kunde_id;

-- Zähler und Zeitraum aus den Angeboten (alle Angebote, auch in der App angelegte)
update app.kunden k set
  anzahl_angebote = coalesce(s.n, 0),
  erstmals = coalesce(s.erst, k.erstmals),
  letzter  = coalesce(s.letzt, k.letzter)
from app.kunden k2
left join (select kunde_id, count(*)::int n, min(angebotsdatum) erst, max(angebotsdatum) letzt from app.angebote where kunde_id is not null group by 1) s on s.kunde_id = k2.id
where k.id = k2.id and k.legacy_key is not null
  and (k.anzahl_angebote, k.erstmals, k.letzter) is distinct from (coalesce(s.n, 0), coalesce(s.erst, k.erstmals), coalesce(s.letzt, k.letzter));
