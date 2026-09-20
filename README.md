# raycast-extensions

Raycast extensions for a laptop that spends its day next to an external display. Each one is a separate extension, so you can install only the one you want.

| Extension                                               | What it does                                                                                       |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| [Display Rotation](extensions/display-rotation)         | Lists the connected displays and rotates the one you pick, with `displayplacer` — no configuration |
| [iTerm Profile Switch](extensions/iterm-profile-switch) | Switches the frontmost iTerm2 session to the profile that belongs to the screen its window is on   |

Nothing machine specific is committed: display ids, layouts and profile names all live in each extension's Raycast preferences.

## Layout

```
extensions/
  display-rotation/       one Raycast extension, one command
  iterm-profile-switch/   one Raycast extension, one command
```

A pnpm workspace ties them together: one `pnpm install` at the root, one catalog pinning every shared dependency version, one lint/test/typecheck setup, and one CI run covering both. Everything Raycast cares about — manifest, icon, source — lives inside the extension directory.

## Install an extension

```sh
git clone https://github.com/dworznik/raycast-extensions.git
cd raycast-extensions
pnpm install
pnpm --filter display-rotation dev      # or --filter iterm-profile-switch
```

`pnpm … dev` builds that one extension and imports it into Raycast, where it stays installed after you stop the process with `Ctrl-C`. Run it again for the other package if you want both. Each extension's README covers its preferences, the macOS permissions it needs, and how it works.

## Development

Run from the repo root to cover both extensions, or add `--filter <name>` to work on one:

| Script                                | What it does                                                        |
| ------------------------------------- | ------------------------------------------------------------------- |
| `pnpm --filter <name> dev`            | `ray develop` for that extension                                    |
| `pnpm run build`                      | `ray build` in every extension                                      |
| `pnpm run lint` / `pnpm run fix-lint` | `ray lint` (ESLint + Prettier + manifest checks) in every extension |
| `pnpm run typecheck`                  | `tsc --noEmit` at the root and in every extension                   |
| `pnpm test` / `pnpm run test:watch`   | Vitest across every extension                                       |

`@raycast/api` cannot be imported from tests, so each extension is laid out the same way:

- `src/lib/*.ts` — every piece of logic, as pure functions with no Raycast imports, each with a Vitest spec next to it.
- `src/*.tsx` — thin command shells: read preferences, call into `src/lib`, render or toast.

Shared configuration lives at the root: `tsconfig.base.json` (each extension extends it), `eslint.config.js`, `.prettierrc` and `vitest.config.ts`. Dependency versions live once in the `catalog:` block of `pnpm-workspace.yaml`, so each package.json says `"@raycast/api": "catalog:"` rather than a version. CI runs lint, typecheck, tests and `ray build` for both extensions on macOS.

Two wrinkles worth knowing, both from the Raycast Store's expectation that an extension is a standalone directory. With `CI=true`, `ray lint` insists on a lockfile inside each extension folder; a workspace keeps one at the root, so the CI lint step unsets that flag. And the `catalog:` versions are a pnpm protocol the Store would not understand. Publishing an extension there later would mean giving its directory a real lockfile and literal versions.

Neither extension is published to the Raycast Store.

## License

MIT
