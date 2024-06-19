import { BackupPaths, BackupRootPath, BackupDestinationPath, BackupPassword } from './environment'
import { Logger } from './logger';
import * as fs from 'fs';
import path from 'path';
import dayjs from 'dayjs'
const _7z = require('7zip-min');

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

        Logger.info(`Creating compressed file ${BackupDestinationPath}/${archiveDate}.7z`);

        let _7zArguments : string[] = ['a']

        if (BackupPassword) {
            _7zArguments.push(`-p${BackupPassword}`);
        }

        _7zArguments.push(`${BackupDestinationPath}/${archiveDate}.7z`);
        _7zArguments.push(`${BackupDestinationPath}/${archiveDate}/`);

        _7z.cmd(_7zArguments, (err: any) => {

            if (err) {
                Logger.error(err);
            } else {
                Logger.info(`Archive ${BackupDestinationPath}/${archiveDate}.7z created`);
            }

            fs.rmSync(`${BackupDestinationPath}/${archiveDate}`, { recursive: true, force: true});
        });
    }

}