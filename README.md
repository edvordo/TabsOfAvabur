# Tabs of Avabur
Sorts messages in chat under channel tabs and adds several new features built around chat.

[![](http://i.imgur.com/plbjGP5.png "Click to install ^^")](https://github.com/edvordo/TabsOfAvabur/raw/master/TabsOfAvabur.user.js)

## Table of Contents

 * [Preview](#preview)
 * [Notes](#notes)
   * [Fair warning](#fair-warning)
   * [Disclaimer](#disclaimer)
   * [How to install](#how-to-install)
     * [Warning](#warning)
 * [Features](#features)

## Preview
![Tabs of avabur ingame](https://i.imgur.com/renrcv1.png "This is what ToA will look like in your game")


## Notes

### Chat direction

To have your chat direction respected nad used by ToA, you have two options:
* Install [edvordo/RoA-WSHookUp](https://github.com/edvordo/RoA-WSHookUp) userscript
  * tl;dr: this script does nothing visible, it's meant for developers to give **you** something to see :)
  * With this option you don't have to do anything else, your chat direction will be applied upon next refresh
  * I'm sure there will be an use for it some point anyway, the updated avabur enhacer uses it afaik
* After installing version 4.1 or later and refreshing the gamepage, go to `Account Management -> Preferences -> Chat` and change the setting back and forth
  * You'll only need to do this once, the setting will persist between reloads after that
  * You don't even have to save the change in chat dir., just clicking the options (New Messages on Top -> New Messages on Bottom) will make ToA use it


### Fair warning
While I have **no intention of harming you** with my work, this is a ***custom JavaScript code*** and you ***should not trust and install just any script you find on the internet***. Get someone that knows a bit of programming to check it for you if you are unsure!

### Disclaimer
This script is a **Work In Progress** or *WIP*, while I tried hard to iron out as many bugs as I could find, only a handful of people tested it for me, so be prepared in case you run into a problem :smiley: If you update me on it [*via a message on RoA or in the issue tracker here on github*] I'll do my best to fix as soon as possible!

### How to install
The easiest way to use ToA is to install a browser Script Manager extension

 * [Tampermonkey](http://www.google.com/search?q=tampermonkey) - Chrome, Safari, Firefox, Opera
 * [Greasemonkey](http://www.google.com/search?q=greasemonkey) - Firefox, QuPZilla, ..

And then [click here](https://github.com/edvordo/TabsOfAvabur/raw/master/TabsOfAvabur.user.js) to install Tabs of Avabur

#### Warning
In case you had previous versions of ToA (prior to the 3.0 version) installed, this installation creates a new entry for ToA. Check and make sure you do not have multiple versions of ToA running before you reload the game. You can safely remove the old entry for ToA. :blush:

## Features

 * **Sorts messages in chat into their respective channel tab** [*the obvious one* ^.^]
 * You can **sort the channel tabs** to your likings [*just drag and drop*]
 * **On tab new message in channel count**
 * ToA **respects** your **chat direction setting**
 * Fair few **[options](http://i.imgur.com/wcJIH57.png) are available to customize ToA** [*applied on change with no need to reload*]
 * **Channel tab preview of new messages sent to that channel** [*if enabled in options*]<br>
![Channel tab new messages preview window](http://i.imgur.com/bZpopVZ.png)
   * On preview window **channel actions**, also available **as [context menu options](http://i.imgur.com/CcweTo6.png)** (*right click*)
   * All these channel options **can be dissabled** in ToA options
 * **Channel muting!**
   * Unlike the `/quiet` chat command, you can mute only speciffic channels without the need to `/leave` the channel
   * Messages received will be removed instantly
   * Muted channel will have it's new message counter disabled and if you remove the tab, it will not be created again
   * Muted channels can be un-muted from *context menu* or *channel manager*
 * **Channel Manager**<br>
![](http://i.imgur.com/G7QPkzd.png "Channel Manager")
   * **Muted Channels** manager
     * You can remove previously muted channel from here
   * **INTRODUCING: Channel merger**
     * Simply put, merged channels effectively means this<br>
![](http://i.imgur.com/QmhWWKc.png)
     * Any grouped channels will be displayed under the same tab.
     * As shown on the screenshot, channels `TabsOfAvabur` and `rowrewamped` are bost displayed when the `#Reltos' addons` tab is active.
     * You can create as many groups as you like
     * You can put as many channel into one group as you like
     * You can rename the channel group
     * Or you can delete it, at which point all messages sorted under it will go into their respective channel tabs
     * The first channel in a list within a group will be the one ToA will try to set as an active one!
     * You can tell the channel group tab to **generate a diferent random color** in case the current one is not ok. [*This is not persistent*]
     * ***Note***: *This being the newest feature, be advised that it can have some bugs or unexpected behavior*
 * **Three profile tooltip actions**
   * Profile tooltips across the game will have 3 new actions<br>
![](http://i.imgur.com/0wKXgdC.png)
   * The letter in sqare brackets `[]` is, as per usual, the triggering key for given action
   * **Nickname** [*lets you un/nickname the user*]
   * **@mention** [*inserts @username handle at the end of the chat message*]
   * **Quickscope** [*sends* `/whois username`]
   * All of these can be disabled in ToA options
 * You'll get a notification in chat when I update ToA :smiley:
 * Can be updated ia script managers!

 [![Codacy Badge](https://api.codacy.com/project/badge/Grade/23ec4cd723ec44a590b02f6b4d3099e3)](https://www.codacy.com/app/edvordo1/TabsOfAvabur?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=edvordo/TabsOfAvabur&amp;utm_campaign=Badge_Grade)