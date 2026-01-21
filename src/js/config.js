export const PAPER_SIZES = {
    a4: { label: 'A4 (210 × 297 mm)', width: 210, height: 297 },
    a3: { label: 'A3 (297 × 420 mm)', width: 297, height: 420 },
    letter: { label: 'Letter (8.5 × 11 in)', width: 215.9, height: 279.4 },
    legal: { label: 'Legal (8.5 × 14 in)', width: 215.9, height: 355.6 },
    a5: { label: 'A5 (148 × 210 mm)', width: 148, height: 210 }
};

export const ORIENTATIONS = {
    LANDSCAPE: 'landscape',
    PORTRAIT: 'portrait'
};

/**
 * Zine template definitions
 * layout: Array of [pageNumber, isUpsideDown] tuples in grid order (row by row)
 */
export const ZINE_TEMPLATES = {
    'mini-8': {
        label: '8-Page Mini-Zine',
        pages: 8,
        grid: { rows: 2, cols: 4 },
        // Grid order: row by row, left to right
        layout: [
            { page: 5, upsideDown: false }, { page: 4, upsideDown: true },
            { page: 3, upsideDown: true }, { page: 2, upsideDown: true },
            { page: 6, upsideDown: false }, { page: 7, upsideDown: false },
            { page: 8, upsideDown: false }, { page: 1, upsideDown: false }
        ],
        gridAreas: `
            "page5 page4 page3 page2"
            "page6 page7 page8 page1"
        `,
        upsideDownPages: [2, 3, 4, 5],
        cutLines: {
            horizontal: { afterRow: 1 } // Cut between row 1 and 2
        }
    },
    'accordion-16': {
        label: '16-Page Accordion',
        pages: 16,
        grid: { rows: 4, cols: 4 },
        layout: [
            { page: 4, upsideDown: true }, { page: 3, upsideDown: true },
            { page: 2, upsideDown: true }, { page: 1, upsideDown: true },
            { page: 5, upsideDown: false }, { page: 6, upsideDown: false },
            { page: 7, upsideDown: false }, { page: 8, upsideDown: false },
            { page: 12, upsideDown: true }, { page: 11, upsideDown: true },
            { page: 10, upsideDown: true }, { page: 9, upsideDown: true },
            { page: 13, upsideDown: false }, { page: 14, upsideDown: false },
            { page: 15, upsideDown: false }, { page: 16, upsideDown: false }
        ],
        gridAreas: `
            "page4 page3 page2 page1"
            "page5 page6 page7 page8"
            "page12 page11 page10 page9"
            "page13 page14 page15 page16"
        `,
        upsideDownPages: [1, 2, 3, 4, 9, 10, 11, 12],
        // Cut lines for accordion fold - vertical cuts on left and right edges
        cutLines: {
            leftEdge: { rows: [0, 1, 2] },   // Cut through rows 1-3, leave row 4 intact
            rightEdge: { rows: [0, 1, 2] }  // Same on right side
        },
        description: '1 sheet, 4×4 grid. Cut along edges then fold accordion-style.'
    },
    'dual-16': {
        label: '16-Page Dual Sheets',
        pages: 16,
        sheets: 2, // Uses 2 separate 8-page mini-zine sheets
        grid: { rows: 2, cols: 4 },
        description: '2 sheets, each folded like an 8-page zine.'
    }
};
