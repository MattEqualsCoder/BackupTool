import * as dotenv from "dotenv";
import * as fs from 'fs';
import { parse } from 'yaml';

dotenv.config();

class BackupPath {
    Path: string = "";
    RecursiveLevels: number = 0;
    Filters: string[] = [];
}

const tempPath = process.env.TEMP_PATH ?? "/tmp";

let backupYamlPath = process.env.BACKUP_YAML_PATH;
if (!backupYamlPath) {
    backupYamlPath = "./backup.yml"
}
const yamlText = fs.readFileSync(backupYamlPath, 'utf8');
const yamlValue = parse(yamlText);

let backupSchedule : string = yamlValue["schedule"];
if (!backupSchedule) {
    backupSchedule = "0/15 * * * *";
}

let backupRootPath : string = yamlValue["root_path"];
if (!backupRootPath) {
    backupRootPath = "/";
}

let backupDestinationPath : string = yamlValue["destination_path"];
if (!backupDestinationPath) {
    backupDestinationPath = `${backupRootPath}/backups`;
}

let backupPassword : string = yamlValue["password"];

const backupPaths : BackupPath[] = [];

let paths : any[] = yamlValue["paths"];

paths.forEach(path => {
    let pathDetails = path;
    backupPaths.push({
        Path: pathDetails['path'],
        RecursiveLevels: pathDetails['recursive_levels'],
        Filters: pathDetails['filters']
    });
});

export {
    backupSchedule as BackupSchedule,
    backupPaths as BackupPaths,
    backupRootPath as BackupRootPath,
    backupDestinationPath as BackupDestinationPath,
    backupPassword as BackupPassword,
    tempPath as TempPath
}