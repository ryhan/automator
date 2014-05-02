# automator.coffee

AUTOMATOR_HIDE_DEBUG = true

automator_log = (message) ->
  console.log message unless AUTOMATOR_HIDE_DEBUG

class Automator

  # Defaults
  options:
    namespace: "automator"

  constructor: (datastore, options = {})->
    $.extend @options, options
    @datastore = datastore
    @categories = datastore.getTable "#{@options.namespace}-categories"
    @words = datastore.getTable "#{@options.namespace}-words"

  hasModel: ->
    (@categories.query().length > 0)

  clearModel: ->
    _.map @words.query(), (record) -> record.deleteRecord()
    _.map @categories.query(), (record) -> record.deleteRecord()

  train: (text, category) ->

    # Impose lowercase requirement, split up text
    category = category.toLowerCase()
    words = text.toLowerCase().split " "

    # Increment our category's count by one
    @_increment @categories, category

    # For each word, increment the total count and category count by one
    self = this
    _.map words, (word)->
      record = self._increment self.words, word
      categoryCount = (record.get category) || 0
      record.set category, categoryCount + 1

    return

  # Used to force the learner to pick up on a particular example.
  # In practice, keep training until classification matches exactly what we trained on.
  trainForce: (text, category) ->
    @train text, category
    if (@classify text).category != category
      @trainUntil text, category
    else
      automator_log "Trained"

  classify: (text) ->

    self = this

    maxC= "unknown"
    maxP = 0
    maxCprime= "unknown"
    maxPprime = 0

    # Impose lowercase requirement, split up text
    words = text.toLowerCase().split " "

    _.map self.categories.query(), (record) ->
      category = record.get "NAME"
      p = self._getConditionalProbability words, category

      automator_log "#{category}, p = #{p}"

      if p >= maxP
        maxCprime = maxC
        maxPprime = maxP
        maxC = category
        maxP = p

    automator_log "Pmax = #{maxP}"
    automator_log "Pprime = #{maxPprime}"

    confidence = ((maxP - maxPprime) / maxP) || 0

    if confidence < 0.01
      return {
        category: "unknown"
        reason: []
        confidence: confidence
      }

    return {
      category: maxC
      reason: self._getReason words, maxC
      confidence: confidence
    }

  toJSON: ->
    response = {
      categories: []
      words: []
    }
    _.map @categories.query(), (record) ->
      response.categories.push {
        "NAME": record.get "NAME"
        "COUNT": record.get "COUNT"
      }

    categoryNames = _.map response.categories, (category) -> category.NAME
    propertyNames = categoryNames.concat("NAME", "COUNT")

    _.map @words.query(), (record) ->
      word = {}
      _.map propertyNames, (property) ->
        val = record.get property
        word[property] = val unless val == null
      response.words.push word

    return response

  fromJSON: (json) ->
    self = this

    _.map json.categories, (category) ->
      self._incrementBy self.categories, category.NAME, category.COUNT

    _.map json.words, (word) ->
      record = self._incrementBy self.words, word.NAME, word.COUNT

      _.map (_.keys word), (category) ->
        if (category != "NAME" and category != "COUNT")
          categoryCount = (record.get category) || 0
          record.set category, categoryCount + word[category]

    return


  _getConditionalProbability: (words, givenCategory) ->

    # Impose lowercase requirement, split up text
    category = givenCategory.toLowerCase()

    self = this

    # Compute inverse pEvidence (probability of given text)
    ipEvidence = 1
    wordSum = @_sumTable @words
    # _.map words, (word) -> pEvidence *= ( 1 + self._getWordCount word) / (1 + wordSum)
    _.map words, (word) -> ipEvidence += Math.log((wordSum) / (self._getWordCount word))

    # Compute pCond (probability of text given a category)
    pCond = 0
    condWordSum = @_sumTableConditional @words, category
    _.map words, (word) -> pCond += Math.log((self._getConditionalWordCount word, category) / (condWordSum))

    # Compute pCategory (probability of category)
    categorySum = @_sumTable @categories
    pCategory = Math.log((@_getCategoryCount category) / (categorySum))

    automator_log category
    automator_log "#{pCond} + #{pCategory} + #{ipEvidence}"

    return pCond + pCategory + ipEvidence

  # Sum over the "COUNT" property of every record in a table
  _sumTable: (table) ->
    sum = 0
    _.map table.query(), (record) -> sum += (record.get "COUNT" || 0)
    sum

  # Sum over the category of every record in a table
  _sumTableConditional: (table, category) ->
    sum = 0
    _.map table.query(), (record) ->
      categoryCount = record.get category
      if category?
        sum += (record.get category || 0)
    sum

  # Given a word, return its total count
  _getWordCount: (word) ->
    records = @words.query {NAME: word}
    return 0 if records.length < 1
    return ((records[0].get "COUNT") || 0)

  # Given a word and a category, return its total count
  _getConditionalWordCount: (word, category) ->
    records = @words.query {NAME: word}
    return 0 if records.length < 1
    return ((records[0].get category) || 0)

  _getCategoryCount: (category) ->
    records = @categories.query {NAME: category}
    return 0 if records.length < 1
    return ((records[0].get "COUNT") || 0)

  _getReason: (words, category) ->
    self = this
    pairs = _.map words, (word) -> {
      word: word
      p: (self._getConditionalWordCount word, category) / (self._getWordCount word)
    }

    pairs = _.filter pairs, (pair) -> (pair.p > 0.5)
    pairs = _.sortBy pairs, (pair) -> -1 * pair.p
    _.pluck pairs, "word"



  # Given a table and a key "name", increase key "count" by one.
  _increment: (table, name) ->
    @_incrementBy table, name, 1

  # Given a table and a key "name", increase key "count" by one.
  _incrementBy: (table, name, increment) ->

    # Search for our record
    records = table.query { NAME: name }
    record = records[0]

    # If our record doesn't exist, add it
    if records.length < 1
      record = table.insert
        NAME: name
        COUNT: 0

    # Get the current count, and increment by "increment"
    count = record.get "COUNT"
    record.set 'COUNT', count + increment

    return record