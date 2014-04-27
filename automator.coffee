# automator.coffee

class Automator

  # Defaults
  options:
    dropboxNamespace: "automator"

  constructor: (datastore, options = {})->
    @datastore = datastore
    $.extend @options, options

  train: (text, category) ->
    return

  classify: (text) ->
    classification:
      category: "unknown"
      reason: []
      confidence: 0