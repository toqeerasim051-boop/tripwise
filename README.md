# TripWise

TripWise is a travel planner that runs entirely in the browser. You can explore countries, keep a wishlist, plan trips day by day, track a budget and gather everything you need to book.

There is no backend and no account. Your data stays in your browser's local storage, and you can export it to a file. TripWise never makes reservations or takes payments: booking always happens on the travel site.

## Features

- **Explore**: a hero slideshow of famous places, live search with suggestions, region chips, filters and sorting. Browsing the 52 featured countries needs no API call (bundled data), so it opens instantly.
- **Country details**: photo header, key facts, neighbours, current weather and a forecast, top attractions with photos, and a **map** with a pin for each attraction (Leaflet + OpenStreetMap).
- **Wishlist**: save destinations and start a trip from any of them.
- **Trips**: create, edit, reopen and delete several trips.
- **Itinerary**: one day per date. Add, edit, reorder and move activities between days. **Auto-plan my days** spreads the top attractions over the trip, and **weather advice** warns when outdoor plans fall on a rainy day, with a one-click move to a dry day.
- **Budget**: total budget, expenses by category, spent and remaining, a traffic-light meter, a breakdown per category and a **forecast** of the daily allowance and projected total.
- **Bookings**: one search form for hotels, flights and activities, filled in from the trip, that opens the travel site; plus saved links for confirmations and tickets.
- **Download PDF**: save the whole trip plan (days, budget, expenses, links) as a PDF file.
- **Light and dark themes**, and a **JSON backup** to move trips and the wishlist to another browser or device.

## Tech stack

- React 18, Vite 8, React Router 7, Tailwind CSS 4 (JavaScript, no TypeScript)
- Leaflet for the map, jsPDF for the PDF (both loaded only when needed)
- Vitest + React Testing Library: about 580 tests; ESLint and Prettier
- Public APIs: REST Countries and Open-Meteo; data saved in LocalStorage (no backend)

## Requirements

- Node.js 20.19+ or 22.12+ (needed by Vite 8)
- A free [REST Countries](https://restcountries.com) API key

## Getting started

```bash
npm install
cp .env.example .env    # then edit .env
npm run dev             # http://localhost:5173
```

In `.env`, set your key:

```
VITE_RESTCOUNTRIES_API_KEY=rc_live_...
```

In the REST Countries dashboard, add your **allowed origins**: `localhost` and, later, your deployed domain. Without them the API answers with `originNotAllowed`.

> Every `VITE_` variable is built into the JavaScript that browsers download, so anyone can see this key. That's why you restrict it to your origins. Never put a real secret in a `VITE_` variable.

Run `npm run check:api` to check that your key works and that the API still returns the shapes TripWise expects.

## Scripts

| Command                    | What it does                                                 |
| -------------------------- | ------------------------------------------------------------ |
| `npm run dev`              | Start the dev server                                         |
| `npm run build`            | Production build into `dist/`                                |
| `npm run preview`          | Serve the production build locally                           |
| `npm test`                 | Run all tests once (Vitest; takes about 2 minutes)           |
| `npm run test:watch`       | Run tests in watch mode                                      |
| `npm run lint`             | ESLint                                                       |
| `npm run format`           | Prettier (`format:check` only checks)                        |
| `npm run check:api`        | Test your REST Countries key against the live API            |
| `npm run data:attractions` | Rebuild the attractions data and download photos (see below) |

## Partner search widgets (optional)

By default, the Bookings tab shows links that open Booking.com, Google Flights and GetYourGuide in a new tab. You can also show search widgets from a travel affiliate network such as [Travelpayouts](https://www.travelpayouts.com) inside the tab. People then search without leaving TripWise, and booking finishes on the partner's site.

1. Create a Travelpayouts account and a project for your site, then join a hotel, flight or activity program.
2. In your account, open the widgets for that program (on the program's page, under its tools), set up a search widget and copy its embed code. It looks like `<script async src="https://…" charset="utf-8"></script>`. Menu names change, so follow Travelpayouts' help pages if yours differ.
3. Copy only the `src` URL into `.env`:

   ```
   VITE_PARTNER_WIDGET_HOTEL=https://...
   VITE_PARTNER_WIDGET_FLIGHT=https://...
   VITE_PARTNER_WIDGET_ACTIVITY=https://...
   ```

4. Optionally, put these placeholders in the URL. TripWise fills them in for each trip:
   - `{query}`: the "Search near" text
   - `{checkin}` and `{checkout}`: the trip dates (`YYYY-MM-DD`), left empty once the trip has started
   - `{currency}`: the trip currency

   Check the partner's documentation for which URL parameters their widget accepts.

5. Restart `npm run dev`. Each configured widget appears on the Bookings tab, with a selector when you have more than one.

Keep these points in mind:

- **Copy the code from your dashboard.** Don't build the URL by hand: widgets need ids such as `promo_id` and `campaign_id` that only the dashboard provides. Old Hotellook widgets stopped working in October 2025.
- **Widgets run in a sandboxed frame.** Partner code can't read your trips or the rest of the page. A few widgets may not work in a sandbox. If a widget stays blank or shows "The partner search couldn't load", check its URL first.
- The URLs contain your public affiliate id, not a secret.
- Leave the variables empty to show only the search links. In development, a short note reminds you that widgets can be set up.

## Your data

- Trips, the wishlist and settings are stored in `localStorage` under `tripwise:v1:*`. Nothing is sent to a server, apart from the API requests for country data and weather.
- Clearing your browser data deletes your trips. Use **Trips → Back up your data → Export to file** to keep a copy.
- **Import from file** adds the trips and wishlist destinations from a backup. A trip you already have is only replaced by a more recently edited copy. Imported files are checked like stored data, and invalid entries are dropped.

## Deploying

`npm run build` produces a static site in `dist/` that any static host can serve, such as Netlify, Vercel, GitHub Pages or Cloudflare Pages.

- Configure a single-page-app fallback, so that unknown paths such as `/trips/abc` serve `index.html`.
- Set `VITE_RESTCOUNTRIES_API_KEY`, plus any widget variables, in the host's build settings.
- Add the deployed domain to the key's allowed origins.

## Project structure

```
src/
  pages/        route components; trip/ holds the trip tabs
  components/   presentational components by feature
  hooks/        data and state hooks (useCountries, useWeather, useTrips, ...)
  context/      Trips, Wishlist and Settings providers (persisted with useReducer)
  services/     http.js, restCountries.js, openMeteo.js, attractions.js
  data/         generated curated data (destinations, attractions, country snapshot)
  utils/        pure logic: validation, money, dates, budget, itinerary, booking links, backup, PDF
  styles/       Tailwind entry and design tokens (light and dark)
  test/         test setup, fixtures and helpers
```

## Accessibility

- Semantic HTML, a skip link, and focus that moves to the page heading on navigation.
- Everything works with the keyboard and shows a visible focus ring.
- Dialogs trap focus and return it when they close. Moves and deletions are announced to screen readers.
- Colour contrast meets WCAG AA in both themes, and status is never shown by colour alone.
- Animations are reduced when your system asks for reduced motion.

## Attractions and photos

REST Countries has no attractions or photos, so TripWise uses a **curated list**: Wikipedia article titles per country in `scripts/attractions-source.mjs`. `npm run data:attractions` then:

- fetches each article's intro, coordinates and link from the Wikipedia API;
- keeps the lead photo only if it is freely licensed and an actual photo (not a map or logo);
- downloads the photos into `public/images/attractions/`, so the app never depends on Wikimedia while running;
- writes `src/data/attractions.json` and `src/data/destinations.json`.

To add a country or attraction, add a line to the source list, run the script, check its notes and commit the changes. Never edit the JSON by hand.

Every photo's author and licence (Creative Commons) are listed on the **About** page (the "Photo credits" link in the footer), each linking to its Wikimedia Commons page. Descriptions come from Wikipedia (CC BY-SA 4.0). Countries without curated data show their flag.

## Limitations

- **No currency conversion.** Changing a trip's currency relabels amounts; it doesn't convert them.
- **Forecasts reach 16 days ahead.** For trips further out, you see the current forecast.
- **Search links may break.** The links use the providers' public search pages, not official APIs, so a provider can change its URL format. Each provider's link is built in one function in `src/utils/bookingLinks.js`.
- **Free-plan limits.** The REST Countries free plan limits requests. TripWise caches results for the session.

## Data sources

- Country data: [REST Countries](https://restcountries.com)
- Weather: [Open-Meteo](https://open-meteo.com) (no key needed)
- Attractions: [Wikipedia](https://en.wikipedia.org) (CC BY-SA 4.0), photos from [Wikimedia Commons](https://commons.wikimedia.org), credited on the Credits page
