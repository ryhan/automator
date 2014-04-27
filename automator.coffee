# automator.coffee

class Automator

  # Defaults
  options:
    dropboxNamespace: "automator"

  constructor: (options = {})->
    $.extend @options.grid, options

  train: (text, category) ->
    return

  classify: (text) ->
    classification:
      category: "unknown"
      reason: []
      confidence: 0