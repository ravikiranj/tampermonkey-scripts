// ==UserScript==
// @name         Audible Goodreads Ratings
// @namespace    https://www.audible.com/
// @version      1.2
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
    isDebugLogEnabled = false,
    bookElemsDict = {
      "sales": "div.bc-container ul.bc-list li.bc-list-item h3.bc-heading a.bc-link",
      "book": "div.bc-container ul.bc-list li.bc-list-item h1.bc-heading",
      "wishlist": "table.bc-table ul.bc-list li.bc-list-item a.bc-link[aria-label='Title']",
      "library": "#adbl-library-content-main ul.bc-list li.bc-list-item:first-child a.bc-link"
    },
    bookElemSelector =  $.map(bookElemsDict, function(value, key) { return value; }).join(","),
    bookElems = $(bookElemSelector),
    bookTitleSimilarityThreshold = 0.7,
    bookAuthorSimilarityThreshold = 0.7;
  const
    _logDebug = function(str) {
      if (isDebugLogEnabled) {
        console.log(str);
      }
    },
    // Ported from https://github.com/aceakash/string-similarity
    _getStringSimilarity = function(first, second) {
      // Patch string case - custom code
      first = first.replace(/\s+/g, '').toLowerCase();
      second = second.replace(/\s+/g, '').toLowerCase();

      // identical or empty
      if (first === second) {
        return 1;
      }

      // if either is a 0-letter or 1-letter string
      if (first.length < 2 || second.length < 2) {
        return 0;
      }

      let firstBigrams = new Map();
      for (let i = 0; i < first.length - 1; i++) {
        const bigram = first.substring(i, i + 2);
        const count = firstBigrams.has(bigram) ? firstBigrams.get(bigram) + 1 : 1;
        firstBigrams.set(bigram, count);
      }

      let intersectionSize = 0;
      for (let i = 0; i < second.length - 1; i++) {
        const bigram = second.substring(i, i + 2);
        const count = firstBigrams.has(bigram) ? firstBigrams.get(bigram) : 0;

        if (count > 0) {
          firstBigrams.set(bigram, count - 1);
          intersectionSize++;
        }
      }

      return (2.0 * intersectionSize) / (first.length + second.length - 2);
    },
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
      const author = bookItemParent.find("li.authorLabel a.bc-link").first().text().trim();
      const searchQuery = title;
      const goodreadsUrl = `https://www.goodreads.com/search?q=${searchQuery}&search_type=books`;
      GM.xmlHttpRequest({
        method: "GET",
        url: goodreadsUrl,
        onload: function(response) {
          if (!response || response.status !== 200 || !response.responseText) {
            const status = response && response.status ? response.status : "UNKNOWN";
            console.log(`HTTP Response Status = ${status} for url = ${goodreadsUrl}`);
            return;
          }
          const parsedHtml = (new DOMParser()).parseFromString(response.responseText, "text/html");
          const html = $(parsedHtml);
          const results = html.find("table.tableList tr");
          let bookLink = "";
          let bookRating = "";
          results.each(function(index, elem) {
            const result = $(elem);
            const resultBookLinkContainer = result.find("a.bookTitle").first();
            const resultBookTitle = resultBookLinkContainer.text().trim()
              // Add multiple splits for goodreads
              .split(":")[0]
              .split("(")[0];
            const resultBookLink = resultBookLinkContainer.attr("href");
            const resultBookAuthor = result.find("a.authorName span").first().text().trim();
            const resultBookRating = result.find("span.minirating").first().text().trim();

            // Missing mandatory fields, skip
            if (!resultBookTitle || !resultBookLink || !resultBookAuthor || !resultBookRating) {
              return;
            }

            // Compute book title similarity score and skip if below threshold
            const bookTitleSimilarity = _getStringSimilarity(title, resultBookTitle);
            _logDebug(`title = ${title}, resultBookTitle = ${resultBookTitle}, bookTitleSimilarity = ${bookTitleSimilarity}, threshold = ${bookTitleSimilarityThreshold}`);
            if (bookTitleSimilarity < bookTitleSimilarityThreshold) {
              return;
            }

            // Compute author similarity score if present and skip if below threshold
            let bookAuthorSimilarity = 0.0;
            if (author) {
              bookAuthorSimilarity = _getStringSimilarity(author, resultBookAuthor);
              _logDebug(`title = ${title}, author = ${author}, resultBookAuthor = ${resultBookAuthor}, bookAuthorSimilarity = ${bookAuthorSimilarity}, threshold = ${bookAuthorSimilarityThreshold}`);
              if (bookAuthorSimilarity < bookAuthorSimilarityThreshold) {
                return;
              }
            }

            // We found a valid search result, return false to exit ".each"
            _logDebug(`Found valid search result for title = ${title}, author = ${author}`);
            bookLink = resultBookLink;
            bookRating = resultBookRating;
            return false;
          });

          if (!bookLink || !bookRating) {
            console.log(`Could not find valid search result for title = ${title}, author = ${author}`);
            return;
          }
          bookItemParent.append(_getRatingsHtml(bookLink, bookRating));
        }
      });
    };

  // Public functions
  return {
    init: function() {
      bookElems.each(function(index, elem) {
        try {
          const bookElem = $(elem);
          const bookTitle = bookElem.text().trim().split(":")[0];
          const bookItemParent = bookElem.parents("ul.bc-list").first();
          if (!bookTitle || bookItemParent.length === 0) {
            return;
          }
          _addGoodreadsRating(bookTitle, bookItemParent);
        } catch (e) {
          console.log(`Caught exception = ${e} when processing elem = ${elem}`);
        }
      });
    }
  };
})(jQuery);

// Initialize ratings
ratings.init();
