/* app.js */

var client;

$(function() {

  var APP_KEY = "d7fdibrrvaw3bbv"

  client = new Dropbox.Client({key: APP_KEY});

  // Try to finish OAuth authorization.
  client.authenticate({interactive: false}, function (error) {
    if (error) {
      alert('Authentication error: ' + error);
    }
  });

  if (client.isAuthenticated()) {
    console.log("it worked!");
    // Client is authenticated. Display UI.
  }


});