/**
 * previewHelpers.js
 * Centralized logic for page objects and labeling across the app.
 */

/**
 * Standardizes various page object formats into a unified preview object.
 * @param {Object|string} page - The page data (string URL or object)
 * @param {number|null} fallbackPageNumber - The page number to use when the page has no explicit number
 * @returns {Object} Normalized page object
 */
export function normalizePreviewPage(page, fallbackPageNumber = null) {
  if (!page || typeof page === 'string') {
    const src = page || null;
    return {
      sourceUrl: src,
      previewUrl: src,
      pageNumber: fallbackPageNumber,
      slotIndex: null
    };
  }

  const sourceUrl = page.sourceUrl ?? page.previewUrl ?? null;
  const previewUrl = page.previewUrl ?? page.sourceUrl ?? null;

  return {
    ...page,
    sourceUrl,
    previewUrl,
    pageNumber: page.pageNumber ?? fallbackPageNumber,
    slotIndex: page.slotIndex ?? null
  };
}

/**
 * Generates consistent labels for pages (Cover, Back, Page N, P-N).
 * @param {number} pageNumber - The 1-based page number
 * @param {number} totalPages - Total pages in the current zine
 * @param {boolean} isShort - Whether to use the short "P1" format instead of "Page 1"
 * @returns {string} The formatted label
 */
export function getPageLabel(pageNumber, totalPages, isShort = false) {
  if (pageNumber === 1) {
    return 'Cover';
  }
  if (pageNumber === totalPages && totalPages > 1) {
    return 'Back';
  }
  return isShort ? `P${pageNumber}` : `Page ${pageNumber}`;
}
