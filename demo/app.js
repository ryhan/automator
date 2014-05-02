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
      /* TODO add support for other rss feeds */
      q : "select title, link from rss where url='http://rss.news.yahoo.com/rss/topstories'",
      format : 'json'
    },
    success : function(data){ return success(data);}
  });
}


function getFeatures(title){
  var text = natural.PorterStemmer.tokenizeAndStem(title).join(" ");
  return text;
}

function isRecommended(title){
  //return (Math.random() > 0.8);
  var classification = NewsRanker.classify(getFeatures(text));
  return (classification.category == "recommend");
}

function train(title, recommendBool){
  var classification = recommendBool ? "recommend" : "not";
  NewsRanker.train(getFeatures(title), classification);
}

function recommend(title, recommend){
  var text = natural.PorterStemmer.tokenizeAndStem(title).join(" ");
  var category = recommend ? "recommend" : "not";
  NewsRanker.trainForce(text, category);
}

function addStory(story){
  var link = $("<a target='_blank' />").attr("href", story.link).text(story.title);
  var recommend = $("<span class='recommend' />");
  var li = $("<li />").append(link);
  li.append(recommend);


  if (isRecommended(story.title) == true){
    $('#nogeniusresults').hide();
    li.addClass('recommended');
    $('#genius').after(li);
  }else{
    /*
    if (Math.random() > 0.8){
      li.addClass('added');
    }
    */
    $('#links').append(li);
  }

}

function applyClickHandlers(){

  var clickHandler = function(e){
    var li = $(e.target).parent();
    var link = li.find("a");

    if (li.hasClass("recommended") == true){
      train(link.text(), false);
      li.hide();
    }else{
      if (li.hasClass("added") == false){
        train(link.text(), true);
      }else{
        train(link.text(), false);
      }
      li.toggleClass("added");
    }
  };

  $("span.recommend").click(clickHandler);

}

var stories = [];
function showStories(){
  getHeadlines(function(data){
    _.map(data.query.results.item, addStory);
    applyClickHandlers();
  });
}


