# Pikmin Turns

A five-minute, turn-based browser RTS inspired by Pikmin. One commander creates a six-character lobby code; a second joins it. The server persists turn state in the `game-data` Docker volume, and browsers poll it so sessions can be asynchronous.

## Run

```sh
npm test
npm start
```

Open `http://localhost:3000`, create a landing site, and join its code from another browser session.

`verify-browser.js` is the deployed two-browser acceptance check. Run it in the Playwright container after installing `playwright-core@1.55.0` as described in the host deployment guidance.

## Operations

The deployed service uses the `game-data` named volume. A staged backup set lives under `/home/ichabod/backups/pikmin-turns-<UTC timestamp>/`: its `payload/pikmin-turns-data.tgz` is made with `docker run --rm -v pikmin-turns_game-data:/data:ro -v "$set_dir/payload":/backup alpine tar czf /backup/pikmin-turns-data.tgz -C /data .`; restore with the inverse `tar xzf` command after stopping the service. `manifest.json` checks the archive and `volume-manifest.json` checks the restored volume contents. Keep sets for 14 days; the inventory classifies older sets as stale but never deletes them. The last isolated restore rehearsal passed on 2026-09-19 UTC.
