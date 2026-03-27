/**
 * Shadow DOM Traversal Utility
 * Recursively walks shadow roots to query elements across shadow boundaries.
 * Required for Gemini (Web Components) and future Shadow DOM usage.
 */

/**
 * Query a single element across shadow DOM boundaries.
 * @param {Element|Document} root - The root element to start searching from
 * @param {string} selector - CSS selector to match
 * @returns {Element|null} The first matching element, or null
 */
export function shadowQuery(root, selector) {
  // Fast path: try direct query first
  try {
    const direct = root.querySelector?.(selector);
    if (direct) return direct;
  } catch {
    // Invalid selector in this context, continue with walk
  }

  return _walk(root, selector);
}

/**
 * Query all matching elements across shadow DOM boundaries.
 * @param {Element|Document} root - The root element to start searching from
 * @param {string} selector - CSS selector to match
 * @returns {Element[]} Array of all matching elements
 */
export function shadowQueryAll(root, selector) {
  const results = [];

  try {
    results.push(...root.querySelectorAll(selector));
  } catch {
    // Invalid selector in this context
  }

  _walkAll(root, selector, results);
  return results;
}

/**
 * Recursive walk for single-element query.
 * @private
 */
function _walk(node, selector) {
  if (node.shadowRoot) {
    try {
      const found = node.shadowRoot.querySelector(selector);
      if (found) return found;
    } catch { /* skip */ }

    for (const child of node.shadowRoot.children) {
      const deep = _walk(child, selector);
      if (deep) return deep;
    }
  }

  for (const child of node.children || []) {
    const deep = _walk(child, selector);
    if (deep) return deep;
  }

  return null;
}

/**
 * Recursive walk for multi-element query.
 * @private
 */
function _walkAll(node, selector, results) {
  if (node.shadowRoot) {
    try {
      results.push(...node.shadowRoot.querySelectorAll(selector));
    } catch { /* skip */ }

    for (const child of node.shadowRoot.children) {
      _walkAll(child, selector, results);
    }
  }

  for (const child of node.children || []) {
    _walkAll(child, selector, results);
  }
}
