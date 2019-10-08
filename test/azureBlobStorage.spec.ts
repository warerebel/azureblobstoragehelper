import sinon from "sinon";
import Assert from "assert";
import https from "https";
import {IncomingMessage} from "http";
import {PassThrough} from "stream";
import {AzureBlobStorage} from "../src/azureBlobStorage";

class MockResponse extends PassThrough {
    statusCode = 0;
}

describe("It provides a convenience wrapper around the Azure blob storage rest api", function(){

    this.beforeEach(function(){
        this.myAzureBlobStorage = new AzureBlobStorage("account", "key");
    });

    this.afterEach(function(){
        sinon.restore();
    });

    it("Executes an http call with received options and returns the result", function(done){
        this.callbacks = {};
        this.request = sinon.stub(https, "request");
        this.request.on = (name: string, callback: Function): void => {this.callbacks[name] = callback;};
        this.request.end = function(): void{;};
        this.request.write = function(): void{;};
        const content = "Test returned content";
        const response = new MockResponse();
        response.statusCode = 200;
        response.write(JSON.stringify(content));
        this.request.callsArgWith(1, response).returns(this.request);

        const options = {
            method: "PUT",
            protocol: "https:",
            host: "testhost.dfs.core.windows.net",
            path: "/test?resource=filesystem",
            headers: {
                "x-ms-date": new Date().toUTCString(),
                "x-ms-version": "2019-02-02"
            }
        };

        this.myAzureBlobStorage.executeRequest(options, "Test sent content", (error: Error, result: IncomingMessage) => {
            Assert(!error);
            Assert.deepEqual(result.statusCode, 200);
            done();
        });
        response.end();
    });

    it("Checks if a filesystem exists and tries to create it if not", function(done){
        const executeStub = sinon.stub(this.myAzureBlobStorage, "executeRequest").yields(null, {statusCode: 200});
        const options = {
            filesystem: "myfs"
        };
        this.myAzureBlobStorage.createFilesystem(options, () => {
            Assert.deepEqual(executeStub.callCount, 1);
            this.myAzureBlobStorage.createFilesystem(options, () => {
                Assert.deepEqual(executeStub.callCount, 1);
                done();
            });
        });
    });

    it("creates a file in blob storage", function(done){
        const executeStub = sinon.stub(this.myAzureBlobStorage, "executeRequest").yields(null, {statusCode: 200});
        const timestamp = new Date().toUTCString();
        const options = {
            filesystem: "name",
            filename: "myfile.txt",
            httpHeaders: {
                "Content-Type": "text/plain"
            }
        };
        const expectedOptions = {
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
            Assert.deepEqual(executeStub.args[0][0], expectedOptions);
            done();
        });
    });

    it("appends fixed data to a file in blob storage", function(done){
        const executeStub = sinon.stub(this.myAzureBlobStorage, "executeRequest").yields(null, {statusCode: 200});
        const timestamp = new Date().toUTCString();
        const options = {
            filesystem: "name",
            filename: "myfile.txt",
            content: "My Content",
            httpHeaders: {
                "Content-Type": "text/plain"
            }
        };
        const expectedOptions = {
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
            Assert.deepEqual(executeStub.args[0][0], expectedOptions);
            done();
        });
    });

    it("pipes data to a blob", function(done){
        const instream = new PassThrough();
        const executeStub = sinon.stub(this.myAzureBlobStorage, "executeRequest").yields(null, {statusCode: 200});
        const options = {
            filesystem: "name",
            filename: "myfile.txt",
            httpHeaders: {
                "Content-Type": "text/plain"
            }
        };
        instream.write("Data", "utf8", () => {
            instream.write("Data", "utf8", () => {
                this.myAzureBlobStorage.writeStream(options, instream,  () => {
                    Assert.deepEqual(executeStub.callCount, 2);
                    Assert.deepEqual(executeStub.args[1][0].path, "/name/myfile.txt?action=flush&position=8");
                    done();
                });
                instream.end(); 
            });
        });
    });
    
    it("flushes data to a file in blob storage", function(done){
        const executeStub = sinon.stub(this.myAzureBlobStorage, "executeRequest").yields(null, {statusCode: 200});
        const timestamp = new Date().toUTCString();
        const options = {
            filesystem: "name",
            filename: "myfile.txt",
            position: 10,
            httpHeaders: {
                "Content-Type": "text/plain"
            }
        };
        const expectedOptions = {
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
            Assert.deepEqual(executeStub.args[0][0], expectedOptions);
            done();
        });
    });

    it("returns a stream of blob data", function (done){
        const executeStub = sinon.stub(https, "request").yields({statusCode: 200});
        const options = {
            filesystem: "name",
            filename: "myfile.txt",
            "Content-Length": 0
        };
        
        this.myAzureBlobStorage.getStream(options, (error: Error, stream: IncomingMessage) => {
            Assert(!error);
            Assert.deepEqual(executeStub.callCount, 1);
            Assert.deepEqual(error, null);
            Assert.deepEqual(stream.statusCode, 200);
            done();
        });
    });

    it("Checks if a path exists", function(done){
        const executeStub = sinon.stub(this.myAzureBlobStorage, "executeRequest").yields(null, {statusCode: 200});
        const timestamp = new Date().toUTCString();
        const options = {
            filesystem: "name",
            filename: "myfile.txt",
        };
        const expectedOptions = {
            method: "HEAD",
            protocol: "https:",
            host: "account.dfs.core.windows.net",
            path: "/name/myfile.txt",
            headers: {
                "x-ms-date": timestamp,
                "x-ms-version": "2019-02-02",
                "Content-Length": 0
            }
        };
        
        this.myAzureBlobStorage.getPath(options, () => {
            Assert.deepEqual(executeStub.args[0][0], expectedOptions);
            done();
        });
    });

    it("Deletes a file", function(done){
        const executeStub = sinon.stub(this.myAzureBlobStorage, "executeRequest").yields(null, {statusCode: 200});
        const timestamp = new Date().toUTCString();
        const options = {
            filesystem: "name",
            filename: "myfile.txt",
            recursive: true
        };
        const expectedOptions = {
            method: "DELETE",
            protocol: "https:",
            host: "account.dfs.core.windows.net",
            path: "/name/myfile.txt?recursive=true",
            headers: {
                "x-ms-date": timestamp,
                "x-ms-version": "2019-02-02",
                "Content-Length": 0
            }
        };
        
        this.myAzureBlobStorage.delete(options, () => {
            Assert.deepEqual(executeStub.args[0][0], expectedOptions);
            options.recursive = false;
            expectedOptions.path =  "/name/myfile.txt?recursive=false";
            this.myAzureBlobStorage.delete(options, () => {
                Assert.deepEqual(executeStub.args[1][0], expectedOptions);
                done();
            });
        });
    });

});

