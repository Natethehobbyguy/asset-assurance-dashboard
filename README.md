# Asset Assurance Dashboard

A portfolio project that turns a common IT asset-management interview scenario into a working web application.

## Scenario

Imagine an organization has several disconnected sources of asset information: a CMDB, endpoint-management platform, network discovery, procurement records, and physical inventory. The challenge is to determine which assets are confidently accounted for, which are probably accounted for, and which have effectively disappeared from the organization's view.

This demo models that problem with three assurance tiers:

- **Verified** — current evidence confirms identity, location, and custody.
- **Probable** — strong evidence exists, but one or more details require confirmation.
- **Unknown** — the organization cannot confidently establish the asset's current location or custody.

## Features

- Executive asset-assurance dashboard
- Inventory search and filtering
- Asset inspection and reclassification workflow
- Unknown-asset discovery queue
- Evidence trail for verification activity
- Assurance index weighted by confidence
- Browser persistence with `localStorage`
- Responsive, dependency-free frontend

## Technology

- HTML5
- CSS3
- Vanilla JavaScript
- Browser `localStorage`

No build step or backend is required.

## Run locally

Open `index.html` in a modern browser. For the cleanest experience, serve the folder with any static web server.

## Methodology

The intended workflow is:

1. **Normalize the inventory** — establish a canonical asset identifier and reconcile duplicates.
2. **Collect evidence** — compare inventory records with endpoint telemetry, network discovery, procurement, assignment records, and physical audits.
3. **Score confidence** — classify each asset as Verified, Probable, or Unknown based on evidence quality.
4. **Prioritize remediation** — investigate unknown assets according to security, financial, and operational criticality.
5. **Close the loop** — update the source of truth and retain an audit trail after verification.

The important idea is that asset management is not simply maintaining a spreadsheet. It is maintaining confidence that the organization's digital record matches physical and technical reality.

## Portfolio talking points

This project demonstrates practical thinking around:

- IT asset management
- Data reconciliation
- Evidence-based decision making
- Risk prioritization
- Inventory data quality
- Workflow design
- Frontend development
- User-focused dashboard design

## Future improvements

Potential next steps include a real database, authentication and role-based access, automated network/endpoint discovery imports, evidence scoring rules, CSV import/export, audit logs, and scheduled verification campaigns.

## License

MIT
