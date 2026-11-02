/** What this browser remembers once the first-visit notice is closed (HU-87): nothing personal. */
const STORAGE_KEY = "first-visit-notice-closed";

/**
 * Runs inline before the page is painted, so whoever already closed the notice never sees it
 * flash. Storage may be blocked: then the notice simply shows again.
 */
export const FIRST_VISIT_SCRIPT = `try{if(localStorage.getItem("${STORAGE_KEY}"))document.documentElement.dataset.noticeClosed=""}catch(e){}`;

/**
 * The same check from React. The 404 pages are drawn in the browser (Next sends them as an empty
 * shell), and a script added that way never runs.
 */
export function hideFirstVisitNoticeIfClosed(): void {
  try {
    if (localStorage.getItem(STORAGE_KEY)) document.documentElement.dataset.noticeClosed = "";
  } catch {
    // Blocked storage: the notice shows.
  }
}

/** Hides the notice now and remembers it, if the browser lets us. */
export function closeFirstVisitNotice(): void {
  document.documentElement.dataset.noticeClosed = "";
  try {
    localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    // Blocked storage: closed for this page only.
  }
}
