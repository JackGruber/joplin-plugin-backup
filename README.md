# Joplin Backup Plugin

A plugin to extend Joplin with a manual and automatic backup function.

<!-- markdownlint-disable MD033 -->
<!-- markdownlint-disable MD028 -->
<!-- markdownlint-disable MD007 -->

<img src=img/main.jpg>

<!-- prettier-ignore-start -->
<!-- TOC depthfrom:2 orderedlist:false -->

- [Installation](#installation)
    - [Automatic](#automatic)
    - [Manual](#manual)
- [Usage](#usage)
- [Options](#options)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [What is backed up](#what-is-backed-up)
- [Restore](#restore)
    - [Settings](#settings)
    - [Notes](#notes)
- [FAQ](#faq)
    - [Internal Joplin links betwen notes are lost](#internal-joplin-links-betwen-notes-are-lost)
    - [Combine multiple JEX Files to one](#combine-multiple-jex-files-to-one)
- [Open a JEX Backup file](#open-a-jex-backup-file)
- [Changelog](#changelog)
- [Links](#links)

<!-- /TOC -->
<!-- prettier-ignore-end -->

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

| Option                       | Description                                                                                                                                                              | Default                 |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------- |
| `Backup path`                | Where to save the backups to. <br>This path is exclusive for the Joplin backups, there should be no other data in it when you disable the `Create Subfolder` settings!   |                         |
| `Keep x backups`             | How many backups should be kept                                                                                                                                          | `1`                     |
| `Backups interval in hours`  | Create a backup every X hours                                                                                                                                            | `24`                    |
| `Only on change`             | Creates a backup at the specified backup interval only if there was a change to a `note`, `tag`, `resource` or `notebook`                                                | `false`                 |
| `Password protected backups` | Protect the backups via encrypted Zip archive.                                                                                                                           | `false`                 |
| `Logfile`                    | Loglevel for backup.log                                                                                                                                                  | `error`                 |
| `Create zip archive`         | Save backup data in a Zip archive                                                                                                                                        | `No`                    |
| `Zip compression Level`      | Compression level for zip archive archive                                                                                                                                | `Copy (no compression)` |
| `Temporary export path`      | The data is first exported into this path before it is copied to the backup `Backup path`.                                                                               | ``                      |
| `Backup set name`            | Name of the backup set if multiple backups are to be keep. [Available moment tokens](https://momentjs.com/docs/#/displaying/format/), which can be used with `{<TOKEN>}` | `{YYYYMMDDHHmm}`        |
| `Single JEX`                 | Create only one JEX file for all, this option is recommended to prevent the loss of internal note links or folder structure during a restore!                            | `true`                  |
| `Create Subfolder`           | Create a sub folder `JoplinBackup` in the configured `Backup path`. Deactivate only if there is no other data in the `Backup path`!                                      | `true`                  |
| `Backup plugins`             | Backup the plugin folder from the Joplin profile with all installed plugin jpl files.                                                                                    | `true`                  |

## Keyboard Shortcuts

Under `Options > Keyboard Shortcuts` you can assign a keyboard shortcut for the following commands:

- `Create backup`

## What is backed up

- Notebooks as JEX export (Empty notebooks are not backed up)
- The `settings.json` (Joplin settings)
- The `keymap-desktop.json` (Keyboard shortcuts)
- The `userchrome.css` (Your Joplin customization)
- The `userstyle.css` (Your Joplin customization)
- The `templates` folder (Note templates)
- The `plugin` folder (All installed plugins, no plugin settings!)

## Restore

### Settings

To restore the Settings, copy the desired files from `<Backup Path>\Profile` to the Joplin directory `.config\joplin-desktop`.  
The exact path can be found in Joplin under `Tools > Options > General`:

<img src=img/joplin_path_in_gui.jpg>

### Notes

The notes are imported via `File > Import > JEX - Joplin Export File`.

> Individual notes cannot be restored from the JEX file!

The notes are imported additionally, no check for duplicates is performed.
If the notebook in which the note was located already exists in your Joplin, then a "(1)" will be appended to the folder name.

## FAQ

### Internal Joplin links betwen notes are lost

If several JEX files are imported and the notes have links to each other, these links will be lost.
Therefore it is recommended to create a Single JEX Backup!

### Combine multiple JEX Files to one

By combining the JEX files into one, the Joplin internal links will work again after the import.

1. Open one of the JEX files in a ZIP program like 7-Zip
2. Open a second JEX and add all files to the first JEX
3. Repeat step 2 for all files
4. Import first JEX which now contains all notes

## Open a JEX Backup file

A Joplin JEX Backup file is a tar archive which can be opened with any zip program that supports TAR archive.
The file names in the archive correspond to the Joplin internal IDs.

## Changelog

See [CHANGELOG.md](CHANGELOG.md)

## Links

- [Joplin - Getting started with plugin development](https://joplinapp.org/api/get_started/plugins/)
- [Joplin - Plugin API reference](https://joplinapp.org/api/references/plugin_api/classes/joplin.html)
- [Joplin - Data API reference](https://joplinapp.org/api/references/rest_api/)
- [Joplin - Plugin examples](https://github.com/laurent22/joplin/tree/dev/packages/app-cli/tests/support/plugins)
