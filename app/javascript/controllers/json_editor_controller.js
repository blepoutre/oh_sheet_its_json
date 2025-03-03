import { Controller } from "@hotwired/stimulus";

export default class extends Controller {
  static targets = ["container"];
  connect() {
    this.initMonaco();
    console.log("JSON editor controller connected");
    console.log("Monaco Editor:", window.jsonEditor);
  }

  initMonaco() {
    if (window.monaco) {
      this.createEditor();
    } else {
      const monacoLoader = document.createElement("script");
      monacoLoader.src =
        "https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs/loader.js";
      monacoLoader.onload = () => {
        require.config({
          paths: {
            vs: "https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs",
          },
        });
        require(["vs/editor/editor.main"], () => this.createEditor());
      };
      document.body.appendChild(monacoLoader);
    }
  }

  createEditor() {
    console.log("Monaco Editor est bien chargé !");
    // Référencer le conteneur spécifique
    const container = this.containerTarget;

    // S'assurer que le conteneur est vide avant d'initialiser
    container.innerHTML = "";

    const editor = monaco.editor.create(container, {
      value: "[{}]",
      language: "json",
      theme: "vs-dark",
      automaticLayout: true,
      minimap: { enabled: false },
      readOnly: false,
      formatOnPaste: true,
      formatOnType: true,
    });

    window.jsonEditor = editor;

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, function () {
      editor.getAction("editor.action.formatDocument").run();
    });

    editor.onDidChangeModelContent(() => {
      try {
        JSON.parse(editor.getValue());
        // Valid JSON
      } catch (e) {
        // Invalid JSON
      }
    });
  }

  toSpreadsheet() {
    try {
      const spreadsheetElement = document.querySelector(
        '[data-controller="spreadsheet"]'
      );
      if (!spreadsheetElement) {
        console.error("Élément spreadsheet non trouvé dans le DOM");
        return;
      }

      // Attendre que le contrôleur soit connecté
      setTimeout(() => {
        const spreadsheetController =
          this.application.getControllerForElementAndIdentifier(
            spreadsheetElement,
            "spreadsheet"
          );

        if (!spreadsheetController) {
          console.error("Le controller spreadsheet n'a pas été trouvé");
          return;
        }

        if (!spreadsheetController.isReady()) {
          console.warn(
            "Le spreadsheet n'est pas encore prêt, tentative d'attente..."
          );

          let attempts = 0;
          const maxAttempts = 50;
          const waitForSpreadsheet = setInterval(() => {
            if (spreadsheetController.isReady()) {
              clearInterval(waitForSpreadsheet);
              console.log("Le spreadsheet est prêt !");
              this.convertJsonToSpreadsheet();
            } else if (++attempts >= maxAttempts) {
              clearInterval(waitForSpreadsheet);
              console.error(
                "Le spreadsheet ne s'est pas chargé après 5 secondes."
              );
            }
          }, 100);
        } else {
          this.convertJsonToSpreadsheet();
        }
      }, 100); // Petit délai pour s'assurer que le contrôleur est bien initialisé
    } catch (error) {
      console.error("Erreur lors de l'initialisation de la conversion:", error);
    }
  }

  convertJsonToSpreadsheet() {
    try {
      const jsonContent = window.jsonEditor.getValue();
      const jsonData = JSON.parse(jsonContent);

      const spreadsheetElement = document.querySelector(
        '[data-controller="spreadsheet"]'
      );
      if (!spreadsheetElement) {
        console.error("Élément spreadsheet non trouvé");
        return;
      }

      const spreadsheetController =
        this.application.getControllerForElementAndIdentifier(
          spreadsheetElement,
          "spreadsheet"
        );

      if (!spreadsheetController) {
        console.error("Le controller spreadsheet n'a pas été trouvé");
        return;
      }

      console.log("Tentative de mise à jour du spreadsheet avec:", jsonData);

      // 1. Aplatir le JSON en format de tableau
      const flattenedData = this.flattenJsonToSpreadsheet(jsonData);

      // 2. Dé-aplatir les données pour les remettre dans la structure JSON originale
      const unflattenedData = this.unflattenJson(flattenedData.data);

      // 3. Mettre à jour le tableau Handsontable avec les données dé-aplaties
      const success = spreadsheetController.updateFromJson(unflattenedData);

      if (!success) {
        console.error("Échec de la mise à jour du tableau");
      } else {
        console.log("Mise à jour du tableau réussie");
      }
    } catch (error) {
      console.error("Erreur lors de la conversion JSON:", error);
      alert("Erreur lors de la conversion JSON: " + error.message);
    }
  }

  flattenJsonToSpreadsheet(json) {
    const jsonArray = Array.isArray(json) ? json : [json];
    const headers = Array.from(
      new Set(jsonArray.flatMap((obj) => Object.keys(obj)))
    );
    const data = [headers];

    jsonArray.forEach((obj) => {
      const row = headers.map((header) => {
        const value = obj[header];
        if (typeof value === "object" && value !== null) {
          return JSON.stringify(value); // Convertir les objets en chaînes JSON
        }
        return value !== undefined ? value : "";
      });
      data.push(row);
    });

    return { headers, data };
  }

  unflattenJson(data) {
    const headers = data[0];
    const rows = data.slice(1);

    return rows.map((row) => {
      const obj = {};
      headers.forEach((header, index) => {
        const value = row[index];
        if (value !== "") {
          try {
            obj[header] = JSON.parse(value); // Essayer de convertir en objet JSON
          } catch (e) {
            obj[header] = value; // Si ce n'est pas un JSON valide, garder la chaîne
          }
        }
      });
      return obj;
    });
  }
}
