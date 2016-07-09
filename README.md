# Tabs of Avabur
Sorts messages in chat under channel tabs and adds several new features built around chat.

## Table of Contents

 * [Preview](#preview)
 * [Notes](#notes)
   * [Fair warning](#fair-warning)
   * [Disclaimer](#disclaimer)
   * [How to install](#how-to-install)
 * [Features](#features)

## Preview
![Tabs of avabur ingame](http://i.imgur.com/renrcv1.png "This is what ToA will look like in your game")


## Notes
### Fair warning
While I have **no intention of harming you** with my work, this is a ***custom JavaScript code*** and you ***should not trust and install just any script you find on the internet***. Get someone that knows a bit of programming to check it for you if you are unsure!

### Disclaimer
This script is a **Work In Progress** or *WIP*, while I tried hard to iron out as many bugs as I could find, only a handful of people tested it for me, so be prepared in case you run into a problem :smiley: If you update me on it [*via a message on RoA or in the issue tracker here on github*] I'll do my best to fix as soon as possible!

### How to install
The easiest way to use ToA is to install a browser Script Manager extension

 * [Tampermonkey](http://www.google.com/search?q=tampermonkey) - Chrome, Safari, Firefox, Opera
 * [Greasemonkey](http://www.google.com/search?q=greasemonkey) - Firefox, QuPZilla, ..

And then [click here](https://github.com/edvordo/TabsOfAvabur/raw/master/TabsOfAvabur.user.js) to install Tabs of Avabur

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