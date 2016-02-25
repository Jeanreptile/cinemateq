var CINEGRAPH = (function (self) {

    var defaultImg;
    var gradients;
    const nodeOpacity = 0.6;
    const borderFraction = 24;
    const PI2 = 2 * Math.PI;

    self.initTexture = function(){
        defaultImg = new Image();
        defaultImg.src = 'images/default_bg2.jpg';
        gradients = [];
    }

    self.getDefaultImage = function(){
        return defaultImg;
    };

    self.getNodeOpacity = function() {
        return nodeOpacity;
    };

    function generateGradientSprite(color) {
        if (gradients[color] == undefined) {
            var c = new THREE.Color(color);
            var gradientCanv = document.createElement('canvas');
            gradientCanv.width = 256;
            gradientCanv.height = 256;
            var hw = gradientCanv.width / 2;
            var gradientCtx = gradientCanv.getContext('2d');
            // outer circle mask
            gradientCtx.beginPath();
            gradientCtx.arc(hw, hw, hw, 0, PI2);
            gradientCtx.clip();
            gradientCtx.fillStyle = "rgba("+c.r*255+","+c.g*255+","+c.b*255+",0)";
            gradientCtx.fill();
            // gradient
            gradientCtx.shadowOffsetX = 1000;
            gradientCtx.shadowOffsetY = 1000;
            gradientCtx.shadowBlur = hw / 2.5;
            gradientCtx.fillStyle = color;
            gradientCtx.shadowColor = color;
            gradientCtx.beginPath();
            gradientCtx.arc(
                hw * 2 - gradientCtx.shadowOffsetX,
                hw - gradientCtx.shadowOffsetY,
                hw - gradientCtx.shadowBlur * 1.2,
                0, PI2, true
            );
            gradientCtx.fill();
            gradients[color] = gradientCanv;
        }
        // generating sprite
        var texture = new THREE.Texture(gradients[color]);
        var material = new THREE.SpriteMaterial({ map: texture, transparent: true });
        var sprite = new THREE.Sprite(material);
        //texture.minFilter = THREE.LinearFilter;
        texture.needsUpdate = true;
        return sprite;
    }

    self.updateGradientLayer = function() {
        for (var i = 0; i < self.scene.children.length; i++){
            var sprite = self.scene.children[i];
            // calculating circle radius
            var circleRadius = self.getSpriteRadius(sprite.position, sprite.scale.x);
            if (circleRadius <= 2)
                continue;
            // if node is out the screen, skip
            var pos = self.toScreenPosition(sprite.position);
            if (pos.x + circleRadius < 0 || pos.x - circleRadius > self.viewWidth
                || pos.y + circleRadius < 0 || pos.y - circleRadius > self.viewHeight)
                continue;
            // tagging gradient sprites as unused to remove them later if necessary
            for (var k = 0; k < sprite.children.length; k++)
                sprite.children[k].gradientIsActive = false;
            // getting lines related to node
            for (var j = self.linesScene.children.length - 1; j >= 0; j--){
                var line = self.linesScene.children[j];
                if (line.type != "Line")
                    continue;
                var startIndex;
                if (line.endNodeId == sprite._id)
                    startIndex = 0;
                else if (line.startNodeId == sprite._id)
                    startIndex = 1;
                else
                    continue;
                var endIndex = startIndex == 0 ? 1 : 0;
                // if line is to small to be seen anyway, skip
                if (line.geometry.vertices[startIndex].distanceToSquared(line.geometry.vertices[endIndex]) <= 16)
                    continue;
                // if line and node have same color, skip
                var c = '#' + line.geometry.colors[startIndex].getHexString();
                if (c === sprite.node._color)
                    continue;
                // adding gradient sprites and updating existing ones
                var startPos = self.toScreenPosition(line.geometry.vertices[startIndex]);
                var endPos = self.toScreenPosition(line.geometry.vertices[endIndex]);
                var lineId = line.startNodeId + "," + line.endNodeId;
                var found = false;
                for (var k = 0; k < sprite.children.length; k++){
                    var gradientSprite = sprite.children[k];
                    if (gradientSprite.lineId == lineId) {
                        found = true;
                        var diff = endPos.sub(startPos), angle = new THREE.Vector3(1,0,0).angleTo(diff);
                        gradientSprite.material.rotation = diff.y > 0 ? -angle : angle;
                        gradientSprite.gradientIsActive = true;
                        break;
                    }
                }
                if (!found) {
                    var gradientSprite = generateGradientSprite(c);
                    gradientSprite.lineId = lineId;
                    sprite.add(gradientSprite);
                    gradientSprite.gradientIsActive = true;
                }
            }
            // removing gradient sprite when not needed anymore
            for (var k = 0; k < sprite.children.length; k++){
                var gradientSprite = sprite.children[k];
                if (gradientSprite.gradientRemoveDisable != true && gradientSprite.gradientIsActive != true) {
                    gradientSprite.geometry.dispose();
                    gradientSprite.material.dispose();
                    sprite.remove(gradientSprite);
                }
            }
        }
    };



    self.generateSpriteBackground = function(sprite) {
        var canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        var context = canvas.getContext('2d');
        context.beginPath();
        var halfWidth = canvas.width / 2;
        context.arc(halfWidth, halfWidth, halfWidth, 0, PI2);
        context.clip();
        context.fillStyle = sprite.node._color;
        context.fillRect(0, 0, canvas.width, canvas.height);
        var texture = new THREE.Texture(canvas);
        var material = new THREE.SpriteMaterial({ map: texture });
        var sprite = new THREE.Sprite(material);
        sprite.gradientRemoveDisable = true;
        //texture.minFilter = THREE.LinearFilter;
        texture.needsUpdate = true;
        return sprite;
    };

    self.generateTexture = function(job, img, text) {
        var canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        self.updateTexture(job, img, canvas, text, nodeOpacity);
        return canvas;
    };

    self.updateTexture = function(job, img, canvas, text, opacity) {
        var opacity = opacity !== undefined ? opacity : nodeOpacity;
        var borderThickness = canvas.width / borderFraction;
        var halfWidth = canvas.width / 2;
        var halfHeight = canvas.height / 2;
        var context = canvas.getContext('2d');
        // clipping to circle
        context.beginPath();
        context.arc(halfWidth, halfHeight, halfWidth - borderThickness, 0, PI2);
        context.clip();
        // black background for opacity
        context.fillStyle = '#000000';
        context.fillRect(0, 0, canvas.width, canvas.height);
        // drawing image
        context.globalAlpha = opacity;
        drawImageProp(context, img, borderThickness, borderThickness,
            canvas.width - 2 * borderThickness, canvas.height - 2 * borderThickness);
        // drawing text
        context.fillStyle = "#ffffff";
        context.font = "bold " + (canvas.width / 9) + "px Arial";
        context.textAlign = "center";
        context.globalAlpha = (1 / (nodeOpacity - 1)) * (opacity - 1);
        wrapText(context, text.toUpperCase(), halfWidth, canvas.height / 2.5,
            canvas.width -  5 * borderThickness, canvas.height / 6);
        context.globalAlpha = 1;
    };

    function wrapText(context, text, x, y, maxWidth, lineHeight) {
        if (text.indexOf(' ') == -1) {
            context.fillText(text, x, y, maxWidth);
            return;
        }
        var words = text.split(' ');
        var line = '';
        var lineCount = 0;
        for (var n = 0; n < words.length; n++) {
            var testLine = line + words[n] + ' ';
            var metrics = context.measureText(testLine);
            var testWidth = metrics.width;
            if (testWidth > maxWidth && n > 0) {
                lineCount++;
                if (lineCount == 3){
                    context.fillText(line.slice(0, -1) + "...", x, y, maxWidth);
                    return;
                }
                context.fillText(line, x, y, maxWidth);
                line = words[n] + ' ';
                y += lineHeight;
            }
            else
                line = testLine;
        }
        context.fillText(line, x, y, maxWidth);
    }

    var filterButtonSprites = [];

    self.generateFilterButtonSprite = function(job) {
        if (filterButtonSprites[job] == undefined){
            var canvas = document.createElement('canvas');
            canvas.width = 256;
            canvas.height = 256;
            var borderThickness = canvas.width / borderFraction;
            var halfWidth = canvas.width / 2;
            var halfHeight = canvas.height / 2;
            var context = canvas.getContext('2d');
            // clipping to circle
            context.beginPath();
            context.arc(halfWidth, halfHeight, halfWidth, 0, PI2);
            context.clip();
            // background color
            context.fillStyle = '#222222';
            context.fillRect(0, 0, canvas.width, canvas.height);
            // drawing text
            context.fillStyle = self.colors[self.scope.jobsRelationships[job]];
            context.font = "bold 100px Arial";
            context.textAlign = "center";
            context.textBaseline = 'middle';
            context.fillText(self.scope.jobsNames[job].toUpperCase().substring(0,2), halfWidth, halfWidth);
            // generating sprite
            var texture = new THREE.Texture(canvas);
            var material = new THREE.SpriteMaterial({ map: texture });
            var sprite = new THREE.Sprite(material);
            //texture.minFilter = THREE.LinearFilter;
            texture.needsUpdate = true;
            sprite.isFilterButton = true;
            sprite.filterButtonJob = job;
            sprite.gradientRemoveDisable = true;
            filterButtonSprites[job] = sprite;
        }
        return filterButtonSprites[job];
    };

    self.updateFilterButtonSprite = function(sprite, selected){
        selected = selected != true ? false : true;
        var context = sprite.material.map.image.getContext('2d');
        var width = 256;
        var halfWidth = width / 2;
        if (context != undefined){
            var color = self.colors[self.scope.jobsRelationships[sprite.filterButtonJob]];
            // background color
            context.fillStyle = selected ? color : '#222222';
            context.fillRect(0, 0, width, width);
            // drawing text
            context.fillStyle = selected ? '#222222' : color;
            context.font = "bold 100px Arial";
            context.textAlign = "center";
            context.textBaseline = 'middle';
            context.fillText(self.scope.jobsNames[sprite.filterButtonJob].toUpperCase().substring(0,2), halfWidth, halfWidth);
            sprite.material.map.needsUpdate = true;
        }
    };

    var filterBackgroundButtonSprites = [];

    self.generateFilterBackgroundButtonSprite = function (text) {
        if (filterBackgroundButtonSprites[text] == undefined){
            var canvas = document.createElement('canvas');
            canvas.width = 256;
            canvas.height = 256;
            var borderThickness = canvas.width / borderFraction;
            var halfWidth = canvas.width / 2;
            var halfHeight = canvas.height / 2;
            var context = canvas.getContext('2d');
            // clipping to circle
            context.beginPath();
            context.arc(halfWidth, halfHeight, halfWidth, 0, PI2);
            context.clip();
            // background color
            context.fillStyle = '#222222';
            context.fillRect(0, 0, canvas.width, canvas.height);
            // drawing text
            context.fillStyle = '#ffffff';
            context.font = "bold 100px Arial";
            context.textAlign = "center";
            context.textBaseline = 'middle';
            context.fillText(text, halfWidth, halfWidth);
            // generating sprite
            var texture = new THREE.Texture(canvas);
            var material = new THREE.SpriteMaterial({ map: texture });
            var sprite = new THREE.Sprite(material);
            //texture.minFilter = THREE.LinearFilter;
            texture.needsUpdate = true;
            sprite.isFilterBackgroundButton = true;
            sprite.filterBackgroundButtonText = text;
            sprite.gradientRemoveDisable = true;
            filterBackgroundButtonSprites[text] = sprite;
        }
        return filterBackgroundButtonSprites[text];
    };

    self.updateFilterBackgroundButtonSprite = function(sprite, selected){
        selected = selected != true ? false : true;
        var context = sprite.material.map.image.getContext('2d');
        var width = 256;
        var halfWidth = width / 2;
        if (context != undefined){
            var color = '#ffffff';
            // background color
            context.fillStyle = selected ? color : '#222222';
            context.fillRect(0, 0, width, width);
            // drawing text
            context.fillStyle = selected ? '#222222' : color;
            context.font = "bold 100px Arial";
            context.textAlign = "center";
            context.textBaseline = 'middle';
            context.fillText(sprite.filterBackgroundButtonText, halfWidth, halfWidth);
            sprite.material.map.needsUpdate = true;
        }
    };

    var filterBackgroundSprites = [];

    self.generateSpriteFilterBackground = function(job) {
        var canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        var context = canvas.getContext('2d');
        context.beginPath();
        var halfWidth = canvas.width / 2;
        var borderThickness = canvas.width / borderFraction;
        context.arc(halfWidth, halfWidth, halfWidth, 0, PI2);
        context.clip();
        context.fillStyle = job != undefined ? self.colors[self.scope.jobsRelationships[job]] : self.orangeColor;
        context.globalAlpha = 0.9;
        context.fillRect(0, 0, canvas.width, canvas.height);
        // drawing text
        context.fillStyle = "#ffffff";
        context.font = "bold " + (canvas.width / 10) + "px Arial";
        context.textAlign = "center";
        context.globalAlpha = 1;
        wrapText(context, self.scope.jobsNames[job].toUpperCase(), halfWidth, canvas.height / 2.5,
            canvas.width -  5 * borderThickness, canvas.height / 6);
        var texture = new THREE.Texture(canvas);
        var material = new THREE.SpriteMaterial({ map: texture });
        var sprite = new THREE.Sprite(material);
        sprite.gradientRemoveDisable = true;
        //texture.minFilter = THREE.LinearFilter;
        texture.needsUpdate = true;
        return sprite;
    };

    self.updateSpriteFilterBackground = function(context, job) {
        var width = 256;
        var borderThickness = width / borderFraction;
        context.clearRect(0,0,width,width);
        context.fillStyle = job != undefined ? self.colors[self.scope.jobsRelationships[job]] : self.orangeColor;
        context.globalAlpha = 0.9;
        context.fillRect(0, 0, width, width);
        // drawing text
        context.fillStyle = "#ffffff";
        context.font = "bold " + (width / 10) + "px Arial";
        context.textAlign = "center";
        context.globalAlpha = 1;
        wrapText(context, self.scope.jobsNames[job].toUpperCase(), width / 2, width / 2.5,
            width -  5 * borderThickness, width / 6);
    };

    /* ------------------- */
    /* BACKGROUND HANDLING */
    /* ------------------- */

    self.sanitizeFileName = function(filename){
        if (filename == undefined)
            return filename;
        // The replaceChar should be either a space or an underscore.
        var replaceChar = "_";
        var regEx = new RegExp('[,/\:*?""<>|]', 'g');
        var Filename = filename.replace(regEx, replaceChar);
        return Filename;
    }

    self.updateBackground = function(node) {
        var oldBg = $("#graph").find('.canvasBackground');
        var bg = $('<div class="canvasBackground"></div>');
        $("#graph").find('canvas').before(bg);

        if (node.img == undefined || node.img == false) {
            bg.css('opacity'); // prevent transition from not firing
            bg.css({
                'background-image': 'url("' + defaultImg.src + '")',
                'opacity': 1,
                'top': oldBg.length > 0 ? '-100%' : '0'
            });
            setTimeout(function() { oldBg.remove(); bg.css('top','0'); }, 1000);
        } else {
            var backgroundImage = new Image();
            if (node.title == undefined)
                backgroundImage.src = 'images/persons/' + self.sanitizeFileName(node.fullname) + '.jpg';
            else
                backgroundImage.src = 'images/movies/' + self.sanitizeFileName(node.title + node.released) + '/backdrop.jpg';
            backgroundImage.onerror = function () {
                this.src = 'images/movies/' + self.sanitizeFileName(node.title + node.released) + '/poster.jpg';
                backgroundImage.onerror = function () { this.src = 'images/default.jpg'; };
            };
            backgroundImage.onload = function () {
                bg.css({
                    'background-image': 'url("'+ backgroundImage.src + '")',
                    'opacity': 1,
                    'top': oldBg.length > 0 ? '-100%' : '0'
                });
                setTimeout(function() { oldBg.remove(); bg.css('top','0'); }, 1000);
            };
        }
    };

    // draw an image proportionally to fit inside a container
    function drawImageProp(ctx, img, x, y, w, h, offsetX, offsetY) {
        if (arguments.length === 2) {
            x = y = 0;
            w = ctx.canvas.width;
            h = ctx.canvas.height;
        }
        // default offset is center
        offsetX = typeof offsetX === "number" ? offsetX : 0.5;
        offsetY = typeof offsetY === "number" ? offsetY : 0.5;
        // keep bounds [0.0, 1.0]
        if (offsetX < 0) offsetX = 0;
        if (offsetY < 0) offsetY = 0;
        if (offsetX > 1) offsetX = 1;
        if (offsetY > 1) offsetY = 1;
        var iw = img.width,
            ih = img.height,
            r = Math.min(w / iw, h / ih),
            nw = Math.round(iw * r),   // new prop. width
            nh = Math.round(ih * r),   // new prop. height
            cx, cy, cw, ch, ar = 1;
        // decide which gap to fill
        if (nw < w) ar = w / nw;
        if (nh < h) ar = h / nh;
        nw *= ar;
        nh *= ar;
        // calc source rectangle
        cw = iw / (nw / w);
        ch = ih / (nh / h);
        cx = (iw - cw) * offsetX;
        cy = (ih - ch) * offsetY;
        // make sure source rectangle is valid
        if (cx < 0) cx = 0;
        if (cy < 0) cy = 0;
        if (cw > iw) cw = iw;
        if (ch > ih) ch = ih;
        // fill image in dest. rectangle
        ctx.drawImage(img, cx, cy, cw, ch,  x, y, w, h);
    }


    return self;
})(CINEGRAPH || {});