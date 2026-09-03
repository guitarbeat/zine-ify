/* eslint-disable */
/**
 * Validation integration for Zine-ify form controls
 * Demonstrates user-friendly validation for existing settings
 */

import { FormValidator } from "../components/FormValidator.js";
import { VALIDATION_TIMING, VALIDATION_RULES } from "../utils/formValidation.js";
import { GRID_DIMENSION_MAX, GRID_DIMENSION_MIN, MARGIN_MAX, MARGIN_MIN } from "./../utils/config.js";

/**
 * Initialize validation for the settings panel
 * @param {HTMLElement|Document} container - The settings container element
 * @param {Object} [uiManager=null] - Optional UIManager instance
 * @returns {FormValidator} The configured validator instance
 */
export function initSettingsValidation(container = document, uiManager = null) {
  const form = container.querySelector("#settings-group") || container.querySelector(".rail-settings-panel");
  if (!form) {
    return null;
  }

  const validator = new FormValidator(form, {
    validateOnSubmit: false, // Settings are auto-applied, no submit button
    showSuccessState: true,
    toastOnSuccess: false,
    focusFirstError: false
  });

  // Grid rows and cols elements
  const gridRowsInput = container.querySelector("#grid-rows");
  const gridColsInput = container.querySelector("#grid-cols");

  /** Helper to update grid total display */
  const updateTotalDisplay = (rowsVal, colsVal) => {
    const rows = parseInt(rowsVal, 10) || 1;
    const cols = parseInt(colsVal, 10) || 1;
    if (uiManager && typeof uiManager.updateGridTotalBadge === "function") {
      uiManager.updateGridTotalBadge(rows, cols);
    } else {
      const gridTotalEl = container.querySelector("#grid-total");
      if (gridTotalEl) {
        gridTotalEl.textContent = `${rows * cols} slots`;
      }
    }
  };

  if (gridRowsInput) {
    validator.register("#grid-rows", {
      fieldName: "Rows",
      rules: [
        VALIDATION_RULES.required,
        VALIDATION_RULES.integer,
        VALIDATION_RULES.min(GRID_DIMENSION_MIN),
        VALIDATION_RULES.max(GRID_DIMENSION_MAX)
      ],
      timing: VALIDATION_TIMING.BLUR,
      constraints: {
        min: GRID_DIMENSION_MIN,
        max: GRID_DIMENSION_MAX,
        format: "whole numbers only"
      },
      onValidationChange: (result, field) => {
        // Clamp invalid values
        if (!result.isValid) {
          const value = parseInt(field.value, 10);
          if (isNaN(value) || value < GRID_DIMENSION_MIN) {
            field.value = GRID_DIMENSION_MIN;
          } else if (value > GRID_DIMENSION_MAX) {
            field.value = GRID_DIMENSION_MAX;
          }
          // Update the grid total display
          updateTotalDisplay(field.value, gridColsInput ? gridColsInput.value : 1);
        }
      }
    });
  }

  // Grid columns validation
  if (gridColsInput) {
    validator.register("#grid-cols", {
      fieldName: "Columns",
      rules: [
        VALIDATION_RULES.required,
        VALIDATION_RULES.integer,
        VALIDATION_RULES.min(GRID_DIMENSION_MIN),
        VALIDATION_RULES.max(GRID_DIMENSION_MAX)
      ],
      timing: VALIDATION_TIMING.BLUR,
      constraints: {
        min: GRID_DIMENSION_MIN,
        max: GRID_DIMENSION_MAX,
        format: "whole numbers only"
      },
      onValidationChange: (result, field) => {
        if (!result.isValid) {
          const value = parseInt(field.value, 10);
          if (isNaN(value) || value < GRID_DIMENSION_MIN) {
            field.value = GRID_DIMENSION_MIN;
          } else if (value > GRID_DIMENSION_MAX) {
            field.value = GRID_DIMENSION_MAX;
          }
          updateTotalDisplay(gridRowsInput ? gridRowsInput.value : 1, field.value);
        }
      }
    });
  }

  // Margin validation
  const marginInput = container.querySelector("#margin-input");
  if (marginInput) {
    validator.register("#margin-input", {
      fieldName: "Margin",
      rules: [
        VALIDATION_RULES.required,
        VALIDATION_RULES.integer,
        VALIDATION_RULES.min(MARGIN_MIN),
        VALIDATION_RULES.max(MARGIN_MAX)
      ],
      timing: VALIDATION_TIMING.BLUR,
      constraints: {
        min: MARGIN_MIN,
        max: MARGIN_MAX,
        format: "mm"
      },
      onValidationChange: (result, field) => {
        if (!result.isValid) {
          const value = parseInt(field.value, 10);
          if (isNaN(value) || value < MARGIN_MIN) {
            field.value = MARGIN_MIN;
          } else if (value > MARGIN_MAX) {
            field.value = MARGIN_MAX;
          }
        }
      }
    });
  }

  // Paper size select - always valid since it is a dropdown
  const paperSizeSelect = container.querySelector("#paper-size-select");
  if (paperSizeSelect) {
    validator.register("#paper-size-select", {
      fieldName: "Paper Size",
      rules: [VALIDATION_RULES.required],
      timing: VALIDATION_TIMING.BLUR
    });
  }

  return validator;
}
