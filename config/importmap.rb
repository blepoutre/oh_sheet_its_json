# Pin npm packages by running ./bin/importmap

pin "application", preload: true
pin "@hotwired/turbo-rails", to: "turbo.min.js", preload: true
pin "@hotwired/stimulus", to: "stimulus.min.js", preload: true
pin "@hotwired/stimulus-loading", to: "stimulus-loading.js", preload: true

# Monaco's editor
pin "monaco-editor", to: "https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs/editor/editor.main.js"
pin "monaco-editor/loader", to: "https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs/loader.js"

# Handsontable
pin "handsontable", to: "https://cdn.jsdelivr.net/npm/handsontable@16.0.0/dist/handsontable.full.min.js"
pin "handsontable/base", to: "https://cdn.jsdelivr.net/npm/handsontable@16.0.0/dist/handsontable.full.min.js"
pin "@hotwired/stimulus", to: "stimulus.min.js"
pin "@hotwired/stimulus-loading", to: "stimulus-loading.js"
pin_all_from "app/javascript/controllers", under: "controllers"
