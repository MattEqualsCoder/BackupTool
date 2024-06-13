import { BackupSchedule } from './environment'
import { Backuper } from './backuper';

const backup = new Backuper();
backup.RunBackup();

var cron = require('node-cron');
cron.schedule(BackupSchedule, () => {
    backup.RunBackup();
});