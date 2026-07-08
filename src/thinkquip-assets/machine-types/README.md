# Machine-type selector icons

Drop the machine-type icon images here. The **Machine Type** selector on the
Inputs page (`src/components/MachineTypeSelector.jsx`) auto-loads every image in
this folder and matches it to a tile by **filename** (without the extension).

Save the icons you provided with these exact names (`.png`, `.jpg`, `.webp` or
`.svg` all work — the stem is what matters):

| File name          | Tile label     | Which of your images                    |
| ------------------ | -------------- | --------------------------------------- |
| `loader.png`       | Loader (live)  | the backhoe / wheel loader              |
| `excavator.png`    | Excavator      | tracked excavator                       |
| `dump-truck.png`   | Dump Truck     | tipper / haul truck                     |
| `mobile-crane.png` | Mobile Crane   | truck-mounted crane with hook           |
| `reach-stacker.png`| Reach Stacker  | telehandler / reach stacker             |
| `roller.png`       | Roller         | single-drum road roller                 |
| `drilling-rig.png` | Drilling Rig   | tracked piling / rotary drill rig       |
| `concrete-pump.png`| Concrete Pump  | truck with folded placing boom          |

Any tile whose file is missing shows an empty placeholder until the image is
added — no code changes needed once the files are in place. To add or rename a
type, edit `MACHINE_TYPES` in `MachineTypeSelector.jsx`.
