const https = require("https");
const azureSharedKeyAuth = require("@warerebel/azurerestauth");

class azureStorage {

    constructor(storageAccount, storageSAS) {
        this.storageAccount = storageAccount;
        this.azureKeyAuth = new azureSharedKeyAuth(storageAccount, storageSAS);
        this.currentFilesystems = [];
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

    checkFilesystem(filesystem, callback) {
        let me = this;
        if (this.currentFilesystems.indexOf(filesystem) < 0) {
            let httpOptions = {
                method: "PUT",
                protocol: "https:",
                host: this.storageAccount.concat(".dfs.core.windows.net"),
                path: "/".concat(filesystem, "?resource=filesystem"),
                headers: {
                    "x-ms-date": new Date().toUTCString(),
                    "x-ms-version": "2019-02-02"
                }
            };
            me.executeRequest(httpOptions, null, (error, result, content) => {
                if(!error)
                    me.currentFilesystems.push(filesystem);
                callback(error, result, content);
            });
        }
        else{
            callback(null, {statusCode: 200});
        }
    }

    createFile(fileName, filesystem, content, callback) {
        let contentLength = typeof content !== "object" && typeof content !== "undefined" ? Buffer.byteLength(content) : 0;
        let createFileOptions = {
            method: "PUT",
            protocol: "https:",
            host: this.storageAccount.concat(".dfs.core.windows.net"),
            path: "/".concat(filesystem, "/", fileName, "?resource=file"),
            headers: {
                "x-ms-date": new Date().toUTCString(),
                "x-ms-version": "2019-02-02",
                "Content-Length": 0,
                "x-ms-content-type": "application/xml"
            }
        };
            
        let writeFileOptions = {
            method: "PATCH",
            protocol: "https:",
            host: this.storageAccount.concat(".dfs.core.windows.net"),
            path: "/".concat(filesystem, "/", fileName, "?action=append&position=0"),
            headers: {
                "x-ms-date": new Date().toUTCString(),
                "x-ms-version": "2019-02-02",
                "Content-Length": contentLength,
                "x-ms-content-type": "application/xml"
            }
        };
            
        let flushOptions = {
            method: "PATCH",
            protocol: "https:",
            host: this.storageAccount.concat(".dfs.core.windows.net"),
            path: "/".concat(filesystem, "/", fileName, "?action=flush&position=", contentLength),
            headers: {
                "x-ms-date": new Date().toUTCString(),
                "x-ms-version": "2019-02-02",
                "x-ms-content-type": "application/xml",
                "Content-Length": 0
            }
        };
            
        this.executeRequest(createFileOptions, null, (error, response, content) => {
            if(error || response.statusCode > 399)
                callback(error, response, content);
            else
                this.executeRequest(writeFileOptions, content, (error, response, content) => {
                    if(error || response.statusCode > 399)
                        callback(error, response, content);
                    else
                        this.executeRequest(flushOptions, null, (error, response, content) => {
                            callback(error, response, content);
                        });
                });
        });
    }

    storeFile(filename, filesystem, content, callback){
        this.checkFilesystem(filesystem, (error, result) => {
            if(!error)
                this.createFile(filename, filesystem, content, (error, result, returnedContent) => {
                    callback(error, result, returnedContent);
                });
            else
                callback(error, result);
        });
    }

}

module.exports = azureStorage;
