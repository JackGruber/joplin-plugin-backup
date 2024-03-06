# Changelog

## not released

- Fix: Don't show `There is no Data to export` on empty profiles and automatic backups #71

## v1.4.0 (2024-02-22)

- Changes that are required for the Joplin default plugin
- Renamed Plugin from `Simple Backup` to `Backup`
- Add: Allow creating of subfolders for each profile

## v1.3.6 (2024-01-11)

- Add: Screenshots / icon for [https://joplinapp.org/plugins/](https://joplinapp.org/plugins/)

## v1.3.5 (2023-12-26)

- Fix: #64 With single JEX backups, some notebooks were backuped/exported twice

## v1.3.4 (2023-12-04)

- Fix: #61 On Jex backup, do not overwrite already exported notebooks if the notebooks name differs only in special characters
- Fix: #62 Better error message if the Joplin profile directory is set as backup path
- Update en_US translation by @montoner0

## v1.3.3 (2023-07-08)

- Add: Workaround for bug #132 with `"` (double quotes) in the password where zip files with such a password can no longer be opened

## v1.3.2 (2023-06-02)

- Fix: #51 for translation zh_CN

## v1.3.1 (2023-05-19)

- Add: #55 Simplified Chinese(zh_CN) translation, thanks to @wh201906

## v1.3.0 (2023-05-14)

- Add: German translation

## v1.2.2 (2023-01-06)

- Fix: `moveLogFile: ENOTDIR: not a directory` for certain backup settings
- Add: DirectoryPath selector for backup path and tmp. export path selection on Joplin >= v2.10.4

## v1.2.1 (2022-12-10)

- Fix: #47 Suppress repeating error message during automatic execution if the backup path is not accessible
- Fix: #48 File already exists when a RAW or MD Frontmatter backup with no revisions is made

## v1.2.0 (2022-11-20)

- Add: Option to select export format between JEX, MD with Frontmatter and RAW (Only supported with Joplin > 2.9.12)
- Add: `Command on Backup finish` to execute a script/program when the backup is finished

## v1.1.1 (2022-07-27)

- Fix: #45 Error message when deleting old ZIP backupsets
- Disable Joplin DirectoryPath selector and use string input again because of several bugs [#6692](https://github.com/laurent22/joplin/issues/6692) and [#6693](https://github.com/laurent22/joplin/issues/6693)
- Fix: #40 Delete existing temporary zip file to prevent adding files to an old aborted backup

## v1.1.0 (2022-07-11)

- Improved: The default setting for `Single JEX` is now `true` (Create only one JEX backup file) to prevent the loss of internal notelinks during a restore. Joplin Discourse: [Lost all connections of my notes](https://discourse.joplinapp.org/t/lost-all-connections-of-my-notes/25464)
- Improved: Create a sub folder `JoplinBackup` in the configured `Backup path` (Only for new installations).
- Improved: Use new Joplin DirectoryPath selector for path selection. Not supported in Joplin >= v2.9.1, non-compatible Joplin versions still use a text input field.
- Add: Backup all installed Joplin plugins (Only the jpl files, no plugin settings!)

## v1.0.5 (2021-12-05)

- Fix: #28 No message was displayed that the backup is finished when starting manually
- Improved: #25 Check `Backup set name` for invalid characters

## v1.0.4 [pre-release] (2021-08-28)

- Improved: #21 Password check (empty passwords)

## v1.0.3 (2021-08-11)

- Fix: #19 Backups failed from Joplin version v2.2.5 and higher, due to the removed template function

## v1.0.2 (2021-07-19)

- Improved: Use of moments token
- Fix: #16 Prevent multiple simultaneous backup runs
- Add: #11 Make zip compression level selectable
- Fix: Delete old backup set information, if the backup set no longer exists

## v1.0.1 (2021-07-03)

Release for Joplin plugin manager

## v1.0.0 [pre-release] (2021-06-20)

- Add: Option for encrypted backups

> ❗️ Requires at least Joplin `2.1.3` ❗️

## v0.9.0 [pre-release] (2021-06-19)

- Add: Relative path could be used for `Backup Path`
- Fix: An error with `Only on change`, which was not working properly
- Add: Option to create zip archive
- Add: Option to specify the `Backup set name` if multiple backups are to be keep.

## v0.5.3 (2021-04-03)

- Add: Backup settings.json
- Optimize: #7 Better error message when a backup is created twice in a row in the same minute

## v0.5.2 (2021-02-13)

- Only internal changes

## v0.5.1 (2021-02-07)

- Fix: Incomplete backup.log with only one backup set

## v0.5.0 (2021-02-07)

- Add: Option for Backuplogfile
- Add: Option to create a backup only if something has changed #3

## v0.4.1 (2021-01-23)

- Optimize: Store profile data in `profile` folder

## v0.4.0 (2021-01-21)

- Add `templates` to backup
- Optimize: Delete old backups at the end of the backup job

## v0.3.1 (2021-01-21)

- Fix #1: Unsupported characters in filename

## v0.3.0 (2021-01-17)

- Fix: Backup not only the last 50 notebooks
- Add: Backup userchrome.css and userstyle.css
- Add: Option to create single file JEX for all notebooks

## v0.2.2 (2021-01-17)

- Fix: Check if keymap-desktop.json exists

## v0.2.1 (2021-01-16)

- remove seconds from folder

## v0.2.0 (2021-01-14)

- Add: Automatic backups every X hours

## v0.1.0 (2021-01-14)

- First version
