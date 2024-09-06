// ==UserScript==
// @name         Google Calendar Notifications
// @namespace    https://calendar.google.com/
// @version      1.0
// @description  Adds notifications to Google Calendar Event
// @author       Ravikiran Janardhana
// @match        https://calendar.google.com/calendar*eventedit*
// @updateURL    https://raw.githubusercontent.com/ravikiranj/tampermonkey-scripts/master/src/google/calendar/google-calendar-notifications.user.js
// @downloadURL  https://raw.githubusercontent.com/ravikiranj/tampermonkey-scripts/master/src/google/calendar/google-calendar-notifications.user.js
// @require      http://code.jquery.com/jquery-3.6.0.min.js
// @grant        GM.xmlHttpRequest
// @run-at       document-idle
// ==/UserScript==

const calendar = (function($) {
    'use strict';

    // Private Variables
    const isDebugLogEnabled = true;
    const addNotificationsId = "addNotifications";
    const maxNotifications = 4;

    const _logDebug = function(str) {
        if (isDebugLogEnabled) {
            console.log(str);
        }
    };

    const sleep = function(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    };

    const _getAddNotificationsHtml = function() {
        const html =
`
<button id="${addNotificationsId}" type="button">Add Notifications</button>
`;
        return html;
    };

    const _patchNotificationSettings = function(notificationsContainer) {
        // Patch Notifications
        const notificationElems = notificationsContainer.children("li");
        let notificationIndex = 1;
        notificationElems.each(function() {
            const notificationElem = $(this);
            // Fix Notification Type
            notificationElem.find("div:first-child div[aria-haspopup='listbox']").first().click();
            if (notificationIndex <= 2) {
                const notificationDurationInMins = notificationIndex == 1 ? 30 : 60;
                // Notification
                setTimeout(function(index) {
                    notificationElem.find("ul[aria-label='Notification method']").children("li").eq(1).click();
                    notificationElem.find("div:nth-child(2) input[type=number]").val(notificationDurationInMins);
                }, 100 * notificationIndex, notificationIndex);
            } else {
                const notificationDurationInMins = notificationIndex == 3 ? 60 : 90;
                // Email
                setTimeout(function(index) {
                    notificationElem.find("ul[aria-label='Notification method']").children("li").eq(0).click();
                    notificationElem.find("div:nth-child(2) input[type=number]").val(notificationDurationInMins);
                }, 100 * notificationIndex, notificationIndex);
            }

            // Fix time duration
            notificationIndex++;
        });
    };

    const _handleAddNotificationsClick = async function() {
        const notificationsContainer = $("ul[aria-label='Notifications']");

        // Add Notifications if necessary
        const numNotificationsToAdd = Math.max(maxNotifications - notificationsContainer.children("li").length, 0);
        const nativeAddNotificationBtn = $("button[aria-label='Add notification']")
        for (let i = 0; i < numNotificationsToAdd; i++) {
            nativeAddNotificationBtn.click();
            await sleep(10);
        }

        setTimeout(function() { _patchNotificationSettings(notificationsContainer); }, 200);
    };

    const _insertAddNotificationsButton = function() {
        const addNotificationsElem = $(_getAddNotificationsHtml());
        const saveBtn = $("#xSaveBu");

        addNotificationsElem.attr("class", saveBtn.attr("class"));
        addNotificationsElem.on("click", _handleAddNotificationsClick);
        addNotificationsElem.insertAfter(saveBtn);
    };

    // Public functions
    return {
        init: function() {
            setTimeout(function() { _insertAddNotificationsButton(); }, 500);
        }
    };
})(jQuery);

// Initialize calendar
calendar.init();
