import {request as httpsRequest, Agent} from "https";
import http from "http";
import {AzureSign, HttpOptions} from "@warerebel/azurerestauth";
import {Readable} from "stream";

export interface StorageOptions {
    force?: boolean,
    filesystem: string,
    filename?: string,
    position?: number,
    recursive?: boolean,
    httpHeaders?: object,
    content?: any,
    readChunkSize?: number
}

export class AzureBlobStorage {

    storageAccount: string;
    azureKeyAuth: AzureSign;
    knownFilesystems: String[];
    agent: Agent;

    constructor(storageAccount: string, storageSAS: string) {
        this.storageAccount = storageAccount;
        this.azureKeyAuth = new AzureSign(storageAccount, storageSAS);
        this.knownFilesystems = [];
        this.agent = new Agent({maxSockets: 150, keepAlive: true, maxFreeSockets: 100});
    }

    executeRequest(httpOptions: HttpOptions, content: any, callback: Function): void {
        if(typeof httpOptions.headers === "undefined")
            httpOptions.headers = {}
        httpOptions.agent = this.agent;
        httpOptions.headers.Authorization = this.azureKeyAuth.getAuthHeaderValue(httpOptions);
        let request = httpsRequest(httpOptions, (response: http.IncomingMessage) => {
            let returnedContent: string = "";
            response.on("error", (error: Error) => {
                callback(error);
            });
            response.on("data", (chunk: string) => {
                returnedContent += chunk;
            });
            response.on("end", () => {
                callback(null, response, returnedContent);
            });
        });
        request.on("error", (error) => {
            callback(error);
        });
        if (content)
            request.write(content);
        request.end();
    }

    createFilesystem(options: StorageOptions, callback: Function): void {
        if (options.force || this.knownFilesystems.indexOf(options.filesystem) < 0) {
            let httpOptions: HttpOptions = {
                method: "PUT",
                protocol: "https:",
                host: this.storageAccount.concat(".dfs.core.windows.net"),
                path: "/".concat(options.filesystem, "?resource=filesystem"),
                headers: {
                    "x-ms-date": new Date().toUTCString(),
                    "x-ms-version": "2019-02-02"
                }
            };
            this.executeRequest(httpOptions, null, (error: Error, response: http.IncomingMessage, content: any) => {
                if(!error && response.statusCode! < 400)
                    this.knownFilesystems.push(options.filesystem);
                callback(error, response, content);
            });
        }
        else{
            callback(null, {statusCode: 200});
        }
    }

    createFile(options: StorageOptions, callback: Function): void {
        let createFileOptions: HttpOptions = {
            method: "PUT",
            protocol: "https:",
            host: this.storageAccount.concat(".dfs.core.windows.net"),
            path: "/".concat(options.filesystem, "/", options.filename!, "?resource=file"),
            headers: options.httpHeaders || {}
        };
        createFileOptions.headers!["x-ms-date"] = new Date().toUTCString();
        createFileOptions.headers!["x-ms-version"] = "2019-02-02";
        createFileOptions.headers!["Content-Length"] = 0;
        this.executeRequest(createFileOptions, null, callback);
    }

    writeContent(options: StorageOptions, callback: Function): void {
        let writeFileOptions: HttpOptions = {
            method: "PATCH",
            protocol: "https:",
            host: this.storageAccount.concat(".dfs.core.windows.net"),
            path: "/".concat(options.filesystem, "/", options.filename!, "?action=append&position=" , typeof options.position !== "undefined" ? options.position.toString() : "0"),
            headers: options.httpHeaders || {}
        };
        writeFileOptions.headers!["x-ms-date"] = new Date().toUTCString();
        writeFileOptions.headers!["x-ms-version"] = "2019-02-02";
        writeFileOptions.headers!["Content-Length"] = Buffer.byteLength(options.content);
        this.executeRequest(writeFileOptions, options.content, callback);
    }

    getPath(options: StorageOptions, callback: Function): void {
        let pathOptions: HttpOptions = {
            method: "HEAD",
            protocol: "https:",
            host: this.storageAccount.concat(".dfs.core.windows.net"),
            path: "/".concat(options.filesystem, "/", options.filename!),
            headers: options.httpHeaders || {}
        };
        pathOptions.headers!["x-ms-date"] = new Date().toUTCString();
        pathOptions.headers!["x-ms-version"] = "2019-02-02";
        pathOptions.headers!["Content-Length"] = 0;
        this.executeRequest(pathOptions, null, callback);
    }

    flushContent(options: StorageOptions, callback: Function): void {
        let flushOptions: HttpOptions = {
            method: "PATCH",
            protocol: "https:",
            host: this.storageAccount.concat(".dfs.core.windows.net"),
            path: "/".concat(options.filesystem, "/", options.filename!, "?action=flush&position=", options.position!.toString()),
            headers: options.httpHeaders || {}
        };
        flushOptions.headers!["x-ms-date"] = new Date().toUTCString();
        flushOptions.headers!["x-ms-version"] = "2019-02-02";
        flushOptions.headers!["Content-Length"] = 0;
        this.executeRequest(flushOptions, null, callback);
    }

    delete(options: StorageOptions, callback: Function): void {
        if(!options.recursive)
            options.recursive = false;
        let deleteOptions: HttpOptions = {
            method: "DELETE",
            protocol: "https:",
            host: this.storageAccount.concat(".dfs.core.windows.net"),
            path: "/".concat(options.filesystem, "/", options.filename!, "?recursive=", options.recursive.toString()),
            headers: options.httpHeaders || {}
        };
        deleteOptions.headers!["x-ms-date"] = new Date().toUTCString();
        deleteOptions.headers!["x-ms-version"] = "2019-02-02";
        deleteOptions.headers!["Content-Length"] = 0;
        this.executeRequest(deleteOptions, null, callback);
    }

    writeStream(options: StorageOptions, stream: Readable, callback: Function): void{
        let currentPosition = 0;
        let currentLength = 0;
        let finished = false;
        let queueLength = 0;

        stream.on("readable", () => {
            let chunk = stream.read(options.readChunkSize);
            if(chunk !== null){
                let chunkLength = Buffer.byteLength(chunk);
                currentLength += chunkLength;
                options.content = chunk;
                options.position = currentPosition;
                currentPosition = currentLength;
                queueLength++;
                this.writeContent(options, (error: Error, response: http.IncomingMessage, content: any) => {
                    queueLength--;
                    if(error)
                        callback(error, response, content);
                    if(finished && queueLength === 0){
                        options.position = currentLength;
                        this.flushContent(options, callback);
                    }
                });
            }
        });

        stream.on("end", () => {
            finished = true;
            if(queueLength === 0){
                options.position = currentLength;
                this.flushContent(options, callback);
            }
        });
        stream.on("error", (error) => {
            callback(error);
        });
    }

    getStream(options: StorageOptions, callback: Function): void{
        let getStreamOptions: HttpOptions = {
            method: "GET",
            protocol: "https:",
            host: this.storageAccount.concat(".dfs.core.windows.net"),
            path: "/".concat(options.filesystem, "/", options.filename!),
            headers: options.httpHeaders || {}
        };
        getStreamOptions.agent = this.agent;
        getStreamOptions.headers!["x-ms-date"] = new Date().toUTCString();
        getStreamOptions.headers!["x-ms-version"] = "2019-02-02";
        getStreamOptions.headers!.Authorization = this.azureKeyAuth.getAuthHeaderValue(getStreamOptions);
        let request = httpsRequest(getStreamOptions, (response: http.IncomingMessage) => {
            callback(null, response);
        });
        request.on("error", (error: Error) => {
            callback(error);
        });
        request.end();
    }
}

