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

    beforeEach(function(){
        this.myAzureBlobStorage = new azureBlobStorage("testAccount", "12345");
    });

    it("Executes the received options and returns the result", async function(){
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
        }

        let callExecute = async function(){
            let result = await this.myAzureBlobStorage.executeRequest(options, "Test sent content");
            assert.deepEqual(result.result, JSON.stringify("Test returned content"));
        }.bind(this);
        callExecute();
        response.end();
    });

});