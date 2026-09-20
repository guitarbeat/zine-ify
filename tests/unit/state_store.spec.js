import { test, expect } from "@playwright/test";
import { StateStore } from "../../src/core/StateStore.js";

test.describe("StateStore", () => {
  let store;

  test.beforeEach(() => {
    store = new StateStore();
  });

  test("constructor initializes with correct default state", () => {
    expect(store.allPageImages.length).toBe(12);
    expect(store.allPageImages.every(img => img === null)).toBe(true);
    expect(store._blankPageUrl).toBeNull();
    expect(store.pageFlips).toEqual({});
    expect(store.pageZooms).toEqual({});
    expect(store.pageTransforms).toEqual({});
    expect(store.pageNumberVisibility).toEqual({});
    expect(store.selectedPageIndex).toBeNull();
    expect(store.layoutPresetId).toBe("layout-12");
    expect(store.guideToggles).toEqual({
      fold: true,
      cut: true,
      boundaries: true,
      numbers: true,
      arrows: false,
      safeArea: false,
      margins: true
    });
    expect(store.printSettings).toEqual({
      duplex: true,
      scale: "fit",
      bleed: 0,
      trim: 0
    });
    expect(store.projectMeta.name).toBe("Untitled zine");
    expect(typeof store.projectMeta.createdAt).toBe("number");
    expect(typeof store.projectMeta.updatedAt).toBe("number");
    expect(store.gridSize).toEqual({ rows: 3, cols: 4 });
    expect(store.uploadedFiles).toEqual([]);
    expect(store.totalPages).toBe(0);
    expect(store.fileQueue).toEqual([]);
    expect(store.isProcessingQueue).toBe(false);
    expect(store.workflowPreviewed).toBe(false);
    expect(store.workflowExported).toBe(false);
    expect(store.paperSize).toBe("letter");
    expect(store.orientation).toBe("landscape");
    expect(store.margin).toBe(0);
  });

  test("getFilledPageCount calculates correctly including edge cases", () => {
    // Initially empty
    expect(store.getFilledPageCount()).toBe(0);

    // With a blank page url
    store._blankPageUrl = "blank-url";
    store.allPageImages[0] = "blank-url";
    expect(store.getFilledPageCount()).toBe(0);

    // With all blank page urls
    store.allPageImages = ["blank-url", "blank-url", "blank-url"];
    expect(store.getFilledPageCount()).toBe(0);

    // With real pages
    store.allPageImages = ["img1.jpg", "blank-url", "img3.jpg", null];
    expect(store.getFilledPageCount()).toBe(3);

    store.allPageImages[3] = "img4.jpg";
    expect(store.getFilledPageCount()).toBe(4);

    // Check with null gaps
    store.allPageImages[2] = null;
    expect(store.getFilledPageCount()).toBe(4); // still 4 because index 3 is filled

    store.allPageImages = new Array(12).fill(null);
    store.allPageImages[11] = "img12.jpg";
    expect(store.getFilledPageCount()).toBe(12);
  });

  test("getRequiredPageCapacity calculates correctly based on grid size and total pages", () => {
    // Default 3x4 grid = 12 slots per sheet
    expect(store.getRequiredPageCapacity()).toBe(12); // min 1 sheet for totalPages = 0

    store.totalPages = 0;
    expect(store.getRequiredPageCapacity()).toBe(12);

    store.totalPages = -5;
    expect(store.getRequiredPageCapacity()).toBe(12);

    store.totalPages = 5;
    expect(store.getRequiredPageCapacity()).toBe(12);

    store.totalPages = 12;
    expect(store.getRequiredPageCapacity()).toBe(12);

    store.totalPages = 13;
    expect(store.getRequiredPageCapacity()).toBe(24); // needs 2 sheets

    // Change grid size to 2x4 = 8 slots per sheet
    store.gridSize = { rows: 2, cols: 4 };
    store.totalPages = 1;
    expect(store.getRequiredPageCapacity()).toBe(8);

    store.totalPages = 9;
    expect(store.getRequiredPageCapacity()).toBe(16);

    // Change grid size to 1x2 = 2 slots per sheet
    store.gridSize = { rows: 1, cols: 2 };
    store.totalPages = 1;
    expect(store.getRequiredPageCapacity()).toBe(2);

    store.totalPages = 3;
    expect(store.getRequiredPageCapacity()).toBe(4);

    // Custom 3x3 grid = 9 slots per sheet
    store.gridSize = { rows: 3, cols: 3 };
    store.totalPages = 10;
    expect(store.getRequiredPageCapacity()).toBe(18);
  });

  test("isMiniZineLayout identifies 2x4 grid", () => {
    expect(store.isMiniZineLayout()).toBe(false); // Default is 3x4

    store.gridSize = { rows: 2, cols: 4 };
    expect(store.isMiniZineLayout()).toBe(true);

    store.gridSize = { rows: 2, cols: 2 };
    expect(store.isMiniZineLayout()).toBe(false);

    store.gridSize = { rows: 4, cols: 2 };
    expect(store.isMiniZineLayout()).toBe(false);
  });

  test("workflow status markers update correctly", () => {
    expect(store.workflowPreviewed).toBe(false);
    expect(store.workflowExported).toBe(false);

    store.markPreviewed();
    expect(store.workflowPreviewed).toBe(true);
    expect(store.workflowExported).toBe(false);

    store.markExported();
    expect(store.workflowPreviewed).toBe(true);
    expect(store.workflowExported).toBe(true);

    store.resetWorkflowStatus();
    expect(store.workflowPreviewed).toBe(false);
    expect(store.workflowExported).toBe(false);
  });

  test("updatePaperSettings updates only provided values and sets projectMeta.updatedAt", () => {
    const initialUpdatedAt = store.projectMeta.updatedAt;

    // Empty call
    store.updatePaperSettings({});
    expect(store.paperSize).toBe("letter");
    expect(store.orientation).toBe("landscape");

    store.updatePaperSettings({ paperSize: "a4" });
    expect(store.paperSize).toBe("a4");
    expect(store.orientation).toBe("landscape"); // unchanged
    expect(store.projectMeta.updatedAt).toBeGreaterThanOrEqual(initialUpdatedAt);

    store.updatePaperSettings({ orientation: "portrait" });
    expect(store.paperSize).toBe("a4"); // unchanged
    expect(store.orientation).toBe("portrait");

    store.updatePaperSettings({ paperSize: "legal", orientation: "landscape" });
    expect(store.paperSize).toBe("legal");
    expect(store.orientation).toBe("landscape");
  });

  test("selectPage sets selectedPageIndex for valid integers and resets for invalid inputs", () => {
    store.selectPage(2);
    expect(store.selectedPageIndex).toBe(2);

    store.selectPage(0);
    expect(store.selectedPageIndex).toBe(0);

    store.selectPage(-1);
    expect(store.selectedPageIndex).toBe(-1);

    // Invalid integer inputs
    store.selectPage("1");
    expect(store.selectedPageIndex).toBeNull();

    store.selectPage(1.5);
    expect(store.selectedPageIndex).toBeNull();

    store.selectPage(null);
    expect(store.selectedPageIndex).toBeNull();

    store.selectPage(undefined);
    expect(store.selectedPageIndex).toBeNull();

    store.selectPage(NaN);
    expect(store.selectedPageIndex).toBeNull();

    store.selectPage(Infinity);
    expect(store.selectedPageIndex).toBeNull();

    store.selectPage(true);
    expect(store.selectedPageIndex).toBeNull();

    store.selectPage({});
    expect(store.selectedPageIndex).toBeNull();
  });

  test("setLayoutPreset sets preset id, updates grid size if complete, and handles fallbacks", () => {
    const initialUpdatedAt = store.projectMeta.updatedAt;

    store.setLayoutPreset("grid-2x2", { rows: 2, cols: 2 });
    expect(store.layoutPresetId).toBe("grid-2x2");
    expect(store.gridSize).toEqual({ rows: 2, cols: 2 });
    expect(store.projectMeta.updatedAt).toBeGreaterThanOrEqual(initialUpdatedAt);

    // Fallback preset id when falsey
    store.setLayoutPreset(null, { rows: 3, cols: 3 });
    expect(store.layoutPresetId).toBe("custom");
    expect(store.gridSize).toEqual({ rows: 3, cols: 3 });

    store.setLayoutPreset("", { rows: 4, cols: 4 });
    expect(store.layoutPresetId).toBe("custom");
    expect(store.gridSize).toEqual({ rows: 4, cols: 4 });

    // Partial or missing gridSize does not overwrite existing gridSize
    store.setLayoutPreset("incomplete-grid", { rows: 5 });
    expect(store.layoutPresetId).toBe("incomplete-grid");
    expect(store.gridSize).toEqual({ rows: 4, cols: 4 });

    // Grid size with 0 for rows or cols evaluates to falsy
    store.setLayoutPreset("zero-grid", { rows: 0, cols: 4 });
    expect(store.layoutPresetId).toBe("zero-grid");
    expect(store.gridSize).toEqual({ rows: 4, cols: 4 });

    store.setLayoutPreset("no-grid", null);
    expect(store.layoutPresetId).toBe("no-grid");
    expect(store.gridSize).toEqual({ rows: 4, cols: 4 });
  });

  test("setPageTransform applies defaults, merges patches, and updates projectMeta.updatedAt", () => {
    const initialUpdatedAt = store.projectMeta.updatedAt;

    // Call without patch uses default patch = {}
    store.setPageTransform(0);
    expect(store.pageTransforms[0]).toEqual({
      rotation: 0,
      fit: "fit",
      crop: null,
      pan: { x: 0, y: 0 },
      zoom: 1
    });

    store.setPageTransform(0, { rotation: 90 });
    expect(store.pageTransforms[0]).toEqual({
      rotation: 90,
      fit: "fit",
      crop: null,
      pan: { x: 0, y: 0 },
      zoom: 1
    });
    expect(store.projectMeta.updatedAt).toBeGreaterThanOrEqual(initialUpdatedAt);

    // Subsequent patch merges into existing transform
    store.setPageTransform(0, { zoom: 1.5, pan: { x: 10, y: 20 } });
    expect(store.pageTransforms[0]).toEqual({
      rotation: 90,
      fit: "fit",
      crop: null,
      pan: { x: 10, y: 20 },
      zoom: 1.5
    });

    // Setting transform for another page index
    store.setPageTransform(1, { fit: "fill" });
    expect(store.pageTransforms[1]).toEqual({
      rotation: 0,
      fit: "fill",
      crop: null,
      pan: { x: 0, y: 0 },
      zoom: 1
    });
  });

  test("toProjectJSON returns serialized state with deep copies", () => {
    store.setLayoutPreset("mini-8", { rows: 2, cols: 4 });
    store.selectedPageIndex = 3;
    store.totalPages = 8;
    store.pageFlips = { 0: true };
    store.pageZooms = { 1: true };
    store.setPageTransform(0, { rotation: 180, pan: { x: 5, y: 5 } });
    store.pageNumberVisibility = { 0: false };
    store.margin = 10;
    store.paperSize = "a4";
    store.orientation = "portrait";

    const json = store.toProjectJSON();

    expect(json).toEqual({
      version: 1,
      layoutPresetId: "mini-8",
      gridSize: { rows: 2, cols: 4 },
      pageFlips: { 0: true },
      pageZooms: { 1: true },
      pageTransforms: {
        0: {
          rotation: 180,
          fit: "fit",
          crop: null,
          pan: { x: 5, y: 5 },
          zoom: 1
        }
      },
      pageNumberVisibility: { 0: false },
      selectedPageIndex: 3,
      guideToggles: {
        fold: true,
        cut: true,
        boundaries: true,
        numbers: true,
        arrows: false,
        safeArea: false,
        margins: true
      },
      printSettings: {
        duplex: true,
        scale: "fit",
        bleed: 0,
        trim: 0
      },
      paperSize: "a4",
      orientation: "portrait",
      margin: 10,
      projectMeta: store.projectMeta,
      pageCount: 8
    });

    // Verify deep copy isolation
    json.gridSize.rows = 99;
    expect(store.gridSize.rows).toBe(2);

    json.pageTransforms[0].rotation = 0;
    expect(store.pageTransforms[0].rotation).toBe(180);
  });

  test("serialization and restoration roundtrip", () => {
    store.setLayoutPreset("grid-2x2", { rows: 2, cols: 2 });
    store.totalPages = 12;
    store.selectedPageIndex = 2;
    store.updatePaperSettings({ paperSize: "a3", orientation: "portrait" });
    store.margin = 12;
    store.pageFlips = { 0: true, 2: false };
    store.pageZooms = { 1: true };
    store.setPageTransform(2, { rotation: 90, zoom: 1.2, pan: { x: 4, y: 8 } });
    store.guideToggles.safeArea = true;
    store.printSettings.bleed = 2;

    const exportedJSON = store.toProjectJSON();

    const newStore = new StateStore();
    newStore.restoreProjectJSON(exportedJSON);

    expect(newStore.layoutPresetId).toBe("grid-2x2");
    expect(newStore.gridSize).toEqual({ rows: 2, cols: 2 });
    expect(newStore.selectedPageIndex).toBe(2);
    expect(newStore.paperSize).toBe("a3");
    expect(newStore.orientation).toBe("portrait");
    expect(newStore.margin).toBe(12);
    expect(newStore.pageFlips).toEqual({ 0: true, 2: false });
    expect(newStore.pageZooms).toEqual({ 1: true });
    expect(newStore.pageTransforms[2]).toEqual({
      rotation: 90,
      fit: "fit",
      crop: null,
      pan: { x: 4, y: 8 },
      zoom: 1.2
    });
    expect(newStore.guideToggles.safeArea).toBe(true);
    expect(newStore.printSettings.bleed).toBe(2);
  });

  test("restoreProjectJSON restores project state from JSON object and applies fallbacks", () => {
    const projectJSON = {
      layoutPresetId: "custom-preset",
      gridSize: { rows: 3, cols: 3 },
      pageFlips: { 1: true },
      pageZooms: { 2: true },
      pageTransforms: {
        1: { rotation: 270, fit: "cover", crop: null, pan: { x: 0, y: 0 }, zoom: 2 }
      },
      pageNumberVisibility: { 1: true },
      selectedPageIndex: 1,
      guideToggles: { fold: false },
      printSettings: { bleed: 5 },
      paperSize: "a3",
      orientation: "portrait",
      margin: 15,
      projectMeta: { name: "Restored Zine", createdAt: 12345 }
    };

    store.restoreProjectJSON(projectJSON);

    expect(store.layoutPresetId).toBe("custom-preset");
    expect(store.gridSize).toEqual({ rows: 3, cols: 3 });
    expect(store.pageFlips).toEqual({ 1: true });
    expect(store.pageZooms).toEqual({ 2: true });
    expect(store.pageTransforms).toEqual({
      1: { rotation: 270, fit: "cover", crop: null, pan: { x: 0, y: 0 }, zoom: 2 }
    });
    expect(store.pageNumberVisibility).toEqual({ 1: true });
    expect(store.selectedPageIndex).toBe(1);
    expect(store.guideToggles).toEqual({
      fold: false,
      cut: true,
      boundaries: true,
      numbers: true,
      arrows: false,
      safeArea: false,
      margins: true
    });
    expect(store.printSettings).toEqual({
      duplex: true,
      scale: "fit",
      bleed: 5,
      trim: 0
    });
    expect(store.paperSize).toBe("a3");
    expect(store.orientation).toBe("portrait");
    expect(store.margin).toBe(15);
    expect(store.projectMeta.name).toBe("Restored Zine");
    expect(store.projectMeta.createdAt).toBe(12345);
    expect(typeof store.projectMeta.updatedAt).toBe("number");
  });

  test("restoreProjectJSON handles empty, partial, or invalid margin values gracefully", () => {
    const defaultMeta = { ...store.projectMeta };

    store.restoreProjectJSON({});

    expect(store.layoutPresetId).toBe("layout-12"); // preserved default
    expect(store.gridSize).toEqual({ rows: 3, cols: 4 });
    expect(store.selectedPageIndex).toBeNull();
    expect(store.paperSize).toBe("letter");
    expect(store.orientation).toBe("landscape");
    expect(store.margin).toBe(0);
    expect(store.projectMeta.name).toBe(defaultMeta.name);

    // Non-finite margin should be ignored
    store.restoreProjectJSON({ margin: "invalid" });
    expect(store.margin).toBe(0);

    store.restoreProjectJSON({ margin: NaN });
    expect(store.margin).toBe(0);

    // Valid margin 0 is finite and accepted
    store.margin = 10;
    store.restoreProjectJSON({ margin: 0 });
    expect(store.margin).toBe(0);
  });
});
