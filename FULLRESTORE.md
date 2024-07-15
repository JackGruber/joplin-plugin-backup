# Full Joplin restore

A Joplin Export (JEX) file created by the Backup plugin can be used to perform a full restore of all notebooks, notes and attachments. This should be carefully undertaken as a mistake could cause the notes in the clients and on the sync server to be duplicated. To avoid duplication it also requires that any clients attached to the server are cleared of their note data and are then re-synced after the restore. For those with large note collections and numerous, large files attached to the notes, this could take a long time for each client. Essentially undertaking a full restore is a disaster recovery exercise. If you wish to just re-upload your notes to the server or re-download your notes from the server please please refer to the Joplin settings for Synchronisation under "Show Advanced Settings".

> When Joplin imports a JEX backup file **it treats every notebook and note within that backup as a new item**. All the items in the backup will get new unique reference numbers (however links between notes will be maintained). If the client the backup is being restored to already contains all or some of the notebooks and notes in the backup they will be duplicated.
>
> A JEX backup file **does not** contain any note history. It contains the notebooks, notes and attachments as they were at the time the backup was made.

The following options for a restore are described here:

- [Full Restore - Without fully resetting the Joplin clients](#full-restore---without-fully-resetting-the-joplin-clients)
- [Full Restore - Fully resetting the Joplin clients](#full-restore---fully-resetting-the-joplin-clients)

## Full Restore - Without fully resetting the Joplin clients

With this method the existing link to the synchronisation cloud storage server will be preserved and used. If End to End Encryption (E2EE) has been enabled the settings will be preserved and used. Any customisation and installed plugins will be retained.

- Identify the Joplin desktop client that has the best Internet connection as this will be the primary machine for the restore.
- Place a copy of the Joplin backup file on that machine.
- Open the Joplin client on the primary machine and delete all notes and notebooks.
- Empty the Joplin client trash folder (Joplin 3.0+).
- Sync the Joplin client so that all the notes are deleted on the cloud storage server.
- When the above sync is complete, sync any other clients so that all the notebooks and notes they contain are deleted.
- In case the cloud storage server has limits on how much data can be transferred at once it is suggested that all clients other than the one on the primary machine are shut down.
- When all clients are empty move to the primary machine and import the backup (`File > Import > JEX - Joplin Export File`).
- Sync the client to the cloud storage server. If you have a large collection of notes and attachments this may tale some time.
- Once complete, start each client in turn and sync. The restored notes will be downloaded. If you have a large collection of notes and attachments this may tale some time.
- If you are certain that the cloud provider will not limit connections or download speed if a large volume of transfers are made, the other clients could be synced at the same time.

## Full Restore - Fully resetting the Joplin clients

With this method the existing link to the synchronisation cloud storage server will be lost. If End to End Encryption (E2EE) has been enabled the settings will be lost. Any customisation and installed plugins will be lost but **copies are stored with the JEX file in the backup archive**.

- Identify the Joplin desktop client that has the best Internet connection as this will be the primary machine for the restore.
- Place a copy of the Joplin backup file on that machine.
- If possible, open the Joplin client on the primary machine and delete all notes and notebooks.
- Empty the Joplin client trash folder (Joplin 3.0+).
- Sync the Joplin client so that all the notes are deleted on the cloud storage server, or access the cloud storage server directly and delete the files in the folder Joplin uses for syncing.
- Completely shut down all clients (`File > Quit`), including the primary machine.
- On Windows machines delete, rename or move the folder `C:\Users\username\.config\joplin-desktop`
- On Linux and Mac machines delete, rename or move the folder `/home/username/.config/joplin-desktop`
- On mobile devices use the mobile OS's App settings to delete the Joplin app data and cache.
- Start the Joplin client on the primary machine.
- Joplin will recreate the `joplin-desktop` folder and the client will be as if just installed with only the "Welcome" notes.
- There will be no sync settings or E2EE settings.
- Connect the primary machine to the cloud storage server using the required credentials.
- Sync to the server (this will be just the "Welcome" notes and so should be very quick).
- If required set up E2EE and re-sync (this will be just the "Welcome" notes and so should be very quick).
- For every other client, open Joplin, delete the "Welcome" notes and connect to the cloud storage server being used for sync.
- This will download the encrypted notes created by the primary machine, so when prompted by Joplin enter the E2EE password that was previously set on the primary machine (this will be just the "Welcome" notes and so should be very quick).
- Once it is confirmed that all clients are connected and that E2EE is working, fully shut down all clients except on the primary machine.
- Open the Joplin client on the primary machine and delete the "Welcome" notes / notebook.
- Empty the Joplin client trash folder (Joplin 3.0+).
- Import the backup (`File > Import > JEX - Joplin Export File`).
- Sync the client to the cloud storage server. If you have a large collection of notes and attachments this may tale some time.
- Once complete, start each client in turn and sync. The restored notes will be downloaded. If you have a large collection of notes and attachments this may tale some time.
- If you are certain that the cloud provider will not limit connections or download speed if a large volume of transfers are made, the other clients could be synced at the same time.
