# assets

Bot artwork.

- `icon.svg`: source of the app icon (gold clapperboard with a play button), drawn by hand as SVG.
- `banner.svg`: source of the bot profile banner (680x240): clapperboard, "Movie Bot" and the tagline "Pick it. Post it. Watch it.".

To get the 1024x1024 PNG that the Discord Developer Portal asks for (App Icon), render the SVG with headless Edge:
`msedge --headless --window-size=1024,1024 --screenshot=icon.png file:///.../icon.svg`
