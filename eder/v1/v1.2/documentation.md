SysADL Web Studio – Architecture Visualization
==============================================

This document describes the current state of the **v1.1** workspace, how the SysADL → JavaScript pipeline works, how the browser visualizer renders architectures, and which gaps or caveats still exist. It replaces the previous Portuguese draft so the whole team can rely on a single, up‑to‑date reference.

---

## 1. Project Overview

The workspace provides a client–server toolchain that transforms SysADL models into executable JavaScript and then visualises the resulting architecture.

* **Transformation** happens on the Node.js backend (`server-node.js`, `transformer.js`, `sysadl-parser.js`, `sysadl.peg`). Each POST to `/api/transform` writes the SysADL source to a temp file, runs the transformer, and returns the generated JS plus metadata.
* **Simulation** is handled in the browser through `simulator.js` (which re‑uses the CommonJS prelude to execute the generated code).
* **Visualisation** occurs entirely on the client. `visualizer.js` evaluates the generated bundle, instantiates the `SysADLModel`, and uses `vis-network` to render components, ports, and connectors.

All UX is orchestrated by `app.js` and `index.html`, with presentation controlled by `styles.css`.

---

## 2. Key Files and Responsibilities

| File | Purpose |
| --- | --- |
| `index.html` | Static shell: Monaco editors, toolbar, log window, legend, and the architecture canvas. |
| `styles.css` | “SysADL Studio” inspired light theme covering panels, buttons, Monaco overrides, and the visualisation container. |
| `app.js` | Front-end controller. Loads Monaco, calls the `/api/transform` endpoint, triggers visualisation, runs simulations, and mirrors log messages to the UI. |
| `visualizer.js` | Creates the dynamic model, extracts nodes/edges, pins ports to component borders, enforces connector direction, and instantiates the `vis-network` canvas. |
| `sysadl-framework/SysADLBase.js` | Browser-friendly runtime used by the generated models. The recent changes record `boundParticipants` so the visualiser can locate concrete source/target ports. |
| `generated/` | Output from the transformation step (e.g. `Simple.js`, `SysADLModel.js`). Helpful when debugging binding metadata. |
| `server-node.js` | Minimal HTTP server that proxies transformation requests to `transformer.js` and serves static assets. |

---

## 3. Transformation & Visualisation Flow

1. **Author SysADL** in the left Monaco editor.
2. **Transform ▶** triggers `transformSysADLToJS` in `app.js`, which POSTs to `/api/transform`.
3. The Node.js server runs `transformer.js`, deposits JS in `generated/`, and responds with the JS text plus metadata (chosen file path, LOC, timestamps).
4. The generated JS is stored in the right Monaco editor and can be downloaded or copied.
5. **Visualize Architecture** calls `renderVisualization('architectureViz', js, logEl)`.
6. `visualizer.js`:
   - Strips `"use strict"` directives, evaluates the bundle, and invokes `createModel()`.
   - Walks the model tree, creating nodes for components and ports and capturing per-component port groups.
   - Uses `boundParticipants` (and participant schema fallbacks) to reconstruct connector flows.
   - Forces all edges to run from **output** to **input** ports; when bindings arrive inverted, the edge endpoints are swapped.
   - Lays components out **horizontally by level** (root → right) and pins ports directly against the component rectangles so the graph resembles SysADL Studio diagrams.
   - Registers hooks for `afterDrawing`, `zoom`, `dragEnd`, and `resize` to keep ports attached to component edges as the user interacts with the canvas.

7. The log panel mirrors key events (`[INFO]`, `[WARN]`, `[ERROR]`) to help diagnose malformed models or transformation failures.

---

## 4. Current Visualisation Behaviour

* **Component layout:** Deterministic, left‑to‑right. Each nesting level increases the x coordinate; siblings are vertically spaced for readability.
* **Port docking:** Input ports appear on the **left edge**, output ports on the **right edge**, and any port without direction (rare) sits below the component. Docking recomputes after stabilisation, zoom, drag, or resize.
* **Edges:** Straight segments with arrowheads, centred labels, and consistent colours. Connectors now reliably map to their bound ports (no more null endpoints).
* **Legend & palette:** Pastel fills differentiate top-level vs nested components, and the legend now focuses on the two component classes plus input/output ports and connectors.
* **Interactive editing:** Components can be dragged after the layout stabilises; ports remain glued to the component borders thanks to the docking hooks.
* **Theme:** The entire UI, including Monaco editors, adopts the SysADL Studio inspired light look; the architecture canvas has no internal padding so the network can use the full area.
* **Mobile tweaks:** Header/toolbar/button styles adapt on small screens so controls remain reachable, while desktop keeps the single-column layout users expect.
* **Log console:** The simulation log mimics a terminal (dark background, monospace font) and includes a “Download log” button that saves the current output as a timestamped `.txt`.

---

## 5. Known Limitations & Open Items

1. **Runtime assumptions:** Port docking depends on the component bounding box returned by `vis-network`. Extreme zoom levels or manual coordinate edits could introduce slight misalignment; if more precision is required we may add explicit node dimensions or custom shapes.
2. **Composite/other ports:** Ports without direction fall to the bottom edge; if the metamodel introduces special categories we may need additional orientation rules.
3. **Generated metadata:** The transformer doesn’t always emit everything we’d like (e.g. some participant schemas still mark both roles as `direction: 'out'`). The visualiser compensates, but improving the generator would simplify the code.
4. **Testing coverage:** Manual verification has been performed with `generated/Simple.js` and `generated/SysADLModel.js`, but there is no automated regression suite. Consider adding snapshot or DOM-based tests for the visualiser.
5. **Internationalisation:** Logs from the legacy runtime (`SysADLBase.js`) are still partially localised; the UI and documentation are now fully in English, but we haven’t homogenised every console string in the runtime.

---

## 6. Running the Project Locally

1. Install dependencies (Node.js 18+ recommended):
   ```bash
   npm install
   ```
   (Only packages listed in `package.json` are required; most assets are fetched from CDNs.)

2. Start the Node.js server from `v1.1`:
   ```bash
   node server-node.js
   ```
   The server listens on `http://localhost:3000`, serves static assets from the directory, and exposes `/api/transform`.

3. Open `http://localhost:3000` in a modern browser (Chrome, Edge, Firefox).

4. Optional: inspect logs in the terminal to monitor transformation requests or errors returned by `transformer.js`.

---

## 7. Troubleshooting Checklist

| Symptom | Possible Cause | Suggested Fix |
| --- | --- | --- |
| “Transformation error” banner | `transformer.js` threw or returned `success: false`. | Inspect `generated/` for stale files and check the server console for the stderr dump. |
| Architecture canvas stays blank | Generated JS failed to evaluate or `createModel` threw. | Check the log panel for `[ERROR] Failed to evaluate/generated model` entries. |
| Ports appear misaligned | Canvas not fully stabilised, or zoom ended mid-frame. | Allow one extra redraw (the hooks normally handle this); as a fallback, trigger a slight zoom in/out. |
| Connectors missing | Model lacks `boundParticipants`, or participant schema is empty. | Verify the connector metadata in the generated file; if absent, the generator must be updated. |

---

## 8. Future Improvements

* Add automated tests that load the generated JS in a headless DOM and assert the number/type of rendered nodes.
* Surface connector metadata (activity name, data type) in a side panel or tooltip summary, similar to SysADL Studio.
* Offer export options (PNG/SVG) for the rendered graph.
* Provide multi-language support if Portuguese UI needs to be restored.

---

### Revision History

| Date | Summary |
| --- | --- |
| 2025‑10‑29 | Introduced UML-style palette, improved legend, expanded log area, added mobile tweaks, throttled port docking for smoother zoom/scroll, and enabled freeform dragging of components. |
| 2025‑10‑28 | Layout overhauled, ports docked to component edges, connector direction enforced. |
| 2025‑10‑27 | Legendary redesign, English UI strings, initial connector binding fixes. |
