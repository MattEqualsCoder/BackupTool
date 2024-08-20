import { BackupPaths, BackupRootPath, BackupDestinationPath, BackupPassword, TempPath } from './environment'
import { Logger } from './logger';
import * as fs from 'fs';
import path from 'path';
import dayjs from 'dayjs'
const _7z = require('7zip-min');

export class Backuper {

    RunBackup() : void {

        let date = dayjs().format("YYYYMMDDHHmmss");
        let tempPath = `${TempPath}/${date}`;

        Logger.info(`Creating backup ${tempPath}`);

        fs.mkdirSync(tempPath, { recursive: true });
        fs.mkdirSync(BackupDestinationPath, { recursive: true });

        try {
            BackupPaths.forEach(backup => {
                Logger.info(`Running backup for path ${backup.Path}`);
    
                if (!fs.existsSync(backup.Path)) {
                    Logger.warn(`Path ${backup.Path} does not exist`);
                    return;
                }
    
                if (fs.lstatSync(backup.Path).isDirectory()) {
                    this.RunDirectoryBackup(backup.Path, backup.RecursiveLevels, backup.Filters, tempPath);
                } else {
                    this.RunFileBackup(backup.Path, backup.Filters, tempPath);
                }
            });
    
            this.CreateZipFile(date);
        } catch (e: any) {
            Logger.error(e.Message);
            fs.rmSync(tempPath, { recursive: true, force: true});
            Logger.info("Removed temp folder");
        }
        
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

        Logger.info(`Creating compressed file ${TempPath}/${archiveDate}.7z`);

        let _7zArguments : string[] = ['a']

        if (BackupPassword) {
            _7zArguments.push(`-p${BackupPassword}`);
        }

        _7zArguments.push(`${TempPath}/${archiveDate}.7z`);
        _7zArguments.push(`${TempPath}/${archiveDate}/`);

        _7z.cmd(_7zArguments, (err: any) => {

            if (err) {
                Logger.error(err);
            } else {
                Logger.info(`Archive ${TempPath}/${archiveDate}.7z created`);
                fs.copyFileSync(`${TempPath}/${archiveDate}.7z`, `${BackupDestinationPath}/${archiveDate}.7z`, fs.constants.COPYFILE_FICLONE_FORCE);
                Logger.info(`Copied to ${BackupDestinationPath}/${archiveDate}.7z`);
            }

            fs.rmSync(`${TempPath}/${archiveDate}`, { recursive: true, force: true});

            
        });
    }

}