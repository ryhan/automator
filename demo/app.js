/* app.js */

var client;
var APP_KEY = "d7fdibrrvaw3bbv"


function authenticate(){

}


$(function() {



  client = new Dropbox.Client({key: APP_KEY});

  // Try to finish OAuth authorization.
  client.authenticate({interactive: false}, function (error) {
    if (error) {
      alert('Authentication error: ' + error);
    }
  });

  if (client.isAuthenticated()) {

    // Client is authenticated. Display UI.
    $('#login').hide();
    var datastoreManager = client.getDatastoreManager();
  }


});