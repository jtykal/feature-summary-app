var app = null;

Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',
    items:{},
    launch: function() {
        app = this;
        console.log("Hello World!");
        this.addFeatureGrid();
    },

    defectColumn : {  
        text: "Defects", width:100, 
        renderer : function(value, metaData, record, rowIdx, colIdx, store, view) {
            var defects = record.get("Defects");
            if (defects && defects.length > 0) {
                var states = _.countBy(defects, function(d) { 
                    return d.get("State")!= "Closed" ? "Open" : "Closed";
                });
                states.Open = states.Open !== undefined ? states.Open : 0;
//                    states.Open = 0 
                states.length = defects.length;
                var tpl = Ext.create('Ext.Template', "{Open}/{length}", { compiled : true } );
                return tpl.apply(states);
            } else
                return "";
        }
    },

    blockedColumn : {  
        text: "Blocked", width:100, 
        renderer : function(value, metaData, record, rowIdx, colIdx, store, view) {
            var blockedSnapshots = record.get("Blocked");
            return (!_.isUndefined(blockedSnapshots) && blockedSnapshots.length > 0) ? blockedSnapshots.length : "";
        }
    },
    
    addFeatureGrid : function() {
        // var viewport = Ext.create('Ext.Viewport');
        Rally.data.ModelFactory.getModel({
         type: 'PortfolioItem/Feature',
         success: function(userStoryModel) {
             app.add({
                 xtype: 'rallygrid',
                 model: userStoryModel,
                 listeners : {
                    load : function(items) {
                        console.log("load",items.data.items);
                        var features = items.data.items;
                        async.map(features,app.getSnapshots, function(err,results) {
                            _.each( features, function(feature,i){
                                feature.set("Defects",results[i]);
                            })
                            async.map(features,app.getBlockedSnapshots, function(err,results) {
                                _.each( features, function(feature,i){
                                    feature.set("Blocked",results[i]);
                                })
                            });
                        });
                        // console.log("store",this.store);
                        // console.log("columns",this.getColumnCfgs());
                        // var cols = this.getColumnCfgs();
                        // cols.push(app.defectColumn);
                        // cols.push(app.blockedColumn);
                        // this.reconfigureWithColumns(cols);

                    }
                 },
                 columnCfgs: [
                    'FormattedID',
                    'Name',
                    'Owner',
                    app.defectColumn,
                    app.blockedColumn
                 ]
             });
         }
        });
    },
    
    getSnapshots : function(record, callback) {

        var that = this;
        var fetch = ['ObjectID','_UnformattedID','State','Priority','Severity','_ItemHierarchy','_TypeHierarchy'];
        var hydrate = ['_TypeHierarchy','State','Priority','Severity'];
        
        var find = {
                '_TypeHierarchy' : { "$in" : ["Defect"]} ,
                '_ProjectHierarchy' : { "$in": [app.getContext().getProject().ObjectID] },
                '__At' : 'current',
                "_ItemHierarchy" : { "$in" : [record.get("ObjectID")]  }
        };

        var storeConfig = {
            find : find,
            autoLoad : true,
            pageSize:1000,
            limit: 'Infinity',
            fetch: fetch,
            hydrate: hydrate,
            listeners : {
                scope : this,
                load: function(store, snapshots, success) {
                    callback(null,snapshots);
                }
            }
        };

        var snapshotStore = Ext.create('Rally.data.lookback.SnapshotStore', storeConfig);

    },

    getBlockedSnapshots : function(record, callback) {

        var that = this;
        var fetch = ['_TypeHierarchy','FormattedID','ObjectID','_UnformattedID','Name','Owner','Blocked','ScheduleState'];
        var hydrate = ['_TypeHierarchy','ScheduleState'];
        
        var find = {
                '_TypeHierarchy' : { "$in" : ["Defect","HierarchicalRequirement"]},
                '__At' : 'current',
                "_ItemHierarchy" : { "$in" : [record.get("ObjectID")]  },
                'Blocked' : true
        };

        var storeConfig = {
            find : find,
            autoLoad : true,
            pageSize:1000,
            limit: 'Infinity',
            fetch: fetch,
            hydrate: hydrate,
            listeners : {
                scope : this,
                load: function(store, snapshots, success) {
                    callback(null,snapshots);
                }
            }
        };

        var snapshotStore = Ext.create('Rally.data.lookback.SnapshotStore', storeConfig);

    }

    
});
