window._trackJs = {
  token: 'bd495185bd7643e3bc43fa62a30cec92',
  enabled: true,
  onError: function (payload) { return true; },
  version: "",
  callback: {
    enabled: true,
    bindStack: true
  },
  console: {
    enabled: true,
    display: true,
    error: true,
    warn: false,
    watch: ['log', 'info', 'warn', 'error']
  },
  network: {
    enabled: true,
    error: true
  },
  visitor: {
    enabled: true
  },
  window: {
    enabled: true,
    promise: true
  }
};
var trackJs = require('trackjs');
import React from 'react';
import ReactDOM from 'react-dom';
import Reflux from 'reflux';
import _ from 'lodash';
import prefsStore from '../components/stores/prefs';
var checkChromeErrors = (err)=>{
  if (chrome.runtime.lastError) {
    window.trackJs.track(chrome.runtime.lastError);
  }
  if (chrome.extension.lastError) {
    window.trackJs.track(chrome.extension.lastError);
  }
  if (err) {
    window.trackJs.track(err);
  }
};
var checkChromeErrorsThrottled = _.throttle(checkChromeErrors, 2000, {leading: true});
//import {reRenderStore} from '../components/stores/main';

var sendMsg = (msg) => {
  chrome.runtime.sendMessage(chrome.runtime.id, msg, (response)=>{});
};
var reload = (reason)=>{
  // console log messages before error triggered location.reload() calls. Preserve console logging in the browser to see them.
  console.log('Reload background script. Reason: ',reason);
  setTimeout(()=>{
    location.reload();
  },0);
};
var close = (id)=>{
  chrome.tabs.get(id, (t)=>{
    if (t) {
      chrome.tabs.remove(id);
    }
  });
};
const eventState = {
  onStartup: null,
  onUpdateAvailable: null,
  onInstalled: null,
  onUninstalled: null,
  onEnabled: null,
  onDisabled: null
};
chrome.runtime.onStartup.addListener(()=>{
  eventState.onStartup = {type: 'startup'};
});
chrome.runtime.onUpdateAvailable.addListener((details)=>{
  eventState.onUpdateAvailable = details;
});
chrome.runtime.onInstalled.addListener((details)=>{
  eventState.onInstalled = details;
});

var Bg = React.createClass({
  mixins: [Reflux.ListenerMixin],
  getInitialState(){
    return {
      eventState: eventState,
      prefs: null,
      init: true
    };
  },
  componentDidMount(){
    this.listenTo(prefsStore, this.prefsChange);
  },
  prefsChange(e){
    var s = this.state;
    console.log('prefsChange');
    s.prefs = e;
    this.setState(s);
    if (s.init) {
      this.attachListeners(s);
    } else {
      sendMsg({e: e, type: 'prefs'});
    }
  },
  attachListeners(state){
    var s = this.state.init ? state : this.state;
    //chrome.tabs.create({active: true}, (tab)=>{});
    if (eventState.onStartup) {
      _.defer(()=>{
    
        sendMsg(eventState.onStartup);
      });
    }
    if (eventState.onInstalled) {
  
      if (eventState.onInstalled.reason === 'update' || eventState.onInstalled.reason === 'install') {
        chrome.tabs.query({title: 'New Tab'},(tabs)=>{
          for (var i = 0; i < tabs.length; i++) {
            close(tabs[i].id);
          }
        });
        chrome.tabs.create({active: true}, (tab)=>{
          setTimeout(()=>{
            if (eventState.onInstalled.reason === 'install') {
              sendMsg({e: eventState.onInstalled, type: 'installed'});
            } else if (eventState.onInstalled.reason === 'update') {
              sendMsg({e: eventState.onInstalled, type: 'versionUpdate'});
            }
          },500);
        });
      }
    }
    if (eventState.onUpdateAvailable) {
  
      sendMsg({e: eventState.onUpdateAvailable, type: 'newVersion'});
    }
    chrome.tabs.onCreated.addListener((e, info) => {
      console.log('onCreated: ', e, info);
      eventState.onCreated = e;
  
      /*if (e.url === 'chrome://newtab/') {
        console.log('New Tab created...');
        _.delay(()=>sendMsg({e: s.prefs, type: 'prefs'}), 500);
      }*/
      sendMsg({e: e, type: 'create'});
    });
    chrome.tabs.onRemoved.addListener((e, info) => {
      eventState.onRemoved = e;
  
      sendMsg({e: e, type: 'remove'});
    });
    chrome.tabs.onActivated.addListener((e, info) => {
      eventState.onActivated = e;
  
      sendMsg({e: e, type: 'activate'});
    });
    chrome.tabs.onUpdated.addListener((e, info) => {
      eventState.onUpdated = e;
  
      if (e.url === 'chrome://newtab/') {
        console.log('New Tab updated...');
      }
      sendMsg({e: e, type: 'update'});
    });
    chrome.tabs.onMoved.addListener((e, info) => {
      eventState.onMoved = e;
  
      console.log('onMoved', e, info);
      sendMsg({e: e, type: 'move'});
    });
    chrome.tabs.onAttached.addListener((e, info) => {
      eventState.onAttached = e;
  
      console.log('onAttached', e, info);
      sendMsg({e: e, type: 'attach'});
    });
    chrome.tabs.onDetached.addListener((e, info) => {
      eventState.onDetached = e;
  
      console.log('onDetached', e, info);
      sendMsg({e: e, type: 'detach'});
    });
    chrome.bookmarks.onCreated.addListener((e, info) => {
      eventState.bookmarksOnCreated = e;
  
      console.log('bookmarks onCreated', e, info);
      sendMsg({e: e, type: 'bookmarks'});
    });
    chrome.bookmarks.onRemoved.addListener((e, info) => {
      eventState.bookmarksOnRemoved = e;
  
      console.log('bookmarks onRemoved', e, info);
      sendMsg({e: e, type: 'bookmarks'});
    });
    chrome.bookmarks.onChanged.addListener((e, info) => {
      eventState.bookmarksOnChanged= e;
  
      console.log('bookmarks onChanged', e, info);
      sendMsg({e: e, type: 'bookmarks'});
    });
    chrome.bookmarks.onMoved.addListener((e, info) => {
      eventState.bookmarksOnMoved= e;
  
      console.log('bookmarks onMoved', e, info);
      sendMsg({e: e, type: 'bookmarks'});
    });
    chrome.history.onVisited.addListener((e, info) => {
      eventState.historyOnVisited = e;
  
      console.log('history onVisited', e, info);
      sendMsg({e: e, type: 'history', action: 'visited'});
    });
    chrome.history.onVisitRemoved.addListener((e, info) => {
      eventState.historyOnVisitRemoved = e;
  
      console.log('history onVisited', e, info);
      sendMsg({e: e, type: 'history', action: 'remove'});
    });
    chrome.management.onEnabled.addListener((details)=>{
      eventState.onEnabled = details;
  
      console.log('app enabled', details);
      sendMsg({e: details, type: 'app'});
    });
    this.attachMessageListener(s);
    this.setState({init: false});
  },
  attachMessageListener(s){
    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
      // requests from front-end javascripts
      if (msg.method === 'captureTabs') {
        var capture = new Promise((resolve, reject)=>{
          try {
            chrome.tabs.captureVisibleTab({format: 'jpeg', quality: 10}, (image)=> {
              if (image) {
                resolve(image);
              } else {
                reject();
              }
              checkChromeErrorsThrottled();
            });
          } catch (e) {
            console.log(e);
            reject();
          }
        });
        capture.then((image)=>{
          sendResponse({'image': image});
        }).catch((e)=>{
          if (s.prefs.mode !== 'tabs') {
            chrome.tabs.update(msg.id, {active: true});
            reload('Screenshot capture error.');
          } else {
            sendMsg({e: sender.id, type: 'error'});
          }
        });
      } else if (msg.method === 'close') {
        close(sender.tab.id);
      } else if (msg.method === 'reload') {
        reload('Messaged by front-end script to reload...');
      } else if (msg.method === 'restoreWindow') {
        for (var i = 0; i < msg.tabs.length; i++) {
          chrome.tabs.create({
            windowId: msg.windowId,
            index: msg.tabs[i].index,
            url: msg.tabs[i].url,
            active: msg.tabs[i].active,
            selected: msg.tabs[i].selected,
            pinned: msg.tabs[i].pinned
          }, (t)=>{
            console.log('restored: ',t);
            checkChromeErrorsThrottled();
          });
        }
        sendResponse({'reload': true});
      } else if (msg.method === 'prefs') {
        sendResponse({'prefs': s.prefs});
      } else if (msg.method === 'setPrefs') {
        prefsStore.set_prefs(msg.obj);
        sendResponse({'prefs': prefsStore.get_prefs()});
      } else if (msg.method === 'tabs') {
        chrome.tabs.query({
          windowId: chrome.windows.WINDOW_ID_CURRENT,
          currentWindow: true
        }, (Tab) => {
          if (Tab) {
            sendResponse({'tabs': Tab});
          }
        });
      }
      return true;
    });
  },
  render:function(){
    var s = this.state;
    console.log('BG STATE: ',s);
    return null;
  }
});
ReactDOM.render(<Bg />, document.body);