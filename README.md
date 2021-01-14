# Joplin Backup Plugin

A plugin to extend Joplin with a manual and automatic backup function.

## Installation

### Automatic

- Go to `Tools > Options > Plugins`
- Search for `Copy Tags`
- Click Install plugin
- Restart Joplin to enable the plugin

### Manual

- Download the latest released JPL package (`io.github.jackgruber.backup.jpl`) from [here](https://github.com/JackGruber/joplin-plugin-backup/releases/latest)
- Close Joplin
- Copy the downloaded JPL package in your profile `plugins` folder
- Start Joplin

## Usage

First configure the Plugin!

For a manual backup click on `Tools > Create Backup`.

## Options

Go to `Tools > Options > Combine notes`

- `Backup Path`: Where to save the backups to.
- `Keep x Backups`: How many backups should be kept. Default `1`
- `Backups interval in hours`: Create a backup every X hours. Default `24`

## Changelog

### v0.1.0 (2021-01-14)

- First version

## Links

- [Joplin - Getting started with plugin development](https://joplinapp.org/api/get_started/plugins/)
- [Joplin - Plugin API reference](https://joplinapp.org/api/references/plugin_api/classes/joplin.html)
- [Joplin - Data API reference](https://joplinapp.org/api/references/rest_api/)
- [Joplin - Plugin examples](https://github.com/laurent22/joplin/tree/dev/packages/app-cli/tests/support/plugins)
