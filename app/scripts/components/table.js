import React from 'react';
import _ from 'lodash';
import v from 'vquery';
import mouseTrap from 'mousetrap';
import {alertStore, faviconStore, reRenderStore} from './stores/main';
import tabStore from './stores/tab';

export var Table = React.createClass({
  getInitialState(){
    return {
      columns: null,
      rows: null,
      order: 'index',
      direction: 'asc',
      rowHover: -1,
      muteInit: true,
      selectedItems: [],
      shiftRange: null
    };
  },
  componentDidMount(){
    var p = this.props;
    this.buildTable(p);
    mouseTrap.bind('del', ()=>{
      this.removeSelectedItems();
    });
  },
  componentWillReceiveProps(nP){
    if (!_.eq(nP.data, this.props.data) || !_.isEqual(nP.data, this.props.data)) {
      this.buildTable(nP);
    }
    if (nP.stores.sort !== this.props.stores.sort) {
      this.setState({order: nP.stores.sort, direction:  nP.direction});
    }
  },
  buildTable(p){
    var s = this.state;
    var rows = [];

    for (var i = 0; i < p.data.length; i++) {
      var row = p.data[i];
      var urlMatch = row.url.match(/^(?:https?:\/\/)?(?:[^@\n]+@)?(?:www\.)?([^:\/\n]+)/im);
      row.domain = urlMatch ? urlMatch[1] : false;
      rows.push(row);
    }
    var columns = ['title', 'domain'];
    if (p.stores.prefs.mode === 'tabs' || p.stores.prefs.mode === 'sessions' || p.stores.prefs.mode === 'history') {
      columns = columns.concat(['pinned', 'mutedInfo']);
    } else if (p.stores.prefs.mode === 'apps' || p.stores.prefs.mode === 'extensions') {
      columns[0] = 'name';
      if (p.stores.prefs.mode === 'apps') {
        columns = columns.concat(['launchType']);
      } else {
        _.pullAt(columns, 1);
      }
      columns = columns.concat(['enabled', 'offlineEnabled', 'version']);
    }
    _.assignIn(s, {columns: columns, rows: _.orderBy(rows, [s.order], [s.direction])});
    console.log('buildTable: ', s);
  },
  handleColumnClick(column){
    var s = this.state;
    var order = column;
    var direction = s.order === column && s.direction === 'asc' ? 'desc' : 'asc'
    this.setState({
      order: order,
      direction: direction,
      rows: _.orderBy(s.rows, [order], [direction])
    });
  },
  handleTitleClick(row){
    var p = this.props;
    
    if (p.stores.prefs.mode === 'tabs') {
      chrome.tabs.update(row.id, {active: true});
    } else if (p.stores.prefs.mode === 'apps' || p.stores.prefs.mode === 'extensions') {
      if (row.enabled) {
        if (p.stores.prefs.mode === 'extensions' || row.launchType === 'OPEN_AS_REGULAR_TAB') {
          if (row.url.length > 0) {
            tabStore.create(row.url);
          } else {
            tabStore.create(row.homepageUrl);
          }
        } else {
          chrome.management.launchApp(row.id);
        }
      }
    } else {
      if (typeof row.openTab !== 'undefined' && row.openTab) {
        chrome.tabs.update(row.id, {active: true});
      } else {
        chrome.tabs.create({url: row.url});
      }
    }
  },
  handleBooleanClick(column, row){
    var p = this.props;
    var s = this.state;
    if (column === 'pinned') {
      chrome.tabs.update(row.id, {pinned: !row.pinned});
      if (p.stores.prefs.mode !== 'tabs') {
        reRenderStore.set_reRender(true, 'create', null);
      }
    } else if (column === 'mutedInfo') {
      chrome.tabs.update(row.id, {muted: !row.mutedInfo.muted}, ()=>{
        if (s.muteInit) {
          var refRow = _.findIndex(s.rows, {id: row.id});
          s.rows[refRow].mutedInfo.muted = !row.mutedInfo.muted;
          this.setState({rows: s.rows, muteInit: false});
        }
      });
      if (p.stores.prefs.mode !== 'tabs') {
        reRenderStore.set_reRender(true, 'create', null);
      }
    } else if (column === 'enabled') {
      chrome.management.setEnabled(row.id, !row.enabled, ()=>{
        reRenderStore.set_reRender(true, 'update', null);
      });
    }
  },
  dragStart: function(e, i) {
    this.dragged = {el: e.currentTarget, i: i};
    e.dataTransfer.effectAllowed = 'move';
    this.placeholder = v(this.dragged.el).clone().n;
    v(this.placeholder).allChildren().removeAttr('data-reactid');
    this.placeholder.removeAttribute('id');
    this.placeholder.classList.add('tileClone');
  },
  dragEnd: function(e) {
    var s = this.state;
    var start = this.dragged.i;
    var end = this.over.i;
    if (start < end) {
      end--;
    }
    if (this.nodePlacement === 'after') {
      end++;
    }
    console.log(s.rows[start].index, s.rows[end].index)
    if (s.rows[start].pinned !== s.rows[end -1].pinned) {
      s.rows[end - 1].index = _.chain(s.rows).filter({pinned: true}).last().value().index;
    }
    chrome.tabs.move(s.rows[start].id, {index: s.rows[end - 1].index}, (t)=>{
      console.log('MOVE: ', t)
      
      reRenderStore.set_reRender(true, 'cycle', s.rows[end - 1].id);
      _.defer(()=>this.dragged.el.parentNode.removeChild(this.placeholder));
    });
  },
  dragOver: function(e, i) {
    e.preventDefault();
    var s = this.state;
    this.dragged.el.style.display = 'none';
    if (e.target === this.placeholder) {
      return;
    }
    this.over = {el: e.target, i: i};
    console.log(s.rows[i].title);
    var relY = e.clientY - this.over.el.offsetTop;
    var height = this.over.el.offsetHeight / 2;
    var parent = e.target.parentNode;

    if (relY > height) {
      this.nodePlacement = 'after';
      try {
        parent.parentNode.insertBefore(this.placeholder, e.target.nextElementSibling.parentNode);
      } catch (e) {}
    } else if (relY < height) {
        this.nodePlacement = 'before';
        parent.parentNode.insertBefore(this.placeholder, e.target.parentNode);
      }
    
  },
  handleSelect(i){

    var s = this.state;
    var p = this.props;
    console.log('p.stores.cursor', p.stores.cursor);
    if (p.stores.cursor.keys.ctrl) {
      if (s.selectedItems.indexOf(i) !== -1) {
        _.pull(s.selectedItems, i);
      } else {
        if (s.selectedItems.length === 0) {
          s.shiftRange = i;
          alertStore.set({
            text: `Press the delete key to remove selected ${p.stores.prefs.mode}.`,
            tag: 'alert-success',
            open: true
          });
        }
        s.selectedItems.push(i);
      }
    } else if (p.stores.cursor.keys.shift) {
      if (!s.shiftRange) {
        s.selectedItems.push(i);
        this.setState({shiftRange: i});
        return;
      } else {
        var rows = _.clone(s.rows);
        if (i < s.shiftRange) {
          var i_cache = i;
          i = s.shiftRange;
          s.shiftRange = i_cache;
        }
        var range = _.slice(rows, s.shiftRange, i);
        for (var z = range.length - 1; z >= 0; z--) {
          var refRow = _.findIndex(s.rows, {id: range[z].id});
          if (s.selectedItems.indexOf(refRow) !== -1 && refRow !== s.shiftRange && refRow !== i) {
            _.pull(s.selectedItems, refRow);
          } else {
            s.selectedItems.push(refRow);
          }
        }

      }
      //this.setState({shiftRange: s.shiftRange});
    } else {
      s.selectedItems = [];
      s.shiftRange = null;
    }
    this.setState({selectedItems: s.selectedItems, shiftRange: s.shiftRange});
  },
  removeSelectedItems(){
    var s = this.state;
    for (var i = s.selectedItems.length - 1; i >= 0; i--) {
      chrome.tabs.remove(s.rows[s.selectedItems[i]].id);
      _.pullAt(s.rows, s.selectedItems[i]);
    }
    this.setState({rows: s.rows, selectedItems: [], shiftRange: null});
  },
  render(){
    var s = this.state;
    var p = this.props;
    var textOverflow = {
      whiteSpace: 'nowrap',
      width: `${p.width <= 1186 ? p.width / 3 : p.width <= 1015 ? p.width / 6 : p.width / 2}px`,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      display: 'inline-block'
    };
    if (s.columns && s.rows) {
      return (
        <div className="datatable-scroll">
          <table className="table datatable-responsive dataTable no-footer dtr-inline" id="DataTables_Table_0">
            <thead>
              <tr role="row">
                {s.columns.map((column, i)=>{
                  var columnLabel = p.stores.prefs.mode === 'apps' && column === 'domain' ? 'webWrapper' : column === 'mutedInfo' ? 'muted' : column;
                  return (
                    <th key={i} className={`sorting${s.order === column ? '_'+s.direction : ''}`} rowSpan="1" colSpan="1" onClick={()=>this.handleColumnClick(column)}>{_.upperFirst(columnLabel.replace(/([A-Z])/g, ' $1'))}</th>
                  );
                })}
              </tr>
            </thead>
            <tbody onMouseLeave={()=>this.setState({rowHover: -1})}>
            {s.rows.map((row, i)=>{
              if (p.stores.prefs.mode !== 'apps' && p.stores.prefs.mode !== 'extensions' && !_.find(p.favicons, {domain: row.domain})) {
                faviconStore.set_favicon(row, s.rows.length, i);
              }
              return (
                <tr 
                key={i} 
                className={i % 2 === 0 ? 'even' : 'odd'} 
                style={{fontSize: '14px', backgroundColor: s.rowHover === i || s.selectedItems.indexOf(i) !== -1 ? p.theme.settingsBg : 'initial'}} 
                onMouseEnter={()=>this.setState({rowHover: i})}
                draggable="true"
                onDragEnd={this.dragEnd}
                onDragStart={(e)=>this.dragStart(e, i)}
                onDragOver={(e)=>this.dragOver(e, i)}
                onClick={()=>this.handleSelect(i)}
                >
                  {s.columns.map((column, z)=>{
                    if (row.hasOwnProperty(column)) {
                      if (column === 'title' || column === 'name') {
                        var fvData = _.result(_.find(p.stores.favicons, { domain: row.domain }), 'favIconUrl');
                        return (
                          <td key={z} style={{maxWidth: p.width <= 950 ? '300px' : p.width <= 1015 ? '400px' : '700px'}}>
                            <div className="media-left media-middle">
                              <img src={fvData ? fvData : row.favIconUrl && row.domain !== 'chrome' ? row.favIconUrl : '../images/file_paper_blank_document.png' } style={{width: '16px', height: '16px'}}/>
                            </div>
                            <div className="media-left">
                              <div style={textOverflow}><a style={{cursor: 'pointer'}} onClick={()=>this.handleTitleClick(row)} className="text-default text-semibold">{row[column]}</a></div>
                              {p.stores.prefs.mode === 'apps' || p.stores.prefs.mode === 'extensions' ? <div className="text-muted text-size-small" style={{whiteSpace: 'nowrap'}}>{row.description}</div> : null}
                            </div>
                            {row.audible ?
                            <div className="media-right media-middle" style={{right: '20px'}}>
                              <i className="icon-volume-medium"/>
                            </div> : null}
                          </td>
                        );

                      } else if (p.stores.prefs.mode === 'apps' && column === 'domain') {
                        return <td key={z}><i className={`icon-${_.isString(row[column]) ? 'check2' : 'cross'}`} /></td>;
                      } else if (_.isBoolean(row[column]) || column === 'mutedInfo') {
                        var bool = column === 'mutedInfo' ? row[column].muted : row[column];
                        var toggleBool = ['pinned', 'enabled', 'mutedInfo'];
                        return <td key={z}><i className={`icon-${bool ? 'check2' : 'cross'}`} style={{cursor: toggleBool.indexOf(column) !== -1 ? 'pointer' : 'initial'}} onClick={toggleBool.indexOf(column) !== -1 ? ()=>this.handleBooleanClick(column, row) : null} /></td>;
                      } else if (column === 'launchType') {
                        return <td key={z}>{row[column].indexOf('TAB') !== -1 ? 'Tab' : 'Window'}</td>;
                      } else {
                        return <td key={z} >{column === 'mutedInfo' ? row[column].muted : row[column]}</td>;
                      }
                    }
                  })}
                </tr>
              );
            })}
            </tbody>
          </table>
        </div>
      );
    } else {
      return null;
    }
  }
});