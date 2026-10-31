# Ghost Orbit

Build “Ghost Orbit,” a Halloween-themed web app showing real space debris around Earth as ghosts.

Core:
- A full-screen 3D globe using globe.gl with a dark space background and stars.
- Fetch real TLE orbital data from CelesTrak (e.g. https://celestrak.org/NORAD/elements/gp.php?GROUP=cosmos-2251-debris&FORMAT=tle, plus iridium-33-debris and 1999-025 for Fengyun-1C). Provide a bundled fallback dataset of sample TLE objects in case of CORS or network blocks. Use satellite.js to compute current positions and update every few seconds so they move.
- Render each object as a small glowing ghost-green point at its real altitude.
- Click a ghost: open a side panel with its name, NORAD ID, origin, and altitude, and a “Hear its story” button.
- Stats panel: total debris shown, count by source event, and an altitude histogram highlighting the most crowded band as “The Haunted Zone.”
- Style: spooky but clean. Deep navy/black background, ghost-green and purple accents, a pixel or gothic header font. Tagline: “Earth’s orbit is haunted — and we’re running out of space.”
- Wire the story/voice button to generate a spooky first-person ghost story for the selected debris piece.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/4c35548b-f406-4fa9-80ae-781b8d208851).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
