/* app.js */

var NewsRanker;
var APP_KEY = "d7fdibrrvaw3bbv"

function loggedIn(datastore){

  // Show the "logged in" UI
  $('#login').hide();

  // Set up Automator
  NewsRanker = new Automator(datastore);


  showStories();

}

// Dropbox OAuth Handler
$(function() {

  var client = new Dropbox.Client({key: APP_KEY});

  // Try to finish OAuth authorization.
  client.authenticate({interactive: false}, function (error) {
    if (error) {
      alert('Authentication error: ' + error);
    }
  });

  // Once the client is authenticated, open up a datastore.
  // It doesn't necessarily _need_ to be the default datastore,
  // and you should never tie more than one Automator to a particular datastore.
  if (client.isAuthenticated()) {
    var datastoreManager = client.getDatastoreManager();
    datastoreManager.openDefaultDatastore(function (error, datastore) {
      if (error) {
        alert('Error opening default datastore: ' + error);
      }else{
        loggedIn(datastore);
      }
    });
  }

  // loggedIn({});

});


function getHeadlines(success)
{
  $.ajax({
    url : 'https://query.yahooapis.com/v1/public/yql',
    jsonp : 'callback',
    dataType : 'jsonp',
    data : {
      q : "select title, link from rss where url='http://rss.news.yahoo.com/rss/topstories'",
      format : 'json'
    },
    success : function(data){ return success(data);}
  });
}

function isRecommended(title){
  var text = natural.PorterStemmer.tokenizeAndStem(title).join(" ");
  var classification = NewsRanker.classify(title);
  return (classification.category == "recommend");
}

function recommend(title, recommend){
  var text = natural.PorterStemmer.tokenizeAndStem(title).join(" ");
  var category = recommend ? "recommend" : "not";
  NewsRanker.trainForce(title, category);
}

function addStory(story){
  var link = $("<a />").attr("href", story.link).text(story.title);
  var recommend = $("<span class='recommend' />");
  var li = $("<li />").append(link);
  li.append(recommend);


  if (isRecommended(story.title) == true){
    $('#nogeniusresults').hide();
    li.addClass('recommended');
    $('#genius').after(li);
  }else{

    $('#links').append(li);
  }

}

function showStories(){
  getHeadlines(function(data){
    _.map(data.query.results.item, addStory);
  });
}
