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

  train: (text, category) ->

    words = text.toLowerCase().split " "

    # Increment our category's count by one
    @_increment @categories, category

    # For each word, increment the total count and category count by one
    _.map words, (word)->
      record = @_increment @words, word
      categoryCount = (record.get category) || 0
      record.set category, categoryCount + 1

    return


  classify: (text) ->
    classification:
      category: "unknown"
      reason: []
      confidence: 0


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