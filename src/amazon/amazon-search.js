// ==UserScript==
// @name         Amazon Search
// @namespace    https://www.amazon.com/
// @version      1.2
// @description  Provides Amazon Search UI on product pages
// @author       Ravikiran Janardhana
// @match        https://www.amazon.com/*/dp/*
// @updateURL    https://gist.github.com/ravikiranj/2d9cc6cf3d4052ae4043fa2c1eb06a62/raw/amazon-search.js
// @downloadURL  https://gist.github.com/ravikiranj/2d9cc6cf3d4052ae4043fa2c1eb06a62/raw/amazon-search.js
// @grant        none
// ==/UserScript==

/*
Add below line to UserScript section to edit locally the file contents
// @require      file://PATH-TO-REPO\tampermonkey-scripts\src\amazon\amazon-search.js
*/

const search = (function($) {
  'use strict';

  // Private Variables (immutable)
  const customerReviewsElem = $("#reviewsMedley"),
    searchFormId = "SEARCH_FORM",
    searchInputId = "SEARCH_INPUT",
    searchSubmitId = "SEARCH_SUBMIT",
    searchFormHtml = `
<form id="${searchFormId}">
  <input type="search" id="${searchInputId}" style="width: 300px;" maxlength="300" placeholder="Search customer reviews">
  <span class="a-button a-button-base" id="${searchSubmitId}">
    <span class="a-button-inner">
      <a href="javascript:void(0);" class="a-button-text" role="button">Search</a>
    </span>
    </span>
</form>
<hr class="a-spacing-large a-divider-normal">
    `,
    searchFormDom = $(searchFormHtml),
    productIdRegex = /https:\/\/www\.amazon\.com\/.*\/dp\/([^\/]+)\/.*/,
    searchPageBaseUrl = "https://www.amazon.com/product-reviews/",
    searchPageParameters = "/ie=UTF8&reviewerType=all_reviews&pageNumber=1&filterByKeyword="
  ;

  // Private Variables (mutable)
  let searchFormElem,
    searchInputElem,
    searchSubmitElem,
    productId
  ;

  // Private functions
  const _getProductId = function() {
    const url = window.location.href;
    const matchResult = url.match(productIdRegex);
    if (!matchResult) {
      searchFormElem.hide();
    }
    return matchResult && matchResult[1] ? matchResult[1] : null;
  },

  _handleSearchEvent = function(e) {
    const query = searchInputElem.val();
    e.stopPropagation();
    e.preventDefault();
    console.log("Redirecting to search page for query = ", query);
    const searchPageUrl = searchPageBaseUrl + productId + searchPageParameters + query;
    window.open(searchPageUrl, "_blank");
  },

  _initEventHandlers = function() {
    searchSubmitElem.click(_handleSearchEvent);
    // Requires user to allow popups
    searchFormElem.keypress(function(e) {
      const keyCode = e.keyCode ? e.keyCode : e.which;
      if (keyCode == "13") {
        _handleSearchEvent(e);
      }
    });
  },

  _addSearchFormToDomAndInitElems = function() {
    searchFormDom.insertBefore(customerReviewsElem);
    searchFormElem = $("#" + searchFormId);
    searchInputElem = $("#" + searchInputId);
    searchSubmitElem = $("#" + searchSubmitId);
  },

  _checkIfProductIdExists = function () {
    productId = _getProductId();
    if (!productId) {
      searchFormElem.hide();
    } else {
      console.log("AmazonSearch Tampermonkey script: productId =", productId, "found, review search box is enabled");
    }
  }
  ;

  return {
    init: function() {
      _addSearchFormToDomAndInitElems();
      _initEventHandlers();
      _checkIfProductIdExists();
    }
  };
})(jQuery);

// Initialize search
search.init();