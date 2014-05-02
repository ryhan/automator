Automator
=========

Naive Bayes on top of a Dropbox Datastore. Put together by [Ryhan](https://github.com/ryhan/).

## Setup

### 1. Authenticate your user with Dropbox
The [Dropbox Datastore JavaScript Tutorial](https://www.dropbox.com/developers/datastore/tutorial/js) has better documentation on this, but the gist is

```javascript
var client = new Dropbox.Client({key: APP_KEY});

// Try to finish OAuth authorization.
client.authenticate({interactive: false});
```

### 2. Open a datastore and use it to create an Automator
```javascript
// Our to-be Automator object
var myClassifier;

if (client.isAuthenticated()) {
  var datastoreManager = client.getDatastoreManager();
  datastoreManager.openDefaultDatastore(function (error, datastore) {

    // Make an Automator object by passing in your datastore.
    myClassifier = new Automator(datastore);
  }
}
```

## Usage

### Train your classifier
Once you have created your classifier, you can train it by supplying a string of space delimited lowercase words and a category (classification) name.
```javascript
myClassifier.train("some lowercase space delimited text", "spam");
myClassifier.train("man I really love bagels", "not spam");
```

### Classify something
Once you have sufficient examples, you can start to classify some text.
```javascript
myClassifier.classify("what are bagels like");
```
The above will return
```javascript
{
  category: "not spam", // returns a classification or "unknown"
  reason: ["bagels"]    // returns an array of features that support this classification
  confidence: 0.5       // some number from 0 to 1
}
```

### Preserve / Restore / Merge State
Oftentimes you want to start users off with some sort of default state.

You can check if the model has been trained at all by calling
```javascript
myClassifier.hasModel() // Returns a boolean
```

You can destroy an existing model by calling
```javascript
myClassifier.clearModel()
```

You can export your classifier's current state by calling
```javascript
var state = myClassifier.toJSON();
```

and similarly merge/restore state by calling
```javascript
myClassifier.fromJSON(state);
```
