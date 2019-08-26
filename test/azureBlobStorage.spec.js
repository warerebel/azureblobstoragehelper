const sinon = require("sinon");
const https = require("https");
const assert = require("assert");
const passthrough = require("stream").PassThrough;
const azureBlobStorage = require("../lib/azureBlobStorage");

describe("It receives a filesystem, a filename and content and stores the content over an HTTP rest api", function(){

    before(function(){
        this.callbacks = [];
        this.request = sinon.stub(https, "request");
        this.request.on = function(name, callback){this.callbacks[name] = callback;}.bind(this);
        this.request.end = function(){};
        this.request.write = function(){};
    });

    after(function(){
        sinon.restore();
    });

    beforeEach(function(){
        this.myAzureBlobStorage = new azureBlobStorage("testAccount", "12345");
    });

    it("Executes an http call with received options and returns the result", function(done){
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
		assert.deepEqual(result.response.statusCode, 200);
		done();
	});
        response.end();
    });

    it("Executes an http call with received options and handles an error", function(done){
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

        this.myAzureBlobStorage.executeRequest(options, "Test sent content", (error, response) => {
		assert.deepEqual(error.message, "error");
		done();
	});
        response.emit("error", {message: "error"});
    });

    it("Checks for a remote filesystem only once and uses it's cache on subsequent checks", function(done){
        let executeStub = sinon.stub(this.myAzureBlobStorage, "executeRequest").yieldsRight(null, {statusCode: 200});
        let filesystem = "myfilesystem";
        this.myAzureBlobStorage.checkFilesystem("testSystem", (error, result) => {
		assert.deepEqual(executeStub.callCount, 1);
		this.myAzureBlobStorage.checkFilesystem("testSystem", (error, result) => {
			assert.deepEqual(executeStub.callCount, 1);
			done();
		});
	});
    });

	it("Creates, writes and flushes a file", function(done){
		let executeStub = sinon.stub(this.myAzureBlobStorage, "executeRequest").yields(null, {statusCode: 200});
		let filesystem = "myfilesystem";
		let filename = "myfilename";
		let content = "mycontent";
		this.myAzureBlobStorage.createFile(filename, filesystem, content, (error, result) => {
			assert(!error);
			assert.deepEqual(executeStub.callCount, 3);
			done();
		});
	});

	it("Stops file creation when one of the steps fails", function(done){
		let filesystem = "myfilesystem";
		let filename = "myfilename";
		let content = "mycontent";
		let executeStub = sinon.stub(this.myAzureBlobStorage, "executeRequest");
		executeStub.onFirstCall().yields(null, {statusCode: 200});
		executeStub.onSecondCall().yields(null, {statusCode: 400});
		this.myAzureBlobStorage.createFile(filename, filesystem, content, (error, result) => {
			assert(!error);
			assert.deepEqual(result.statusCode, 400);
			assert.deepEqual(executeStub.callCount, 2);
			done();
		});
	});

	it("Stores a file in blob storage", function(done){
		let filesystem = "myfilesystem";
		let filename = "myfilename";
		let content = "mycontent";
		let createFileStub = sinon.stub(this.myAzureBlobStorage, "storeFile").yields(null, {statusCode: 200});
		this.myAzureBlobStorage.storeFile(filename, filesystem, content, (error, result) => {
			assert.deepEqual(result.statusCode, 200);
			assert.deepEqual(createFileStub.callCount, 1);
			assert(!error);
			done();
		});
	});

});

