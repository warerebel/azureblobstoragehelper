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
                let result = "";
                response.on("error", (error) => {
                    callback(error);
                });
                response.on("data", (chunk) => {
                    result += chunk;
                });
                response.on("end", () => {
                    callback(null, {response: response, result: result});
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
                }
                me.executeRequest(httpOptions, (error, result) => {;
			if(!error)
				me.currentFilesystems.push(filesystem);
			callback(error, result);
		});
            }
            else{
                callback(null);
            }
    }

    createFile(fileName, filesystem, content, callback) {
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
	    this.executeRequest(createFileOptions, (error, response) => {
		if(error || response.statusCode > 399)
		    callback(error, response);
		else
			this.executeRequest(writeFileOptions, (error, response) => {
				if(error || response.statusCode > 399)
					callback(error, response);
				else
					this.executeRequest(flushOptions, (error, response) => {
						callback(error, response)
					});
			});
	    });
    }

    storeFile(filename, filesystem, content, callback){ 
            this.checkFilesystem(filesystem, (error, result) => {
		if(!error)
		    this.createFile(filename, filesystem, content, (error, result) => {
		    	callback(error, result);
		    });
		else
		callback(error, result);
	    });
    }

}

module.exports = azureStorage;
