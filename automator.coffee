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
    return

  classify: (text) ->
    classification:
      category: "unknown"
      reason: []
      confidence: 0