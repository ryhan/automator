/* app.js */

var agent;
var client, datastoreManager;
var APP_KEY = "d7fdibrrvaw3bbv"

$(function() {

  client = new Dropbox.Client({key: APP_KEY});

  // Try to finish OAuth authorization.
  client.authenticate({interactive: false}, function (error) {
    if (error) {
      alert('Authentication error: ' + error);
    }
  });

  if (client.isAuthenticated()) {

    $('#login').hide();

    datastoreManager = client.getDatastoreManager();

    datastoreManager.openDefaultDatastore(function (error, datastore) {
      if (error) {
        alert('Error opening default datastore: ' + error);
      }else{
        agent = new Automator(datastore);
      }
    });
  }


});