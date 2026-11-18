-- Filterwerte für die Angebotsliste (Jahre, Statuskürzel). Wiederholbar; nach jedem Import erneut ausführen.
delete from app.stamm_auswahl where liste in ('filter_jahr','filter_status');
insert into app.stamm_auswahl (liste, wert, sortierung)
  select 'filter_jahr', jahr::text, 0 from app.angebote where jahr is not null group by jahr;
insert into app.stamm_auswahl (liste, wert, sortierung)
  select 'filter_status', status, 0 from app.angebote where status is not null group by status having count(*) >= 3;
