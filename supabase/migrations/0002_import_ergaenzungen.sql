-- Ergänzungen für den Altdaten-Import. Idempotent, rein additiv bzw. lockernd.
-- 88 Rechnungspositionen des Altbestands gehören zu Rechnungen, die es nicht mehr gibt
-- (Rechnungsnummern 1..50 und einzelne gelöschte). Damit alle 36.753 Positionen übernommen
-- werden können, darf rechnung_id leer sein. Die Nummer der verwaisten Position bleibt in rechnungnr erhalten.
alter table app.rechnungspositionen alter column rechnung_id drop not null;
alter table app.rechnungspositionen add column if not exists rechnungnr text;
create index if not exists rechnungspositionen_nr_idx on app.rechnungspositionen (rechnungnr);
