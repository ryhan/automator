// Generated by CoffeeScript 1.6.3
var AUTOMATOR_HIDE_DEBUG, Automator, automator_log;

AUTOMATOR_HIDE_DEBUG = true;

automator_log = function(message) {
  if (!AUTOMATOR_HIDE_DEBUG) {
    return console.log(message);
  }
};

Automator = (function() {
  Automator.prototype.options = {
    namespace: "automator"
  };

  function Automator(datastore, options) {
    if (options == null) {
      options = {};
    }
    $.extend(this.options, options);
    this.datastore = datastore;
    this.categories = datastore.getTable("" + this.options.namespace + "-categories");
    this.words = datastore.getTable("" + this.options.namespace + "-words");
  }

  Automator.prototype.hasModel = function() {
    return this.categories.query().length > 0;
  };

  Automator.prototype.clearModel = function() {
    _.map(this.words.query(), function(record) {
      return record.deleteRecord();
    });
    return _.map(this.categories.query(), function(record) {
      return record.deleteRecord();
    });
  };

  Automator.prototype.train = function(text, category) {
    var self, words;
    category = category.toLowerCase();
    words = text.toLowerCase().split(" ");
    this._increment(this.categories, category);
    self = this;
    _.map(words, function(word) {
      var categoryCount, record;
      record = self._increment(self.words, word);
      categoryCount = (record.get(category)) || 0;
      return record.set(category, categoryCount + 1);
    });
  };

  Automator.prototype.trainForce = function(text, category) {
    this.train(text, category);
    if ((this.classify(text)).category !== category) {
      return this.trainUntil(text, category);
    } else {
      return automator_log("Trained");
    }
  };

  Automator.prototype.classify = function(text) {
    var confidence, maxC, maxCprime, maxP, maxPprime, self, words;
    self = this;
    maxC = "unknown";
    maxP = 0;
    maxCprime = "unknown";
    maxPprime = 0;
    words = text.toLowerCase().split(" ");
    _.map(self.categories.query(), function(record) {
      var category, p;
      category = record.get("NAME");
      p = self._getConditionalProbability(words, category);
      automator_log("" + category + ", p = " + p);
      if (p >= maxP) {
        maxCprime = maxC;
        maxPprime = maxP;
        maxC = category;
        return maxP = p;
      }
    });
    automator_log("Pmax = " + maxP);
    automator_log("Pprime = " + maxPprime);
    confidence = ((maxP - maxPprime) / maxP) || 0;
    if (confidence < 0.01) {
      return {
        category: "unknown",
        reason: [],
        confidence: confidence
      };
    }
    return {
      category: maxC,
      reason: self._getReason(words, maxC),
      confidence: confidence
    };
  };

  Automator.prototype.toJSON = function() {
    var categoryNames, propertyNames, response;
    response = {
      categories: [],
      words: []
    };
    _.map(this.categories.query(), function(record) {
      return response.categories.push({
        "NAME": record.get("NAME"),
        "COUNT": record.get("COUNT")
      });
    });
    categoryNames = _.map(response.categories, function(category) {
      return category.NAME;
    });
    propertyNames = categoryNames.concat("NAME", "COUNT");
    _.map(this.words.query(), function(record) {
      var word;
      word = {};
      _.map(propertyNames, function(property) {
        var val;
        val = record.get(property);
        if (val !== null) {
          return word[property] = val;
        }
      });
      return response.words.push(word);
    });
    return response;
  };

  Automator.prototype.fromJSON = function(json) {
    var self;
    self = this;
    _.map(json.categories, function(category) {
      return self._incrementBy(self.categories, category.NAME, category.COUNT);
    });
    _.map(json.words, function(word) {
      var record;
      record = self._incrementBy(self.words, word.NAME, word.COUNT);
      return _.keys(word, function(category) {
        var categoryCount;
        if (category !== "NAME" && category !== "COUNT") {
          categoryCount = (record.get(category)) || 0;
          return record.set(category, categoryCount + word[category]);
        }
      });
    });
  };

  Automator.prototype._getConditionalProbability = function(words, givenCategory) {
    var category, categorySum, condWordSum, ipEvidence, pCategory, pCond, self, wordSum;
    category = givenCategory.toLowerCase();
    self = this;
    ipEvidence = 1;
    wordSum = this._sumTable(this.words);
    _.map(words, function(word) {
      return ipEvidence += Math.log((1 + wordSum) / (1 + self._getWordCount(word)));
    });
    pCond = 0;
    condWordSum = this._sumTableConditional(this.words, category);
    _.map(words, function(word) {
      return pCond += Math.log((1 + self._getConditionalWordCount(word, category)) / (1 + condWordSum));
    });
    categorySum = this._sumTable(this.categories);
    pCategory = Math.log((1 + this._getCategoryCount(category)) / (1 + categorySum));
    automator_log(category);
    automator_log("" + pCond + " + " + pCategory + " + " + ipEvidence);
    return pCond + pCategory + ipEvidence;
  };

  Automator.prototype._sumTable = function(table) {
    var sum;
    sum = 0;
    _.map(table.query(), function(record) {
      return sum += record.get("COUNT" || 0);
    });
    return sum;
  };

  Automator.prototype._sumTableConditional = function(table, category) {
    var sum;
    sum = 0;
    _.map(table.query(), function(record) {
      var categoryCount;
      categoryCount = record.get(category);
      if (category != null) {
        return sum += record.get(category || 0);
      }
    });
    return sum;
  };

  Automator.prototype._getWordCount = function(word) {
    var records;
    records = this.words.query({
      NAME: word
    });
    if (records.length < 1) {
      return 0;
    }
    return (records[0].get("COUNT")) || 0;
  };

  Automator.prototype._getConditionalWordCount = function(word, category) {
    var records;
    records = this.words.query({
      NAME: word
    });
    if (records.length < 1) {
      return 0;
    }
    return (records[0].get(category)) || 0;
  };

  Automator.prototype._getCategoryCount = function(category) {
    var records;
    records = this.categories.query({
      NAME: category
    });
    if (records.length < 1) {
      return 0;
    }
    return (records[0].get("COUNT")) || 0;
  };

  Automator.prototype._getReason = function(words, category) {
    var pairs, self;
    self = this;
    pairs = _.map(words, function(word) {
      return {
        word: word,
        p: (self._getConditionalWordCount(word, category)) / (self._getWordCount(word))
      };
    });
    pairs = _.filter(pairs, function(pair) {
      return pair.p > 0.5;
    });
    pairs = _.sortBy(pairs, function(pair) {
      return -1 * pair.p;
    });
    return _.pluck(pairs, "word");
  };

  Automator.prototype._increment = function(table, name) {
    return this._incrementBy(table, name, 1);
  };

  Automator.prototype._incrementBy = function(table, name, increment) {
    var count, record, records;
    records = table.query({
      NAME: name
    });
    record = records[0];
    if (records.length < 1) {
      record = table.insert({
        NAME: name,
        COUNT: 0
      });
    }
    count = record.get("COUNT");
    record.set('COUNT', count + increment);
    return record;
  };

  return Automator;

})();
