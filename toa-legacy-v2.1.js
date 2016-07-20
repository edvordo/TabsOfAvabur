// ==UserScript==
// @name         TabsOfAvabur
// @namespace    Reltrakii_Magic_World
// @version      2.1
// @description  Tabs the channels it finds in chat, can be sorted, with notif for new messages
// @author       Reltorakii
// @match        https://*.avabur.com/game.php
// @grant        none
// ==/UserScript==
/* jshint -W097 */
'use strict';

(function() {
    
    var options                 = {
        scriptSettings  : {
            purge           : true,
            channel_remove  : false,
            preview         : true,
            preview_reset   : false,
            group_wires     : false
        },
        channelsSettings    : {
            channelManager : {},
            mutedChannels   : []
        }
    };
    var channelLog              = {};
    var currentChannel          = "Main";
    var ServerMessagesChannel   = "SML_325725_2338723_CHC";
    var CMDResposeChannel       = "CMDRC_4000_8045237_CHC";
    var WhispersChannel         = "UW_7593725_3480021_CHC";
    var WiresChannel            = "WC_0952340_3245901_CHC";

    var showedMoTD              = false;
    var lastMoTDContent         = "";

    var showingReconnectMsg    = false;

    var hovering;
    var hoveringOverTab;

    function loadMessages()
    {
        $("#chatMessageList li:not(.processed)").each(function(i,e){
            var plainText       = $(e).text();
            // lets get rid of staff stuff
            plainText           = plainText.replace(/^\[X\]\s*/, "");
            // now clean up spaces
            plainText           = plainText.replace(/\s+/g, " ");
            // default message format [11:11:11] [Channel] (optional) the rest of the message
            var defaultMsg      = plainText.match(/^\[([^\]]+)\]\s*(\[([^\]]+)\])?\s*(.*)/);
            // clan MoTD: [11 Nov, 1111] Clan Message of the Day:
            var isClanMoTD      = plainText.replace(/^\[[0-9]+\s+[a-zA-Z]+\,\s*[0-9]+\]\s*/, "").indexOf("Clan Message of the Day:") === 0;
            // clan MoTD: [11 Nov, 1111] Message of the Day:
            var isRoAMoTD       = plainText.replace(/^\[[0-9]+\s+[a-zA-Z]+\,\s*[0-9]+\]\s*/, "").indexOf("Message of the Day:") === 0;
            // Staff Server Messages [11:11:11] [ Whatever the hell. ]
            var isServerMsg     = plainText.match(/^\[[^\]]+\]\s*\[\s+.*\s+]$/);
            // whisper detection
            var isWhisper       = plainText.match(/^\[[^\]]+\]\s*Whisper\s*(to|from)\s*([^:]+)/);
            // wire detection
            var isWire          = plainText.match(/^\[[^\]]+\]\s*(You|[a-zA-Z]+)\s*wired\s*.*\s*(you|[a-zA-Z]+)\.$/);

            var isChatNotif     = $(e).children(".chat_notification").length > 0;
            var isChatReconnect = $(e).attr("id") === "websocket_reconnect_line";
            var channel         = currentChannel;
            var channelInfo     = resolveChannelID(channel);
            if (defaultMsg !== null) {
                channel         = defaultMsg[3] === undefined ? "Main" : defaultMsg[3];
                channelInfo     = resolveChannelID(channel);
            }
            if (isClanMoTD) {
                channel         = "CLAN";
                channelInfo     = resolveChannelID("CLAN");
            } else if (isServerMsg){
                channel         = "Server Messages";
                channelInfo     = resolveChannelID(channel);
            } else if (isWhisper){
                channel         = "Whispers Log";
                channelInfo     = resolveChannelID(channel);
            } else if (isWire &amp;&amp; options.scriptSettings.group_wires){
                channel         = "Wires Log";
                channelInfo     = resolveChannelID(channel);
            }
            var channelID       = channelInfo.cID;
            if (
                channelID !== CMDResposeChannel 
                &amp;&amp; channelID !== ServerMessagesChannel 
                &amp;&amp; channelID !== WiresChannel 
                &amp;&amp; ( isChatNotif || isChatReconnect)
            ) {
                
                channelID       = currentChannel;
            }
            if (channelID === CMDResposeChannel){
                channel         = "Info Channel";
            }
            var channelColor    = resolveChannelColor(channelID, channel);
            if (currentChannel !== channelID){
                $(e).hide();
            } else {
                $(e).show();
            }
            $(e).addClass("processed");
            $(e).addClass("chc_" + channelID);
            if (channelLog[channelID] === undefined) {
                channelLog[channelID] = {
                    channelName: channel,
                    channelID: channelID,
                    channelColor: channelColor,
                    messages: 0,
                    newMessages: false,
                    newMessagesCount: 0,
                    muted: options.channelsSettings.mutedChannels.indexOf(channelID) !== -1
                };
            }
            if (channelID !== currentChannel){
                channelLog[channelID].newMessages = true;
                channelLog[channelID].newMessagesCount++;
            }
            channelLog[channelID].messages++;
            if (options.channelsSettings.mutedChannels.indexOf(channelID) !== -1){
                $(e).remove();
            }
            updateChannelList(channelLog[channelID]);
        });

        setTimeout(loadMessages, 500);
    }
    function init()
    {
        loadOptions();
        loadDependencies();
        prepareHTML();
        addSettingsTab();
        loadMessages();

        $("#channelTabListWrapper").mCustomScrollbar({axis:"x",advanced:{autoExpandHorizontalScroll:true}});
        $("#channelTabList").sortable({items:".channelTab",distance: 5});
        $("#channelTabList").disableSelection();
        setTimeout(function(){$("#channelTabMain").click();},1000);
    }

    function resolveChannelID(channel)
    {
        
        //channel = channel.replace(/\s+/g, "");
        var channelID;
        var resolved = true;
        if (channel === "GLOBAL") {
            channelID = "Global";
        } else if (channel === "CLAN") {
            channelID = "Clan";
        } else if (channel.substr(0,4) === "AREA") {
            channelID = "Area";
        } else if (channel === "HELP") {
            channelID = "Help";
        } else if (channel === "STAFF") {
            channelID = "Staff";
        } else if (channel === "TRADE") {
            channelID = "Trade";
        } else if (channel === "Market") {
            channelID = "Trade";
        } else if (channel === "Whispers Log") {
            channelID = WhispersChannel;
        } else if (channel === "Wires Log") {
            channelID = WiresChannel;
        } else if (channel === "Server Messages") {
            channelID = ServerMessagesChannel;
        } else if (channel.match(/^Level:\s+[0-9]+/)) {
            channelID = CMDResposeChannel;
        } else if (!channel.match(/^[a-zA-Z0-9]+$/)) {
            var channelSystemID = 0;
            $("select#chatChannel option").each(function(i,e){
                var n = $(e).attr("name");
                if (n==="channel"+channel) {
                    channelSystemID = $(e).attr("value");
                }
            });
            if (channelSystemID === 0) {
                resolved = false;
                channelSystemID = "Main";
            }
            channelID = channelSystemID;
        } else {
            if ($("#channel"+channel).length === 0) {
                resolved = false;
                channel = "Main";
            }
            channelID = channel;
        }
        return {cID: channelID, res: resolved};
    }

    function resolveChannelColor(channelID, channelName)
    {
        var color = $(".chatChannel[data-id='" + channelID + "']").css("background-color");
        if (color === undefined) {
            $(".chatChannel").each(function(i,e){
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

    function updateChannelList(channel)
    {
        var tab = $("#channelTab" + channel.channelID);
        if (tab.length === 0) {
            if (channel.muted) {
                return;
            }
            $("<div>")
                .attr("id", "channelTab" + channel.channelID)
                .attr("data-channel", channel.channelID)
                .addClass("border2 ui-element channelTab")
                .css({
                    color: channel.channelColor
                })
                .appendTo("#channelTabList");
            tab = $("#channelTab" + channel.channelID);
        }
        var channelTabLabel = "#"+channel.channelName;
        tab.text(channelTabLabel);
        if (channel.newMessages &amp;&amp; !channel.muted) {
            
            if ($(".Ch"+channel.channelID+"Badge").length === 0) {
            var badge = $("<span>")
                .addClass("ChBadge")
                .addClass("border2")
                .addClass("Ch"+channel.channelID+"Badge")
                .text(channel.newMessagesCount)
                .appendTo("#channelTab"+channel.channelID);
            } else {
                $(".Ch"+channel.channelID+"Badge").text(channel.newMessagesCount);
            }
        }
        if (channel.muted) {
            $("<span>")
                .addClass("ChBadge fa fa-times border2 ui-element")
                .appendTo("#channelTab"+channel.channelID);
        }
    }

    function addSettingsTab()
    {
        $("<div>")
            .attr("id", "ToASettings")
            .addClass("border2 ui-element ToASettings")
            .prependTo("#channelTabList");
        $("<span>")
            .addClass("fa")
            .addClass("fa-cogs")
            .css({
                color: "#ffd700",
                fontWeight: 500
            })
            .appendTo("#ToASettings")
    }

    function randomNumber()
    {
        return Math.floor(Math.random() * 1000000+1000000);
    }

    function loadDependencies()
    {
        //<link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/font-awesome/4.5.0/css/font-awesome.min.css">
        $("<link>")
            .attr({
                rel: "stylesheet",
                href: "//maxcdn.bootstrapcdn.com/font-awesome/4.5.0/css/font-awesome.min.css"
            })
            .appendTo("head");
    }

    function prepareHTML()
    {
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
            .addClass("border2 ui-element fa fa-eraser emerald cpa")
            .attr("id", "CPAPurge")
            .attr("title", "Clear channel of all messages")
            .appendTo("#channelPreviewActions");

        $("<span>")
            .addClass("border2 ui-element fa fa-unlink ruby cpa")
            .attr("id", "CPARemove")
            .attr("title", "Clear the channel and remove it from tabs\nIf any new messages pop into it, it will come back.")
            .appendTo("#channelPreviewActions");

        $("<div>")
            .attr("id", "channelPreviewContent")
            .appendTo("#channelPreviewWrapper");

        $("<div>")
            .attr("id", "channelPreviewMessages")
            .css({
                padding:"2px",
            })
            .appendTo("#channelPreviewContent");
        $("#channelPreviewContent").mCustomScrollbar();

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

        $("#channelTabContextMenu").hide();

        /**
         * settings
         */
        $("<div>")
            .attr("id", "ToASettingsWindow")
            .addClass("border2 ui-element")
            .appendTo("body");

        $("<h5>")
            .css("text-align", "center")
            .text("TabsOfAvabur - Settings")
            .appendTo("#ToASettingsWindow");
        
        $("<div>")
            .attr("id","ToASWMenu")
            .appendTo("#ToASettingsWindow");

        var t = $("<div>")
            .addClass("col-xs-6 text-center");

        var l = t.clone().appendTo("#ToASWMenu");
        var r = t.clone().appendTo("#ToASWMenu");

        $("<button>")
            .attr("type", "button")
            .attr("id", "ToAScriptOptions")
            .addClass("btn btn-primary btn-block")
            .text("Script options")
            .appendTo(l);

        $("<button>")
            .attr("type", "button")
            .attr("id", "ToAChannelManager")
            .addClass("btn btn-primary btn-block")
            .text("(WIP) Channel Manager")
            .appendTo(r);

        $("<div>").addClass("clearfix").appendTo("#ToASettingsWindow");

        $("<div>")
            .attr("id", "ToASettingsWindowContent")
            .appendTo("#ToASettingsWindow");

        $("<div>")
            .attr("id", "ToASettingsScriptSettings")
            .append($("<h6>").text("Script settings").addClass("text-center"))
            .appendTo("#ToASettingsWindowContent");

        var t2  = $("<label>");
        var t2a = $("<input>").attr({"type":"checkbox"}).addClass("settingsChanger");
        var t2w = t.clone().removeClass("text-center");

        // purge channel
        t2w.clone()
            .append(
                t2.clone()
                    .text(" Allow channel message purging")
                    .prepend(
                        t2a.clone()
                            .attr("data-setting","purge")
                            .prop("checked", options.scriptSettings.purge)
                    )
            )
            .appendTo("#ToASettingsScriptSettings");
        // purge and remove
        t2w.clone()
            .append(
                t2.clone()
                    .text(" Allow removing channel form tabs")
                    .prepend(
                        t2a.clone()
                            .attr("data-setting","channel_remove")
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
                            .attr("data-setting","preview")
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
                            .attr("data-setting","preview_reset")
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
                            .attr("data-setting","group_wires")
                            .prop("checked", options.scriptSettings.group_wires)
                    )
            )
            .appendTo("#ToASettingsScriptSettings");



        $("<div>")
            .attr("id", "ToASettingsChannelManager")
            .text("This functionality is yet to be worked on :)")
            .addClass("text-center")
            .appendTo("#ToASettingsWindowContent");

        $("<div>").addClass("clearfix").appendTo("#ToASettingsWindow");
        $("<div>")
            .attr("id", "ToASettingsSaved")
            .text("Settings have been saved and are applied")
            .addClass("text-center small")
            .appendTo("#ToASettingsWindow");

        $("<span>")
            .attr("id", "ToASettingsWindowClose")
            .addClass("fa fa-times border2 ui-element")
            .appendTo("#ToASettingsWindow");

        $("#ToASettingsWindow").hide();
        $("#ToASettingsScriptSettings").hide();
        $("#ToASettingsChannelManager").hide();
        $("#ToASettingsSaved").hide();
        /**
         * CSS
         */
        $("<style>").text("\
#channelTabListWrapper{margin-bottom: -5px;position: relative;}#channelTabList{overflow: hidden;border-radius: 4px 4px 0 0;font-size: 9pt;}\
.ToASettings, .channelTab{cursor: pointer;margin: 2px 2px 0 2px;border-radius: 4px 4px 0 0;display: inline-block;padding: 2px 5px;position:relative;}\
#chatMessageList li{display: none;}\
#chatMessageList li.processed{display: list-item;}\
.ChBadge{display:inline-block;margin-left:3px;padding:1px 4px;font-size:7pt;vertical-align:top;border-color:green!important;color:#fff !important;}\
.muted-badge{position:absolute;left:5px;top:5px;}\
.mCSB_scrollTools.mCSB_scrollTools_horizontal{top:15px!important;}\
.mCSB_horizontal.mCSB_inside>.mCSB_container{margin-bottom: 0 !important;}\
#channelPreviewWrapper{position:absolute;font-size:9pt;min-width:350px;max-width:500px;background-color:rgba(0,0,0,.75)!important;}\
#channelPreviewContent{max-height: 250px;overflow-y: hidden;}\
#channelPreviewActions{position:absolute;right:2px;top:2px;}\
.cpa{display:inline-block;margin-left:2px;padding: 1px 3px;font-size:9pt;vertical-align:top;cursor:pointer;}\
#channelTabContextMenu{position:absolute;width:175px;background-color:rgba(0,0,0,.75)!important;}\
.cctmButton{text-align:left!important;}\
#ToASettingsWindow{position:absolute;width:500px;top:50%;left:50%;transform:translate(-50%,-50%);background-color:rgba(0,0,0,.75)!important;}\
.cctmButton>span{margin: 0 15px 0 5px;font-size:8.5pt;padding:2px;}\
#ToASettingsWindowContent label{font-size:10pt;}\
#ToASettingsWindowContent {padding-top:5px;}\
#ToASettingsWindowClose{position:absolute;right:2px;top:2px;color:#f00;padding:1px 4px;cursor:pointer;}").appendTo("body");
    }

    function changeSetting(e)
    {
        var setting = $(e).attr("data-setting");
        options.scriptSettings[setting] = $(e).prop("checked");
        saveOptions();
    }

    function purgeChannel(andRemove,confirmToo)
    {
        andRemove       = andRemove===undefined?options.scriptSettings.channel_remove:andRemove;
        confirmToo      = confirmToo===undefined?false:confirmToo;
        var channelID   = hoveringOverTab;
        var channelName = channelLog[channelID].channelName;
        var confirmText = 'Are you sure you want purge the "'+channelName+'" channel'+(andRemove?' and remove it from tabs':'')+'?\nThis only affects your screen.';
        if (confirmToo || confirm(confirmText)){
            $(".chc_"+channelID).remove();
            resetUnreadCount();
            if (andRemove) {
                $("#channelTab"+channelID).remove();
                delete channelLog[channelID];
                $("#channelTabMain").click();
                $("#channelPreviewWrapper").hide();
            }
        }
    }

    function resetUnreadCount()
    {
        var channelID                           = hoveringOverTab;
        channelLog[channelID].newMessages       = false;
        channelLog[channelID].newMessagesCount  = 0;
        updateChannelList(channelLog[channelID]);
        $("#channelPreviewWrapper").hide();
        $("#channelTabContextMenu").hide();
    }

    var SSN = 0;
    function saveOptions()
    {
        clearTimeout(SSN);
        var opts = JSON.stringify(options);
        localStorage.setItem("ToAOPTS", opts);
        $("#ToASettingsSaved").show();
        SSN = setTimeout(function(){
            $("#ToASettingsSaved").fadeOut();
        }, 3E3)
    }

    function loadOptions()
    {
        var stored = localStorage.getItem("ToAOPTS");
        try {
            var parsed = JSON.parse(stored);
            if (!parsed["scriptSettings"] === undefined){
                return;
            }
            if (parsed["scriptSettings"]["purge"] !== undefined) {
                options.scriptSettings.purge = !!parsed["scriptSettings"]["purge"];
            }
            if (parsed["scriptSettings"]["channel_remove"] !== undefined) {
                options.scriptSettings.channel_remove = !!parsed["scriptSettings"]["channel_remove"];
            }
            if (parsed["scriptSettings"]["preview"] !== undefined) {
                options.scriptSettings.preview = !!parsed["scriptSettings"]["preview"];
            }
            if (parsed["scriptSettings"]["preview_reset"] !== undefined) {
                options.scriptSettings.preview_reset = !!parsed["scriptSettings"]["preview_reset"];
            }
            if (parsed["scriptSettings"]["group_wires"] !== undefined) {
                options.scriptSettings.group_wires = !!parsed["scriptSettings"]["group_wires"];
            }
        } catch(e) {
            localStorage.removeItem("ToAOPTS");
            console.log(e);
        }
    }

    $(document).on("change", ".settingsChanger", function(e){
        changeSetting(this);
    });

    $(document).on("click", ".channelTab", function(e){
        e.preventDefault();
        $(".channelTab").removeClass("chTabSelected");
        var channelID = $(this).attr("data-channel");
        channelLog[channelID].newMessages = false;
        channelLog[channelID].newMessagesCount = 0;
        updateChannelList(channelLog[channelID]);
        $(".processed").hide();
        var channelOption = $("#channel" + channelID);
        if (channelOption.length === 0) {
            channelOption = $("#chatChannel option[value="+channelID+"]");
            if (channelOption.length === 0) {
                channelOption = $("#channelMain");
            }
        }
        if (channelOption.length > 0){
            var cID = channelOption.attr("value");
            $("#chatChannel").val(cID);
        }
        currentChannel = channelID;
        $(".chc_"+channelID).show();
        $("#channelTab"+channelID).addClass("chTabSelected");
        $("#channelPreviewWrapper").hide();
    });

    
    $(document).on("dblclick", ".channelTab", function(e){
        e.preventDefault();
        if (!options.scriptSettings.purge){
            return;
        }
        purgeChannel();
    });

    $(document).on("click", "#CPAReset, #chTabCTMenuReset", function(){
        resetUnreadCount();
    });

    $(document).on("click", "#CPAPurge, #chTabCTMenuPurge", function(){
        var confirmToo = $(this).attr("id") === "chTabCTMenuPurge";
        purgeChannel(false, confirmToo);
    });

    $(document).on("click", "#CPARemove, #chTabCTMenuRemove", function(){
        var confirmToo = $(this).attr("id") === "chTabCTMenuRemove";
        purgeChannel(true, confirmToo);
    });

    $(document).on("click", "#chTabCTMenuLeave", function(){
        var channelName = channelLog[hoveringOverTab].channelName;
        purgeChannel(true, true);
        $("#chatMessage").text("/leave " + channelName);
        $("#chatSendMessage").click();
    });

    $(document).on("click", "#chTabCTMenuMute", function(){
        if (hoveringOverTab === undefined){
            return;
        }
        if (options.channelsSettings.mutedChannels.indexOf(hoveringOverTab) === -1) {
            options.channelsSettings.mutedChannels.push(hoveringOverTab);
            saveOptions();
        }
        channelLog[hoveringOverTab].muted = true;
        updateChannelList(channelLog[hoveringOverTab]);
    });

    $(document).on("click", "#chTabCTMenuUnMute", function(){
        if (hoveringOverTab === undefined){
            return;
        }
        var pos = options.channelsSettings.mutedChannels.indexOf(hoveringOverTab)
        if (pos !== -1) {
            options.channelsSettings.mutedChannels.splice(pos,1);
            saveOptions();
        }
        channelLog[hoveringOverTab].muted = false;
        updateChannelList(channelLog[hoveringOverTab]);
    });

    
    $(document).on("mouseover", ".channelTab", function(e){
        clearTimeout(hovering);
        var channelID       = $(this).attr("data-channel");
        hoveringOverTab     = channelID;
        if (!options.scriptSettings.preview){
            return;
        }
        var channelName     = channelLog[channelID].channelName;

        var channelPreviewWrapper = $("#channelPreviewWrapper");
        
        var channelTabHolder    = $(this);

        var cssOptions = {
            top: ($(this).offset().top + 25)+"px"
        };
        var previewContent = "There are no new messages in this channel!";
        if (channelLog[channelID].newMessages === true) {
            var previewMessages = [];
            $(".chc_"+channelID).each(function(i,e){
                if (i < channelLog[channelID].newMessagesCount){
                    previewMessages.push($(e).html());
                }
            });
            previewContent = previewMessages.join("<br>");
        }

        $("#channelPreviewMessages").html(previewContent);

        if ($(this).offset().left > $(document).width() / 2){
            cssOptions.left = ($(this).offset().left - channelPreviewWrapper.width() + 50)+"px";
        } else {
            cssOptions.left = ($(this).offset().left + 50)+"px";
        }
        channelPreviewWrapper
            .css(cssOptions)
            .children("h5")
                .text("'"+channelName+"' preview");

        if (options.scriptSettings.preview_reset){
            $("#CPAReset").show();
        } else {
            $("#CPAReset").hide();
        }
        if (options.scriptSettings.purge){
            $("#CPAPurge").show();
        } else {
            $("#CPAPurge").hide();
        }
        if (options.scriptSettings.channel_remove){
            $("#CPARemove").show();
        } else {
            $("#CPARemove").hide();
        }
    });

    $(document).on("mouseover", function(e){
        clearTimeout(hovering);
        if (hoveringOverTab !== undefined &amp;&amp; channelLog[hoveringOverTab] !== undefined) {
        
            var channelTab              = $("#channelTab" + hoveringOverTab);
            var channelPreviewWrapper   = $("#channelPreviewWrapper");
            var shouldShow              = channelLog[hoveringOverTab].newMessages === true;
            var OpenAndKeep             = $(e.target).closest(channelTab).length || $(e.target).closest(channelPreviewWrapper).length;
            var delay                   = OpenAndKeep ? 500 : 250;
            hovering = setTimeout(function(){
                if (options.scriptSettings.preview &amp;&amp; OpenAndKeep &amp;&amp; shouldShow) {
                    channelPreviewWrapper.show();
                } else {
                    channelPreviewWrapper.hide();
                }
            }, delay);
        }
    });

    $(document).on("contextmenu", ".channelTab", function(e){
        e.preventDefault();
        var cssOptions = {
            top: e.pageY+"px"
        };

        if ($(this).offset().left > $(document).width() / 2){
            cssOptions.left = (e.pageX - $(this).width())+"px";
        } else {
            cssOptions.left = e.pageX+"px";
        }


        if (options.scriptSettings.preview_reset){
            $("#chTabCTMenuReset").show();
        } else {
            $("#chTabCTMenuReset").hide();
        }
        if (options.scriptSettings.purge){
            $("#chTabCTMenuPurge").show();
        } else {
            $("#chTabCTMenuPurge").hide();
        }
        if (options.scriptSettings.channel_remove){
            $("#chTabCTMenuRemove").show();
        } else {
            $("#chTabCTMenuRemove").hide();
        }

        if (options.channelsSettings.mutedChannels.indexOf(hoveringOverTab) !== -1){
            $("#chTabCTMenuUnMute").show();
            $("#chTabCTMenuMute").hide();
        } else {
            $("#chTabCTMenuMute").show();
            $("#chTabCTMenuUnMute").hide();
        }


        $("#channelTabContextMenu").css(cssOptions).show();
        $("#channelPreviewWrapper").hide();
        return false;
    });

    $(document).on("click", "#ToASettings", function(){
        $("#ToASettingsWindow").show();
    });

    $(document).on("click", function(e){
        $("#channelTabContextMenu").hide();
        var settings = $("#ToASettingsWindow");
        if (!$(e.target).closest(settings).length &amp;&amp; !$(e.target).closest("#ToASettings").length || $(e.target).closest("#ToASettingsWindowClose").length) {
            settings.hide();
            $("#ToASettingsChannelManager").hide();
            $("#ToASettingsScriptSettings").hide();
        }
    });

    $(document).on("click", "#ToAScriptOptions, #ToAChannelManager", function(){
        var id = $(this).attr("id");
        if (id === "ToAScriptOptions") {
            $("#ToASettingsScriptSettings").show();
            $("#ToASettingsChannelManager").hide();
        } else {
            $("#ToASettingsScriptSettings").hide();
            $("#ToASettingsChannelManager").show();
        }
    });

    init();
})();