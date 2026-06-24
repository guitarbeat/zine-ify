# Zine-ify GUI — Ubiquitous Language

Glossary for the product interface. Terms only; no implementation specs.

| Term | Definition |
|------|------------|
| **Workspace Canvas** | The full-page surface where panels float. User can drag panels and scroll to reach them. |
| **Snap Card** | A draggable panel on the canvas (Paper, Add pages, Export, Preview fold, Zine layout, brand pill). |
| **Zine Sheet** | The imposed page grid — the primary object users arrange and export. Lives inside the Zine layout snap card. |
| **Page Slot** | One cell in the zine sheet grid; holds a page image or stays blank. |
| **Paper Config** | Sheet size, orientation, margin, and grid dimensions. |
| **Fold Preview** | Modal showing 3D fold simulation, step slider, booklet preview, and illustrated fold guide. |
| **Workflow** | Import pages → arrange in slots → configure paper → export PDF (optional: preview fold). |
| **Helper Chip** | Status text on the zine card header (e.g. "Drop files to add pages"). |
| **Mobile Rail** | *(legacy)* Bottom-sheet pattern for settings/upload on narrow screens. Currently stubbed in markup. |
| **Snap Layout** | Algorithm that places snap cards on a grid without overlap; runs on load, resize, and after drag. |