/* eslint-disable no-undef */
const sinon = require("sinon");
const assert = require("assert");
const https = require("https");
const passthrough = require("stream").PassThrough;
const azureBlobStorage = require("../lib/azureBlobStorage");

describe("It provides a convenience wrapper around the Azure blob storage rest api", function(){

    this.beforeEach(function(){
        this.myAzureBlobStorage = new azureBlobStorage("account", "key");
    });

    it("Executes an http call with received options and returns the result", function(done){
        this.callbacks = [];
        this.request = sinon.stub(https, "request");
        this.request.on = function(name, callback){this.callbacks[name] = callback;}.bind(this);
        this.request.end = function(){};
        this.request.write = function(){};
        let content = "Test returned content";
        let response = new passthrough();
        response.statusCode = 200;
        response.write(JSON.stringify(content));
        this.request.callsArgWith(1, response).returns(this.request);

        let options = {
            method: "PUT",
            protocol: "https:",
            host: "testhost.dfs.core.windows.net",
            path: "/test?resource=filesystem",
            headers: {
                "x-ms-date": new Date().toUTCString(),
                "x-ms-version": "2019-02-02"
            }
        };

        this.myAzureBlobStorage.executeRequest(options, "Test sent content", (error, result) => {
            assert(!error);
            assert.deepEqual(result.statusCode, 200);
            done();
        });
        response.end();
    });

    it("Checks if a filesystem exists and tries to create it if not", function(done){
        let executeStub = sinon.stub(this.myAzureBlobStorage, "executeRequest").yields(null, {statusCode: 200});
        let options = {
            filesystem: "myfs"
        };
        this.myAzureBlobStorage.createFilesystem(options, () => {
            assert.deepEqual(executeStub.callCount, 1);
            this.myAzureBlobStorage.createFilesystem(options, () => {
                assert.deepEqual(executeStub.callCount, 1);
                done();
            });
        });
    });

    it("creates a file in blob storage", function(done){
        let executeStub = sinon.stub(this.myAzureBlobStorage, "executeRequest").yields(null, {statusCode: 200});
        let timestamp = new Date().toUTCString();
        let options = {
            filesystem: "name",
            filename: "myfile.txt",
            httpHeaders: {
                "Content-Type": "text/plain"
            }
        };
        let expectedOptions = {
            method: "PUT",
            protocol: "https:",
            host: "account.dfs.core.windows.net",
            path: "/name/myfile.txt?resource=file",
            headers: {
                "x-ms-date": timestamp,
                "x-ms-version": "2019-02-02",
                "Content-Length": 0,
                "Content-Type": "text/plain"
            }
        };
        
        this.myAzureBlobStorage.createFile(options, () => {
            assert.deepEqual(executeStub.args[0][0], expectedOptions);
            done();
        });
    });

    it("appends fixed data to a file in blob storage", function(done){
        let executeStub = sinon.stub(this.myAzureBlobStorage, "executeRequest").yields(null, {statusCode: 200});
        let timestamp = new Date().toUTCString();
        let options = {
            filesystem: "name",
            filename: "myfile.txt",
            content: "My Content",
            httpHeaders: {
                "Content-Type": "text/plain"
            }
        };
        let expectedOptions = {
            method: "PATCH",
            protocol: "https:",
            host: "account.dfs.core.windows.net",
            path: "/name/myfile.txt?action=append&position=0",
            headers: {
                "x-ms-date": timestamp,
                "x-ms-version": "2019-02-02",
                "Content-Length": 10,
                "Content-Type": "text/plain"
            }
        };
        
        this.myAzureBlobStorage.writeContent(options, () => {
            assert.deepEqual(executeStub.args[0][0], expectedOptions);
            done();
        });
    });

    it("pipes data to a blob", function(done){
        let instream = new passthrough();
        let executeStub = sinon.stub(this.myAzureBlobStorage, "executeRequest").yields(null, {statusCode: 200});
        let options = {
            filesystem: "name", // Required - must be lower case
            filename: "myfile.txt", // Required
            httpHeaders: {
                // Any custom http headers to set - optional and can be omitted
                "Content-Type": "text/plain"
            }
        };
        instream.write("Data", "utf8", () => {
            instream.write("Data", "utf8", () => {
                this.myAzureBlobStorage.writeStream(options, instream,  () => {
                    assert.deepEqual(executeStub.callCount, 3);
                    assert.deepEqual(executeStub.args[2][0].path, "/name/myfile.txt?action=flush&position=8");
                    done();
                });
                instream.end(); 
            });
        });
    });
    
    it("flushes data to a file in blob storage", function(done){
        let executeStub = sinon.stub(this.myAzureBlobStorage, "executeRequest").yields(null, {statusCode: 200});
        let timestamp = new Date().toUTCString();
        let options = {
            filesystem: "name",
            filename: "myfile.txt",
            position: 10,
            httpHeaders: {
                "Content-Type": "text/plain"
            }
        };
        let expectedOptions = {
            method: "PATCH",
            protocol: "https:",
            host: "account.dfs.core.windows.net",
            path: "/name/myfile.txt?action=flush&position=10",
            headers: {
                "x-ms-date": timestamp,
                "x-ms-version": "2019-02-02",
                "Content-Length": 0,
                "Content-Type": "text/plain"
            }
        };
        
        this.myAzureBlobStorage.flushContent(options, () => {
            assert.deepEqual(executeStub.args[0][0], expectedOptions);
            done();
        });
    });

});

