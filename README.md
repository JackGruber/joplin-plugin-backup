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

Backups can be created manually with the command `Tools > Create Backup` or are created automatically based on the configured interval.

## Options

Go to `Tools > Options > Backup`

- `Backup Path`: Where to save the backups to.
- `Keep x Backups`: How many backups should be kept. Default `1`
- `Backups interval in hours`: Create a backup every X hours. Default `24`

## What is backuped

- Each notebook as JEX
- The `keymap-desktop.json`
- The `userchrome.css`
- The `userstyle.css`

## Changelog

### Not released

- Fix: Backup not only the last 50 notebooks
- Add: Backup userchrome.css and userstyle.css
- Add: Option to create single file JEX for all notebooks

### v0.2.2 (2021-01-17)

- Fix: Check if keymap-desktop.json exists

### v0.2.1 (2021-01-16)

- remove seconds from folder

### v0.2.0 (2021-01-14)

- Add: Automatic backups every X hours

### v0.1.0 (2021-01-14)

- First version

## Links

- [Joplin - Getting started with plugin development](https://joplinapp.org/api/get_started/plugins/)
- [Joplin - Plugin API reference](https://joplinapp.org/api/references/plugin_api/classes/joplin.html)
- [Joplin - Data API reference](https://joplinapp.org/api/references/rest_api/)
- [Joplin - Plugin examples](https://github.com/laurent22/joplin/tree/dev/packages/app-cli/tests/support/plugins)
