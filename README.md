# raycast-extensions

Raycast extensions for a laptop that spends its day next to an external display. Each one is a separate extension, so you can install only the one you want.

| Extension                                               | What it does                                                                                         |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| [Display Rotation](extensions/display-rotation)         | Rotates any connected display with `displayplacer` — discovers the screens by name, no configuration |
| [iTerm Profile Switch](extensions/iterm-profile-switch) | Switches the frontmost iTerm2 session to the profile that belongs to the screen its window is on     |

Nothing machine specific is committed: display ids, layouts and profile names all live in each extension's Raycast preferences.

## Layout

```
extensions/
  display-rotation/       one Raycast extension, one command
  iterm-profile-switch/   one Raycast extension, one command
```

npm workspaces tie them together: one `npm install` at the root, one set of dev dependencies, one lint/test/typecheck setup, and one CI run covering both. Everything Raycast cares about — manifest, icon, source — lives inside the extension directory.

## Install an extension

```sh
git clone https://github.com/dworznik/raycast-extensions.git
cd raycast-extensions
npm install
npm run dev -w extensions/display-rotation      # or -w extensions/iterm-profile-switch
```

`npm run dev` builds that one extension and imports it into Raycast, where it stays installed after you stop the process with `Ctrl-C`. Run it again for the other directory if you want both. Each extension's README covers its preferences, the macOS permissions it needs, and how it works.

## Development

Run from the repo root to cover both extensions, or add `-w extensions/<name>` to work on one:

| Script                              | What it does                                                        |
| ----------------------------------- | ------------------------------------------------------------------- |
| `npm run dev -w extensions/<name>`  | `ray develop` for that extension                                    |
| `npm run build`                     | `ray build` in every extension                                      |
| `npm run lint` / `npm run fix-lint` | `ray lint` (ESLint + Prettier + manifest checks) in every extension |
| `npm run typecheck`                 | `tsc --noEmit` at the root and in every extension                   |
| `npm test` / `npm run test:watch`   | Vitest across every extension                                       |

`@raycast/api` cannot be imported from tests, so each extension is laid out the same way:

- `src/lib/*.ts` — every piece of logic, as pure functions with no Raycast imports, each with a Vitest spec next to it.
- `src/*.tsx` — thin command shells: read preferences, call into `src/lib`, render or toast.

Shared configuration lives at the root: `tsconfig.base.json` (each extension extends it), `eslint.config.js`, `.prettierrc` and `vitest.config.ts`. CI runs lint, typecheck, tests and `ray build` for both extensions on macOS.

One wrinkle worth knowing: with `CI=true`, `ray lint` insists on a `package-lock.json` inside each extension folder, which is what the Raycast Store expects. A workspace keeps a single lockfile at the root instead, so the CI lint step unsets that flag. Publishing an extension to the Store later would mean generating a lockfile in its directory.

Neither extension is published to the Raycast Store.

## License

MIT
