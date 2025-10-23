# Copilot Instructions for TamPets Sorocaba Collection Points

## Project Overview
This is a web application for visualizing and filtering collection points in Sorocaba, Brazil, for the TamPets project. The app uses a CSV file as its data source and displays locations on an interactive map using Leaflet.js. Users can filter points by region, distance from a given CEP (postal code), and view details in a sidebar.

## Key Files & Structure
- `index.html`: Main entry point. Loads Leaflet, PapaParse, and project scripts/styles. UI includes controls for CEP, region, and distance filtering.
- `script.js`: Core logic for map rendering, CSV parsing, filtering, and sidebar interactions. Integrates with OpenStreetMap and Nominatim for geocoding CEPs.
- `Pontos de coleta.csv`: Data source for collection points. Uses semicolon delimiter and expects columns like `Latitude`, `Longitude`, `Região`, `Nome do Local`, etc.
- `style.css`: Custom styles for layout, controls, map, and sidebar.
- `Logo (3).png`: Project logo used in header.

## Data Flow & Integration
- CSV is loaded client-side using PapaParse (`script.js`).
- Map markers are generated from CSV rows with valid latitude/longitude.
- CEP search uses Nominatim API to geocode and center the map, then filters points by distance.
- Region and distance filters update visible markers without reloading the CSV.
- Sidebar displays details for a selected point, with a link to Google Maps.

## Developer Workflows
- No build step; static files are directly served.
- Debug by opening `index.html` in a browser. Use browser console for JS errors and CSV load status.
- To update data, replace or edit `Pontos de coleta.csv` (ensure semicolon delimiter and correct column names).
- For new UI features, update both `index.html` and `script.js`.
- For map or geocoding changes, review Leaflet and Nominatim usage in `script.js`.

## Project-Specific Patterns
- All filtering and data logic is handled in `script.js` (no backend).
- CSV columns are referenced with exact names (including spaces), e.g., `p[' Latitude ']`.
- Sidebar is dynamically populated and toggled via JS; closing is handled by both button and map click.
- External dependencies are loaded via CDN (Leaflet, PapaParse).

## Examples
- To add a new filter, extend the controls in `index.html` and update filtering logic in `adicionarPinos()` in `script.js`.
- To change map style, modify the Leaflet tile layer URL in `script.js`.
- To support new CSV columns, update both the PapaParse config and marker/sidebar rendering logic.

## Conventions
- Use semicolon as CSV delimiter.
- All UI text is in Brazilian Portuguese.
- No authentication or backend required.

---
For questions about data format, UI controls, or map integration, see `script.js` and `index.html` for canonical patterns.
