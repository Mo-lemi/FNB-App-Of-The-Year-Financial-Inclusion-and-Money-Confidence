# Imali — safe to spend today

**One number for people whose income changes every day:** how much you can spend today and still cover what's coming.

Built for the **FNB App of the Year Hackathon 2026** (Financial Inclusion and Money Confidence).

**Try it:** [mo-lemi.github.io/FNB-App-Of-The-Year-Financial-Inclusion-and-Money-Confidence/?demo](https://mo-lemi.github.io/FNB-App-Of-The-Year-Financial-Inclusion-and-Money-Confidence/?demo)

The `?demo` link opens a ready-made account for Sipho, a delivery driver who also washes cars on weekends and receives a monthly grant. Open the link without `?demo` to start with your own details. It works best on a phone, and you can add it to your home screen.

## The problem

Budgeting apps assume a monthly salary. Millions of South Africans earn from piece work, spaza shops, taxis, deliveries, side hustles and grants instead. Their money arrives in uneven amounts on uneven days, while rent, school transport and stokvel contributions are due on fixed dates. A good Friday can feel like plenty of money, and the shortfall only shows up nine days later.

Imali answers one question every morning: **"How much can I spend today without running short before my next bills?"**

## What it does

- **Safe to spend today.** A single rand amount, with a status (*on track*, *go carefully* or *essentials only*) and one line explaining why. For example: *"Keeping enough back for School transport (R450) on Thu 5 Nov."*
- **14-day forecast.** A chart of where your balance is heading on the safe plan compared with spending as usual. Tap a day for details.
- **Good-day nudge.** On a better-than-usual day, Imali suggests putting a small amount into a buffer, once a day. You can change the amount: the card shows what today's safe amount becomes, and won't let you save so much that food and transport are no longer covered.
- **Bills.** Monthly bills with due dates. Overdue bills show up first, and you mark them paid with one confirmed tap.
- **SMS reader with scam check.** Paste a bank or payment SMS and Imali fills in the amount and type. It also warns about scam signs: links, requests for a PIN or OTP, prize claims, pressure to act fast, and "pay a fee to receive money".
- **Insights.** Which weekdays you usually earn most, whether income is trending up or down, your biggest cost, and whether you tend to overspend after a big day.
- **Four languages.** English, isiZulu, Sesotho and Afrikaans.
- **Optional PIN lock.** A 4-digit PIN for shared phones. The app locks again after a minute away, and there's a Lock button on the home screen.

## How the number is worked out

Everything runs on the phone. No AI service is involved and nothing is sent anywhere.

1. **Income by weekday.** From your logged income, Imali learns what you usually earn on each day of the week. It keeps both the average and a cautious figure (the 25th percentile, so a slow day).
2. **Trend.** The last 28 days are compared with earlier weeks, so a slowing month lowers the forecast. The adjustment is capped at ±25%.
3. **Scheduled income.** Regular monthly money such as a SASSA grant is detected and placed on its date.
4. **Starting estimate.** Until there's enough history, your own weekly estimate fills the gaps. Its weight fades over 28 days.
5. **Safe amount.** Over the next 14 days, Imali finds the largest daily amount you could spend so that your balance never drops below zero, assuming only *cautious* income and paying every bill on time.

The engine is in [`src/lib/forecast.ts`](src/lib/forecast.ts), and its tests are in [`src/lib/forecast.test.ts`](src/lib/forecast.test.ts).

## Privacy and security

- **No account and no server.** Data is stored only in the phone's browser (`localStorage`). It can be downloaded as a JSON file or deleted from Settings.
- **Never asks for banking details.** Imali does not connect to a bank and never asks for a banking PIN, password or OTP.
- **PIN lock.** Only a salted SHA-256 hash of the PIN is stored. After five wrong tries you must wait, and the wait doubles with each further miss. The PIN is a privacy screen for shared phones, **not encryption**. A forgotten PIN can't be reset, because there's no account. The only option is to delete the data and start again.
- **Demo links can't wipe real data.** Opening a `?demo` link on a phone that already has data runs the demo for that visit only. The saved data and PIN stay untouched.
- **Accidental taps.** Saving to the buffer and marking a bill as paid both ask for confirmation first, and the confirm button sits in a different spot so a double tap can't trigger it.

## Run it locally

You need Node 22 or later.

```bash
npm install
npm run dev      # http://localhost:5173  (add ?demo for the sample account)
npm test         # forecast, SMS parser and PIN lock tests
npm run build    # type-check and production build into dist/
```

Every push to `main` runs the tests, builds the app and deploys it to GitHub Pages through [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).

## Tech

React 18, TypeScript and Vite, packaged as a PWA with `vite-plugin-pwa` so it installs to the home screen and works offline. Tests use Vitest. There are no UI or chart libraries: the icons and the forecast chart are hand-made SVG. The app is about 64 KB gzipped, which matters on prepaid data.

```
src/
  lib/          forecast engine, SMS parser, PIN lock, storage, demo data, translations
  components/   screens (Today, Add, Insights, Settings, Onboarding, Lock) and UI parts
```

## Known limitations

- The isiZulu, Sesotho and Afrikaans translations cover the main labels and still need review by first-language speakers.
- The SMS reader uses patterns, not a model. It handles common South African bank formats, but you should check the amount it fills in.
- A web app can't read SMS messages by itself, so messages have to be pasted in.
- Data lives in one browser on one phone. Clearing the browser's data deletes it unless you have downloaded a copy.
