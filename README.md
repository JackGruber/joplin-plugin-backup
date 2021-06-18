# Joplin Backup Plugin

A plugin to extend Joplin with a manual and automatic backup function.

<img src=img/main.jpg>

## Installation

### Automatic

- Go to `Tools > Options > Plugins`
- Search for `Simple Backup`
- Click Install plugin
- Restart Joplin to enable the plugin

### Manual

- Download the latest released JPL package (`io.github.jackgruber.backup.jpl`) from [here](https://github.com/JackGruber/joplin-plugin-backup/releases/latest)
- Close Joplin
- Copy the downloaded JPL package in your profile `plugins` folder
- Start Joplin

## Usage

First configure the Plugin under `Tools > Options > Backup`!

Backups can be created manually with the command `Tools > Create backup` or are created automatically based on the configured interval.
The backup started manually by `Create backup` respects all the settings except for the `Backups interval in hours`.

## Options

Go to `Tools > Options > Backup`

| Option                      | Description                                                                                                               | Default |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------- |
| `Backup path`               | Where to save the backups to. <br>This path is exclusive for the Joplin backups, there should be no other data in it!     |         |
| `Single JEX`                | Create only one JEX file for all notebooks                                                                                | `false` |
| `Keep x backups`            | How many backups should be kept                                                                                           | `1`     |
| `Backups interval in hours` | Create a backup every X hours                                                                                             | `24`    |
| `Only on change`            | Creates a backup at the specified backup interval only if there was a change to a `note`, `tag`, `resource` or `notebook` | `false` |
| `Logfile`                   | Loglevel for backup.log                                                                                                   | `error` |
| `Create zip archive`        | Save backup data in a Zip archive                                                                                         | `No`    |
| `Temporary export path`     | The data is first exported into this path before it is copied to the backup `Backup path`.                                | ``      |

## Keyboard Shortcuts

Under `Options > Keyboard Shortcuts` you can assign a keyboard shortcut for the following commands:

- `Create backup`

## What is backed up

- Notebooks as JEX export (Empty notbooks are not backed up)
- The `settings.json` (Joplin settings)
- The `keymap-desktop.json` (Keyboard shortcuts)
- The `userchrome.css` (Your Joplin customization)
- The `userstyle.css` (Your Joplin customization)
- The `templates` folder (Note templates)

## Restore

### Settings

To restore the Settings, copy the desired files from `<Backup Path>\Profile` to the Joplin directory `.config\joplin-desktop`.  
The exact path can be found in Joplin under `Tools > Options > Generla`:

<img src=img/joplin_path_in_gui.jpg>

### Notes

The notes are imported via `File > Import > JEX - Joplin Export File`.

> Individual notes cannot be restored from the JEX file!

The notes are imported additionally, no check for duplicates is performed.
If the folder in which the note was located already exists in you Joplin, than the folder name is extended by one (1).

## Changelog

See [CHANGELOG.md](CHANGELOG.md)

## Links

- [Joplin - Getting started with plugin development](https://joplinapp.org/api/get_started/plugins/)
- [Joplin - Plugin API reference](https://joplinapp.org/api/references/plugin_api/classes/joplin.html)
- [Joplin - Data API reference](https://joplinapp.org/api/references/rest_api/)
- [Joplin - Plugin examples](https://github.com/laurent22/joplin/tree/dev/packages/app-cli/tests/support/plugins)
