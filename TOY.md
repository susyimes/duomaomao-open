# Bilibili Toy distribution

Run with the pinned lockfile and pnpm:

```powershell
pnpm install --frozen-lockfile
pnpm check
pnpm assets:validate
pnpm build:toy
pnpm test:toy
```

`dist-toy/duomaomao-toy.zip` is the upload artifact. Build output and test screenshots/reports are ignored. Nothing is uploaded by these commands. `pnpm build` still builds the original website using adapter-auto, with its normal URLs and downloadable source archive.

The Toy build starts from the current `src` and `public` in the fixed ignored `.toy-work` directory. It does not reuse a published build. The script checks compatibility anchor counts before adapting the staged source; if upstream source changes those anchors, the build fails for review. Only the staged edition uses adapter-static, relative asset URLs and `#/gallery` navigation. The adapter's root fallback HTML preload/import URLs are also made relative, because adapter-static otherwise emits absolute URLs even with `paths.relative` enabled. A source fingerprint replaces Kit's default time-based version, and sorted ZIP entries use fixed timestamps so repeated builds with the same inputs and toolchain produce the same ZIP bytes.

Toy currently accepts `.data` but filters `.glb`. All 33 source GLBs remain in `public/assets/models`; the staged build renames their byte-identical payloads to `.data` and adjusts both game and gallery loading paths. Three.js GLTFLoader reads ArrayBuffers and identifies GLB by its magic header, so no geometry, palette materials or animations are converted or removed. `toy:check` loads every packaged `.data` with the actual GLTFLoader, checks bounds, clip names and source SHA-256 values. The manifest records both packaged and original paths. The independently authored meadow PNG remains bundled and is used by both renderers.

The nested editable art ZIP is omitted from this runtime package. The gallery's download action becomes an asset-license link in both languages. Source files and the original source archive remain unchanged in the repository. Asset license, source provenance, project licenses and Three.js MIT notice are retained using allowed `.md` extensions.

`test:toy` serves the actual ZIP under `/toy-fixture/` on an automatically allocated local port with no SPA rewrite fallback. Desktop Chromium verifies Chinese/English switching, start, movement input, hint audio request, pause/return, every gallery character/prop, animation controls and direct hash-route reload. The UI references 32 distinct models; the spare combined `friends` lineup is retained and parsed by `toy:check`. A separate 844×390 Chromium touch context checks start, hint and visible touch controls. Screenshots and `report.json` are saved to `dist-toy/verification/`.

The game already uses container ResizeObserver, viewport-fit, touch controls, focus/visibility pause and user-gesture audio playback. A Toy-only short-landscape CSS rule moves stamina beside the joystick to avoid overlapping the target panel; browser checks verify those rectangles do not overlap in either language. No Toy SDK is needed for local gameplay, identity, cloud saves or leaderboard integration. The package has no external network dependencies and does not attempt SDK-only App orientation/immersive controls. The host can size the container normally. Desktop touch emulation does not establish physical-phone or Bilibili App compatibility; verify those in Toy's preview before submitting.

Packaging rejects files outside the official whitelist and requires a root `index.html`. Both ZIP and expanded payload are limited conservatively to 50,000,000 bytes. Official references checked 2026-10-24:

- [Toy FAQ and allowed formats](https://www.bilibili.com/toy/publish/guide/faq)
- [Toy SDK](https://www.bilibili.com/toy/publish/sdk)
- [SvelteKit router and paths configuration](https://svelte.dev/docs/kit/@sveltejs-kit-vite)
- [SvelteKit static adapter](https://svelte.dev/docs/kit/adapter-static)

The repository requests Svelte MCP documentation and autofixer tools; those tools were not exposed in this session. Official documentation, `svelte-check`, both builds and real Chromium execution were used for verification.
