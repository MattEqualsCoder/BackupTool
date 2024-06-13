import { BackupPaths, BackupRootPath, BackupDestinationPath } from './environment'
import { Logger } from './logger';
import * as fs from 'fs';
import path from 'path';
import dayjs from 'dayjs'
const archiver = require('archiver');

export class Backuper {

    RunBackup() : void {

        let date = dayjs().format("YYYYMMDDHHmmss");
        let backupPath = `${BackupDestinationPath}/${date}`;

        Logger.info(`Creating backup ${backupPath}`);

        fs.mkdirSync(backupPath, { recursive: true });

        BackupPaths.forEach(backup => {
            Logger.info(`Running backup for path ${backup.Path}`);

            if (!fs.existsSync(backup.Path)) {
                Logger.warn(`Path ${backup.Path} does not exist`);
                return;
            }

            if (fs.lstatSync(backup.Path).isDirectory()) {
                this.RunDirectoryBackup(backup.Path, backup.RecursiveLevels, backup.Filters, backupPath);
            } else {
                this.RunFileBackup(backup.Path, backup.Filters, backupPath);
            }
        });

        this.CreateZipFile(date);
    }

    RunDirectoryBackup(directoryPath: string, recursiveLevel: number, filters: string[], backupPath: string) {

        if (recursiveLevel < 0) {
            return;
        }

        let files = fs.readdirSync(directoryPath);

        files.forEach(file => {
            let fullPath = `${directoryPath}/${file}`;
            if (fs.lstatSync(fullPath).isDirectory()) {
                this.RunDirectoryBackup(fullPath, recursiveLevel - 1, filters, backupPath);
            } else {
                this.RunFileBackup(fullPath, filters, backupPath);
            }
        });
    }

    RunFileBackup(filePath: string, filters: string[], backupPath: string) {

        let baseName = path.basename(filePath);

        if (filters && !filters.some(filter => baseName.match(filter))) {
            return;
        }

        let directory = filePath.replace(baseName, "");
        let relativeDirectoryPath = path.relative(BackupRootPath, directory);
        if (!fs.existsSync(`${backupPath}/${relativeDirectoryPath}`)) {
            Logger.info(`Backing up folder ${directory} to ${backupPath}/${relativeDirectoryPath}`);
            fs.mkdirSync(`${backupPath}/${relativeDirectoryPath}`, { recursive: true });
        }

        let relativePath = path.relative(BackupRootPath, filePath);

        Logger.info(`Backing up file ${filePath} to ${backupPath}/${relativePath}`);
        fs.copyFileSync(filePath, `${backupPath}/${relativePath}`);
    }

    CreateZipFile(archiveDate: string) {
        const output = fs.createWriteStream(`${BackupDestinationPath}/${archiveDate}.zip`);
        const archive = archiver('zip', {
            zlib: { level: 9 }
        });

        Logger.info(`Creating up file ${BackupDestinationPath}/${archiveDate}.zip`);

        output.on('close', function() {
            fs.rmSync(`${BackupDestinationPath}/${archiveDate}`, { recursive: true, force: true});
            Logger.info(`Created ${BackupDestinationPath}/${archiveDate}.zip`);
        });

        archive.on('warning', function(err: any) {
            if (err.code === 'ENOENT') {
                Logger.warn(err);
            } else {
                Logger.error(err);
            }
        });
        
        archive.on('error', function(err: any) {
            Logger.error(err);
        });

        archive.pipe(output);
        archive.directory(`${BackupDestinationPath}/${archiveDate}/`, false);
        archive.finalize();
    }

}