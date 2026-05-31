# Home Loan EMI Calculator

A dependency-free home loan calculator that runs entirely in the browser. The app uses plain HTML,
CSS, and JavaScript, so it does **not** require Node.js, npm, Vite, React, or any package install.

## Run on Windows localhost

### Option 1: Open directly

1. Download or clone this repository.
2. Open the project folder in File Explorer.
3. Double-click `index.html`.

### Option 2: Serve with a built-in Windows/Python web server

If you prefer a localhost URL and already have Python installed, run this from the project folder:

```powershell
python -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## Troubleshooting a blank page

If `http://localhost:8000` opens to a blank page, the most common cause is starting the
Python server from a different directory. Stop the server with <kbd>Ctrl</kbd> + <kbd>C</kbd>,
change into this project folder, and start it again:

```powershell
cd path\to\homeloan-application
python -m http.server 8000
```

Then refresh `http://localhost:8000/index.html`. You should see the calculator title and the
loan form. If the page still does not load, open the browser developer console and look for an
error message from `app.js`.

## Features

- Calculates home loan principal from home price and down payment.
- Estimates monthly EMI/payment from interest rate and loan term.
- Supports optional extra monthly payments.
- Shows total interest, total paid, payoff date, and months saved.
- Groups the amortization schedule by year.
- Downloads the yearly amortization schedule as a CSV file.
