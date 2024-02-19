# Joplin Plugin: Backup <img src=img/icon_32.png>

A plugin to extend Joplin with a manual and automatic backup function.

<!-- markdownlint-disable MD033 -->
<!-- markdownlint-disable MD028 -->
<!-- markdownlint-disable MD007 -->

<img src=img/main.png>

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
    - [Restore a singel note](#restore-a-singel-note)
- [FAQ](#faq)
    - [Internal Joplin links betwen notes are lost](#internal-joplin-links-betwen-notes-are-lost)
    - [Combine multiple JEX Files to one](#combine-multiple-jex-files-to-one)
    - [Open a JEX Backup file](#open-a-jex-backup-file)
    - [Are Note History Revisions backed up?](#are-note-history-revisions-backed-up)
    - [Are all Joplin profiles backed up?](#are-all-joplin-profiles-backed-up)
- [Changelog](#changelog)
- [Links](#links)

<!-- /TOC -->
<!-- prettier-ignore-end -->

## Installation

### Automatic

- Go to `Tools > Options > Plugins`
- Search for `Backup`
- Click Install plugin
- Restart Joplin to enable the plugin

### Manual

- Download the latest released JPL package (`io.github.jackgruber.backup.jpl`) from [here](https://github.com/JackGruber/joplin-plugin-backup/releases/latest)
- Close Joplin
- Copy the downloaded JPL package in your profile `plugins` folder
- Start Joplin

## Usage

First configure the Plugin under `Tools > Options > Backup`!
The plugin must be configured separately for each Joplin profile.

Backups can be created manually with the command `Tools > Create backup` or are created automatically based on the configured interval.
The backup started manually by `Create backup` respects all the settings except for the `Backups interval in hours`.

## Options

Go to `Tools > Options > Backup`

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

### Restore a singel note

1. Create a new profile in Joplin via `File > Switch profile > Create new Profile`
2. Joplin switches automatically to the newly created profile
3. Import the Backup via `File > Import > JEX - Joplin Export File`
4. Search for the desired note
5. In the note overview, click on the note on the right and select `Export > JEX - Joplin Export File`
6. Save the file on your computer
7. Switch back to your orginal Joplin profil via `File > Switch profile > Default`
8. Import the exported note via `File > Import > JEX - Joplin Export File` and select the file from step 6

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

### Open a JEX Backup file

A Joplin JEX Backup file is a tar archive which can be opened with any zip program that supports TAR archive.
The file names in the archive correspond to the Joplin internal IDs.

### Are Note History (Revisions) backed up?

The note history and file versions (revisions) are not included in the backup.

### Are all Joplin profiles backed up?

No, the backup must be configured for each profile.
Profiles that are not active are not backed up, even if a backup has been configured.

## Changelog

See [CHANGELOG.md](CHANGELOG.md)

## Links

- [Joplin - Getting started with plugin development](https://joplinapp.org/api/get_started/plugins/)
- [Joplin - Plugin API reference](https://joplinapp.org/api/references/plugin_api/classes/joplin.html)
- [Joplin - Data API reference](https://joplinapp.org/api/references/rest_api/)
- [Joplin - Plugin examples](https://github.com/laurent22/joplin/tree/dev/packages/app-cli/tests/support/plugins)
