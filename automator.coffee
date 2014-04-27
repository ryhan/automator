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
    textArray = text.split " "

    @_increment @categories category

    return


  classify: (text) ->
    classification:
      category: "unknown"
      reason: []
      confidence: 0


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