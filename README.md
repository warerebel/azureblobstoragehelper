[![Build Status](https://travis-ci.com/warerebel/azureblobstoragehelper.svg?branch=master)](https://travis-ci.com/warerebel/azureblobstoragehelper)
[![Coverage Status](https://coveralls.io/repos/github/warerebel/azureblobstoragehelper/badge.svg?branch=master)](https://coveralls.io/github/warerebel/azureblobstoragehelper?branch=master)
<br />

# Intorduction
Module to ease the storing of data in azure gen2 blob storage

# Warning
This module is a very early release and not ready for use.

# Getting Started
Call the constructor with the storage account name and the shared key for the storage resource.

Store content to the blob storage account calling `storeFile`

```javascript
const azureBlobStorage = require("azureblobstoragehelper");

let myStorageHelper = new azureBlobStorage("account name", "Shared key");

myStorageHelper.storeFile("filename", "filesystem", "content", (error, response) => {
    if(!error && response.statusCode < 400)
        console.log("stored file");
});
```

A filesystem that doesn't exist will be created.
The filename should include the full desired save path.

