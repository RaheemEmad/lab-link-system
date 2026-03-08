import DOMPurify from 'dompurify';

/**
 * Safely preview HTML content in a sandboxed window.
 * Strips all scripts and dangerous attributes before rendering.
 */
export function openSanitizedHtmlPreview(htmlContent: string) {
  const previewWindow = window.open('', '_blank');
  if (!previewWindow || !htmlContent) return;

  const sanitized = DOMPurify.sanitize(htmlContent, {
    WHOLE_DOCUMENT: true,
    ALLOWED_TAGS: [
      'html', 'head', 'body', 'title', 'style',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'p', 'br', 'hr', 'div', 'span', 'pre', 'code',
      'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
      'ul', 'ol', 'li', 'dl', 'dt', 'dd',
      'a', 'img', 'strong', 'em', 'b', 'i', 'u', 'sub', 'sup',
      'blockquote', 'section', 'article', 'header', 'footer',
      'meta', 'link',
    ],
    ALLOWED_ATTR: [
      'class', 'id', 'style', 'href', 'src', 'alt', 'title',
      'width', 'height', 'colspan', 'rowspan', 'border',
      'cellpadding', 'cellspacing', 'align', 'valign',
      'charset', 'name', 'content', 'rel', 'type',
    ],
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'textarea', 'button'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur'],
  });

  previewWindow.document.write(sanitized);
  previewWindow.document.close();
}
