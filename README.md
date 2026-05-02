# Hire_Manager

This is the frontend submission for the Hire Manager notification app.

## What it does

- Shows a protected login screen for the bearer token.
- Uses the notifications API with the query params `limit`, `page`, and `notification_type`.
- Separates the UI into two pages:
	- `All Notifications`
	- `Priority Notifications`
- Distinguishes viewed and new notifications locally.
- Uses native CSS and React only.

## Important paths

- App entry: `src/App.jsx`
- Router bootstrap: `src/main.jsx`
- Styles: `src/index.css`
- Vite config: `vite.config.js`
- Token: `.env` via `VITE_NOTIFICATION_TOKEN`

## Run locally

```powershell
cd Hire_Manager
npm install
npm run dev
```

The app is pinned to `http://localhost:3000/` for grading and local development.

## API details

- Endpoint: Set via environment variable `VITE_NOTIFICATION_API_URL` (default: `http://20.207.122.201/evaluation-service/notifications`)
- Method: `GET`
- Headers:
	- `Authorization: Bearer <token>`
	- `Accept: application/json`
- Supported notification types:
	- `Event`
	- `Result`
	- `Placement`

## Notes

- The token is stored locally in `Hire_Manager/.env` and ignored by Git.
- The backend helper folders remain in the repository for reference, but the frontend deliverable lives inside `Hire_Manager`.
