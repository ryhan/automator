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

    words = text.split " "


    # Increment our category's count by one
    @_increment @categories, category

    # For each word, increment the total count by one
    _.map words, (word)->
      record = _increment @words, word
      categoryCounts = record.get "categories" || {}
      count = categoryCounts[category] || 0
      categoryCounts[category] = count + 1
      record.set "categories", categoryCounts

    return


  classify: (text) ->
    classification:
      category: "unknown"
      reason: []
      confidence: 0


  # Given a table and a key "name", increase key "count" by one.
  _increment: (table, name) ->

    # Search for our record
    records = table.query { name: name }
    record = records[0]

    # If our record doesn't exist, add it
    if records.length < 1
      record = table.insert
        name: name
        count: 0

    # Get the current count, and increment by one
    count = record.get "count"
    record.set 'count', count + 1

    return record