import { Controller } from "@hotwired/stimulus";

export default class extends Controller {
  static targets = ["container"];
  static values = {
    ready: Boolean,
  };

  connect() {
    console.log("Spreadsheet controller trying to connect");
    // Vérifier si Handsontable est disponible
    if (typeof Handsontable === "undefined") {
      console.error(
        "Handsontable is not defined. Make sure it's loaded before the controller."
      );
      return;
    }
    console.log("Handsontable is loaded");
    this.initSpreadsheet();
    console.log("Spreadsheet controller connected");
    console.log("Handsontable:", window.spreadsheet);
  }

  initSpreadsheet() {
    // Référencer le conteneur spécifique au lieu de this.element
    const container = this.containerTarget;

    const hot = new Handsontable(container, {
      data: [
        ["", "", "", "", ""],
        ["", "", "", "", ""],
        ["", "", "", "", ""],
      ],
      rowHeaders: true,
      colHeaders: true,
      licenseKey: "non-commercial-and-evaluation",
      contextMenu: true,
      stretchH: "all",
      manualColumnResize: true,
      manualRowResize: true,
      minSpareRows: 1,
      minSpareCols: 1,
      allowInsertRow: true,
      allowInsertColumn: true,
      allowRemoveRow: true,
      allowRemoveColumn: true,
      afterChange: (changes) => {
        if (changes) {
          console.log("Spreadsheet data changed:", changes);
        }
      },
    });

    this.hot = hot;
    // Supprimer la référence globale
    // window.spreadsheet = hot; // Pour accès global
  }

  toJson() {
    try {
      const data = this.hot.getData();
      const headers = this.getHeaders();
      const jsonData = this.convertToJson(data, headers);

      if (window.jsonEditor) {
        window.jsonEditor.setValue(JSON.stringify(jsonData, null, 2));
      }
    } catch (error) {
      console.error("Erreur lors de la conversion vers JSON:", error);
    }
  }

  getHeaders() {
    const data = this.hot.getData();
    const firstRow = data[0];
    if (!firstRow) return [];

    // Filtrer les headers null ou undefined
    return firstRow.filter((header) => header != null && header !== "");
  }

  convertToJson(data, headers) {
    const result = [];

    // Trouver l'index de la dernière ligne non vide
    let lastNonEmptyRowIndex = data.length - 1;
    while (
      lastNonEmptyRowIndex > 0 &&
      !data[lastNonEmptyRowIndex].some((cell) => cell !== "" && cell !== null)
    ) {
      lastNonEmptyRowIndex--;
    }

    for (let i = 1; i <= lastNonEmptyRowIndex; i++) {
      const row = data[i];
      // Vérifier si la ligne contient au moins une valeur non nulle et non vide
      if (row.some((cell) => cell !== "" && cell !== null)) {
        const obj = {};
        const childrenData = {};

        headers.forEach((header, index) => {
          if (!header) return; // Ignorer les headers null ou undefined

          const value = row[index];
          // Ne pas inclure les valeurs null ou vides
          if (value !== null && value !== "") {
            if (header.startsWith("children") && header !== "children") {
              // Extraire le nom de la propriété enfant (ex: childrenName -> name)
              const childProp = header.replace("children", "");
              const childKey =
                childProp.charAt(0).toLowerCase() + childProp.slice(1);
              childrenData[childKey] = value;
            } else if (header !== "children") {
              obj[header] = value;
            }
          }
        });

        // Si nous avons des données d'enfant non nulles, les ajouter au tableau children
        if (Object.keys(childrenData).length > 0) {
          obj.children = [childrenData];
        }

        // N'ajouter l'objet que s'il contient des données non nulles
        if (
          Object.keys(obj).length > 0 ||
          Object.keys(childrenData).length > 0
        ) {
          result.push(obj);
        }
      }
    }

    return result;
  }

  // Ajouter une méthode pour vérifier si le tableau est prêt
  isReady() {
    return !!this.hot;
  }

  // Modifier updateFromJson pour retourner un statut
  updateFromJson(jsonData) {
    try {
      const parsedData =
        typeof jsonData === "string" ? JSON.parse(jsonData) : jsonData;

      if (!Array.isArray(parsedData) || parsedData.length === 0) {
        console.error("Les données JSON doivent être un tableau non vide");
        return false;
      }

      // Fonction pour transformer les données avec préfixe pour les enfants
      const transformData = (data) => {
        return data.map((item) => {
          const transformed = { ...item };
          if (Array.isArray(item.children) && item.children.length > 0) {
            const child = item.children[0]; // On prend le premier enfant
            delete transformed.children;
            // Ajouter les propriétés de l'enfant avec le préfixe "children"
            Object.keys(child).forEach((key) => {
              transformed[
                `children${key.charAt(0).toUpperCase()}${key.slice(1)}`
              ] = child[key];
            });
          }
          return transformed;
        });
      };

      const transformedData = transformData(parsedData);

      // Récupérer tous les en-têtes
      const headers = Array.from(
        new Set(transformedData.flatMap((obj) => Object.keys(obj)))
      );

      // Créer le tableau de données
      const spreadsheetData = [
        headers,
        ...transformedData.map((obj) =>
          headers.map((header) => obj[header] || "")
        ),
      ];

      // Mettre à jour le tableau Handsontable
      if (this.hot) {
        this.hot.loadData(spreadsheetData);
        return true;
      } else {
        console.error("Instance Handsontable non initialisée");
        return false;
      }
    } catch (error) {
      console.error("Erreur lors de la conversion JSON vers tableau:", error);
      return false;
    }
  }
}
