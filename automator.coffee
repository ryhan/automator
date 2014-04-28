# automator.coffee

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

    maxCategory = "unknown"
    maxP = 0

    _.map self.categories.query(), (record) ->
      category = record.get "NAME"
      p = self._getConditionalProbability text, category
      if p > maxP
        maxCategory = category
        maxP = p

    return {
      category: maxCategory
      reason: []
      confidence: maxP
    }


  _getConditionalProbability: (text, givenCategory) ->

    # Impose lowercase requirement, split up text
    category = givenCategory.toLowerCase()
    words = text.toLowerCase().split " "

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