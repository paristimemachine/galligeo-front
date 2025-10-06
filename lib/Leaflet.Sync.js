/*
 * Leaflet.Sync
 * Synchronizes panning and zooming between two maps
 * https://github.com/jieter/Leaflet.Sync
 */

(function (factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD
        define(['leaflet'], factory);
    } else if (typeof module !== 'undefined') {
        // Node/CommonJS
        module.exports = factory(require('leaflet'));
    } else {
        // Browser globals
        if (typeof window.L === 'undefined') {
            throw new Error('Leaflet must be loaded first');
        }
        factory(window.L);
    }
}(function (L) {
    'use strict';

    L.Map = L.Map.extend({
        sync: function (map, options) {
            this._initSync();
            options = L.extend({
                noInitialSync: false,
                syncCursor: false,
                syncCursorMarkerOptions: {
                    radius: 10,
                    fillOpacity: 0.3,
                    color: '#da291c',
                    fillColor: '#fff'
                }
            }, options);

            // prevent double-syncing the map:
            if (this._syncMaps.indexOf(map) === -1) {
                this._syncMaps.push(map);
                this._syncOffsets[L.Util.stamp(map)] = options.offsetFn;
            }

            if (!options.noInitialSync) {
                map.setView(this.getCenter(), this.getZoom(), {animate: false, reset: true});
            }
            return this;
        },

        // unsync maps from each other
        unsync: function (map) {
            var self = this;

            if (this._syncMaps) {
                this._syncMaps.forEach(function (synced, id) {
                    if (map === synced) {
                        delete self._syncOffsets[L.Util.stamp(map)];
                        self._syncMaps.splice(id, 1);
                    }
                });
            }

            return this;
        },

        // Checks if the map is synced with anything
        isSynced: function () {
            return (this.hasOwnProperty('_syncMaps') && Object.keys(this._syncMaps).length > 0);
        },

        // Get synced maps
        _initSync: function () {
            if (!this._syncMaps) {
                this._syncMaps = [];
                this._syncOffsets = {};
                this.on('zoomend', this._onZoom, this);
                this.on('moveend', this._onMove, this);
            }
        },

        _onMove: function (e) {
            if (!this._movingSync) {
                this._syncMaps.forEach(function (toSync) {
                    toSync._movingSync = true;
                    toSync.setView(this.getCenter(), toSync.getZoom(), {animate: false, reset: false});
                    toSync._movingSync = false;
                }, this);
            }
        },

        _onZoom: function (e) {
            if (!this._zoomingSync) {
                this._syncMaps.forEach(function (toSync) {
                    toSync._zoomingSync = true;
                    toSync.setView(this.getCenter(), this.getZoom(), {animate: false, reset: false});
                    toSync._zoomingSync = false;
                }, this);
            }
        }
    });

    return L;
}));
