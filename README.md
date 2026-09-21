# Material Icon Conventions

[![CI](https://github.com/shou6/material-icon-conventions/actions/workflows/ci.yml/badge.svg)](https://github.com/shou6/material-icon-conventions/actions/workflows/ci.yml)

[日本語](README.ja.md)

Adds icon associations for common file and folder naming conventions that [Material Icon Theme](https://marketplace.visualstudio.com/items?itemName=PKief.material-icon-theme) does not cover yet. It reuses the icons that ship with Material Icon Theme and recolors some of them.

## Features

- Provides default values for `material-icon-theme.files.associations` and `material-icon-theme.folders.associations`
- Adds recolored folder icons through `material-icon-theme.folders.customClones` for folders that no built-in icon fits
- Adds names that no Material Icon Theme icon pack covers yet
- Leaves Material Icon Theme itself, its icons, and your `settings.json` untouched

## Added associations

### Folders

| Icon | Folder names |
| --- | --- |
| `test` | `testdata`, `test-data`, `test_data` |
| `mock` | `stubs`, `stub`, `fakes`, `fake` |
| `generator` | `factories`, `factory` |
| `api` | `endpoints`, `endpoint`, `openapi`, `swagger` |
| `job` | `workers`, `worker`, `cron`, `crons`, `schedulers`, `scheduler` |
| `event` | `listeners`, `listener`, `subscribers`, `subscriber`, `observers`, `observer`, `emitters` |
| `lib` | `third_party` |
| `mappings` | `mappers`, `mapper`, `serializers`, `transformers` |
| `secure` | `permissions`, `authorization`, `capabilities` |
| `error` | `exceptions`, `exception` |
| `log` | `logger`, `loggers` |
| `connection` | `sockets`, `socket`, `websocket`, `websockets` |
| `database` | `datasets`, `dataset`, `postgres`, `postgresql`, `csv` |
| `migrations` | `alembic` |
| `base` | `foundation` |
| `views` | `popup` |
| `temp` | `.wxt`, `.browser-profile` |

### Files

| Icon | File names and extensions |
| --- | --- |
| `test-ts` | `*.mock.ts`, `*.mocks.ts`, `*.fixture.ts`, `*.fixtures.ts`, `*.stub.ts`, `*.fake.ts`, `*.e2e.ts` |
| `test-js` | `*.mock.js`, `*.mocks.js`, `*.mock.mjs`, `*.fixture.js`, `*.fixtures.js`, `*.stub.js`, `*.fake.js`, `*.e2e.js` |
| `test-jsx` | `*.mock.tsx`, `*.mock.jsx`, `*.e2e.tsx` |
| `console` | `.blerc` |
| `claude` | `.claudeignore` |
| `url` | `*.lnk` |
| `installation` | `*.iss` |
| `python-misc` | `*.mako` |

### Recolored folder icons

Material Icon Theme generates these icons from a built-in icon with a new color.

| Name | Based on | Color | Folder names |
| --- | --- | --- | --- |
| `installer` | `packages` | `amber-600` | `installer`, `installers` |
| `entrypoints` | `app` | `teal-400` | `entrypoints` |

## Your own settings take precedence

Material Icon Theme reads one value for each association setting: your workspace setting, then your user setting, then the default. If you set `material-icon-theme.files.associations`, `material-icon-theme.folders.associations`, or `material-icon-theme.folders.customClones` yourself, Material Icon Theme uses your value instead of this extension's associations for that setting. This is by design: the extension never interferes with your own customization.

## Disabling

Disable or uninstall this extension from the Extensions view. Material Icon Theme then drops the added associations and keeps working as before.

## Requirements

- Visual Studio Code 1.138 or later
- [Material Icon Theme](https://marketplace.visualstudio.com/items?itemName=PKief.material-icon-theme) (installed automatically as a dependency). Select it as your file icon theme to see the icons.

## License

[MIT](LICENSE)
