# Efe Isildar — Portfolio

A static personal portfolio featuring my software projects, music releases, and recent listening and viewing activity.

## Structure

```text
.
├── index.html
└── assets
    ├── css/main.css
    ├── js/main.js
    ├── fonts/
    └── media/
```

## Run locally

Serve the repository root with any static HTTP server. For example:

```sh
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Deployment

The site is designed to be published directly from the repository root with GitHub Pages. No build step is required.

The Spotify and Letterboxd cards read public display data from a Cloudflare Worker.
