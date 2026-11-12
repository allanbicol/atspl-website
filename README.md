# Australian Target Systems — website

Static site for atspl.com.au, built with [Astro](https://astro.build).

## Run it

```
npm install
npm run dev       # local preview at http://localhost:4321
npm run build     # production build into dist/
npm run preview   # serve the production build
```

`dist/` is plain HTML, CSS and JS and can be hosted anywhere.

## Where things are

| Path | What it holds |
| --- | --- |
| `src/config.ts` | Phone, email, address, navigation, statistics, form endpoint, video URLs |
| `src/pages/` | One file per page: home, about-us, ilts, ranges, contact-us, supplier-opportunity, website-privacy-policy, 404 |
| `src/layouts/Base.astro` | Header, footer, scroll rail, page metadata |
| `src/styles/global.css` | Colour, type and spacing tokens, plus shared components |
| `src/scripts/app.ts` | Smooth scroll, header, scroll rail, heading and image reveals, counters, accordions |
| `src/scripts/range.ts` | The interactive 3D range on the homepage (Three.js) |
| `src/scripts/forms.ts` | Form validation and sending |
| `src/content/privacy.json` | Privacy policy text |
| `src/assets/img/` | Photography and logos (optimised at build time) |

## Forms

`FORM_ENDPOINT` in `src/config.ts` is empty, so the contact and supplier forms
open the visitor's email app with the message pre-filled. Set it to a form
endpoint URL and both forms will post to it instead.

## Video

The two ILTS videos are 156 MB and 89 MB. They are streamed from their current
URLs (see `MEDIA` in `src/config.ts`) rather than bundled into the site.
