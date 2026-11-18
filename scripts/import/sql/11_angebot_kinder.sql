-- Kindtabellen der importierten, unveränderten Angebote: löschen und neu schreiben.
delete from app.angebot_adressen  x using imp_ziel z where x.angebot_id = z.angebot_id;
delete from app.angebot_positionen x using imp_ziel z where x.angebot_id = z.angebot_id;
delete from app.angebot_termine   x using imp_ziel z where x.angebot_id = z.angebot_id;

-- Adressen: Suffix 1 Auftraggeber, 2 Beladestelle, 3 Entladestelle, 4/5 Zusatz. Nur wenn irgendein Feld befüllt ist.
insert into app.angebot_adressen (angebot_id, art, bezeichnung, anrede, titel, vorname, name, name1, name2, zuhaenden, strasse, lkz, plz, ort, telefon)
select z.angebot_id, v.art, v.bezeichnung, v.anrede, v.titel, v.vorname, v.name, v.name1, v.name2, v.zuhaenden, v.strasse, v.lkz, v.plz, v.ort, v.telefon
from legacy.f02_umzug u
join imp_ziel z on z.legacy_rowid = u._rowid
cross join lateral (
  select (array['auftraggeber','beladestelle','entladestelle','zusatz1','zusatz2'])[i] as art,
         pg_temp.t(j ->> ('bez_adr' || i))   as bezeichnung,
         pg_temp.t(j ->> ('anrede' || i))    as anrede,
         pg_temp.t(j ->> ('titel' || i))     as titel,
         pg_temp.t(j ->> ('vorname' || i))   as vorname,
         pg_temp.t(j ->> ('name' || i))      as name,
         pg_temp.t(j ->> ('name' || i || '1')) as name1,
         pg_temp.t(j ->> ('name' || i || '2')) as name2,
         pg_temp.t(j ->> ('zuhaenden' || i)) as zuhaenden,
         pg_temp.t(j ->> ('strasse' || i))   as strasse,
         pg_temp.t(j ->> ('lkz' || i))       as lkz,
         pg_temp.t(j ->> ('plz' || i))       as plz,
         pg_temp.t(j ->> ('ort' || i))       as ort,
         pg_temp.t(j ->> ('telefon' || i))   as telefon
  from (select to_jsonb(u) as j offset 0) q, generate_series(1, 5) i
) v
where coalesce(v.bezeichnung, v.anrede, v.titel, v.vorname, v.name, v.name1, v.name2, v.zuhaenden, v.strasse, v.lkz, v.plz, v.ort, v.telefon) is not null;

-- Positionen aus f02_umzug: Beladen 1..4, Befördern 0..4, Entladen 1..4
insert into app.angebot_positionen (angebot_id, bereich, zeile, anzahl, text, einheiten, einzelpreis, prozent)
select z.angebot_id, v.bereich, v.zeile, v.anzahl, v.text, v.einheiten, v.einzelpreis, v.prozent
from legacy.f02_umzug u
join imp_ziel z on z.legacy_rowid = u._rowid
cross join lateral (
  select g.bereich, i as zeile,
         (j ->> (g.p || '_an' || i))::numeric as anzahl,
         pg_temp.t(j ->> (g.ptext || i))      as text,
         (j ->> (g.p || '_st' || i))::numeric as einheiten,
         (j ->> (g.p || '_ep' || i))::numeric as einzelpreis,
         (j ->> (g.p || '_m' || i))::numeric  as prozent
  from (select to_jsonb(u) as j offset 0) q,
       (values ('beladen', 'bela', 'bela_text', 1), ('befoerdern', 'bef', 'bef_text', 0), ('entladen', 'entla', 'entla_tex', 1)) g(bereich, p, ptext, ab),
       generate_series(g.ab, 4) i
) v
where v.text is not null or coalesce(v.einzelpreis, 0) <> 0 or coalesce(v.anzahl, 0) <> 0 or coalesce(v.einheiten, 0) <> 0;

-- Positionen aus f02_umzug1: Nebenleistungen 1..15 und Packmaterial 1..15
-- Packmaterial: PACKST (Stück) liegt in einheiten, anzahl bleibt leer -> Formel 1 × einheiten × einzelpreis.
insert into app.angebot_positionen (angebot_id, bereich, zeile, anzahl, text, einheiten, einzelpreis, prozent, art)
select z.angebot_id, v.bereich, v.zeile, v.anzahl, v.text, v.einheiten, v.einzelpreis, v.prozent, v.art
from imp_ziel z
join imp_u1 u1 on u1.nr = z.angebotnr
cross join lateral (
  select 'nebenleistung' as bereich, i as zeile,
         (j ->> ('nlan' || i))::numeric as anzahl, pg_temp.t(j ->> ('nltext' || i)) as text,
         (j ->> ('nlst' || i))::numeric as einheiten, (j ->> ('nlep' || i))::numeric as einzelpreis,
         (j ->> ('nlmarge' || i))::numeric as prozent, null::text as art
  from (select to_jsonb(u1) as j offset 0) q, generate_series(1, 15) i
  union all
  select 'packmaterial', i,
         null::numeric, pg_temp.t(j ->> ('pack' || i)),
         (j ->> ('packst' || i))::numeric, (j ->> ('packep' || i))::numeric,
         (j ->> ('packm' || i))::numeric, pg_temp.t(j ->> ('packart' || i))
  from (select to_jsonb(u1) as j offset 0) q, generate_series(1, 15) i
) v
where v.text is not null or coalesce(v.einzelpreis, 0) <> 0 or coalesce(v.anzahl, 0) <> 0 or coalesce(v.einheiten, 0) <> 0;

-- Freie Leistungen aus f02_um_frei
insert into app.angebot_positionen (angebot_id, bereich, zeile, anzahl, text, einheiten, einzelpreis, prozent, beschreibung, ust, konto, kostenstelle, waehrung)
select n.angebot_id, 'frei',
       row_number() over (partition by n.angebot_id order by f.rf, f._rowid)::int,
       f.anzahl::numeric, pg_temp.t(f.text), f.stueck::numeric, f.ep::numeric, f.marge::numeric,
       pg_temp.t(f.leistung), f.mwst::numeric, pg_temp.t(f.konto), pg_temp.t(f.kostenstel), pg_temp.t(f.waehrung)
from legacy.f02_um_frei f
join imp_nr n on n.angebotnr = pg_temp.t(f.angebotnr) and n.frei;

-- Termine 1..10, nur befüllte
insert into app.angebot_termine (angebot_id, zeile, text, datum, von, bis, gebucht)
select z.angebot_id, v.zeile, v.text, v.datum, v.von, v.bis, v.gebucht
from legacy.f02_umzug u
join imp_ziel z on z.legacy_rowid = u._rowid
cross join lateral (
  select i as zeile,
         pg_temp.t(j ->> ('termin' || i)) as text,
         pg_temp.d(j ->> ('tdat' || i))   as datum,
         case when (j ->> ('termin' || i || '_v')) ~ '\d' then pg_temp.t(j ->> ('termin' || i || '_v')) end as von,
         case when (j ->> ('termin' || i || '_b')) ~ '\d' then pg_temp.t(j ->> ('termin' || i || '_b')) end as bis,
         coalesce((j ->> ('termin' || i || '_g'))::numeric, 0) <> 0 as gebucht
  from (select to_jsonb(u) as j offset 0) q, generate_series(1, 10) i
) v
where v.text is not null or v.datum is not null or v.von is not null or v.bis is not null;

-- Checkliste
delete from app.checklistenpunkte x using imp_ziel z where x.angebot_id = z.angebot_id;
insert into app.checklistenpunkte (angebot_id, zeile, aufgabe, erledigt, ignorieren, datentyp, wert, vorgaben, eintragen)
select n.angebot_id,
       row_number() over (partition by n.angebot_id order by c.rf, c._rowid)::int,
       pg_temp.t(c.aufgabe), pg_temp.b(c.erledigt::numeric), pg_temp.b(c.ignorieren::numeric),
       pg_temp.t(c.datentyp), pg_temp.t(c.textwert), pg_temp.t(c.vorgaben), pg_temp.b(c.eintragen::numeric)
from legacy.f02_checklist c
join imp_nr n on n.angebotnr = pg_temp.t(c.angebotnr) and n.frei;

-- Umzugsgut (Inventar je Angebot), Upsert auf legacy_rowid
drop table if exists imp_gut;
create temp table imp_gut as
select g._rowid as legacy_rowid, n.angebot_id,
       pg_temp.t(g.artnr) as artnr, pg_temp.t(g.beladestel) as beladestelle, pg_temp.t(g.etage) as etage, pg_temp.t(g.zimmer) as zimmer,
       pg_temp.t(g.organisat) as organisation, pg_temp.t(g.mitarbeit) as mitarbeiter,
       g.anzahl::numeric as anzahl, pg_temp.t(g.gegenstand) as gegenstand, pg_temp.t(g.besonderes) as besonderes, pg_temp.t(g.zusatz) as zusatz,
       g.re::numeric as re, g.reinheit::numeric as raumeinheit, pg_temp.b(g.packmittel::numeric) as packmittel,
       g.montage::numeric as montage, g.demontage::numeric as demontage, g.einpacken::numeric as einpacken, g.auspacken::numeric as auspacken,
       g.einladen::numeric as einladen, g.ausladen::numeric as ausladen,
       pg_temp.t(g.ent_stelle) as entladestelle, pg_temp.t(g.ent_stock) as entlade_etage, pg_temp.t(g.ent_zimmer) as entlade_zimmer
from legacy.f02_barcode2 g
join imp_nr n on n.angebotnr = pg_temp.t(g.angebotnr) and n.frei;
select pg_temp.upsert('app.umzugsgut', 'imp_gut', 'legacy_rowid');
