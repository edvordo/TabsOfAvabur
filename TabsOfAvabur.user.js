// ==UserScript==
// @name         TabsOfAvabur
// @namespace    Reltorakii.magic
// @version      4.4.0-alpha-2
// @description  Tabs the channels it finds in chat, can be sorted, with notif for new messages
// @author       Reltorakii
// @match        http*://*.avabur.com/game*
// @downloadURL  https://github.com/edvordo/TabsOfAvabur/raw/master/TabsOfAvabur.user.js
// @updateURL    https://github.com/edvordo/TabsOfAvabur/raw/master/TabsOfAvabur.user.js
// @require      https://cdn.rawgit.com/omichelsen/compare-versions/v3.1.0/index.js
// @require      https://cdn.rawgit.com/markdown-it/markdown-it/8.4.1/dist/markdown-it.min.js
// @require      https://cdn.rawgit.com/markdown-it/markdown-it-emoji/1.4.0/dist/markdown-it-emoji.min.js
// @grant        none
// @run-at       document-idle
// ==/UserScript==
/* jshint -W097 */
/* jshint -W043 */
"use strict";

(function ($) {

    let options = {
        scriptSettings  : {
            purge                     : true,
            channel_remove            : false,
            preview                   : true,
            preview_reset             : false,
            group_wires               : false,
            at_username               : true,
            join_channel_link         : true,
            auto_join                 : false,
            profile_tooltip_nickname  : true,
            profile_tooltip_mention   : true,
            profile_tooltip_quickscope: true,
            chat_direction            : 'up',
            persistent_channels       : false,
            prepend_with_hashtag      : true,
            abbreviate_channel_names  : false,
            loose_abbreviation        : true,
            exclamate_unread_count    : false
        },
        channelsSettings: {
            channelMerger     : {
                groups         : [],
                mapping        : {},
                defaultChannels: {}
            },
            mutedChannels     : [],
            persistentChannels: []
        },
        version         : typeof GM_info === "object" ? GM_info.script.version : '4.4.0-alpha-2'
    };

    let groupsMap             = {};
    let channelLog            = {};
    let currentChannel        = null;
    let ServerMessagesChannel = "SML_325725_2338723_CHC";
    let CMDResposeChannel     = "CMDRC_4000_8045237_CHC";
    let WhispersChannel       = "UW_7593725_3480021_CHC";
    let WiresChannel          = "WC_0952340_3245901_CHC";
    let MergedChannelsGroup   = "MCG_105704_4581101_CHC";

    let firstTabSelected = false;

    let GlobalChannel = '1000000000';
    let EventChannel  = '2000000000';

    let scriptChannels = [ServerMessagesChannel, CMDResposeChannel, WhispersChannel, WiresChannel];

    let internalUpdateUrl   = "https://api.github.com/repos/edvordo/TabsOfAvabur/contents/TabsOfAvabur.user.js";
    let internalReleasesUrl = 'https://api.github.com/repos/edvordo/TabsOfAvabur/releases';

    let hovering;
    let hoveringOverTab;

    let checkForUpdateTimer = 0;

    let SSN = 0;

    let maxMessageCount = 250; // this is a max forced by the game itself

    function log(message) {
        console.log(`[${(new Date).toLocaleTimeString()}] [Tabs of Avabur (v${options.version})] ${message}`);
    }

    function ChannelHistory() {
        let messages = [];

        function __removeOldest() {
            while (messages.length > maxMessageCount) {
                if (options.scriptSettings.chat_direction === 'up') {
                    messages.pop();
                } else {
                    messages.shift();
                }
            }
        }

        function __addMessage(message) {
            __removeOldest();
            if (options.scriptSettings.chat_direction === 'up') {
                messages.unshift(message);
            } else {
                messages.push(message);
            }
        }

        function __getMessages() {
            return messages;
        }

        function __clearMessages() {
            messages = [];
        }

        function __getMessageCount() {
            return messages.length;
        }

        function __reverseMessages() {
            messages.reverse();
        }

        return {
            addMessage     : __addMessage,
            getMessages    : __getMessages,
            clearMessages  : __clearMessages,
            getMessageCount: __getMessageCount,
            reverseMessages: __reverseMessages
        };
    }

    function returnCustomID(channel, resolved, cname, on) {
        return {
            cID : channel,
            res : resolved,
            name: cname,
            on  : typeof on !== "undefined" ? on : name
        };
    }

    function resolveChannelID(channel) {
        let channelID;
        let origChannelName = channel;
        let resolved        = true;
        if (channel === "GLOBAL") {
            channel = "Global";
        } else if (channel === "CLAN") {
            channel = "Clan";
        } else if (channel && channel.substr(0, 4) === "AREA") {
            channel = "Area";
        } else if (channel === "HELP") {
            channel = "Help";
        } else if (channel === "STAFF") {
            channel = "Staff";
        } else if (channel === "TRADE") {
            channel = "Trade";
        } else if (channel === "Market") {
            return returnCustomID(CMDResposeChannel, true, "");//  info channel changes this later
        } else if (channel === "Whispers Log") {
            return returnCustomID(WhispersChannel, true, channel, origChannelName);
        } else if (channel === "Wires Log") {
            return returnCustomID(WiresChannel, true, channel, origChannelName);
        } else if (channel === "Server Messages") {
            return returnCustomID(ServerMessagesChannel, true, channel, origChannelName);
        } else if (channel && channel.match(/^(Battle|Fishing|Woodcutting|Mining|Stonecutting|Crafting|Carving|Event):\s+[0-9]+/)) {
            return returnCustomID(CMDResposeChannel, true, "", origChannelName);//  info channel changes this later
        }
        let map = {
            "Global": "GLOBAL",
            "Clan"  : "CLAN",
            "Area"  : "AREA",
            "Help"  : "HELP",
            "Staff" : "STAFF",
            "Trade" : "TRADE"
        };
        if (map.hasOwnProperty(origChannelName)) {
            origChannelName = map[origChannelName];
        }

        channelID = 0;
        $("select#chatChannel option").each(function (i, e) {
            let n = $(e).attr("id");
            if (n === "channel" + channel) {
                channelID = $(e).attr("value");
            }
        });
        if (options.channelsSettings.channelMerger.groups.indexOf(origChannelName) !== -1) {
            channelID = MergedChannelsGroup + "_MCGID_" + groupsMap[origChannelName];
        }

        if (origChannelName == "GLOBAL") {
            channelID = GlobalChannel;
        }
        if (origChannelName == "Event") {
            channelID = EventChannel;
        }

        if (channelID === 0) {
            resolved  = false;
            channelID = CMDResposeChannel; // Main
        }

        return returnCustomID(channelID, resolved, channel, origChannelName);
    }

    function resolveChannelColor(channelID, channelName) {
        let color = "";
        try {
            color = $(".chatChannel[data-id=\"" + channelName + "\"]").css("background-color");
        } catch (e) {
            color = "";
        }
        if (color === "" || typeof color === "undefined") {
            $(".chatChannel").each(function (i, e) {
                if ($(e).attr("data-id") === channelName) {
                    color = $(e).css("background-color");
                }
            });
        }
        if (channelID === ServerMessagesChannel) {
            color = "#007f23";
        } else if (channelID === CMDResposeChannel) {
            color = "#317D80";
        } else if (channelID === WhispersChannel) {
            color = "#DE3937"; //FF3
        } else if (channelID === WiresChannel) {
            color = "#39DE37"; //FF3
        }
        return color;
    }

    function updateAllChannelTabs() {
        $("#channelTabList").find(".channelTab").each(function () {
            let channel = $(this).data("channel");
            if (channel) {
                updateChannelList(channelLog[channel]);
            }
        });
    }

    function abbreviateChannelName(channelName) {
        if (channelName.match(/^[0-9a-z \-'\._]+$/i) === null) {
            return channelName;
        }

        if (channelName.match(/^[A-Z]+$/) || channelName.match(/^[a-z]+$/)) {
            if (options.scriptSettings.loose_abbreviation === true) {
                return channelName.substr(0, 3);
            } else {
                return channelName.charAt(0);
            }
        }

        let cnsp = channelName.split(' ');
        if (cnsp.length > 1) {
            return cnsp.map(abbreviateChannelName).join('');
        }

        let cndp = channelName.split('-');
        if (cndp.length > 1) {
            return cndp.map(abbreviateChannelName).join('-');
        }

        let cnup = channelName.split('_');
        if (cnup.length > 1) {
            return cnup.map(abbreviateChannelName).join('_');
        }

        let regex = /[a-z']+/g;
        if (options.scriptSettings.loose_abbreviation === true) {
            regex = /([a-z]{1,}|['])+/g
        }
        return channelName.split(regex).map(part => {
            if (part.match(/^[A-Z]+$/)) {
                return part;
            }
            if (options.scriptSettings.loose_abbreviation === true) {
                return part.substr(0, 2);
            } else {
                return part.charAt(0);
            }
        }).join('');
    }

    function updateChannelList(channel, withPersistentUpdate = true) {
        let tab = $("#channelTab" + channel.channelID);
        if (tab.length === 0) {
            if (channel.muted) {
                return;
            }
            $("<div>")
                .attr({
                    id            : `channelTab${channel.channelID}`,
                    "data-channel": channel.channelID
                })
                .addClass("border2 ui-element channelTab")
                .css(
                    {
                        color: channel.channelColor
                    }
                )
                .appendTo("#channelTabList");
            tab = $("#channelTab" + channel.channelID);
        }
        let channelTabLabel = channel.channelName;
        if (true === options.scriptSettings.abbreviate_channel_names) {
            channelTabLabel = abbreviateChannelName(channelTabLabel);
        }
        if (true === options.scriptSettings.prepend_with_hashtag) {
            channelTabLabel = '#' + channelTabLabel;
        }
        tab.text(channelTabLabel).css({color: channel.channelColor});
        if (channel.newMessages && !channel.muted) {

            let newMsgCountIndicator = channel.newMessagesCount;
            if (options.scriptSettings.exclamate_unread_count === true) {
                newMsgCountIndicator = '!';
            } else if (newMsgCountIndicator > maxMessageCount) {
                newMsgCountIndicator = `${maxMessageCount}+`;
            }
            if ($(".Ch" + channel.channelID + "Badge").length === 0) {
                $("<span>")
                    .addClass("ChBadge")
                    .addClass("border2")
                    .addClass("Ch" + channel.channelID + "Badge")
                    .text(newMsgCountIndicator)
                    .appendTo("#channelTab" + channel.channelID);
            } else {
                $(".Ch" + channel.channelID + "Badge").text(newMsgCountIndicator);
            }
        }
        if (channel.muted) {
            $("<span>")
                .addClass("ChBadge fa fa-times border2 ui-element")
                .appendTo("#channelTab" + channel.channelID);
        }
        if (withPersistentUpdate) {
            savePersistentChannels();
        }
        if (firstTabSelected === false && document.querySelectorAll('.channelTab').length === 1) {
            document.querySelector('.channelTab').click();
        }
    }

    function addSettingsTab() {
        log('Adding settings tab');
        $("<div>")
            .attr("id", "ToASettings")
            .addClass("border2 ui-element ToASettings")
            .prependTo("#channelTabList");
        $("<span>")
            .addClass("fa")
            .addClass("fa-cogs")
            .css(
                {
                    color     : "#ffd700",
                    fontWeight: 500
                }
            )
            .appendTo("#ToASettings");
    }

    function randomInt(min, max) {
        return Math.round(Math.random() * (max - min)) + min;
    }

    function randomColor() {
        let color = "#";
        for (let i = 0; i < 6; i++) {
            color += Math.floor(Math.random() * 15).toString(16);
        }
        return color;
    }

    function randomName(min, max) {
        let a    = "aeiou".split("");
        let b    = "rtzpsdfghklmnbvc".split("");
        let l    = randomInt(min, max);
        let name = "";
        for (let i = 0; i < l; i++) {
            let charset = i % 2 === 0 ? a : b;
            if (i === 0) {
                charset = Math.random() < 0.5 ? a : b;
            }
            let letter = charset[randomInt(0, charset.length - 1)];
            name += i === 0 ? letter.toUpperCase() : letter;
        }
        return name;
    }

    function ucfirst(str) {
        let first = str.charAt(0).toUpperCase();

        return first + str.substr(1);
    }

    function loadDependencies() {
        log('Adding dependencies');
        //<link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/font-awesome/4.6.3/css/font-awesome.min.css">
        $("<link>")
            .attr(
                {
                    rel : "stylesheet",
                    href: "//maxcdn.bootstrapcdn.com/font-awesome/4.7.0/css/font-awesome.min.css"
                }
            )
            .appendTo("head");

        // basically we are not in userscript manager context
        if (typeof compareVersions !== 'function' && typeof GM_info !== 'object') {
            $('<script>')
                .attr(
                    {
                        src     : 'https://cdn.rawgit.com/omichelsen/compare-versions/v3.1.0/index.js',
                        language: 'application/javascript'
                    }
                )
                .appendTo('head');
            $('<script>')
                .attr(
                    {
                        src     : 'https://cdn.rawgit.com/markdown-it/markdown-it/8.4.1/dist/markdown-it.min.js',
                        language: 'application/javascript'
                    }
                )
                .appendTo('head');
            $('<script>')
                .attr(
                    {
                        src     : 'https://cdn.rawgit.com/markdown-it/markdown-it-emoji/1.4.0/dist/markdown-it-emoji.min.js',
                        language: 'application/javascript'
                    }
                )
                .appendTo('head');
        }
    }

    function populateChangelog() {
        log('Pulling script repo tags');
        let container = $('#ToASettingsChangelog > #ToACLLog');
        container.html('');
        fetch(internalReleasesUrl)
            .then(response => response.json())
            .then(releases => {
                for (let release of releases) {
                    // release.name, release.body, new Date(release.published_at), release.html_url;
                    container.append(`<div>
    <h5>
        ${release.name}<br>
        <small>${(new Date(release.published_at)).toLocaleString()}</small>
    </h5>
    ${markdownit().use(markdownitEmoji).render(release.body)}
</div>`);
                }
            });
    }

    function prepareHTML() {
        log('Setting-up HTML');
        $("<div>")
            .attr("id", "channelTabListWrapper")
            .insertBefore("#chatMessageListWrapper");
        $("<div>")
            .attr("id", "channelTabList")
            .appendTo("#channelTabListWrapper");

        /**
         * Preview channel
         */
        $("<div>")
            .attr("id", "channelPreviewWrapper")
            .addClass("border2")
            .addClass("ui-element")
            .appendTo("body");

        $("<h5>")
            .css("text-align", "center")
            .appendTo("#channelPreviewWrapper");

        $("<div>")
            .attr("id", "channelPreviewActions")
            .appendTo("#channelPreviewWrapper");

        $("<span>")
            .addClass("border2 ui-element fa fa-check sapphire cpa")
            .attr("id", "CPAReset")
            .attr("title", "Mark as read")
            .appendTo("#channelPreviewActions");

        $("<span>")
            .addClass("border2 ui-element fa fa-history materials cpa")
            .attr("id", "CPAHistory")
            .attr("title", "View history")
            .appendTo("#channelPreviewActions");

        $("<span>")
            .addClass("border2 ui-element fa fa-eraser emerald cpa")
            .attr("id", "CPAPurge")
            .attr("title", "Clear channel of all messages")
            .appendTo("#channelPreviewActions");

        $("<span>")
            .addClass("border2 ui-element fa fa-unlink ruby cpa")
            .attr("id", "CPARemove")
            .attr(
                "title",
                "Clear the channel and remove it from tabs\nIf any new messages pop into it, it will come back."
            )
            .appendTo("#channelPreviewActions");

        $("<div>")
            .attr("id", "channelPreviewContent")
            .appendTo("#channelPreviewWrapper");

        $("<div>")
            .attr("id", "channelPreviewMessages")
            .css({padding: "2px"})
            .appendTo("#channelPreviewContent");

        /**
         * context menu
         */

        $("<div>")
            .attr("id", "channelTabContextMenu")
            .addClass("ui-element navSection")
            .appendTo("body");

        $("<a>")
            .attr("id", "chTabCTMenuMute")
            .text("Mute channel")
            .addClass("cctmButton")
            .appendTo("#channelTabContextMenu");

        $("<span>")
            .addClass("ui-element fa fa-bell-slash titanium")
            .prependTo("#chTabCTMenuMute");

        $("<a>")
            .attr("id", "chTabCTMenuUnMute")
            .text("Un-mute channel")
            .addClass("cctmButton")
            .appendTo("#channelTabContextMenu");

        $("<span>")
            .addClass("ui-element fa fa-bell platinum")
            .prependTo("#chTabCTMenuUnMute");

        $("<a>")
            .attr("id", "chTabCTMenuReset")
            .text("Mark as read")
            .addClass("cctmButton")
            .appendTo("#channelTabContextMenu");

        $("<span>")
            .addClass("ui-element fa fa-check sapphire")
            .prependTo("#chTabCTMenuReset");

        $("<a>")
            .attr("id", "chTabCTMenuLast")
            .text("Show history")
            .addClass("cctmButton")
            .appendTo("#channelTabContextMenu");

        $("<span>")
            .addClass("ui-element fa fa-history materials")
            .prependTo("#chTabCTMenuLast");

        $("<a>")
            .attr("id", "chTabCTMenuPurge")
            .text("Purge messages")
            .addClass("cctmButton")
            .appendTo("#channelTabContextMenu");

        $("<span>")
            .addClass("ui-element fa fa-eraser emerald")
            .prependTo("#chTabCTMenuPurge");

        $("<a>")
            .attr("id", "chTabCTMenuRemove")
            .text("Remove from tabs")
            .addClass("cctmButton")
            .appendTo("#channelTabContextMenu");

        $("<span>")
            .addClass("ui-element fa fa-unlink ruby")
            .prependTo("#chTabCTMenuRemove");

        $("<a>")
            .attr("id", "chTabCTMenuLeave")
            .text("Leave channel")
            .addClass("cctmButton")
            .appendTo("#channelTabContextMenu");

        $("<span>")
            .addClass("ui-element fa fa-arrow-right diamond")
            .prependTo("#chTabCTMenuLeave");

        $("<a>")
            .attr("id", "chTabCTMenuColor")
            .text("Change color")
            .addClass("cctmButton")
            .appendTo("#channelTabContextMenu");

        $("<span>")
            .addClass("ui-element fa fa-crosshairs crystals")
            .prependTo("#chTabCTMenuColor");


        $("#channelTabContextMenu").hide();

        /**
         * settings
         */
        $("<div>")
            .attr("id", "ToASettingsWindow")
            .addClass("border2 ui-element")
            .appendTo("body");

        let author = document.createElement('a');
        author.setAttribute('href', 'javascript:void(0');
        author.setAttribute('id', 'ToAAuthor');
        author.appendChild(document.createTextNode('@Reltorakii'));
        $("<h5>")
            .css("text-align", "center")
            .append(`TabsOfAvabur v${options.version} by ${author.outerHTML} - Settings`)
            .appendTo("#ToASettingsWindow");

        $("<div>")
            .attr("id", "ToASWMenu")
            .data('active', null)
            .appendTo("#ToASettingsWindow");

        let tm = $("<div>")
            .addClass("col-sm-4 text-center");

        let tm1 = tm.clone().appendTo("#ToASWMenu");
        let tm2 = tm.clone().appendTo("#ToASWMenu");
        // let tm3 = tm.clone().appendTo("#ToASWMenu");
        let tm4 = tm.clone().appendTo("#ToASWMenu");

        $("<button>")
            .attr({type: "button", id: "ToAScriptOptions"})
            .data('target', '#ToASettingsScriptSettings')
            .addClass("btn btn-primary btn-block")
            .text("Script options")
            .appendTo(tm1);

        $("<button>")
            .attr({type: "button", id: "ToAChannelMerger"})
            .data('target', '#ToASettingsChannelMerger')
            .addClass("btn btn-primary btn-block")
            .text("Channel Manager")
            .appendTo(tm2);

        // $("<button>")
        //     .attr({type: "button", id: "ToAChannelHistory"})
        //     .data('target', '#ToASettingsChannelHistory')
        //     .addClass("btn btn-primary btn-block")
        //     .text("Channels History")
        //     .appendTo(tm3);

        $("<button>")
            .attr({type: "button", id: "ToAChangelog"})
            .data('target', '#ToASettingsChangelog')
            .addClass("btn btn-primary btn-block")
            .text("Changelog")
            .appendTo(tm4);

        $("<div>").addClass("clearfix").appendTo("#ToASettingsWindow");

        $("<div>")
            .attr("id", "ToASettingsWindowContent")
            .appendTo("#ToASettingsWindow");

        $("<div>")
            .attr("id", "ToASettingsScriptSettings")
            .appendTo("#ToASettingsWindowContent");

        let st  = $("<h6>").addClass("text-center");
        let t2  = $("<label>");
        let t2a = $("<input>").attr({"type": "checkbox"}).addClass("settingsChanger");
        let t2w = $("<div>").addClass("col-sm-6");

        st.clone().text("Script settings").appendTo("#ToASettingsScriptSettings");
        // purge channel
        t2w.clone()
            .append(
                t2.clone()
                    .text(" Allow channel message purging")
                    .prepend(
                        t2a.clone()
                            .attr("data-setting", "purge")
                            .prop("checked", options.scriptSettings.purge)
                    )
            )
            .appendTo("#ToASettingsScriptSettings");
        // purge and remove
        t2w.clone()
            .append(
                t2.clone()
                    .text(" Allow removing channel from tabs")
                    .prepend(
                        t2a.clone()
                            .attr("data-setting", "channel_remove")
                            .prop("checked", options.scriptSettings.channel_remove)
                    )
            )
            .appendTo("#ToASettingsScriptSettings");

        // preview
        t2w.clone()
            .append(
                t2.clone()
                    .text(" Preview channel on tab hover")
                    .prepend(
                        t2a.clone()
                            .attr("data-setting", "preview")
                            .prop("checked", options.scriptSettings.preview)
                    )
            )
            .appendTo("#ToASettingsScriptSettings");

        // mark read
        t2w.clone()
            .append(
                t2.clone()
                    .text(" Allow marking channels as read")
                    .prepend(
                        t2a.clone()
                            .attr("data-setting", "preview_reset")
                            .prop("checked", options.scriptSettings.preview_reset)
                    )
            )
            .appendTo("#ToASettingsScriptSettings");

        // mark read
        t2w.clone()
            .append(
                t2.clone()
                    .text(" Group wires into their own channel")
                    .prepend(
                        t2a.clone()
                            .attr("data-setting", "group_wires")
                            .prop("checked", options.scriptSettings.group_wires)
                    )
            )
            .appendTo("#ToASettingsScriptSettings");

        // @mention
        t2w.clone()
            .append(
                t2.clone()
                    .text(" Make @username clickable")
                    .prepend(
                        t2a.clone()
                            .attr("data-setting", "at_username")
                            .prop("checked", options.scriptSettings.at_username)
                    )
            )
            .appendTo("#ToASettingsScriptSettings");

        // /join channel password
        t2w.clone()
            .append(
                t2.clone()
                    .html(
                        " Make '/join channel' clickable. <span class='fa fa-info-circle ToATooltip' title='After you click on the link, the chat message will be filled with a /join channel text.' data-toggle='tooltip' data-placement='top' data-html='true'></span>")
                    .prepend(
                        t2a.clone()
                            .attr("data-setting", "join_channel_link")
                            .prop("checked", options.scriptSettings.join_channel_link)
                    )
            )
            .appendTo("#ToASettingsScriptSettings");

        // /join channel password
        t2w.clone()
            .append(
                t2.clone()
                    .html(
                        " Autojoin clicked channel. <span class='fa fa-info-circle ToATooltip' title='This is designed to work with the previous option to replace the /join <a>channel</a> message.<br>If this option is enabled, the prefilled message to join a channel will be automatically sent.' data-toggle='tooltip' data-placement='top' data-html='true'></span>")
                    .prepend(
                        t2a.clone()
                            .attr("data-setting", "auto_join")
                            .prop("checked", options.scriptSettings.auto_join)
                    )
            )
            .appendTo("#ToASettingsScriptSettings");

        // profileOptionsTooltip - Nickname
        t2w.clone()
            .append(
                t2.clone()
                    .html(" Enable Ni[c]kname shortcut")
                    .prepend(
                        t2a.clone()
                            .attr("data-setting", "profile_tooltip_nickname")
                            .prop("checked", options.scriptSettings.profile_tooltip_nickname)
                    )
            )
            .appendTo("#ToASettingsScriptSettings");

        // profileOptionsTooltip - @mention
        t2w.clone()
            .append(
                t2.clone()
                    .html(" Enable @m[e]ntion shortcut")
                    .prepend(
                        t2a.clone()
                            .attr("data-setting", "profile_tooltip_mention")
                            .prop("checked", options.scriptSettings.profile_tooltip_mention)
                    )
            )
            .appendTo("#ToASettingsScriptSettings");

        // profileOptionsTooltip - Nickname
        t2w.clone()
            .append(
                t2.clone()
                    .html(" Enable [Q]uickscope shortcut")
                    .prepend(
                        t2a.clone()
                            .attr("data-setting", "profile_tooltip_quickscope")
                            .prop("checked", options.scriptSettings.profile_tooltip_quickscope)
                    )
            )
            .appendTo("#ToASettingsScriptSettings");

        // pesist channels between reloads
        t2w.clone()
            .append(
                t2.clone()
                    .html(
                        ` Enable persistent channels <span class="fa fa-info-circle ToATooltip" title="Upon refresh all currently present channel tabs will be recreated (without history)." data-toggle="tooltip" data-placement="top" data-html="true"></span>`)
                    .prepend(
                        t2a.clone()
                            .attr("data-setting", "persistent_channels")
                            .prop("checked", options.scriptSettings.persistent_channels)
                    )
            )
            .appendTo("#ToASettingsScriptSettings");

        // prepend the number sign to channel tab name
        t2w.clone()
            .append(
                t2.clone()
                    .html(` Prepend # to channel tab names`)
                    .prepend(
                        t2a.clone()
                            .attr("data-setting", "prepend_with_hashtag")
                            .prop("checked", options.scriptSettings.prepend_with_hashtag)
                    )
            )
            .appendTo("#ToASettingsScriptSettings");

        // use an exclamation point to indicate new messages i na channel
        t2w.clone()
            .append(
                t2.clone()
                    .html(` Use ! instead of new messages count`)
                    .prepend(
                        t2a.clone()
                            .attr("data-setting", "exclamate_unread_count")
                            .prop("checked", options.scriptSettings.exclamate_unread_count)
                    )
            )
            .appendTo("#ToASettingsScriptSettings");

        // abbr channel names
        t2w.clone()
            .append(
                t2.clone()
                    .html(` Abbreviate channel names (e.g.: TabOfAvabur would become TOA)`)
                    .prepend(
                        t2a.clone()
                            .attr("data-setting", "abbreviate_channel_names")
                            .prop("checked", options.scriptSettings.abbreviate_channel_names)
                    )
            )
            .appendTo("#ToASettingsScriptSettings");

        // loose abbreviation
        t2w.clone()
            .append(
                t2.clone()
                    .html(` Loose abbreviation (e.g.: TabsOfAvabur => TabOfAva OR Main => Mai)`)
                    .prepend(
                        t2a.clone()
                            .attr("data-setting", "loose_abbreviation")
                            .prop("checked", options.scriptSettings.loose_abbreviation)
                    )
            )
            .appendTo("#ToASettingsScriptSettings");

        $("<div>").addClass("clearfix").appendTo("#ToASettingsScriptSettings");

        $("<div>")
            .attr("id", "ToASettingsChannelMerger")
            .appendTo("#ToASettingsWindowContent");

        st.clone().text("Muted channels").appendTo("#ToASettingsChannelMerger");

        /**
         * muted channels content added on settings window open
         */

        $("<div>")
            .attr("id", "ToASChMMutedChannelsHolder")
            .addClass("border2 ui-element ToASChannelsHolder")
            .appendTo("#ToASettingsChannelMerger");

        // clearfix muted channels
        $("<div>").addClass("clearfix").appendTo("#ToASettingsWindow");

        /**
         * channel merger content added on setting window open
         */
        st.clone().text("Channel Merger").appendTo("#ToASettingsChannelMerger");

        // holder for all channels - script created ones
        $("<div>")
            .attr("id", "ToASChMMergedChannelsHolder")
            .addClass("border2 ui-element ToASChannelsHolder incsort")
            .appendTo("#ToASettingsChannelMerger")
            .before(t2.clone().text("Available Channels:"));

        // holder for groups
        $("<div>")
            .attr("id", "ToASChMMergedChannelsGroupsHolder")
            .addClass("ui-element ToASChannelsHolder")
            .appendTo("#ToASettingsChannelMerger")
            .before();
        let chgl = t2.clone().text("Channel Groups:").insertBefore("#ToASChMMergedChannelsGroupsHolder");
        $("<button>")
            .addClass("fa fa-plus btn btn-primary emerald pull-right btn-xs")
            .attr("id", "ToASChMAddGroup")
            .insertAfter(chgl);

        // channel history related stuff
        $("<div>")
            .attr("id", "ToASettingsChannelHistory")
            .appendTo("#ToASettingsWindowContent");

        // changelog
        $("<div>")
            .attr("id", "ToASettingsChangelog")
            .appendTo("#ToASettingsWindowContent");

        $('<a>')
            .addClass('btn btn-primary')
            .attr({href: 'https://www.github.com/edvordo/TabsOfAvabur'});

        $('<div>')
            .attr('id', 'ToACLLog')
            .appendTo('#ToASettingsChangelog');

        // clearfix channel merger
        $("<div>").addClass("clearfix").appendTo("#ToASettingsChannelMerger");

        // clearfix settings window
        $("<div>").addClass("clearfix").appendTo("#ToASettingsWindow");

        $("<div>")
            .attr("id", "ToASettingsSaved")
            .text("Settings have been saved and are applied")
            .addClass("text-center small")
            .appendTo("#ToASettingsWindow");

        // close button
        $("<span>")
            .attr("id", "ToASettingsWindowClose")
            .addClass("fa fa-times border2 ui-element")
            .appendTo("#ToASettingsWindow");

        /**
         * profile tooltip extras
         */
        let ToAExtraDivider = $("<span>").text(" · ");

        ToAExtraDivider.clone()
            .addClass("ToAPONickname")
            .toggleClass("hidden", !options.scriptSettings.profile_tooltip_nickname)
            .appendTo("#profileOptionTooltip");
        $("<a>")
            .addClass("ToAPONickname")
            .toggleClass("hidden", !options.scriptSettings.profile_tooltip_nickname)
            .text("Ni[c]kname")
            .attr("id", "profileOptionNick")
            .appendTo("#profileOptionTooltip");

        ToAExtraDivider.clone()
            .addClass("ToAPOMention")
            .toggleClass("hidden", !options.scriptSettings.profile_tooltip_mention)
            .appendTo("#profileOptionTooltip");
        $("<a>")
            .addClass("ToAPOMention")
            .toggleClass("hidden", !options.scriptSettings.profile_tooltip_mention)
            .text("@m[e]ntion")
            .attr("id", "profileOptionAt")
            .appendTo("#profileOptionTooltip");

        ToAExtraDivider.clone()
            .addClass("ToAPOQuickscope")
            .toggleClass("hidden", !options.scriptSettings.profile_tooltip_quickscope)
            .appendTo("#profileOptionTooltip");
        $("<a>")
            .addClass("ToAPOQuickscope")
            .toggleClass("hidden", !options.scriptSettings.profile_tooltip_quickscope)
            .text("[Q]uickscope")
            .attr("id", "profileOptionQuickScope")
            .appendTo("#profileOptionTooltip");

        // init
        $("#ToASettingsWindow").hide();
        $("#ToASettingsScriptSettings").hide();
        $("#ToASettingsChannelMerger").hide();
        $("#ToASettingsChannelHistory").hide();
        $("#ToASettingsChangelog").hide();
        $("#ToASettingsSaved").hide();
        $(".ToATooltip").tooltip();
        $("#ToASettingsWindow").draggable({handle: "h5"});
        /**
         * CSS
         */
        $("<style>").text(` 
#channelTabListWrapper {margin-bottom: -1px;position: relative;}
#channelTabList {overflow: hidden;border-radius: 4px 4px 0 0;font-size: 9pt;}
.ToASettings, .channelTab {cursor: pointer;margin: 2px 2px 0 2px;border-radius: 4px 4px 0 0;display: inline-block;padding: 2px 5px;position:relative;}
#chatMessageList li:not(.processed) {display: none;}
/*#chatMessageList li.processed{display: list-item;}*/
.ChBadge {display:inline-block;margin-left:3px;padding:1px 4px;font-size:7pt;vertical-align:top;border-color:green!important;color:#fff !important;}
.muted-badge {position:absolute;left:5px;top:5px;}
#channelPreviewWrapper {position:absolute;font-size:9pt;min-width:350px;max-width:500px;background-color:rgba(0,0,0,.75)!important;}
#channelPreviewContent{max-height: 250px;overflow-x: hidden;}
#channelPreviewActions{position:absolute;right:2px;top:2px;}
.cpa{display:inline-block;margin-left:2px;padding: 1px 3px;font-size:9pt;vertical-align:top;cursor:pointer;}
#channelTabContextMenu{position:absolute;width:175px;background-color:rgba(0,0,0,.75)!important;}
.cctmButton{text-align:left!important;}
#ToASettingsWindow{position:absolute!important;width:50%;min-width: 500px;top:150px;left:25%;background-color:rgba(0,0,0,.75)!important;z-index:150;}
.cctmButton>span{margin: 0 15px 0 5px;font-size:8.5pt;padding:2px;}
#channelTabContextMenu .cctmButton {display:block;width:100%;border-left:0;}
#ToASettingsWindowContent label{font-size:10pt;}
#ToASettingsWindowContent {padding-top:5px;}
#ToASettingsWindowClose{position:absolute;right:2px;top:2px;color:#f00;padding:1px 4px;cursor:pointer;}
.ToASChannelsHolder{padding: 2px;margin:3px auto;width:97%;}
.ChMChannelWrapper{display:inline-block;margin:1px 2px;padding:1px 4px;font-size:10pt;}
.ChMMChX{margin-right:4px;padding:1px 2px;cursor:pointer;}
#ToASettingsWindow .tooltip{width:350px;}
#ToASettingsWindow .tooltip-inner{max-width:100%;}
.hand{curson: pointer;}
#ToASChMAddGroup, .ToASChMChGRemove{margin-top: 0;}
.incsort{border-radius: 0 !important; margin: 3px 1px; padding: 2px;}
.chTabSelected {background: var(--nav-background-color);background-image: linear-gradient(to bottom,var(--nav-gradient-first-color) 0,var(--nav-gradient-second-color) 100%)}
#ToASChMMergedChannelsGroupsHolder > .incsort > span:nth-of-type(1) {border-left-width: 7px !important;}
#ToACLLog {max-height: 300px; overflow: auto;}
@media screen and (max-width:768px){#ToASettingsWindow{left:5%;}}`)
            .appendTo("body");
    }

    function saveOptions() {
        clearTimeout(SSN);
        let opts = JSON.stringify(options);
        localStorage.setItem("ToAOPTS", opts);
        $("#ToASettingsSaved").show();
        SSN = setTimeout(function () {
            $("#ToASettingsSaved").fadeOut();
        }, 3E3);
    }

    function changeSetting(e) {
        let setting                     = $(e).attr("data-setting");
        options.scriptSettings[setting] = $(e).prop("checked");
        let match                       = setting.match("^profile_tooltip_([a-z]+)");
        if (match !== null) {
            let POOption = ucfirst(match[1]);
            $(".ToAPO" + POOption).toggleClass("hidden");
        }
        let chanelTabsUpdatableSettings = [
            "prepend_with_hashtag",
            "abbreviate_channel_names",
            "loose_abbreviation",
            "exclamate_unread_count"
        ];
        if (chanelTabsUpdatableSettings.indexOf(setting) !== -1) {
            updateAllChannelTabs();
        }
        saveOptions();
    }

    function resetUnreadCount() {
        let channelID                          = hoveringOverTab;
        channelLog[channelID].newMessages      = false;
        channelLog[channelID].newMessagesCount = 0;
        updateChannelList(channelLog[channelID]);
        $("#channelPreviewWrapper").hide();
        $("#channelTabContextMenu").hide();
    }

    function purgeChannel(andRemove, confirmToo) {
        andRemove       = typeof andRemove === "undefined" ? options.scriptSettings.channel_remove : andRemove;
        confirmToo      = typeof confirmToo === "undefined" ? false : confirmToo;
        let channelID   = hoveringOverTab;
        let channelName = channelLog[channelID].channelName;
        let confirmText = `Are you sure you want purge the "${channelName}" channel${(andRemove ? 'and remove it from tabs' : '')}?\nThis only affects your screen.`;
        if (confirmToo || window.confirm(confirmText)) {
            $(".chc_" + channelID).remove();
            channelLog[channelID].messageHistory.clearMessages();
            resetUnreadCount();
            if (andRemove) {
                $("#channelTab" + channelID).remove();
                //delete channelLog[channelID];
                $("#channelTabMain").click();
                $("#channelPreviewWrapper").hide();
                savePersistentChannels();
            }

        }
    }

    function loadOptions() {
        log('Loading  options');
        let stored = localStorage.getItem("ToAOPTS");
        try {
            let parsed = JSON.parse(stored);
            if (parsed.hasOwnProperty('scriptSettings')) {
                if (parsed.scriptSettings.hasOwnProperty('purge')) {
                    options.scriptSettings.purge = !!parsed.scriptSettings.purge;
                }
                if (parsed.scriptSettings.hasOwnProperty('channel_remove')) {
                    options.scriptSettings.channel_remove = !!parsed.scriptSettings.channel_remove;
                }
                if (parsed.scriptSettings.hasOwnProperty('preview')) {
                    options.scriptSettings.preview = !!parsed.scriptSettings.preview;
                }
                if (parsed.scriptSettings.hasOwnProperty('preview_reset')) {
                    options.scriptSettings.preview_reset = !!parsed.scriptSettings.preview_reset;
                }
                if (parsed.scriptSettings.hasOwnProperty('group_wires')) {
                    options.scriptSettings.group_wires = !!parsed.scriptSettings.group_wires;
                }
                if (parsed.scriptSettings.hasOwnProperty('at_username')) {
                    options.scriptSettings.at_username = !!parsed.scriptSettings.at_username;
                }
                if (parsed.scriptSettings.hasOwnProperty('join_channel_link')) {
                    options.scriptSettings.join_channel_link = !!parsed.scriptSettings.join_channel_link;
                }
                if (parsed.scriptSettings.hasOwnProperty('auto_join')) {
                    options.scriptSettings.auto_join = !!parsed.scriptSettings.auto_join;
                }
                if (parsed.scriptSettings.hasOwnProperty('profile_tooltip_nickname')) {
                    options.scriptSettings.profile_tooltip_nickname = !!parsed.scriptSettings.profile_tooltip_nickname;
                }
                if (parsed.scriptSettings.hasOwnProperty('profile_tooltip_mention')) {
                    options.scriptSettings.profile_tooltip_mention = !!parsed.scriptSettings.profile_tooltip_mention;
                }
                if (parsed.scriptSettings.hasOwnProperty('profile_tooltip_quickscope')) {
                    options.scriptSettings.profile_tooltip_quickscope = !!parsed.scriptSettings.profile_tooltip_quickscope;
                }
                if (parsed.scriptSettings.hasOwnProperty('chat_direction')) {
                    options.scriptSettings.chat_direction = parsed.scriptSettings.chat_direction;
                }
                if (parsed.scriptSettings.hasOwnProperty('persistent_channels')) {
                    options.scriptSettings.persistent_channels = !!parsed.scriptSettings.persistent_channels;
                }
                if (parsed.scriptSettings.hasOwnProperty('prepend_with_hashtag')) {
                    options.scriptSettings.prepend_with_hashtag = !!parsed.scriptSettings.prepend_with_hashtag;
                }
                if (parsed.scriptSettings.hasOwnProperty('abbreviate_channel_names')) {
                    options.scriptSettings.abbreviate_channel_names = !!parsed.scriptSettings.abbreviate_channel_names;
                }
                if (parsed.scriptSettings.hasOwnProperty('loose_abbreviation')) {
                    options.scriptSettings.loose_abbreviation = !!parsed.scriptSettings.loose_abbreviation;
                }
                if (parsed.scriptSettings.hasOwnProperty('exclamate_unread_count')) {
                    options.scriptSettings.exclamate_unread_count = !!parsed.scriptSettings.exclamate_unread_count;
                }
            }
            if (parsed.hasOwnProperty('channelsSettings') && parsed.hasOwnProperty('version')) {
                if (parsed.channelsSettings.hasOwnProperty('mutedChannels') && Array.isArray(parsed.channelsSettings.mutedChannels)) {
                    options.channelsSettings.mutedChannels = parsed.channelsSettings.mutedChannels;
                }
                if (parsed.channelsSettings.hasOwnProperty('channelMerger')) {
                    if (parsed.channelsSettings.channelMerger.hasOwnProperty('groups') && Array.isArray(parsed.channelsSettings.channelMerger.groups)) {
                        for (let ccg in parsed.channelsSettings.channelMerger.groups) {
                            let groupName = parsed.channelsSettings.channelMerger.groups[ccg];
                            if (typeof groupName === "string" && options.channelsSettings.channelMerger.groups.indexOf(groupName) === -1) {
                                options.channelsSettings.channelMerger.groups.push(groupName);
                                groupsMap[groupName] = randomName(3, 5) + "_" + randomInt(5, 9);
                            }
                        }
                    }
                    if (typeof parsed.channelsSettings.channelMerger.hasOwnProperty('mapping') && typeof parsed.channelsSettings.channelMerger.mapping === "object") {
                        options.channelsSettings.channelMerger.mapping = parsed.channelsSettings.channelMerger.mapping;
                    }
                    if (typeof parsed.channelsSettings.channelMerger.hasOwnProperty('defaultChannels') && typeof parsed.channelsSettings.channelMerger.defaultChannels === "object") {
                        options.channelsSettings.channelMerger.defaultChannels = parsed.channelsSettings.channelMerger.defaultChannels;
                    }
                }

                if (parsed.channelsSettings.hasOwnProperty('persistentChannels')) {
                    options.channelsSettings.persistentChannels = parsed.channelsSettings.persistentChannels;
                    for (let _channelIndex in options.channelsSettings.persistentChannels) {
                        let persistentChannel = options.channelsSettings.persistentChannels[_channelIndex];
                        if (groupsMap.hasOwnProperty(persistentChannel.n)) {
                            options.channelsSettings.persistentChannels[_channelIndex].i = MergedChannelsGroup + '_MCGID_' + groupsMap[persistentChannel.n];
                        }
                    }
                }
            }
            //$.extend(true, options, parsed || {});
            saveOptions();
        } catch (e) {
            log(`Failed to load settings!`);
            console.log(e);
            localStorage.removeItem("ToAOPTS");

        }
    }

    function createChannelEntry(newChannel, newChannelID, newChannelColor) {
        channelLog[newChannelID] = {
            channelName     : newChannel,
            channelID       : newChannelID,
            channelColor    : newChannelColor,
            messages        : 0,
            newMessages     : false,
            newMessagesCount: 0,
            muted           : options.channelsSettings.mutedChannels.indexOf(newChannel) !== -1,
            messageHistory  : new ChannelHistory()
        };
    }

    function loadAllChannels() {
        $("#chatChannel option").each(function (i, e) {
            let channelName  = $(e).text();
            let channelInfo  = resolveChannelID(channelName);
            let channelID    = channelInfo.cID;
            let channelColor = resolveChannelColor(channelID, channelInfo.name);
            if (!channelLog.hasOwnProperty(channelID)) {
                createChannelEntry(channelInfo.on, channelID, channelColor);
            }
        });
        if (!channelLog.hasOwnProperty(GlobalChannel)) {
            createChannelEntry("GLOBAL", GlobalChannel, resolveChannelColor(GlobalChannel, "Global"));
        }
        if (!channelLog.hasOwnProperty(EventChannel)) {
            createChannelEntry("Event", EventChannel, resolveChannelColor(EventChannel, "Event"));
        }
        // [ServerMessagesChannel, CMDResposeChannel, WhispersChannel, WiresChannel];
        if (!channelLog.hasOwnProperty(ServerMessagesChannel)) {
            createChannelEntry(
                "Server Messages",
                ServerMessagesChannel,
                resolveChannelColor(ServerMessagesChannel, "Server Messages")
            );
        }
        if (!channelLog.hasOwnProperty(CMDResposeChannel)) {
            createChannelEntry(
                "Info Channel",
                CMDResposeChannel,
                resolveChannelColor(CMDResposeChannel, "Info Channel")
            );
        }
        if (!channelLog.hasOwnProperty(WhispersChannel)) {
            createChannelEntry("Whispers Log", WhispersChannel, resolveChannelColor(WhispersChannel, "Whispers Log"));
        }
        if (!channelLog.hasOwnProperty(WiresChannel)) {
            createChannelEntry("Wires Log", WiresChannel, resolveChannelColor(WiresChannel, "Wires Log"));
        }
    }

    function quickScopeUser() {
        if (!options.scriptSettings.profile_tooltip_quickscope) {
            return false;
        }
        $("#chatMessage").text("/whois " + $("#profileOptionTooltip").attr("data-username"));
        $("#chatSendMessage").click();
        $("#profileOptionTooltip").hide();
        setTimeout(function () {
            $("#channelTab" + CMDResposeChannel).click();
        }, 1000);
    }

    function mentionUser() {
        if (!options.scriptSettings.profile_tooltip_mention) {
            return false;
        }
        $("#chatMessage").append(" @" + $("#profileOptionTooltip").attr("data-username")).focus();
        $("#profileOptionTooltip").hide();
    }

    function nicknameUser() {
        if (!options.scriptSettings.profile_tooltip_nickname) {
            return false;
        }
        let username = $("#profileOptionTooltip").attr("data-username");
        $.confirm({
            "title"  : "Nickname for " + username,
            "message": "<input type=\"text\" id=\"ToASPONicknameName\" style=\"width:100%;\" placeholder=\"Leave blank to unnickname\">",
            "buttons": {
                "Nickname": {
                    "class" : "green",
                    "action": function () {
                        let newNick = $("#ToASPONicknameName").val();
                        if (newNick.match(/^\s*$/)) {
                            $("#chatMessage").text("/unnickname " + username);
                        } else {
                            $("#chatMessage").text("/nickname " + username + " " + newNick);
                        }
                        $("#chatSendMessage").click();
                    }
                },
                "Cancel"  : {
                    "class" : "red",
                    "action": function () {
                    }
                }
            }
        });
        setTimeout(function () {
            $("#ToASPONicknameName").val("").focus();
        }, 500);
    }

    function isScriptChannel(channelID) {
        return scriptChannels.indexOf(channelID) !== -1;
    }

    function updateGroupName() {
        let newName  = $(this).val();
        let groupID  = $(this).attr("data-gnid");
        let origName = options.channelsSettings.channelMerger.groups[groupID];
        let origGID  = groupsMap[origName];
        delete groupsMap[origName];
        groupsMap[newName]                                     = origGID;
        options.channelsSettings.channelMerger.groups[groupID] = newName;
        $(this).parent().attr("data-group", newName);
        for (let x in options.channelsSettings.channelMerger.mapping) {
            if (options.channelsSettings.channelMerger.mapping[x] === origName) {
                options.channelsSettings.channelMerger.mapping[x] = newName;
            }
        }
        let groupChannelID = MergedChannelsGroup + "_MCGID_" + groupsMap[newName];
        if (channelLog.hasOwnProperty(groupChannelID)) {
            channelLog[groupChannelID].channelName = newName;
            updateChannelList(channelLog[groupChannelID]);
        }
        saveOptions();
    }

    function addChannelGroup(i, name) {
        let mcgw = $("<div>").addClass("border2 incsort input-group");

        let mcgigb = $("<div>").addClass("input-group-btn");

        let mcgdb = $("<button>").addClass("ToASChMChGRemove btn btn-primary btn-xs ruby");
        let mcgn  = $("<input>").attr({type: "text", name: "mcg_cn"}).addClass("ToASChMmcgName");

        let mcgID   = MergedChannelsGroup + "_MCGID_" + groupsMap[name];
        let wrapper = mcgw.clone()
            .attr({"id": mcgID, "data-group": name})
            .appendTo("#ToASChMMergedChannelsGroupsHolder");

        let igb = mcgigb.clone().appendTo(wrapper);
        mcgdb.clone().attr("data-gnid", i).html("<i class=\"fa fa-times\"></i>").appendTo(igb);
        mcgn.clone().val(name).attr("data-gnid", i).appendTo(wrapper);
    }

    function checkForUpdate() {
        let version = "";

        fetch(internalUpdateUrl)
            .then(response => response.json())
            .then(data => {
                let match = atob(data.content).match(/\/\/\s+@version\s+([^\n]+)/);
                version   = match[1];

                if (compareVersions(options.version, version) < 0) {
                    populateChangelog();
                    let message = `<li class="chat_notification">TabsOfAvabur has been updated to version ${version}! <a href="https://github.com/edvordo/TabsOfAvabur/raw/master/TabsOfAvabur.user.js" target="_blank">Update</a> | <a href="javascript:void(0);" id="ToAUpdateShowChangelog">Changelog</a></li>`;
                    if (options.scriptSettings.chat_direction === "up") {
                        $("#chatMessageList").prepend(message);
                    } else {
                        $("#chatMessageList").append(message);
                        scrollToBottom('#channelPreviewContent');
                    }
                } else {
                    checkForUpdateTimer = setTimeout(checkForUpdate, 24 * 60 * 60 * 1000);
                }
            });
    }


    HTMLElement.prototype.getToAChannelInfo = function() {
        let e = this;

        if (e.nodeName !== 'LI') {
            return null;
        }

        if (e.hasAttribute('data-tocid')) {
            return e.getAttribute('data-toacid');
        }

        let element = $(e);

        let plainText   = element.text();
        // lets get rid of staff stuff
        plainText       = plainText.replace(/^\[X\]\s*/, "");
        // now clean up spaces
        plainText       = plainText.replace(/\s+/g, " ");
        // default message format [11:11:11] [Channel] (optional) the rest of the message
        let defaultMsg  = plainText.match(/^\[([^\]]+)\]\s*(\[([^\]]+)\])?\s*(.*)/);
        // clan MoTD: [11 Nov, 1111] Clan Message of the Day:
        let isClanMoTD  = plainText.replace(/^\[[0-9]+\s+[a-zA-Z]+\,\s*[0-9]+\]\s*/, "").indexOf("Clan Message of the Day:") === 0;
        // clan MoTD: [11 Nov, 1111] Message of the Day:
        let isRoAMoTD   = plainText.replace(/^\[[0-9]+\s+[a-zA-Z]+\,\s*[0-9]+\]\s*/, "").indexOf("Message of the Day:") === 0;
        // Staff Server Messages [11:11:11] [ Whatever the hell. ]
        let isServerMsg = plainText.match(/^\[[^\]]+\]\s*\[\s+.*\s+]$/);
        // whisper detection
        let isWhisper   = plainText.match(/^\[[^\]]+\]\s*Whisper\s*(to|from)\s*([^:]+)/);
        isWhisper       = isWhisper && element.closest("li").find("span:eq(2)").text().indexOf("Whisper") === 0;
        isWhisper       = isWhisper || plainText.match(/^\[[^\]]+\]\s*While you were away, you received [0-9,]+ whispers?:$/);
        // wire detection
        let isWire      = plainText.match(/^\[[^\]]+\]\s*(You|[a-zA-Z]+)\s*wired\s*.*\s*(you|[a-zA-Z]+)\.$/);
        // [11:11:11] Username sent a whatever to you.

        let isChatNotif     = element.children(".chat_notification").length > 0 || element.hasClass("chat_notification");
        let isChatReconnect = element.attr("id") === "websocket_reconnect_line";


        let channel = "";
        if (currentChannel !== null && currentChannel.match(/^[0-9]+$/) && channelLog.hasOwnProperty(currentChannel)) {
            channel = channelLog[currentChannel].channelName;
        } else if (currentChannel !== null && currentChannel.indexOf(MergedChannelsGroup) === 0) {
            channel = channelLog[currentChannel].channelName;
        } else if (currentChannel !== null && scriptChannels.indexOf(currentChannel) !== -1) {
            channel = channelLog[currentChannel].channelName;
        } else {
            channel = currentChannel;
        }
        // let channel         = currentChannel=="Main" ? currentChannel : ;
        let channelInfo = resolveChannelID(channel);

        // validation of parsed channel name, whether the message has also valid html
        if (defaultMsg !== null) {
            // console.log(defaultMsg);
            channel = typeof defaultMsg[3] === 'undefined' ? "Main" : defaultMsg[3];
            if (channel !== "Main") {
                let validate       = element.closest("li").find("span:eq(2)").text() === "[";
                let quickscopeinfo = channel.match(/^(Battle|Fishing|Woodcutting|Mining|Stonecutting|Crafting|Carving|Event):\s+[0-9]+/);
                if (!validate && quickscopeinfo === null) {
                    channel = "Main";
                }
            }
            channelInfo = resolveChannelID(channel);
        }
        if (isClanMoTD) {
            channel     = "CLAN";
            channelInfo = resolveChannelID(channel);
        } else if (isServerMsg) {
            channel     = "Server Messages";
            channelInfo = resolveChannelID(channel);
        } else if (isWhisper) {
            channel     = "Whispers Log";
            channelInfo = resolveChannelID(channel);
        } else if (isWire && options.scriptSettings.group_wires) {
            channel     = "Wires Log";
            channelInfo = resolveChannelID(channel);
        }
        let channelID = channelInfo.cID;
        channel       = channelInfo.on;
        if (
            channelID !== CMDResposeChannel &&
            channelID !== ServerMessagesChannel &&
            channelID !== WiresChannel &&
            (isChatNotif || isChatReconnect)
        ) {

            channelID = channelInfo.cID;
        }

        if (channelID === CMDResposeChannel) {
            channel = "Info Channel";
        }

        return {
            channelID: channelID,
            channel: channel,
            plainText: plainText,
            channelInfo: channelInfo
        };
    };

    function processMessage(e) {
        if (e.classList.contains('processed')) {
            return false;
        }
        // let element = $(e);
        let element = e;


        let {channelID, channel, plainText, channelInfo} = element.getToAChannelInfo();

        let channelColor = resolveChannelColor(channelID, channelInfo.name);

        if (typeof options.channelsSettings.channelMerger.mapping[channel] !== "undefined") {
            let groupName = options.channelsSettings.channelMerger.mapping[channel];
            let groupID   = options.channelsSettings.channelMerger.groups.indexOf(groupName);
            channelID     = MergedChannelsGroup + "_MCGID_" + groupsMap[groupName];
            channel       = groupName;
            channelColor  = randomColor();
        }

        if (currentChannel === null) {
            currentChannel = channelID;
        }
        // console.log(currentChannel, channel);
        // if (currentChannel != channelID) {
        // element.addClass("hidden");
        // }
        // element.addClass("processed");
        // element.addClass("chc_" + channelID);
        // element.attr('data-toacid', channelID);
        element.classList.add("processed");
        element.classList.add("chc_" + channelID);
        element.setAttribute('data-toacid', channelID);
        if (!channelLog.hasOwnProperty(channelID)) {
            createChannelEntry(channel, channelID, channelColor);
        }
        if (channelID != currentChannel) {
            channelLog[channelID].newMessages = true;
            channelLog[channelID].newMessagesCount++;
        }
        channelLog[channelID].messages++;

        // if (options.channelsSettings.mutedChannels.indexOf(channel) !== -1) {
        //     $(e).remove();
        // }

        if (options.scriptSettings.at_username) {
            element.innerHTML = element.innerHTML.replace(/\@([a-z]+)/gi, "@<a class=\"profileLink\">$1</a>");
        }

        if (options.scriptSettings.join_channel_link) {
            element.innerHTML = element.innerHTML.replace(
                /\/join\s+([^\s]+)\s*([^\s<]+)?/,
                `/join <a class="joinChannel">$1</a> <span class="jcPWD">$2</span>`
            );
        }
        let temp = $(element);
        channelLog[channelID].messageHistory.addMessage(temp);
        if (channelID != currentChannel) {
            // console.log(`rem cos c:"${currentChannel}" != r:"${channelID}" (${element.text()})`);
            element.remove();
            // element.addClass('hidden');
        }

        if (plainText.match(/tabs\s+of\s+avabur/i) !== null) {
            clearTimeout(checkForUpdateTimer);
            checkForUpdateTimer = setTimeout(checkForUpdate, randomInt(30, 120) * 1000);
        }

        updateChannelList(channelLog[channelID]);
    }

    function loadMessages() {
        let o = new MutationObserver(function(ml) {

            if ($("#chatWrapper>div:nth-child(2)").attr("id") === "chatMessageWrapper") {
                $("#channelTabListWrapper").insertBefore("#chatMessageListWrapper");
            }

            for (let m of ml) {
                if (m.addedNodes.length) {
                    processMessage(m.addedNodes[0]);
                }
            }
        });
        log('Starting chat monitor loop');
        o.observe(document.querySelector('#chatMessageList'), {childList: true});
    }

    // function doubleCheckUnprocessed(t) {
    //     $("#chatMessageList li:not(.processed)").each(function (i, e) {
    //         processMessage(e);
    //     });
    //
    //     setTimeout(doubleCheckUnprocessed, 10000);
    //
    //     if ($("#chatWrapper>div:nth-child(2)").attr("id") === "chatMessageWrapper") {
    //         $("#channelTabListWrapper").insertBefore("#chatMessageListWrapper");
    //     }
    // }

    function scrollToBottom(selector) {
        $(selector).animate({
            scrollTop: $(selector).prop("scrollHeight")
        });
    }

    function savePersistentChannels() {
        if (!options.scriptSettings.persistent_channels) {
            options.channelsSettings.persistentChannels = [];
            saveOptions();
            return;
        }
        let channelsData = [];
        $('.channelTab').each((i, e) => {
            let data = $(e).data();
            if (channelLog.hasOwnProperty(data.channel)) {
                let channel = channelLog[data.channel];
                channelsData.push(
                    {
                        i: channel.channelID,
                        n: channel.channelName,
                        c: channel.channelColor,
                    }
                );
            }

        });
        options.channelsSettings.persistentChannels = channelsData;
        saveOptions();
    }

    function addPersistentChannels() {
        log('Creating persistent channels tabs');
        if (!options.scriptSettings.persistent_channels) {
            return;
        }

        for (let channel of options.channelsSettings.persistentChannels) {
            createChannelEntry(channel.n, channel.i, channel.c, false);
            updateChannelList(channelLog[channel.i], false);
        }
    }

    function setupEvents() {
        log('Setting up events');

        $(document).on("change", ".settingsChanger", function () {
            changeSetting(this);
        });

        // inspect DOM changes
        $(document).on('change', 'input[name="data-preference-id-12"]', function (e) {
            log('Updating chat direction from prefferences select');
            // e.target.value can be 0 or 1 => 0 - default, 1 - retarded
            options.scriptSettings.chat_direction = parseInt(e.target.value) ? 'down' : 'up';
            saveOptions();
        });

        // if the player uses edvordo/RoA-WSHookUp
        $(document).on('roa-ws:login_info', function (e, d) {
            log('Updating chat direction from login_info');
            options.scriptSettings.chat_direction = d.p.chatScroll;
            saveOptions();
        });

        $(document).on('roa-ws:page:settings_preferences, roa-ws:page:settings_preferences_change', function (e, d) {
            log('Updating chat direction from prefferences change');
            // 12 is the relevant option ..
            // d.preferences[12] can be 0 or 1 => 0 - default, 1 - retarded
            options.scriptSettings.chat_direction = parseInt(d.preferences[12]) ? 'down' : 'up';
            saveOptions();
        });

        $(document).on('roa-ws:mychans', (e, d) => {
            for (let channel of d.channels) {
                channelListCache[channel.name] = channel;
            }
        });

        $(document).on("click", ".channelTab", function () {
            $(".channelTab").removeClass("chTabSelected");
            let channelID                          = $(this).attr("data-channel");
            channelLog[channelID].newMessages      = false;
            channelLog[channelID].newMessagesCount = 0;
            updateChannelList(channelLog[channelID]);
            let cms = $('#chatMessageList');
                cms.find('li').remove();
                channelLog[channelID].messageHistory.getMessages().forEach(m => {
                    cms.append(m);
                });
            // $("#chatMessageList > li:not(.hidden)").addClass("hidden");
            // $(".chc_" + channelID).removeClass("hidden");
            $("#channelTab" + channelID).addClass("chTabSelected");
            $("#channelPreviewWrapper").hide();
            currentChannel = channelID;
            if (channelID.match(/^[0-9]+$/) === null) {
                let groupName = channelLog[channelID].channelName;
                if (options.channelsSettings.channelMerger.groups.indexOf(groupName) !== -1) {
                    if (typeof options.channelsSettings.channelMerger.defaultChannels[groupName] !== "undefined") {
                        channelID = resolveChannelID(options.channelsSettings.channelMerger.defaultChannels[groupName]).cID;
                    }
                }
            }
            let channelOption = $("#chatChannel option[value=" + channelID + "]");
            if (channelOption.length > 0) {
                $("#chatChannel").val(channelID);
            }
            if (options.scriptSettings.chat_direction === "down") {
                setTimeout(function () {
                    scrollToBottom("#chatMessageListWrapper");
                }, 500);
            }
        });

        // $(document).on("click", ".channelTab", function () {
        //     $(".channelTab").removeClass("chTabSelected");
        //     let channelID                          = $(this).attr("data-channel");
        //     channelLog[channelID].newMessages      = false;
        //     channelLog[channelID].newMessagesCount = 0;
        //     updateChannelList(channelLog[channelID]);
        //     // $(".processed").hide();
        //     $("#chatMessageList > li:not(.hidden)").addClass("hidden");
        //     $(".chc_" + channelID).removeClass("hidden");
        //     $("#channelTab" + channelID).addClass("chTabSelected");
        //     $("#channelPreviewWrapper").hide();
        //     currentChannel = channelID;
        //     if (channelID.match(/^[0-9]+$/) === null) {
        //         let groupName = channelLog[channelID].channelName;
        //         if (options.channelsSettings.channelMerger.groups.indexOf(groupName) !== -1) {
        //             if (typeof options.channelsSettings.channelMerger.defaultChannels[groupName] !== "undefined") {
        //                 channelID = resolveChannelID(options.channelsSettings.channelMerger.defaultChannels[groupName]).cID;
        //             }
        //         }
        //     }
        //     let channelOption = $("#chatChannel option[value=" + channelID + "]");
        //     if (channelOption.length > 0) {
        //         $("#chatChannel").val(channelID);
        //     }
        //     if (options.scriptSettings.chat_direction === "down") {
        //         setTimeout(function () {
        //             scrollToBottom("#chatMessageListWrapper");
        //         }, 500);
        //     }
        // });

        $(document).on("click", "#CPAReset, #chTabCTMenuReset", function () {
            resetUnreadCount();
        });

        $(document).on("click", "#CPAHistory, #chTabCTMenuLast", function () {
            let channelName = channelLog[hoveringOverTab].channelName;
            let msg         = "/last " + channelName;
            if (channelName === "CLAN") {
                msg = "/c /last";
            } else if (options.channelsSettings.channelMerger.groups.indexOf(channelName) !== -1) {
                if (typeof options.channelsSettings.channelMerger.defaultChannels[channelName] !== "undefined") {
                    msg = "/last " + options.channelsSettings.channelMerger.defaultChannels[channelName];
                }
            } else if (channelName === "Whispers Log") {
                msg = "/w /last";
            } else if (scriptChannels.indexOf(hoveringOverTab) !== -1) {
                return false;
            }
            $("#chatMessage").text(msg);
            $("#chatSendMessage").click();
        });

        $(document).on("click", "#CPAPurge, #chTabCTMenuPurge", function () {
            let confirmToo = $(this).attr("id") === "chTabCTMenuPurge";
            purgeChannel(false, confirmToo);
        });

        $(document).on("click", "#CPARemove, #chTabCTMenuRemove", function () {
            let confirmToo = $(this).attr("id") === "chTabCTMenuRemove";
            purgeChannel(true, confirmToo);
        });

        $(document).on("click", "#chTabCTMenuLeave", function () {
            let channelName = channelLog[hoveringOverTab].channelName;
            purgeChannel(true, true);
            $("#chatMessage").text("/leave " + channelName);
            $("#chatSendMessage").click();
        });

        $(document).on("click", "#chTabCTMenuColor", function () {
            if (hoveringOverTab.indexOf(MergedChannelsGroup) !== -1) {
                channelLog[hoveringOverTab].channelColor = randomColor();
                updateChannelList(channelLog[hoveringOverTab]);
            } else {
                $.alert("Tab color change failed! Please try again!", "Group tab color change");
            }
        });

        $(document).on("click", "#chTabCTMenuMute", function () {
            if (typeof hoveringOverTab === "undefined") {
                return;
            }
            let channel = channelLog[hoveringOverTab].channelName;
            if (options.channelsSettings.mutedChannels.indexOf(channel) === -1) {
                options.channelsSettings.mutedChannels.push(channel);
                saveOptions();
            }
            channelLog[hoveringOverTab].muted = true;
            updateChannelList(channelLog[hoveringOverTab]);
        });

        $(document).on("click", "#chTabCTMenuUnMute", function () {
            if (typeof hoveringOverTab === "undefined") {
                return;
            }
            let channel = channelLog[hoveringOverTab].channelName;
            let pos     = options.channelsSettings.mutedChannels.indexOf(channel);
            if (pos !== -1) {
                options.channelsSettings.mutedChannels.splice(pos, 1);
                saveOptions();
            }
            channelLog[hoveringOverTab].muted = false;
            updateChannelList(channelLog[hoveringOverTab]);
        });

        $(document).on("mouseover", ".channelTab", function () {
            clearTimeout(hovering);
            let channelID   = $(this).attr("data-channel");
            hoveringOverTab = channelID;
            if (!options.scriptSettings.preview) {
                return;
            }
            let channelName = channelLog[channelID].channelName;

            let channelPreviewWrapper = $("#channelPreviewWrapper");

            let cssOptions     = {
                top: ($(this).offset().top + 25) + "px"
            };
            let previewContent = "There are no new messages in this channel!";
            if (channelLog[channelID].newMessages === true && channelLog[channelID].messageHistory.getMessageCount() > 0) {
                let previewMessages = [];
                $(channelLog[channelID].messageHistory.getMessages()).each(function (i, e) {
                    if (i < channelLog[channelID].newMessagesCount) {
                        previewMessages.push(e.html());
                    }
                });
                previewContent = previewMessages.join("<br>");
            }

            $("#channelPreviewMessages").html(previewContent);

            if ($(this).offset().left > $(document).width() / 2) {
                cssOptions.left = ($(this).offset().left - channelPreviewWrapper.width() + $(this).width()) + "px";
            } else {
                cssOptions.left = ($(this).offset().left) + "px";
            }
            channelPreviewWrapper.css(cssOptions).children('h5').text(`"${channelName}" preview`);

            if (options.scriptSettings.preview_reset) {
                $("#CPAReset").show();
            } else {
                $("#CPAReset").hide();
            }
            if (options.scriptSettings.purge) {
                $("#CPAPurge").show();
            } else {
                $("#CPAPurge").hide();
            }
            if (options.scriptSettings.channel_remove) {
                $("#CPARemove").show();
            } else {
                $("#CPARemove").hide();
            }
        });

        $(document).on("mouseover", function (e) {
            clearTimeout(hovering);
            if (typeof hoveringOverTab !== "undefined" && typeof channelLog[hoveringOverTab] !== "undefined") {

                let channelTab            = $("#channelTab" + hoveringOverTab);
                let channelPreviewWrapper = $("#channelPreviewWrapper");
                // let shouldShow            = channelLog[hoveringOverTab].newMessages === true;
                let shouldShow            = true;
                let OpenAndKeep           = $(e.target).closest(channelTab).length || $(e.target)
                    .closest(channelPreviewWrapper).length;
                let delay                 = OpenAndKeep ? 500 : 250;

                hovering = setTimeout(function () {
                    if (options.scriptSettings.preview && OpenAndKeep && shouldShow) {
                        channelPreviewWrapper.show(0, function () {
                            if (options.scriptSettings.chat_direction === 'down') {
                                scrollToBottom('#channelPreviewContent');
                            }
                        });


                    } else {
                        channelPreviewWrapper.hide();
                    }
                }, delay);
            }
        });

        $(document).on("contextmenu", ".channelTab", function (e) {
            e.preventDefault();
            let cssOptions = {
                top: e.pageY + "px"
            };

            if ($(this).offset().left > $(document).width() / 2) {
                cssOptions.left = (e.pageX - $(this).width()) + "px";
            } else {
                cssOptions.left = e.pageX + "px";
            }

            if (options.scriptSettings.preview_reset) {
                $("#chTabCTMenuReset").show();
            } else {
                $("#chTabCTMenuReset").hide();
            }
            if (options.scriptSettings.purge) {
                $("#chTabCTMenuPurge").show();
            } else {
                $("#chTabCTMenuPurge").hide();
            }
            if (options.scriptSettings.channel_remove) {
                $("#chTabCTMenuRemove").show();
            } else {
                $("#chTabCTMenuRemove").hide();
            }

            if (options.channelsSettings.mutedChannels.indexOf(channelLog[hoveringOverTab].channelName) !== -1) {
                $("#chTabCTMenuUnMute").show();
                $("#chTabCTMenuMute").hide();
            } else {
                $("#chTabCTMenuMute").show();
                $("#chTabCTMenuUnMute").hide();
            }

            if (hoveringOverTab.match(/^[a-z]+/i)) {
                $("#chTabCTMenuLeave").hide();
                if (hoveringOverTab.indexOf(MergedChannelsGroup) !== -1) {
                    $("#chTabCTMenuColor").show();
                } else {
                    $("#chTabCTMenuColor").hide();
                }
            } else {
                $("#chTabCTMenuColor").hide();
                $("#chTabCTMenuLeave").show();
            }

            if (scriptChannels.indexOf(hoveringOverTab) !== -1 && hoveringOverTab !== WhispersChannel) {
                $("#chTabCTMenuLast").hide();
            } else {
                $("#chTabCTMenuLast").show();
            }
            // $("#chTabCTMenuColor").hide();

            $("#channelTabContextMenu").css(cssOptions).show();
            $("#channelPreviewWrapper").hide();
            return false;
        });

        $(document).on("click", "#ToASettings", function () {
            $("#modalBackground").show();
            $("#ToASettingsWindow").show();
            loadAllChannels();

            /**
             * load muted channel
             */

            let mchw = $("<span>").addClass("ChMChannelWrapper border2");
            let mchx = $("<span>").addClass("ChMMChX ui-element fa fa-times ruby");

            $("#ToASChMMutedChannelsHolder").html("");
            $("#ToASChMMergedChannelsHolder").html("");
            $("#ToASChMMergedChannelsGroupsHolder").html("");
            let channelName = "";
            for (let i in options.channelsSettings.mutedChannels) {
                channelName = options.channelsSettings.mutedChannels[i];
                let holder  = mchw.clone().append(channelName).appendTo("#ToASChMMutedChannelsHolder");
                mchx.clone().attr("data-channel", channelName).prependTo(holder);
            }
            channelName = "";

            $("#ToASChMMergedChannelsGroupsHolder").html("");
            for (let j in options.channelsSettings.channelMerger.groups) {
                let mcggn = options.channelsSettings.channelMerger.groups[j];
                addChannelGroup(j, mcggn);
            }
            for (let channelID in channelLog) {
                if (options.channelsSettings.channelMerger.groups.indexOf(channelLog[channelID].channelName) !== -1) {
                    continue;
                }
                let channelInfo = channelLog[channelID];
                channelName     = channelInfo.channelName;
                let channelBlob = mchw.clone().attr("data-channel", channelName).text(channelName);
                if (typeof options.channelsSettings.channelMerger.mapping[channelName] !== "undefined") {
                    let grouppedInto = options.channelsSettings.channelMerger.mapping[channelName];
                    let mcgGroupID   = options.channelsSettings.channelMerger.groups.indexOf(grouppedInto);
                    mcgGroupID       = MergedChannelsGroup + "_MCGID_" + groupsMap[grouppedInto];
                    if (options.channelsSettings.channelMerger.defaultChannels[grouppedInto] === channelName) {
                        channelBlob.insertAfter("#" + mcgGroupID + " > input");
                    } else {
                        channelBlob.appendTo("#" + mcgGroupID);
                    }
                } else {
                    channelBlob.appendTo("#ToASChMMergedChannelsHolder");
                }
            }
            channelName = "";
            $(".incsort").sortable(
                {
                    items      : "span",
                    connectWith: ".incsort",
                    receive    : function (i, e) {
                        channelName   = $(e.item[0]).attr("data-channel");
                        let groupName = $(this).attr("data-group");
                        if (typeof groupName === "undefined") {
                            delete options.channelsSettings.channelMerger.mapping[channelName];
                        } else {
                            options.channelsSettings.channelMerger.mapping[channelName] = groupName;
                        }
                        saveOptions();
                    },
                    update     : function (i, e) {
                        let groupName = $(this).attr("data-group");
                        if (typeof groupName !== "undefined") {
                            let channels    = $(i.target).children("span");
                            let channelName = $(channels[0]).attr("data-channel");

                            options.channelsSettings.channelMerger.defaultChannels[groupName] = channelName;
                            saveOptions();
                        } // else branch makes no sense :)
                    }
                }
            ).disableSelection();
        });

        $(document).on("click", ".ChMMChX", function () {
            let channel                 = $(this).attr("data-channel");
            let channelID               = resolveChannelID(channel).cID;
            channelLog[channelID].muted = false;
            updateChannelList(channelLog[channelID]);
            let pos = options.channelsSettings.mutedChannels.indexOf(channel);
            if (pos !== -1) {
                options.channelsSettings.mutedChannels.splice(pos, 1);
            }
            $(this).parent().fadeOut("slow", function () {
                $(this).remove();
            });
            saveOptions();
        });

        $(document).on("click", ".joinChannel", function () {
            // trim(",");
            let chn = $(this).text().replace(/^,+|,+$/gm, "");
            $("#chatMessage").text("/join " + chn);
            let pwd = $(this).parent().find(".jcPWD").text();
            $("#chatMessage").append(" " + pwd);
            if (options.scriptSettings.auto_join) {
                $("#chatSendMessage").click();
            }
        });

        $(document).on("click", function (e) {
            $("#channelTabContextMenu").hide();
            let settings = $("#ToASettingsWindow");
            if (
                !$(e.target).closest("#ToASettingsWindow").length &&
                !$(e.target).closest("#ToASettings").length &&
                !$(e.target).closest("#confirmOverlay").length &&
                !$(e.target).closest(".replenishStamina").length ||
                $(e.target).closest("#ToASettingsWindowClose").length) {

                settings.hide();
                $("#ToASettingsChannelMerger").hide();
                $("#ToASettingsScriptSettings").hide();
                $("#ToASettingsChannelHistory").hide();
                $("#ToASettingsChangelog").hide();
                if ($(e.target).closest("#ToASettingsWindowClose").length) {
                    $("#modalBackground").fadeOut();
                }
            }
        });

        $(document).on("click", "#ToASWMenu button", function () {
            let target = $(this).data('target');
            let active = $('#ToASWMenu').data('active');
            if (active === null) {
                $(target).slideDown();
            } else {
                $(active).slideUp(function () {
                    $(target).slideDown();
                });
            }
            $('#ToASWMenu').data('active', target);
        });

        $(document).on("click", "#profileOptionQuickScope", quickScopeUser);
        $(document).on("click", "#profileOptionAt", mentionUser);
        $(document).on("click", "#profileOptionNick", nicknameUser);

        $(document).on("keydown", function (e) {
            let keys = {
                Q: 81, // [Q]uickscope
                C: 67, // Ni[c]kname
                E: 69 // @m[e]ntion
            };
            let key  = e.which;
            if ($("#profileOptionTooltip").css("display") === "block") {

                if (key === keys.Q) {
                    quickScopeUser();
                } else if (key === keys.E) {
                    mentionUser();
                    e.preventDefault();
                } else if (key === keys.C) {
                    nicknameUser();
                }
            }
        });

        // on blur ... hmm
        $(document).on("change", ".ToASChMmcgName", updateGroupName);

        $(document).on("click", "#ToASChMAddGroup", function () {
            $.confirm(
                {
                    "title"  : "New Group Name",
                    "message": "<input type=\"text\" id=\"ToASChMNewgroupName\" style=\"width:100%;\">",
                    "buttons": {
                        "Create": {
                            "class" : "green",
                            "action": function () {
                                let groupName = $("#ToASChMNewgroupName").val();
                                if (groupName.match(/^\s*$/)) {
                                    groupName = randomName(7, 13);
                                }
                                options.channelsSettings.channelMerger.groups.push(groupName);
                                groupsMap[groupName] = randomName(3, 5) + "_" + randomInt(5, 9);
                                $("#ToASettings").click();
                            }
                        },
                        "Cancel": {
                            "class" : "red",
                            "action": function () {
                            }
                        }
                    }
                }
            );
            $("#ToASChMNewgroupName").focus();
        });

        $(document).on("click", ".ToASChMChGRemove", function () {
            let elem = $(this);
            $.confirm(
                {
                    "title"  : "Group Delete Confirmation",
                    "message": "Are you sure you want to remove this channel group?",
                    "buttons": {
                        "Yes": {
                            "class" : "green",
                            "action": function () {
                                let groupID = elem.attr("data-gnid");

                                let groupName = options.channelsSettings.channelMerger.groups[groupID];

                                for (let x in options.channelsSettings.channelMerger.mapping) {
                                    if (options.channelsSettings.channelMerger.mapping[x] === groupName) {
                                        delete options.channelsSettings.channelMerger.mapping[x];
                                    }
                                }

                                options.channelsSettings.channelMerger.groups.splice(groupID, 1);

                                let groupChannelID = MergedChannelsGroup + "_MCGID_" + groupsMap[groupName];
                                $("#channelTab" + groupChannelID).remove();
                                delete channelLog[groupChannelID];
                                delete groupsMap[groupName];
                                delete options.channelsSettings.channelMerger.defaultChannels[groupName];
                                $("#chatMessageList li").attr("class", "");
                                saveOptions();
                                $("#channelTabList > div:nth-child(2)").click();
                                // loadMessages("reload");
                                $("#ToASettings").click();
                            }
                        },
                        "No" : {
                            "class" : "red",
                            "action": function () {
                            }
                        }
                    }
                }
            );
        });

        $(document).on('click', '#ToAUpdateShowChangelog', function (e) {
            $('#ToASettings').click();
            setTimeout(function () {
                $('#ToAChangelog').click();
            }, 500);
            e.preventDefault();
            return false;
        });

        $(document).on('click', '#ToAAuthor', function () {
            $('#chatMessage').html('/profile Reltorakii');
            $('#chatSendMessage').click();
        });
    }

    function init() {
        loadOptions();
        setupEvents();
        loadDependencies();
        prepareHTML();
        addSettingsTab();
        addPersistentChannels();
        loadMessages();
        // log('Starting chat monitor loop');
        // doubleCheckUnprocessed();
        populateChangelog();

        // TODO: many channels horizontal scroll
        $("#channelTabList").sortable({
            items   : ".channelTab",
            distance: 5,
            update  : savePersistentChannels,
            containment: 'parent'
        });
        $("#channelTabList").disableSelection();
        checkForUpdateTimer = setTimeout(checkForUpdate, 10000);
    }

    init();

}(jQuery));
