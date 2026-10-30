# Pocket Ledger

A simple personal finance tracker that runs entirely in your browser. No account, no server, no build step.


## Features

- Add, edit and delete income and spending transactions (with undo on delete)
- Month-by-month view with a summary of income, spending, net saved and savings rate
- Monthly budgets per category, with progress bars that warn near the limit and flag overspending
- Six-month income vs. spending chart and a category breakdown
- Search and filter transactions by text, type and category
- Currency switch: INR, USD, EUR, GBP
- Backup and restore through copy/paste JSON, plus CSV copy
- Light and dark mode, responsive down to phone width

## Privacy

All data is stored in your browser's `localStorage`. Nothing is sent anywhere. Clearing site data erases it, so use **Backup** to keep a copy.

## Run it

Open `index.html` in any modern browser. That's all.

To host it free on GitHub Pages: **Settings → Pages → Deploy from a branch → `main` / root**.

## Tech

Plain HTML, CSS and JavaScript in three files: `index.html`, `style.css`, `script.js`. Fonts load from Google Fonts (with system fallbacks if offline).

## Roadmap ideas

- Recurring transactions
- Import from bank CSV
- Optional sync across devices

## License

MIT
