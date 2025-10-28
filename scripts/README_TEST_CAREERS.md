Test Supabase careers table

Purpose
- Quick Node.js script to verify the `person_careers` (or configured) table is reachable via the Supabase REST API and to sample returned rows.

Run
- From the project root run:

```
node scripts/test_supabase_careers.js
```

What the script does
- Reads `config/supabase.js` (looks for `window.SUPABASE_URL` and `window.SUPABASE_ANON_KEY`).
- Uses `window.SUPABASE_CAREERS_TABLE` if present, otherwise defaults to `person_careers`.
- Calls the Supabase REST `GET /rest/v1/<table>?select=*&limit=50` with the anon key in `apikey` and `Authorization` header.
- Prints the number of rows and a sample of up to 5 rows.

Interpreting results
- "Returned rows: N" with N>0 → careers table is accessible and contains data.
- "Returned rows: 0" → table returned an empty array. Possible causes:
  - The table is empty.
  - The table lives in a different schema or has a different name.
  - Row Level Security (RLS) or other permission prevents the anon key from reading rows.
  - The anon key is invalid/expired.
- Non-2xx responses (401/403/404/400) → inspect the printed JSON body. Common cases:
  - 401/403: key missing or invalid.
  - 404: table/view not found (check the schema and spelling).
  - 400 with code 42703: column does not exist (if you query a column that isn't there).

Next steps (suggested)
- If you want, I can:
  - Add a CLI flag to override the table name when running the script.
  - Query a known person id to check career rows for that person.
  - Try the script against `persons` or `vw_ministernode` to diagnose available tables/views.
