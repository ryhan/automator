/* app.js */

var NewsRanker;
var APP_KEY = "d7fdibrrvaw3bbv";

var recommendedArticles;

function loggedIn(datastore){

  // Show the "logged in" UI
  $('#login').hide();

  // Set up Automator
  NewsRanker = new Automator(datastore);
  recommendedArticles = datastore.getTable "recommendedArticles";

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


function fetchRSS(feed, success){
   $.ajax({
    url : 'https://query.yahooapis.com/v1/public/yql',
    jsonp : 'callback',
    dataType : 'jsonp',
    data : {
      /* TODO add support for other rss feeds */
      q : "select title, link, pubDate from rss where url='" + feed + "'",
      format : 'json'
    },
    success : function(data){ return success(data);}
  });

}


var stories = [];
function getHeadlines(success)
{

  var feeds = [
    "http://rss.news.yahoo.com/rss/topstories",
    "http://feeds.feedburner.com/fastcodesign/feed",
    "https://news.layervault.com/?format=rss"
  ];

  var count = feeds.length;

  _.map(feeds, function(feed){
    fetchRSS(feed, function(data){
      count -= 1;
      _.map(data.query.results.item, function(story){
        story.date = new Date(story.pubDate);
        stories.push(story);
      });

      if (count == 0){
        stories = _.sortBy(stories, function(o) { return o.date });
        success(stories);
      }
    });
  });

}


function getFeatures(title){
  var text = natural.PorterStemmer.tokenizeAndStem(title).join(" ");
  return text;
}

function isRecommended(title){
  //return (Math.random() > 0.8);
  var classification = NewsRanker.classify(getFeatures(title));
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
    var records = recommendedArticles.query({"title": story.title});
    if (records.length > 0){
      li.addClass('added');
    }
    $('#links').append(li);
  }

}

function applyClickHandlers(){

  var removeRecommendation = function(text){
    var records = recommendedArticles.query({"title": text});
    if (records.length > 0){
      record = records[0];
      record..deleteRecord();
    }
  };

  var addRecommendation = function(text){
    recommendedArticles.insert({
      "title": text
    });
  };

  var clickHandler = function(e){
    var li = $(e.target).parent();
    var link = li.find("a");

    if (li.hasClass("recommended") == true){
      train(link.text(), false);
      removeRecommendation(link.text());
      li.hide();
    }else{
      if (li.hasClass("added") == false){
        train(link.text(), true);
        addRecommendation(link.text());
      }else{
        train(link.text(), false);
        removeRecommendation(link.text());
      }
      li.toggleClass("added");
    }
  };

  $("span.recommend").click(clickHandler);

}


function showStories(){
  getHeadlines(function(stories){
    _.map(stories, addStory);
    //_.map(data.query.results.item, addStory);
    applyClickHandlers();
  });
}


