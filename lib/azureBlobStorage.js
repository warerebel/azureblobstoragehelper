const https = require("https");
const azureSharedKeyAuth = require("@warerebel/azurerestauth");

class azureStorage {

    constructor(storageAccount, storageSAS) {
        this.storageAccount = storageAccount;
        this.azureKeyAuth = new azureSharedKeyAuth(storageAccount, storageSAS);
        this.currentFilesystems = [];
    }

    executeRequest(httpOptions, content) {
        return new Promise((resolve, reject) => {
            httpOptions.headers.Authorization = this.azureKeyAuth.getAuthHeaderValue(httpOptions);
            let request = https.request(httpOptions, (response) => {
                let result = "";
                response.on("error", (error) => {
                    reject(error);
                });
                response.on("data", (chunk) => {
                    result += chunk;
                });
                response.on("end", () => {
                    resolve({resonse: response, result: result});
                });
            });
            request.on("error", (error) => {
                reject(error);
            });
            if (content)
                request.write(content);
            request.end();
        });
    }

    checkFilesystem(filesystem) {
        return new Promise(async (resolve, reject) => {
            if (this.currentFilesystems.indexOf(filesystem) === -1) {
                let httpOptions = {
                    method: "PUT",
                    protocol: "https:",
                    host: this.storageAccount.concat(".dfs.core.windows.net"),
                    path: "/".concat(filesystem, "?resource=filesystem"),
                    headers: {
                        "x-ms-date": new Date().toUTCString(),
                        "x-ms-version": "2019-02-02"
                    }
                }
                try {
                    let response = await this.executeRequest(httpOptions);
                    this.currentFilesystems.push(filesystem);
                    resolve(response);
                } catch (error) {
                    reject(error);
                }
            }
            else{
                resolve(true);
            }
        });
    }

    async createFile(fileName, filesystem, content) {
        return new promise(async (resolve, reject) => {
            let contentLength = Buffer.byteLength(content);
            let createFileOptions = {
                method: "PUT",
                protocol: "https:",
                host: process.env.NTIS_DATD_STORAGE_ACCOUNT.concat(".dfs.core.windows.net"),
                path: "/".concat(filesystem, "/", fileName, "?resource=file"),
                headers: {
                    "x-ms-date": new Date().toUTCString(),
                    "x-ms-version": "2019-02-02",
                    "Content-Length": 0,
                    "x-ms-content-type": "application/xml"
                }
            }
            let writeFileOptions = {
                method: "PATCH",
                protocol: "https:",
                host: process.env.NTIS_DATD_STORAGE_ACCOUNT.concat(".dfs.core.windows.net"),
                path: "/".concat(filesystem, "/", fileName, "?action=append&position=0"),
                headers: {
                    "x-ms-date": new Date().toUTCString(),
                    "x-ms-version": "2019-02-02",
                    "Content-Length": contentLength,
                    "x-ms-content-type": "application/xml"
                }
            }
            let flushOptions = {
                method: "PATCH",
                protocol: "https:",
                host: process.env.NTIS_DATD_STORAGE_ACCOUNT.concat(".dfs.core.windows.net"),
                path: "/".concat(filesystem, "/", fileName, "?action=flush&position=", contentLength),
                headers: {
                    "x-ms-date": new Date().toUTCString(),
                    "x-ms-version": "2019-02-02",
                    "x-ms-content-type": "application/xml",
                    "Content-Length": 0
                }
            }
            try {
                let response = {};
                response.createFile = await this.executeRequest(createFileOptions);
                response.writeFile = await this.executeRequest(writeFileOptions);
                response.flushFile = await this.executeRequest(flushOptions);
                resolve(response);
            } catch (error) {
                reject(error);
            }
        });
    }

    async storeFile(filename, filesystem, content) {
        return new Promise(async(resolve, reject) => {
            try{
            let response = {};
            response.fileSystemCheck = await this.checkFilesystem(filesystem);
            response.storeFile = await this.createFile(filename, filesystem, content);
            resolve(response);
            } 
            catch(error){
                reject(error);
            }
        });
    }

}

module.exports = azureStorage;