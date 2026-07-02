# Maryam Rafique — Portfolio

Plain HTML/CSS/JS site. No build step, no npm, no frameworks. Open `index.html` in a browser and it works.

## File structure

```
index.html          all page content
css/styles.css       all styling
js/main.js            all interactivity (nav, filters, lightbox, accordion, etc.)
assets/               images, favicon, CV
README.md
```

## Editing text

Every editable spot in `index.html` has a comment right above it:

```html
<!-- EDIT HERE: headline -->
<h1 class="hero__headline">...</h1>
```

Search the file for `EDIT HERE` and change the text/links in place. Covers: nav links, booking link, hero copy, tools list, project cards, bio copy, testimonials, skills, experience timeline, FAQ, footer/socials.

### Links you should replace
- `https://calendly.com/YOUR-LINK` — every "Book a Consultation" button (appears 4 times)
- `assets/CV.pdf` — the "Download CV" button (add your actual CV file to `/assets` with this name, or update the path)
- `hello@maryamrafique.com` — footer email/mailto links
- `https://instagram.com/YOUR-HANDLE`, `https://linkedin.com/in/YOUR-HANDLE`, `https://behance.net/YOUR-HANDLE` — footer socials

## Swapping images

All images live in `/assets` and are placeholder SVGs so the site works out of the box.

| File | Used for | Recommended size |
|---|---|---|
| `assets/maryam.jpg` (or keep `.svg`) | Hero avatar | square, 400×400+ |
| `assets/project-1.svg` … `project-6.svg` | Work grid thumbnails | 800×600 (4:3) |
| `assets/favicon.svg` | Browser tab icon | any size, SVG |
| `assets/og-image.svg` | Social link preview | **replace with a real 1200×630 JPG/PNG** — most platforms (Facebook, LinkedIn, iMessage) don't render SVG previews |
| `assets/CV.pdf` | CV download | PDF |

To swap an image: drop your file into `/assets` and update the `src` (or `href`) in `index.html` to match the new filename. Keep `width`/`height` attributes roughly matching the image's aspect ratio to avoid layout shift.

To add a 7th project card: copy one whole `<article class="project-card">…</article>` block in the "Work" section, give it a new `data-category`, `data-title`, `data-tag`, `data-problem`, `data-approach`, `data-result`, and swap the image + text.

## Changing the accent color

Open `css/styles.css` and edit the two variables at the top:

```css
:root {
  --accent-1: #7C3AED; /* electric violet */
  --accent-2: #FF3D77; /* coral-magenta */
}
```

Every gradient, button, hover state, and highlight derives from these two colors — change them and the whole site re-themes.

## Deploying

**Netlify (drag & drop)**
1. Go to [app.netlify.com/drop](https://app.netlify.com/drop)
2. Drag the whole project folder onto the page
3. Done — you get a live URL instantly

**GitHub Pages**
1. Push this folder to a GitHub repo
2. Repo Settings → Pages → set source to the `main` branch, root folder
3. Site publishes at `https://YOUR-USERNAME.github.io/YOUR-REPO`

No build command, no environment variables, no dependencies — it's static files.

## Accessibility & performance notes

- Semantic HTML5 (`header`, `nav`, `main`, `section`, `article`, `footer`)
- All images have descriptive `alt` text — update alt text if you replace an image with a different subject
- Keyboard-navigable: project cards, accordion, lightbox, and mobile nav all work with Tab/Enter/Escape
- Respects `prefers-reduced-motion` — animations and the auto-scrolling marquee/testimonial slider are disabled for users who request it
- Images use `loading="lazy"` except the hero avatar
- No external JS libraries — just the two Google Fonts (Space Grotesk + Inter)
