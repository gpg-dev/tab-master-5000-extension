import React from 'react';

import state from './stores/state';
import themeStore from './stores/theme';
import {utilityStore, msgStore} from './stores/main';

var LargeBtn = React.createClass({
  render(){
    var p = this.props;
    return (
      <button 
      style={p.style} 
      className="btn btn-block btn-float btn-float-lg legitRipple" 
      type="button"
      onClick={p.onClick}
      onMouseEnter={p.onMouseEnter}
      onMouseLeave={p.onMouseLeave}>
        <i className={p.icon} /> 
        <span>{p.label}</span>
      </button>
    );
  }
});

export var SidebarMenu = React.createClass({
  getInitialState(){
    return {
      sidebarTab: 'Navigation',
      lgBtnHover: '',
      viewMode: true,
      sortBy: true
    };
  },
  render(){
    var p = this.props;
    var s = this.state;

    var lgBtnOptions = [
      [
        [
          {label: 'Tabs', icon: 'icon-browser'},
          {label: 'Sessions', icon: 'icon-windows2'},
        ],
        [
          {label: 'History', icon: 'icon-history'},
          {label: 'Bookmarks', icon: 'icon-bookmark4'},
        ],
      ],
      [
        [
          {label: 'Apps', icon: 'icon-history'},
        ],
        [
          {label: 'Extensions', icon: 'icon-bookmark4'},
        ]
      ]
    ];
    var sidebarTabs = [
    {label: 'Settings', icon: 'icon-gear', onClick: ()=>state.set({modal: {state: true, type: 'settings'}})},
      {label: `${p.prefs.format === 'tile' ? 'Table' : 'Tile'} Format`, icon: `icon-${p.prefs.format === 'tile' ? 'list' : 'grid'}`, onClick: ()=>msgStore.setPrefs({format: p.prefs.format === 'tile' ? 'table' : 'tile'})},
      {label: 'Sessions', icon: 'icon-windows2'}
    ];
    return (
      <div className="sidebar sidebar-secondary sidebar-default" style={{
        color: p.theme.darkBtnText
      }}>
        <div className="sidebar-content">
          <div className="tabbable sortable ui-sortable">
            <ul className="nav nav-lg nav-tabs nav-justified">
              {sidebarTabs.map((tab, i)=>{
                var tabStyle = {
                  color: p.theme.darkBtnText,
                  backgroundColor: p.theme.darkBtnBg,
                  borderBottom: '0px',
                  cursor: 'pointer'
                };
                return (
                  <li key={i}>
                    <a style={tabStyle} className="legitRipple" onClick={tab.onClick} data-tip={tab.label}>
                      <i className={tab.icon}/>
                    </a>
                  </li>
                );
              })}
            </ul>

            <div className="tab-content">
              <div className="tab-pane no-padding active" id="components-tab">
                <div className="sidebar-category">
                  <div className={`category-title ${s.viewMode ? '' : 'category-collapsed'}`} style={{
                    borderTopColor: p.theme.darkBtnText,
                    borderTop: `1px solid ${p.theme.darkBtnText}`,
                    borderBottomColor: p.theme.darkBtnText, 
                    cursor: 'pointer'
                  }} 
                    onClick={()=>this.setState({viewMode: !s.viewMode})}>
                    <span>View Mode</span>
                    <ul className="icons-list">
                      <li>
                        <a data-action="collapse" className={s.viewMode ? '' : 'rotate-180'}></a>
                      </li>
                    </ul>
                  </div>

                  {s.viewMode ?
                  <div className="category-content" style={{height: s.viewMode ? 'initial' : '0px', WebkitTransition: 'height 0.2s'}}>
                    <div className="row" onMouseLeave={()=>this.setState({lgBtnHover: ''})}>
                      {lgBtnOptions.map((row, i)=>{
                        //
                        return (
                          <div key={i} className="row">
                            {row.map((column, c)=>{
                              return (
                                <div key={c} className="col-xs-6">
                                  {column.map((option, o)=>{
                                    var lgBtnStyle = {
                                      color: p.prefs.mode === option.label.toLowerCase() ? p.theme.lightBtnText : p.theme.darkBtnText,
                                      backgroundColor: p.prefs.mode === option.label.toLowerCase() ? themeStore.opacify(p.theme.lightBtnBg, 0.8) : s.lgBtnHover === option.label ? p.theme.darkBtnBgHover : themeStore.opacify(p.theme.darkBtnBg, 0.8),
                                      marginBottom: '10px'
                                    };
                                    return (
                                      <LargeBtn 
                                      key={o}
                                      style={lgBtnStyle}
                                      icon={option.icon} 
                                      label={option.label}
                                      onClick={()=>utilityStore.handleMode(option.label.toLowerCase())}
                                      onMouseEnter={()=>this.setState({lgBtnHover: option.label})}
                                       />
                                    );
                                  })}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  </div> : null}
                </div>
                <div className="sidebar-category">
                  <div className={`category-title ${s.sortBy ? '' : 'category-collapsed'}`} style={{borderBottomColor: p.theme.bodyText, cursor: 'pointer'}} onClick={()=>this.setState({sortBy: !s.sortBy})}>
                    <span>Sort By</span>
                    <ul className="icons-list">
                      <li>
                        <a data-action="collapse" className={s.sortBy ? '' : 'rotate-180'}></a>
                      </li>
                    </ul>
                  </div>

                  {s.sortBy ?
                  <div className="category-content" style={{display: 'block'}}>
                    <form action="#">
                        <div className="form-group">
                          {p.keys.map((key, i)=>{
                            return (
                              <div key={i} className="radio">
                                <label>
                                  <div className="choice">
                                    <span className={p.sort === key ? 'checked' : ''} style={{border: `2px solid ${p.theme.darkBtnText}`}}>
                                      <input 
                                      type="radio" 
                                      name="radio-group" 
                                      className="styled"
                                      onClick={()=>state.set({sort: key, direction: p.direction === 'desc' ? 'asc' : 'desc'})}
                                       />
                                    </span>
                                  </div>
                                  {p.labels[key]}
                                </label>
                              </div>
                            );
                          })}
                        </div>
                    </form>
                  </div> : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    ); 
  }
});