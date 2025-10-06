/*
 * Leaflet.IIIF - Simple IIIF Image API support for Leaflet
 * Simplified version for Galligeo
 */

(function(factory) {
    if (typeof define === 'function' && define.amd) {
        define(['leaflet'], factory);
    } else if (typeof module !== 'undefined') {
        module.exports = factory(require('leaflet'));
    } else {
        factory(window.L);
    }
}(function(L) {
    'use strict';

    L.TileLayer.Iiif = L.TileLayer.extend({
        options: {
            tileFormat: 'jpg',
            tileSize: 256,
            maxZoom: 20,
            minZoom: 0,
            continuousWorld: true,
            noWrap: true,
            attribution: 'Gallica - BnF'
        },

        initialize: function(url, options) {
            this._infoUrl = url;
            
            if (options) {
                L.setOptions(this, options);
            }

            // Charger les informations IIIF
            this._loadInfo();
        },

        _loadInfo: function() {
            var self = this;
            
            fetch(this._infoUrl)
                .then(response => response.json())
                .then(data => {
                    self._iiifInfo = data;
                    self._baseUrl = data['@id'];
                    self._width = data.width;
                    self._height = data.height;
                    self._tileSize = data.tiles ? data.tiles[0].width : 256;
                    
                    // Calculer le niveau de zoom maximum basé sur la taille de l'image
                    var maxSize = Math.max(self._width, self._height);
                    self.options.maxNativeZoom = Math.ceil(Math.log(maxSize / self._tileSize) / Math.log(2));
                    self.options.maxZoom = self.options.maxNativeZoom + 2;
                    
                    // Définir les bounds de l'image
                    var southWest = self._map.unproject([0, self._height], self.options.maxNativeZoom);
                    var northEast = self._map.unproject([self._width, 0], self.options.maxNativeZoom);
                    self._imageBounds = new L.LatLngBounds(southWest, northEast);
                    
                    // Centrer la carte sur l'image
                    if (self._map) {
                        self._map.fitBounds(self._imageBounds);
                    }
                    
                    self.fire('load');
                })
                .catch(error => {
                    console.error('Erreur chargement IIIF info:', error);
                    self.fire('error', {error: error});
                });
        },

        getTileUrl: function(coords) {
            if (!this._iiifInfo) {
                return '';
            }

            var tileSize = this._tileSize;
            var zoom = this._getZoomForUrl();
            
            var scale = Math.pow(2, this.options.maxNativeZoom - zoom);
            var tileBaseSize = tileSize * scale;
            
            var minx = coords.x * tileBaseSize;
            var miny = coords.y * tileBaseSize;
            var maxx = Math.min(minx + tileBaseSize, this._width);
            var maxy = Math.min(miny + tileBaseSize, this._height);
            
            var region = minx + ',' + miny + ',' + (maxx - minx) + ',' + (maxy - miny);
            var size = tileSize + ',';
            
            return this._baseUrl + '/' + region + '/' + size + '/0/default.' + this.options.tileFormat;
        },

        onAdd: function(map) {
            this._map = map;
            
            if (this._iiifInfo && this._imageBounds) {
                map.fitBounds(this._imageBounds);
            }
            
            L.TileLayer.prototype.onAdd.call(this, map);
        }
    });

    L.tileLayer.iiif = function(url, options) {
        return new L.TileLayer.Iiif(url, options);
    };

    return L.TileLayer.Iiif;
}));
