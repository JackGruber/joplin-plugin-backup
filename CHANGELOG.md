# Changelog

## not released

- Improved: The default setting for `Single JEX` is now `true` (Create only one JEX backup file) to prevent the loss of internal notelinks during a restore. Joplin Discourse: [Lost all connections of my notes](https://discourse.joplinapp.org/t/lost-all-connections-of-my-notes/25464)
- Improved: Create a sub folder `JoplinBackup` in the configured `Backup path` (Only for new installations).
- Improved: Use new Joplin DirectoryPath selector for path selection. Not supported in Joplin >= v2.9.1, non-compatible Joplin versions still use a text input field.

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
