# raycast-extensions

My [Raycast](https://raycast.com) extensions. Each one is a self-contained extension in its own directory under `extensions/`, so they are installed, versioned and worked on independently — this repository is just the shared home and toolchain for them.

## What's here so far

| Extension                                               | What it does                                                                                     |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| [Display Rotation](extensions/display-rotation)         | Lists the connected displays and rotates the one you pick, with `displayplacer`                  |
| [iTerm Profile Switch](extensions/iterm-profile-switch) | Switches the frontmost iTerm2 session to the profile that belongs to the screen its window is on |

Each extension's README covers its own requirements, preferences, macOS permissions and design.

## Install one

```sh
git clone https://github.com/dworznik/raycast-extensions.git
cd raycast-extensions
pnpm install
pnpm --filter <extension> dev
```

`pnpm … dev` builds that one extension and imports it into Raycast, where it stays installed after you stop the process with `Ctrl-C`. Run it again per extension you want. Nothing installs an extension you did not ask for.

## Layout

```
extensions/
  <extension>/
    package.json      Raycast manifest: commands, preferences, icon
    assets/           extension icon
    src/
      <command>.tsx   thin command shell
      lib/            the logic, plus its specs
    README.md
```

A pnpm workspace ties them together: one `pnpm install` at the root, one catalog pinning every shared dependency version, one lint/test/typecheck setup, and one CI run covering all of them. Everything Raycast cares about lives inside the extension directory.

## Add an extension

1. Create `extensions/<name>/` with a `package.json` manifest — copy the shape of an existing one. Dependency versions come from the catalog in `pnpm-workspace.yaml`, so write `"@raycast/api": "catalog:"` rather than a version, and add anything new to that catalog.
2. Add `tsconfig.json` with `{ "extends": "../../tsconfig.base.json", "include": ["src/**/*", "raycast-env.d.ts"] }`, a 512×512 `assets/extension-icon.png`, and a `.prettierignore` if the extension carries test fixtures.
3. Give it the same scripts as its neighbours: `dev`, `build`, `lint`, `fix-lint`, `typecheck`. The root scripts pick it up automatically.
4. `pnpm install`, then `pnpm --filter <name> dev`.

## Conventions

- **`@raycast/api` cannot be imported from tests**, so the logic lives in `src/lib/*.ts` as pure functions with no Raycast imports, each with a Vitest spec next to it. The `.tsx` files stay thin: read preferences, call into `src/lib`, render or toast.
- **Nothing machine-specific is committed.** Ids, names and paths are discovered at runtime or declared as Raycast preferences.
- **Conventional Commits** (`feat:`, `fix:`, `ci:`, `build:`, `docs:`…), and branches named to match (`feat/…`, `fix/…`).

## Development

Run from the repo root to cover every extension, or add `--filter <name>` to work on one:

| Script                                | What it does                                                |
| ------------------------------------- | ----------------------------------------------------------- |
| `pnpm --filter <name> dev`            | `ray develop` for that extension                            |
| `pnpm run build`                      | `ray build` everywhere                                      |
| `pnpm run lint` / `pnpm run fix-lint` | `ray lint` (ESLint + Prettier + manifest checks) everywhere |
| `pnpm run typecheck`                  | `tsc --noEmit` at the root and in every extension           |
| `pnpm test` / `pnpm run test:watch`   | Vitest across every extension                               |

Shared configuration lives at the root: `tsconfig.base.json`, `eslint.config.js`, `.prettierrc` and `vitest.config.ts`. CI runs lint, typecheck, tests and `ray build` for every extension on macOS, and Dependabot keeps the actions and dependencies current.

Two wrinkles worth knowing, both from the Raycast Store's expectation that an extension is a standalone directory. With `CI=true`, `ray lint` insists on a lockfile inside each extension folder; a workspace keeps one at the root, so the CI lint step unsets that flag. And the `catalog:` versions are a pnpm protocol the Store would not understand. Publishing an extension there someday means giving its directory a real lockfile and literal versions.

Nothing here is published to the Raycast Store.

## License

MIT
