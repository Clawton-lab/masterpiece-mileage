-- =====================================================
-- MASTERPIECE MILEAGE — IMPORT REAL DATA
-- Paste into Supabase SQL Editor → Run
-- =====================================================

-- First, remove the sample projects that came with the inventory app
-- (keeps only real ones)
delete from projects where name in ('Henderson Patio Remodel', 'Thompson Outdoor Kitchen', 'Ramirez Fire Pit & Pergola', 'Yard Stock (No Project)');

-- IMPORT REAL PROJECTS
insert into projects (name, address) values
  ('Office', '864 W Happy Canyon, Castle Pines, CO 80108'),
  ('Anderson', '1265 Silver Rock Ln, Golden, CO 80439'),
  ('Cohen/Long', '13185 Twin Elk Ln, Littleton, CO 80127'),
  ('Cummings', '402 De France Dr, Golden, CO 80401'),
  ('Green', '7537 S Settlers Dr, Morrison, CO 80465'),
  ('Hogg', '2510 Juniper Ct, Golden, CO 80401'),
  ('Labrie', '15099 County Rd 350, Buena Vista, CO 81211'),
  ('Lauro', '2912 Elk Summit Ln, Evergreen, CO 80439'),
  ('McGuire', '2481 Hawken Dr, Castle Rock, CO 80109'),
  ('Murr', '13034 Molly Dr, Conifer, CO 80433'),
  ('North', '20664 Seminole Rd, Indian Hills, CO 80454'),
  ('Boodge Stain Co', '1729 Valtec Ln I, Boulder, CO 80301, USA'),
  ('Adams Lumber', '6720 S Jordan Rd, Englewood, CO 80112, USA'),
  ('Denver Rail', '3803 Headlight Rd, Strasburg, CO 80136, USA'),
  ('Home Depot Castle Rock', '333 W Allen St c, Castle Rock, CO 80108, USA'),
  ('Burkgren', '6163 Willowbrook Dr, Morrison, CO 80465, USA');

-- IMPORT TRIP HISTORY
-- Using subqueries to look up project IDs by name
insert into trips (user_id, user_name, from_project_id, from_project_name, from_address, to_project_id, to_project_name, to_address, miles, irs_rate, reimbursement, trip_date, status)
select
  yu.id, 'Stephen Morton',
  fp.id, fp.name, fp.address,
  tp.id, tp.name, tp.address,
  t.miles, 0.70, round(t.miles * 0.70, 2), t.trip_date, 'logged'
from (values
  ('Office', 'Cummings', 34, '2026-04-02'::date),
  ('Cummings', 'McGuire', 47, '2026-04-02'::date),
  ('Cummings', 'Office', 34, '2026-04-03'::date),
  ('Cummings', 'North', 14, '2026-04-03'::date),
  ('North', 'Office', 30, '2026-04-03'::date),
  ('Office', 'Cummings', 34, '2026-04-06'::date),
  ('Cummings', 'Cohen/Long', 18, '2026-04-06'::date),
  ('Cohen/Long', 'Office', 22, '2026-04-06'::date),
  ('Office', 'North', 31, '2026-04-07'::date),
  ('North', 'Office', 30, '2026-04-07'::date),
  ('Office', 'North', 31, '2026-04-09'::date),
  ('North', 'Cummings', 14, '2026-04-09'::date),
  ('Cummings', 'Office', 34, '2026-04-09'::date)
) as t(from_name, to_name, miles, trip_date)
join yard_users yu on yu.email = 'sbmorton5@gmail.com'
join projects fp on fp.name = t.from_name
join projects tp on tp.name = t.to_name;
