import {AzureSign, HttpOptions} from "@warerebel/azurerestauth";
import {Readable} from "stream";

export interface StorageOptions {
    force?: boolean;
    filesystem: string;
    filename?: string;
    position?: number;
    recursive?: boolean;
    httpHeaders?: object;
    content?: string | Buffer | null;
    readChunkSize?: number;
}

export class AzureBlobStorage {
    storageAccount: string;
    azureKeyAuth: AzureSign;

    constructor(storageAccount: string, storageSAS: string);

    createFilesystem(options: StorageOptions, callback: Function): void;
    createFile(options: StorageOptions, callback: Function): void;
    writeContent(options: StorageOptions, callback: Function): void;
    getPath(options: StorageOptions, callback: Function): void;
    flushContent(options: StorageOptions, callback: Function): void;
    delete(options: StorageOptions, callback: Function): void;
    writeStream(options: StorageOptions, stream: Readable, callback: Function): void;
    getStream(options: StorageOptions, callback: Function): void;
}
