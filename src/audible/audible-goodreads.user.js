// ==UserScript==
// @name         Audible Goodreads Ratings
// @namespace    https://www.audible.com/
// @version      1.0
// @description  Provides Goodreads ratings on audible website
// @author       Ravikiran Janardhana
// @match        https://www.audible.com/*
// @updateURL    https://raw.githubusercontent.com/ravikiranj/tampermonkey-scripts/master/src/audible/audible-goodreads.user.js
// @downloadURL  https://raw.githubusercontent.com/ravikiranj/tampermonkey-scripts/master/src/audible/audible-goodreads.user.js
// @require      http://code.jquery.com/jquery-3.6.0.min.js
// @grant        GM.xmlHttpRequest
// ==/UserScript==

/*
Add below line to UserScript section to edit locally the file contents
// @require      file://PATH-TO-REPO\tampermonkey-scripts\src\audible\audible-goodreads.user.js
*/

const ratings = (function($) {
  'use strict';

  // Private Variables (immutable)
  const
    bookElemsDict = {
      "sales": "div.bc-container ul.bc-list li.bc-list-item h3.bc-heading a.bc-link",
      "book": "div.bc-container ul.bc-list li.bc-list-item h1.bc-heading",
      "wishlist": "table.bc-table ul.bc-list li.bc-list-item a.bc-link[aria-label='Title']",
      "library": "#adbl-library-content-main ul.bc-list li.bc-list-item:first-child a.bc-link"
    },
    bookElemSelector =  $.map(bookElemsDict, function(value, key) { return value; }).join(","),
    bookElems = $(bookElemSelector);
  const
    _getRatingsHtml = function(bookLink, bookRating) {
      const patchedBookLink = bookLink.startsWith("http") ? bookLink : `https://www.goodreads.com${bookLink}`;
      const html =
        `
<li class="bc-list-item ratingsLabel">
  <span class="bc-text bc-size-small bc-color-secondary">Goodreads Rating:
      <a class="bc-link bc-color-link" tabindex="0" target="_blank" href="${patchedBookLink}"> ${bookRating}</a>
  </span>
</li>
    `;
      return html;
    },
    _addGoodreadsRating = function(title, bookItemParent) {
      const goodreadsUrl = `https://www.goodreads.com/search?q=${title}&search_type=books`;
      GM.xmlHttpRequest({
        method: "GET",
        url: goodreadsUrl,
        onload: function(response) {
          if (!response || response.status != 200 || !response.responseText) {
            const status = response && response.status ? response.status : "UNKNOWN";
            console.log(`HTTP Response Status = ${status} for url = ${goodreadsUrl}`);
            return;
          }
          const parsedHtml = (new DOMParser()).parseFromString(response.responseText, "text/html");
          const html = $(parsedHtml);
          const bookLink = html.find("tbody td a.bookTitle").first().attr("href");
          const bookRating = html.find("tbody td span.minirating").first().text();
          if (!bookLink || !bookRating) {
            console.log(`Missing bookLink = ${bookLink}, bookRating = ${bookRating}!`);
            return;
          }
          bookItemParent.append(_getRatingsHtml(bookLink, bookRating));
        }
      });
    };
  return {
    init: function() {
      bookElems.each(function(index, elem) {
        const bookElem = $(elem);
        const bookTitle = bookElem.text().trim();
        const bookItemParent = bookElem.parents("ul.bc-list").first();
        if (!bookTitle || !bookItemParent) {
          return;
        }
        _addGoodreadsRating(bookTitle, bookItemParent);
      });
    }
  };
})(jQuery);

// Initialize ratings
ratings.init();