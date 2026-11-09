# Fly Club Scoring

Next.js + Supabase, deployed on Vercel. Admin-only editing; everyone can view results.

## Setup

1. Create a Supabase project and run `schema.sql` in the SQL editor.
2. In Supabase > Authentication > Users, add your admin user(s) with email and password.
   In Authentication > Providers > Email, turn off "Allow new users to sign up" so only users you add can sign in.
3. Copy `.env.example` to `.env.local` and fill in the project URL and anon key
   (Supabase > Project Settings > API).
4. `npm install` then `npm run dev` to try it locally.
5. Push to GitHub, import the repo in Vercel, and add the same two environment variables.

## Scoring

- Each shooter shoots five cards. Every card has its own score, group and flys, entered per card.
- Totals (score, group, flys) are the sum across the five cards, calculated by the database.
- Event results rank by total score, then total flys.
- Seasons (yearly championships) are defined by a start and end date, e.g. 01/11/2025 to 30/10/2026. Add them on the Season page while signed in; seasons cannot overlap. An event counts toward the season whose dates contain the event date.
- Season ranking ranks by total flys, then total score.
- Bays are 1A to 10B. Each event can have any number of details; a bay can be used once per detail.

## Importing existing results

1. Add the season first (Season page > Add season), so events fall inside its dates.
2. Run `import/import.sql` once in the Supabase SQL editor.
3. Fill in `import/results-template.csv`: one row per shooter per event, dates as YYYY-MM-DD,
   bays 1A to 10B, and a score, group and flys for each of the five cards
   (c1_score, c1_group, c1_flys ... c5_flys). Do not include totals; they are calculated.
   `import/results-example.csv` shows the format.
4. In Supabase: Table Editor > `import_results` > Insert > Import data from CSV.
5. In the SQL editor run `select process_import();`. It creates any missing members and events,
   saves the scores and empties the staging table. If any row has a problem (for example an
   invalid bay) nothing is saved and the error says what is wrong.

Names are matched ignoring case, so keep spelling consistent. Re-importing the same shooter and
event updates the scores rather than duplicating them.
