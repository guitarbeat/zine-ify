/**
 * previewHelpers.js
 * Centralized logic for page objects and labeling across the app.
 */

/**
 * Standardizes various page object formats into a unified preview object.
 * @param {Object|string} page - The page data (string URL or object)
 * @param {number} slotIndex - The index in the current zine layout
 * @returns {Object} Normalized page object
 */
export function normalizePreviewPage(page, slotIndex = null) {
  if (!page || typeof page === 'string') {
    const src = page || null;
    return {
      sourceUrl: src,
      previewUrl: src,
      pageNumber: slotIndex !== null ? slotIndex + 1 : null,
      slotIndex
    };
  }

  // Handle various property names used across the legacy code
  const sourceUrl = page.sourceUrl ?? page.previewUrl ?? page.src ?? null;
  const previewUrl = page.previewUrl ?? page.sourceUrl ?? page.src ?? null;
  const fallbackNum = slotIndex !== null ? slotIndex + 1 : null;
  
  return {
    ...page,
    sourceUrl,
    previewUrl,
    pageNumber: page.pageNumber ?? (Number.isInteger(page.pageIndex) ? page.pageIndex + 1 : fallbackNum),
    slotIndex: page.slotIndex ?? slotIndex
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
