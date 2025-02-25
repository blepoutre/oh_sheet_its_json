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
      const success = spreadsheetController.updateFromJson(jsonData);

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
    console.log("Flattening JSON to spreadsheet format...");
    const jsonArray = Array.isArray(json) ? json : [json];
    console.log("Treating as array with length:", jsonArray.length);

    const flattenObject = (obj, prefix = "") => {
      return Object.keys(obj).reduce((acc, key) => {
        const propName = prefix ? `${prefix}.${key}` : key;

        if (obj[key] === null) {
          return { ...acc, [propName]: "" };
        } else if (typeof obj[key] === "object" && !Array.isArray(obj[key])) {
          return { ...acc, ...flattenObject(obj[key], propName) };
        } else if (Array.isArray(obj[key])) {
          // Simplification pour les tableaux
          if (obj[key].length === 0) {
            return { ...acc, [propName]: "[]" };
          }

          // Pour les tableaux d'objets
          if (typeof obj[key][0] === "object") {
            const arrayFlattened = obj[key].map((item, index) =>
              flattenObject(item, `${propName}[${index}]`)
            );
            return {
              ...acc,
              ...arrayFlattened.reduce((a, b) => ({ ...a, ...b }), {}),
            };
          }

          // Pour les tableaux simples
          return { ...acc, [propName]: JSON.stringify(obj[key]) };
        } else {
          return { ...acc, [propName]: obj[key] };
        }
      }, {});
    };

    const flattenedData = jsonArray.map((item) => flattenObject(item));
    console.log("Flattened objects:", flattenedData);

    const headers = Array.from(
      new Set(flattenedData.flatMap((obj) => Object.keys(obj)))
    );
    console.log("Generated headers:", headers);

    // Créer les données pour le tableau
    const data = [];
    data.push(headers); // Première ligne = en-têtes

    // Ajout des données
    flattenedData.forEach((obj) => {
      const row = headers.map((header) => {
        const value = obj[header];
        return value !== undefined ? value : "";
      });
      data.push(row);
    });

    console.log("Final data structure:", data);
    return { headers, data };
  }
}
