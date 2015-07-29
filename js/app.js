(function ($) {
    'use strict';

    $.ui = {
        keyCode: {
            ALT: 18,
            BACKSPACE: 8,
            CAPS_LOCK: 20,
            COMMA: 188,
            COMMAND: 91,
            COMMAND_LEFT: 91, // COMMAND
            COMMAND_RIGHT: 93,
            CONTROL: 17,
            DELETE: 46,
            DOWN: 40,
            END: 35,
            ENTER: 13,
            ESCAPE: 27,
            HOME: 36,
            INSERT: 45,
            LEFT: 37,
            MENU: 93, // COMMAND_RIGHT
            NUMPAD_ADD: 107,
            NUMPAD_DECIMAL: 110,
            NUMPAD_DIVIDE: 111,
            NUMPAD_ENTER: 108,
            NUMPAD_MULTIPLY: 106,
            NUMPAD_SUBTRACT: 109,
            PAGE_DOWN: 34,
            PAGE_UP: 33,
            PERIOD: 190,
            RIGHT: 39,
            SHIFT: 16,
            SPACE: 32,
            TAB: 9,
            UP: 38,
            WINDOWS: 91 // COMMAND
        }
    };
    
    $.roomViewApp = {};
    $.roomViewApp.currentOptions = {
        mainSelector: "#root",
        viewSelector: "#root .root-view",
        hasUserInteraction: false,
        srcPath: "src/room2/",
        renderer: "canvas"
    };

    var actionObjects = {
        camera: null, 
        scene: null, 
        renderer: null
    };
    
    var stateObjects = {
        texture_placeholder: null,
        isUserInteracting: false,
        hasUserInteraction: false,
        onPointerDownPointerX: 0, 
        onPointerDownPointerY: 0,
        lon: 90,
        lat: 0,
        onPointerDownLon: 0,
        onPointerDownLat: 0,
        phi: 0,
        theta: 0,
        target: new THREE.Vector3(),
        hDel: 0
    };

    var myMap;
    var roomObjects = [];

    function getActionObjects() {
        return {
            camera: null, 
            scene: null, 
            renderer: null
        };
    }
    
    function getStateObjects() {
        return {
            texture_placeholder: null,
            isUserInteracting: false,
            hasUserInteraction: false,
            onPointerDownPointerX: 0, 
            onPointerDownPointerY: 0,
            lon: 90,
            lat: 0,
            onPointerDownLon: 0,
            onPointerDownLat: 0,
            phi: 0,
            theta: 0,
            target: new THREE.Vector3(),
            hDel: 0
        };
    }

    function onWindowResize() {
        actionObjects.camera.aspect = window.innerWidth / (window.innerHeight - stateObjects.hDel);
        actionObjects.camera.updateProjectionMatrix();

        actionObjects.renderer.setSize( window.innerWidth, (window.innerHeight - stateObjects.hDel) );
        $($.roomViewApp.currentOptions.mainSelector).trigger("mozfullscreenchange");
    }

    function loadTexture( path ) {
        var texture = new THREE.Texture( stateObjects.texture_placeholder );
        var material = new THREE.MeshBasicMaterial( { map: texture, overdraw: 0.5 } );

        var image = new Image();
        image.onload = function () {
            texture.image = this;
            texture.needsUpdate = true;
        };
        image.src = path;

        return material;
    }

    function onDocumentMouseDown( event ) {
        event.preventDefault();

        stateObjects.isUserInteracting = true;

        stateObjects.onPointerDownPointerX = event.clientX;
        stateObjects.onPointerDownPointerY = event.clientY;

        stateObjects.onPointerDownLon = stateObjects.lon;
        stateObjects.onPointerDownLat = stateObjects.lat;
    }

    function onDocumentMouseMove( event ) {
        if ( stateObjects.isUserInteracting === true ) {
            stateObjects.lon = ( stateObjects.onPointerDownPointerX - event.clientX ) * 0.1 + stateObjects.onPointerDownLon;
            stateObjects.lat = ( event.clientY - stateObjects.onPointerDownPointerY ) * 0.1 + stateObjects.onPointerDownLat;
        }
    }

    function onDocumentMouseLeave( event ) {
        stateObjects.isUserInteracting = false;
    }

    function onDocumentMouseUp( event ) {
        stateObjects.isUserInteracting = false;
    }

    function onDocumentMouseWheel( event ) {
        event = event.originalEvent;
        var fovVal = 75;
        // WebKit
        if ( event.wheelDeltaY ) {
            fovVal = actionObjects.camera.fov - event.wheelDeltaY * 0.05;
        // Opera / Explorer 9
        } else if ( event.wheelDelta ) {
            fovVal = actionObjects.camera.fov - event.wheelDelta * 0.05;
        // Firefox
        } else if ( event.detail ) {
            fovVal = actionObjects.camera.fov - event.detail * 0.5;
        }
        
        if (fovVal >= 0 && fovVal <= 100){
            actionObjects.camera.fov = fovVal;
        } else if(fovVal < 0){
            actionObjects.camera.fov = 1;
        } else if(fovVal > 100){
            actionObjects.camera.fov = 99;
        }

        actionObjects.camera.updateProjectionMatrix();
    }

    function onDocumentTouchStart( event ) {
        if ( event.touches.length == 1 ) {
            event.preventDefault();

            stateObjects.onPointerDownPointerX = event.touches[ 0 ].pageX;
            stateObjects.onPointerDownPointerY = event.touches[ 0 ].pageY;

            stateObjects.onPointerDownLon = stateObjects.lon;
            stateObjects.onPointerDownLat = stateObjects.lat;
        }
    }

    function onDocumentTouchMove( event ) {
        if ( event.touches.length == 1 ) {
            event.preventDefault();

            stateObjects.lon = ( stateObjects.onPointerDownPointerX - event.touches[0].pageX ) * 0.1 + stateObjects.onPointerDownLon;
            stateObjects.lat = ( event.touches[0].pageY - stateObjects.onPointerDownPointerY ) * 0.1 + stateObjects.onPointerDownLat;
        }
    }

    function animate() {
        requestAnimationFrame( animate );
        update();
    }

    function update() {
        if (stateObjects.hasUserInteraction === true) {
            stateObjects.lon += 0.1;
        }

        stateObjects.lat = Math.max( - 85, Math.min( 85, stateObjects.lat ) );
        stateObjects.phi = THREE.Math.degToRad( 90 - stateObjects.lat );
        stateObjects.theta = THREE.Math.degToRad( stateObjects.lon );

        stateObjects.target.x = 500 * Math.sin( stateObjects.phi ) * Math.cos( stateObjects.theta );
        stateObjects.target.y = 500 * Math.cos( stateObjects.phi );
        stateObjects.target.z = 500 * Math.sin( stateObjects.phi ) * Math.sin( stateObjects.theta );

        /*if($.roomViewApp.currentOptions.renderer != "webgl"){
            actionObjects.camera.position.copy( stateObjects.target ).negate();
        }*/
        actionObjects.camera.lookAt( stateObjects.target );

        actionObjects.renderer.render( actionObjects.scene, actionObjects.camera );
    }
    
    $.roomViewApp.initView = function(options){
        $.roomViewApp.currentOptions = $.extend($.roomViewApp.currentOptions, options);
        actionObjects = getActionObjects();
        stateObjects = getStateObjects();
        
        
        stateObjects.hasUserInteraction = $.roomViewApp.currentOptions.hasUserInteraction;
        actionObjects.camera = new THREE.PerspectiveCamera(100, window.innerWidth / window.innerHeight, 1, 1100 );
        actionObjects.scene = new THREE.Scene();

        stateObjects.texture_placeholder = document.createElement( 'canvas' );
        stateObjects.texture_placeholder.width = 128;
        stateObjects.texture_placeholder.height = 128;

        var context = stateObjects.texture_placeholder.getContext( '2d' );
        context.fillStyle = 'rgb( 200, 200, 200 )';
        context.fillRect( 0, 0, stateObjects.texture_placeholder.width, stateObjects.texture_placeholder.height );

        var materials = [
            loadTexture( $.roomViewApp.currentOptions.srcPath + "px.jpg" ), // right
            loadTexture( $.roomViewApp.currentOptions.srcPath + "nx.jpg" ), // left
            loadTexture( $.roomViewApp.currentOptions.srcPath + "py.jpg" ), // top
            loadTexture( $.roomViewApp.currentOptions.srcPath + "ny.jpg" ), // bottom
            loadTexture( $.roomViewApp.currentOptions.srcPath + "pz.jpg" ), // back
            loadTexture( $.roomViewApp.currentOptions.srcPath + "nz.jpg" ) // front
        ];

        var mesh = new THREE.Mesh( new THREE.BoxGeometry( 300, 300, 300, 7, 7, 7 ), new THREE.MeshFaceMaterial( materials ) );
        mesh.scale.x = - 1;
        actionObjects.scene.add( mesh );

        for ( var i = 0, l = mesh.geometry.vertices.length; i < l; i ++ ) {
            var vertex = mesh.geometry.vertices[ i ];
            vertex.normalize();
            vertex.multiplyScalar( 550 );
        }

        actionObjects.renderer = new THREE.CanvasRenderer();
        actionObjects.renderer.setPixelRatio( window.devicePixelRatio );
        actionObjects.renderer.setSize( window.innerWidth, window.innerHeight );

        var $viewContainer = $($.roomViewApp.currentOptions.viewSelector);
        $viewContainer.children().detach();
        $viewContainer.append(actionObjects.renderer.domElement);

        $viewContainer.bind( 'mousedown', onDocumentMouseDown );
        $viewContainer.bind( 'mousemove', onDocumentMouseMove );
        $viewContainer.bind( 'mouseleave', onDocumentMouseLeave );
        $viewContainer.bind( 'mouseup', onDocumentMouseUp );
        $viewContainer.bind( 'mousewheel', onDocumentMouseWheel );
        $viewContainer.bind( 'DOMMouseScroll', onDocumentMouseWheel );
        $viewContainer.bind( 'touchstart', onDocumentTouchStart );
        $viewContainer.bind( 'touchmove', onDocumentTouchMove );
        window.addEventListener( 'resize', onWindowResize, false );
        
        animate();
    };

    $.roomViewApp.initGlView = function(options){
        $.roomViewApp.currentOptions = $.extend($.roomViewApp.currentOptions, options);
        actionObjects = getActionObjects();
        stateObjects = getStateObjects();

        stateObjects.lon = 0;

        stateObjects.hasUserInteraction = $.roomViewApp.currentOptions.hasUserInteraction;
        actionObjects.camera = new THREE.PerspectiveCamera(100, window.innerWidth / window.innerHeight, 1, 1100 );
        stateObjects.target = new THREE.Vector3( 0, 0, 0 );
        actionObjects.camera.target = stateObjects.target;
        actionObjects.scene = new THREE.Scene();

        var geometry = new THREE.SphereGeometry( 500, 60, 40 );
        geometry.applyMatrix( new THREE.Matrix4().makeScale( -1, 1, 1 ) );

        var material = new THREE.MeshBasicMaterial({
            map: THREE.ImageUtils.loadTexture( $.roomViewApp.currentOptions.srcPath + "room.jpg" )
        });

        var mesh = new THREE.Mesh( geometry, material );
        actionObjects.scene.add( mesh );

        actionObjects.renderer = new THREE.WebGLRenderer();
        actionObjects.renderer.setPixelRatio( window.devicePixelRatio );
        actionObjects.renderer.setSize( window.innerWidth, window.innerHeight );

        var $viewContainer = $($.roomViewApp.currentOptions.viewSelector);
        $viewContainer.children().detach();
        $viewContainer.append(actionObjects.renderer.domElement);

        $viewContainer.bind( 'mousedown', onDocumentMouseDown );
        $viewContainer.bind( 'mousemove', onDocumentMouseMove );
        $viewContainer.bind( 'mouseleave', onDocumentMouseLeave );
        $viewContainer.bind( 'mouseup', onDocumentMouseUp );
        $viewContainer.bind( 'mousewheel', onDocumentMouseWheel );
        $viewContainer.bind( 'DOMMouseScroll', onDocumentMouseWheel );
        $viewContainer.bind( 'touchstart', onDocumentTouchStart );
        $viewContainer.bind( 'touchmove', onDocumentTouchMove );
        window.addEventListener( 'resize', onWindowResize, false );

        animate();
    };

    function launchFullScreen(element) {
        if(element.requestFullScreen) {
            element.requestFullScreen();
        } else if(element.mozRequestFullScreen) {
            element.mozRequestFullScreen();
            document.mozFullscreenElement = element;
        } else if(element.webkitRequestFullScreen) {
            element.webkitRequestFullScreen();
        }
    }

    function cancelFullScreen() {
        if(document.cancelFullScreen) {
            document.cancelFullScreen();
        } else if(document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
            document.mozFullscreenElement = undefined;
        } else if(document.webkitCancelFullScreen) {
            document.webkitCancelFullScreen();
        }
    }

    function onFullScreenChange ( e ) {
        if(!window.fullScreen){
            document.mozFullscreenElement = undefined;
        }

        var fullscreenElement =
            document.fullscreenElement ||
            document.mozFullscreenElement ||
            document.webkitFullscreenElement;

        var fullscreenEnabled =
            document.fullscreenEnabled ||
            document.mozFullscreenEnabled ||
            document.webkitFullscreenEnabled;

        var btn = $(".view-tools .btn-full-size", $($.roomViewApp.currentOptions.mainSelector));

        if(fullscreenElement){
            btn.removeClass("glyphicon-resize-full");
            btn.addClass("glyphicon-resize-small");

        } else{
            btn.addClass("glyphicon-resize-full");
            btn.removeClass("glyphicon-resize-small");
        }
    }

    function onFullScreenClick ( e ) {
        var btn = $(e.target);

        if (btn.hasClass("glyphicon-resize-full")){
            launchFullScreen($($.roomViewApp.currentOptions.mainSelector)[0]);
        } else {
            cancelFullScreen($($.roomViewApp.currentOptions.mainSelector)[0]);
        }

        btn.toggleClass("glyphicon-resize-full");
        btn.toggleClass("glyphicon-resize-small");
    }

    function zoomUp(){
        return setInterval( function(){
            var fovVal = 75;
            fovVal = actionObjects.camera.fov - 1;

            if (fovVal >= 1 && fovVal <= 99){
                actionObjects.camera.fov = fovVal;
            } else if(fovVal < 1){
                actionObjects.camera.fov = 1;
            } else if(fovVal > 99){
                actionObjects.camera.fov = 99;
            }

            actionObjects.camera.updateProjectionMatrix();
        } , 50);
    }

    function zoomDown(){
        return setInterval( function(){
            var fovVal = 75;
            fovVal = actionObjects.camera.fov + 1;

            if (fovVal >= 1 && fovVal <= 99){
                actionObjects.camera.fov = fovVal;
            } else if(fovVal < 1){
                actionObjects.camera.fov = 1;
            } else if(fovVal > 99){
                actionObjects.camera.fov = 99;
            }

            actionObjects.camera.updateProjectionMatrix();
        } , 50);
    }

    function moveLeft(){
        return setInterval( function(){
            stateObjects.lon -= 1;
        } , 25);
    }

    function moveRight(){
        return setInterval( function(){
            stateObjects.lon += 1;
        } , 25);
    }

    function moveUp(){
        return setInterval( function(){
            stateObjects.lat += 1;
        } , 25);
    }

    function moveDown(){
        return setInterval( function(){
            stateObjects.lat -= 1;
        } , 25);
    }

    var toolsActions ={
        zoomUp: null,
        zoomDown: null,
        moveLeft: null,
        moveUp: null,
        moveDown: null,
        moveRight: null
    };

    $.roomViewApp.loadRoom = function(room){
        var $mainContainer = $($.roomViewApp.currentOptions.mainSelector);

        if($.roomViewApp.currentOptions.renderer == "canvas"){
            $.roomViewApp.initView({ srcPath: room })
        }

        if($.roomViewApp.currentOptions.renderer == "webgl"){
            $.roomViewApp.initGlView({ srcPath: room })
        }

        $(".view-rooms .preview-item", $mainContainer).each(function(ind, el){
            $(el).removeClass("preview-selected");
        });
        $('.view-rooms .preview-item[data-panorama-path="' + room + '"]', $mainContainer).addClass("preview-selected");
    };

    $.roomViewApp.initTools = function(options){
        options = $.extend({}, options);
        var $mainContainer = $($.roomViewApp.currentOptions.mainSelector);
        
        $(".view-rooms .preview-item", $mainContainer).click(function(e){
            var path = $(e.target).attr("data-panorama-path");
            if(!path){
                path = $(e.target).closest(".preview-item").attr("data-panorama-path");
            }

            $.roomViewApp.loadRoom(path);
            $.each(roomObjects, function(ind, el){
                if(el.path == path){
                    el.mapMarker.options.set("preset", "islands#redIcon");
                } else {
                    el.mapMarker.options.set("preset", "islands#blueIcon");
                }
            });
        });

        $(".view-tools .btn-full-size", $mainContainer).click( onFullScreenClick );

        $(".view-tools .btn-zoom-up", $mainContainer).bind( "mousedown", function(e){
            toolsActions.zoomUp = zoomUp();
        });
        $(".view-tools .btn-zoom-up", $mainContainer).bind( "mouseleave mouseup", function(e){
            if(toolsActions.zoomUp){
                clearInterval(toolsActions.zoomUp);
                toolsActions.zoomUp = null;
            }
        });

        $(".view-tools .btn-zoom-down", $mainContainer).bind( "mousedown", function(e){
            toolsActions.zoomDown = zoomDown();
        });
        $(".view-tools .btn-zoom-down", $mainContainer).bind( "mouseleave mouseup", function(e){
            if(toolsActions.zoomDown){
                clearInterval(toolsActions.zoomDown);
                toolsActions.zoomDown = null;
            }
        });

        $(".view-tools .btn-move-left", $mainContainer).bind( "mousedown", function(e){
            toolsActions.moveLeft = moveLeft();
        });
        $(".view-tools .btn-move-left", $mainContainer).bind( "mouseleave mouseup", function(e){
            if(toolsActions.moveLeft){
                clearInterval(toolsActions.moveLeft);
                toolsActions.moveLeft = null;
            }
        });

        $(".view-tools .btn-move-right", $mainContainer).bind( "mousedown", function(e){
            toolsActions.moveRight = moveRight();
        });
        $(".view-tools .btn-move-right", $mainContainer).bind( "mouseleave mouseup", function(e){
            if(toolsActions.moveRight){
                clearInterval(toolsActions.moveRight);
                toolsActions.moveRight = null;
            }
        });

        $(".view-tools .btn-move-up", $mainContainer).bind( "mousedown", function(e){
            toolsActions.moveUp = moveUp();
        });
        $(".view-tools .btn-move-up", $mainContainer).bind( "mouseleave mouseup", function(e){
            if(toolsActions.moveUp){
                clearInterval(toolsActions.moveUp);
                toolsActions.moveUp = null;
            }
        });

        $(".view-tools .btn-move-down", $mainContainer).bind( "mousedown", function(e){
            toolsActions.moveDown = moveDown();
        });
        $(".view-tools .btn-move-down", $mainContainer).bind( "mouseleave mouseup", function(e){
            if(toolsActions.moveDown){
                clearInterval(toolsActions.moveDown);
                toolsActions.moveDown = null;
            }
        });

        $(document).bind( "keydown", function(e){
            switch (e.which){
                case $.ui.keyCode.UP:
                    if (toolsActions.moveUp == null)
                        toolsActions.moveUp = moveUp();
                    break;
                case $.ui.keyCode.DOWN:
                    if (toolsActions.moveDown == null)
                        toolsActions.moveDown = moveDown();
                    break;
                case $.ui.keyCode.LEFT:
                    if (toolsActions.moveLeft == null)
                        toolsActions.moveLeft = moveLeft();
                    break;
                case $.ui.keyCode.RIGHT:
                    if (toolsActions.moveRight == null)
                        toolsActions.moveRight = moveRight();
                    break;
            }
        });

        $(document).bind( "keyup", function(e){
            switch (e.which){
                case $.ui.keyCode.UP:
                    if(toolsActions.moveUp){
                        clearInterval(toolsActions.moveUp);
                        toolsActions.moveUp = null;
                    }
                    break;
                case $.ui.keyCode.DOWN:
                    if(toolsActions.moveDown){
                        clearInterval(toolsActions.moveDown);
                        toolsActions.moveDown = null;
                    }
                    break;
                case $.ui.keyCode.LEFT:
                    if(toolsActions.moveLeft){
                        clearInterval(toolsActions.moveLeft);
                        toolsActions.moveLeft = null;
                    }
                    break;
                case $.ui.keyCode.RIGHT:
                    if(toolsActions.moveRight){
                        clearInterval(toolsActions.moveRight);
                        toolsActions.moveRight = null;
                    }
                    break;
            }
        });

        $mainContainer.bind("fullscreenchange webkitfullscreenchange mozfullscreenchange msfullscreenchange", onFullScreenChange );
    };

    $.roomViewApp.initMap = function(options){
        options = $.extend({}, options);

        var $mainContainer = $($.roomViewApp.currentOptions.mainSelector);
        var $mapContainer = $(".view-map", $mainContainer);
        $mapContainer.children().detach();
        myMap = null;
        roomObjects = new Array();

        $(".view-rooms .preview-item", $mainContainer).each(function(ind, el){
            roomObjects.push({
                coord: [$(el).attr("data-latitude"), $(el).attr("data-longitude")],
                selected: $(el).hasClass("preview-selected"),
                path: $(el).attr("data-panorama-path")
            })
        });

        ymaps.ready(function(){
            myMap = new ymaps.Map($mapContainer[0], {
                center: [51.71352223, 39.19439021],
                zoom: 16,
                controls: ['zoomControl',  'fullscreenControl']
            });

            var myCollection = new ymaps.GeoObjectCollection();

            for (var i = 0; i < roomObjects.length; i++) {
                var icon = roomObjects[i].selected ? 'islands#redIcon' : 'islands#blueIcon';

                var newItem = new ymaps.Placemark(roomObjects[i].coord, {}, {
                    preset: icon
                });
                newItem.roomObjectsIndex = i;

                newItem.events.add('click', function(e) {
                    var item = e.get('target');
                    var path = roomObjects[item.roomObjectsIndex].path;
                    $.roomViewApp.loadRoom(path);
                    $.each(roomObjects, function(ind, el){
                        if(el.path == path){
                            el.mapMarker.options.set("preset", "islands#redIcon");
                        } else {
                            el.mapMarker.options.set("preset", "islands#blueIcon");
                        }
                    });
                });

                roomObjects[i].mapMarker = newItem;
                myCollection.add(newItem);
            }

            myMap.geoObjects.add(myCollection);
        });
    };

    $.roomViewApp.init = function(options){
        if(options.renderer == "canvas"){
            $.roomViewApp.initView(options);
        }

        if(options.renderer == "webgl"){
            $.roomViewApp.initGlView(options);
        }

        $.roomViewApp.initTools({});
        $.roomViewApp.initMap({});
    };
    
})(jQuery);