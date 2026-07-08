# Machine data — how to add or edit a SANY machine

All machine specs and prices live in **`machines.json`** in this folder. You
do not need to touch any other code to add a machine — edit the JSON, validate
it, done.

## Adding a new machine

1. Open **`machines.template.json`**. It contains one complete **electric**
   template and one complete **diesel** template, with every field explained
   in the `// comment` lines.
2. Copy the template block that matches your machine (electric or diesel).
3. Paste it into `machines.json`, inside the `models` list of the right
   machine type (e.g. `wheel-loader`). Put a comma between models.
4. Replace every placeholder value with the real figures. Delete the comment
   lines (any key that starts with `//`) — or leave them, they are ignored.
5. Put the machine's cutout image (background removed) in
   `src/thinkquip-assets-v3/machines-cutout/` — that is the only folder the
   app loads machine images from — and point `imageAsset` at it.
6. Run:

   ```bash
   npm run validate-data
   ```

   It will either say the file is valid, or tell you in plain English which
   machine and which field has a problem. The same check runs automatically
   before every `npm run build` — a broken data file will not build.

## Rules to know

- Every model needs a **unique `id`** (lowercase, no spaces).
- **`energyType`** must be `"electric"` or `"diesel"` — it decides which
  fields are required and how the calculator models running costs.
- All prices are in **Rand, excluding VAT**, written as plain numbers:
  `1850000`, not `"R1,850,000"`.
- **Confidence (optional):** any spec or cost value can be marked with how
  solid the figure is by writing it as an object:

  ```json
  "fuelTankL": { "value": 300, "confidence": "estimate" }
  ```

  Allowed levels: `"confirmed"` (factory/manufacturer data), `"estimate"`
  (reasoned placeholder), `"pending"` (awaiting a real quote). A plain value
  with no wrapper counts as `"confirmed"`. **Never invent a number** — if a
  value is truly unknown, resolve it first.
- **Diesel `overhaul`:** use `null` if the machine has no separate
  engine-overhaul event (engine care covered by `routineServicePerHour`), or
  `{ "intervalHours": ..., "cost": ... }` if it has one.
- The same machine sold at **two prices** (e.g. dry vs wet brake) is entered
  as **two models** with different `id`s and `displayName`s — see the two
  SYL956H5 entries for the pattern.
