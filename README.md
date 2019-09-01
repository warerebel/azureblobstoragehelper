[![Build Status](https://travis-ci.com/warerebel/azureblobstoragehelper.svg?branch=master)](https://travis-ci.com/warerebel/azureblobstoragehelper)
[![Coverage Status](https://coveralls.io/repos/github/warerebel/azureblobstoragehelper/badge.svg?branch=master)](https://coveralls.io/github/warerebel/azureblobstoragehelper?branch=master)
<br />

# Intorduction
Module to ease the storing of data in azure gen2 blob storage

# Getting Started
Call the constructor with the storage account name and the shared key for the storage resource.


```javascript
const azureBlobStorage = require("azureblobstoragehelper");

let myStorageHelper = new azureBlobStorage("account name", "Shared key");
```

## Create a filesystem / container:

As a convenience the createFilesystem function will not try to create a filesystem it already created, so you can call it without checking if you already created this filesystem. To skip this check and force the creation of the filesystem you should set the force option to true.

```javascript
let options = {
    filesystem: "name", // Required - must be lower case
    force: false // force filesystem creation - can be omitted
}

myStorageHelper.createFilesystem(options, (error, response, content) => {
    if(error){ console.error(error.message); }
});
```

## Create a file
```javascript
let options = {
    filesystem: "name", // Required - must be lower case
    filename: "myfile.txt", // Required
    httpHeaders: {
        // Any custom http headers to set - optional and can be omitted
        "Content-Type": "text/plain"
    }
}

myStorageHelper.createFile(options, (error, response, content) => {
    if(error){ console.error(error.message); }
});
```

## Write content to a file
```javascript
let options = {
    filesystem: "name", // Required - must be lower case
    filename: "myfile.txt", // Required
    content: "My file content", // Required - any valid Node http content
    position: 0, // Optional - the position in the blob to append data - defaults to zero
    httpHeaders: {
        // Any custom http headers to set - optional and can be omitted
        "Content-Type": "text/plain"
    }
}

myStorageHelper.writeContent(options, (error, response, content) => {
    if(error){ console.error(error.message); }
});
```

## Flush file content
```javascript
let options = {
    filesystem: "name", // Required - must be lower case
    filename: "myfile.txt", // Required
    position: 15, // Required - the position in the blob to flush data
    httpHeaders: {
        // Any custom http headers to set - optional and can be omitted
        "Content-Type": "text/plain"
    }
}

myStorageHelper.flushContent(options, (error, response, content) => {
    if(error){ console.error(error.message); }
});

```
## Create a file from a stream
Azure blob storage does not support chunked transfer. The helper module simulates a chunked transfer by enacting multiple append operations to a single blob whilst reading from a stream.
After the stream content is written to the blob, (i.e. after the stream emits end) it will automatically be flushed with no need to call `flushContent`.
```javascript
let options = {
    filesystem: "name", // Required - must be lower case
    filename: "myfile.txt", // Required
    httpHeaders: {
        // Any custom http headers to set - optional and can be omitted
        "Content-Type": "text/plain"
    }
}

const fs = require("fs");
let instream = fs.createReadStream("./myfile.txt");

myStorageHelper.writeStream(options, instream,  (error, response, content) => {
    if(error){ console.error(error.message); }
});

```
# Notes
- A filesystem that doesn't exist will be created.
- The filename should include the full desired save path.
- A user set "x-ms-version" header is ignored and will be overwritten to version "2019-02-02".
- A user set "x-ms-date" heaeder is ignored and set to current system time.

