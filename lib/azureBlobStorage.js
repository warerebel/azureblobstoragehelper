const https = require("https");
const azureSharedKeyAuth = require("@warerebel/azurerestauth");

class azureStorage {

    constructor(storageAccount, storageSAS) {
        this.storageAccount = storageAccount;
        this.azureKeyAuth = new azureSharedKeyAuth(storageAccount, storageSAS);
        this.knownFilesystems = [];
    }

    executeRequest(httpOptions, content, callback) {
        httpOptions.headers.Authorization = this.azureKeyAuth.getAuthHeaderValue(httpOptions);
        let request = https.request(httpOptions, (response) => {
            let returnedContent = "";
            response.on("error", (error) => {
                callback(error);
            });
            response.on("data", (chunk) => {
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

    createFilesystem(options, callback) {
        if (options.force || this.knownFilesystems.indexOf(options.filesystem) < 0) {
            let httpOptions = {
                method: "PUT",
                protocol: "https:",
                host: this.storageAccount.concat(".dfs.core.windows.net"),
                path: "/".concat(options.filesystem, "?resource=filesystem"),
                headers: {
                    "x-ms-date": new Date().toUTCString(),
                    "x-ms-version": "2019-02-02"
                }
            };
            this.executeRequest(httpOptions, null, (error, response, content) => {
                if(!error && response.statusCode < 400)
                    this.knownFilesystems.push(options.filesystem);
                callback(error, response, content);
            });
        }
        else{
            callback(null, {statusCode: 200});
        }
    }

    createFile(options, callback) {
        let createFileOptions = {
            method: "PUT",
            protocol: "https:",
            host: this.storageAccount.concat(".dfs.core.windows.net"),
            path: "/".concat(options.filesystem, "/", options.filename, "?resource=file"),
            headers: options.httpHeaders || {}
        };
        createFileOptions.headers["x-ms-date"] = new Date().toUTCString();
        createFileOptions.headers["x-ms-version"] = "2019-02-02";
        createFileOptions.headers["Content-Length"] = 0;
        this.executeRequest(createFileOptions, null, callback);
    }

    writeContent(options, callback) {
        let writeFileOptions = {
            method: "PATCH",
            protocol: "https:",
            host: this.storageAccount.concat(".dfs.core.windows.net"),
            path: "/".concat(options.filesystem, "/", options.filename, "?action=append&position=" , options.position || 0),
            headers: options.httpHeaders || {}
        };
        writeFileOptions.headers["x-ms-date"] = new Date().toUTCString();
        writeFileOptions.headers["x-ms-version"] = "2019-02-02";
        writeFileOptions.headers["Content-Length"] = Buffer.byteLength(options.content);
        this.executeRequest(writeFileOptions, options.content, callback);
    }

    getPath(options, callback) {
        let pathOptions = {
            method: "HEAD",
            protocol: "https:",
            host: this.storageAccount.concat(".dfs.core.windows.net"),
            path: "/".concat(options.filesystem, "/", options.filename),
            headers: options.httpHeaders || {}
        };
        pathOptions.headers["x-ms-date"] = new Date().toUTCString();
        pathOptions.headers["x-ms-version"] = "2019-02-02";
        pathOptions.headers["Content-Length"] = 0;
        this.executeRequest(pathOptions, null, callback);
    }

    flushContent(options, callback) {
        let flushOptions = {
            method: "PATCH",
            protocol: "https:",
            host: this.storageAccount.concat(".dfs.core.windows.net"),
            path: "/".concat(options.filesystem, "/", options.filename, "?action=flush&position=", options.position),
            headers: options.httpHeaders || {}
        };
        flushOptions.headers["x-ms-date"] = new Date().toUTCString();
        flushOptions.headers["x-ms-version"] = "2019-02-02";
        flushOptions.headers["Content-Length"] = 0;
        this.executeRequest(flushOptions, null, callback);
    }

    delete(options, callback) {
        if(!options.recursive)
            options.recursive = false;
        let deleteOptions = {
            method: "DELETE",
            protocol: "https:",
            host: this.storageAccount.concat(".dfs.core.windows.net"),
            path: "/".concat(options.filesystem, "/", options.filename, "?recursive=", options.recursive),
            headers: options.httpHeaders || {}
        };
        deleteOptions.headers["x-ms-date"] = new Date().toUTCString();
        deleteOptions.headers["x-ms-version"] = "2019-02-02";
        deleteOptions.headers["Content-Length"] = 0;
        this.executeRequest(deleteOptions, null, callback);
    }

    writeStream(options, stream, callback){
        let currentPosition = 0;
        let currentLength = 0;
        let finished = false;
        let queueLength = 0;

        stream.on("readable", () => {
            let chunk = stream.read(options.readChunk);
            if(chunk !== null){
                let chunkLength = Buffer.byteLength(chunk);
                currentLength += chunkLength;
                options.content = chunk;
                options.position = currentPosition;
                currentPosition = currentLength;
                queueLength++;
                this.writeContent(options, (error, response, content) => {
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

    getStream(options, callback){
        let getStreamOptions = {
            method: "GET",
            protocol: "https:",
            host: this.storageAccount.concat(".dfs.core.windows.net"),
            path: "/".concat(options.filesystem, "/", options.filename),
            headers: options.httpHeaders || {}
        };
        getStreamOptions.headers["x-ms-date"] = new Date().toUTCString();
        getStreamOptions.headers["x-ms-version"] = "2019-02-02";
        getStreamOptions.headers.Authorization = this.azureKeyAuth.getAuthHeaderValue(getStreamOptions);
        let request = https.request(getStreamOptions, (response) => {
            callback(null, response);
        });
        request.on("error", (error) => {
            callback(error);
        });
        request.end();
    }
}

module.exports = azureStorage;
