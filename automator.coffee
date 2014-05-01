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


  _getConditionalProbability: (words, givenCategory) ->

    # Impose lowercase requirement, split up text
    category = givenCategory.toLowerCase()

    self = this

    # Compute denominator pEvidence (probability of given text)
    pEvidence = 1
    wordSum = @_sumTable @words
    _.map words, (word) -> pEvidence *= ( 1 + self._getWordCount word) / (1 + wordSum)

    # Compute pCond (probability of text given a category)
    pCond = 1
    condWordSum = @_sumTableConditional @words, category
    _.map words, (word) -> pCond *= (1 + self._getConditionalWordCount word, category) / (1 + condWordSum)

    # Compute pCategory (probability of category)
    categorySum = @_sumTable @categories
    pCategory = (1 + @_getCategoryCount category) / (1 + categorySum)

    console.log category
    console.log "#{pCond} * #{pCategory} / #{pEvidence}"

    return pCond * pCategory / pEvidence

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

    # Search for our record
    records = table.query { NAME: name }
    record = records[0]

    # If our record doesn't exist, add it
    if records.length < 1
      record = table.insert
        NAME: name
        COUNT: 0

    # Get the current count, and increment by one
    count = record.get "COUNT"
    record.set 'COUNT', count + 1

    return record