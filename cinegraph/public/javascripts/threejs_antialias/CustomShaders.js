/**
 * @author alteredq / http://alteredqualia.com/
 *
 * Full-screen textured quad shader
 */

THREE.TransparencyBlendShader = {

	uniforms: {
    "tBase": { type: "t", value: null },
		"tAdd": { type: "t", value: null },
		"tDiffuse": { type: "t", value: null },
		"opacity":  { type: "f", value: 1.0 }

	},

	vertexShader: [

		"varying vec2 vUv;",

		"void main() {",

			"vUv = uv;",
			"gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",

		"}"

	].join("\n"),

	fragmentShader: [


    "uniform sampler2D tBase;",
    "uniform sampler2D tAdd;",
    "uniform float amount;",

    "varying vec2 vUv;",

    "void main() {",

        "vec4 t1 = texture2D( tBase, vUv );",
        "vec4 t2 = texture2D( tAdd, vUv );",
        "gl_FragColor = (t1 * (1.0 - t2.a))+(t2 * t2.a);",

    "}"

].join("\n")

};

THREE.ThickLineShader = {

	uniforms: {
		"tDiffuse": { type: "t", value: null },
		"edgeWidth": {type: "i", value: 1},
		"diagOffset": {type: "i", value: 0},
		"totalWidth": { type: "f", value: null },
		"totalHeight": { type: "f", value: null }
	},

	vertexShader: [
		"varying vec2 vUv;",

		"void main() {",
			"vUv = uv;",
			"gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",
		"}"

	].join("\n"),

	fragmentShader: [
		"uniform sampler2D tDiffuse;",
		"uniform int edgeWidth;",
		"uniform int diagOffset;",
		"uniform float totalWidth;",
		"uniform float totalHeight;",
		"const int MAX_LINE_WIDTH = 30;", // Needed due to weird limitations in GLSL around for loops
		"varying vec2 vUv;",

		"void main() {",
			"int offset = int( floor(float(edgeWidth) / float(2) + 0.5) );",
			"vec4 color = vec4( 0.0, 0.0, 0.0, 0.0);",

			// Horizontal copies of the wireframe first
			"for (int i = 0; i < MAX_LINE_WIDTH; i++) {",
				"float uvFactor = (float(1) / totalWidth);",
				"float newUvX = vUv.x + float(i - offset) * uvFactor;",
				"float newUvY = vUv.y + (float(i - offset) * float(diagOffset) ) * uvFactor;",  // only modifies vUv.y if diagOffset > 0
				"color = max(color, texture2D( tDiffuse, vec2( newUvX,  newUvY  ) ));	",
				// GLSL does not allow loop comparisons against dynamic variables. Workaround below
				"if(i == edgeWidth) break;",
			"};",

			// Now we create the vertical copies
			"for (int i = 0; i < MAX_LINE_WIDTH; i++) {",
				"float uvFactor = (float(1) / totalHeight);",
				"float newUvX = vUv.x + (float(i - offset) * float(-diagOffset) ) * uvFactor;", // only modifies vUv.x if diagOffset > 0
				"float newUvY = vUv.y + float(i - offset) * uvFactor;",
				"color = max(color, texture2D( tDiffuse, vec2( newUvX, newUvY ) ));	",
				"if(i == edgeWidth) break;",
			"};",

			"gl_FragColor = color;",

		"}"

	].join("\n")

};
THREE.FXAAShader = {

	uniforms: {

		"tDiffuse":   { type: "t", value: null },
		"resolution": { type: "v2", value: new THREE.Vector2( 1 / 1024, 1 / 512 ) }

	},

	vertexShader: [

		"void main() {",

			"gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",

		"}"

	].join("\n"),

	fragmentShader: [

		"uniform sampler2D tDiffuse;",
		"uniform vec2 resolution;",

		"#define FXAA_REDUCE_MIN   (1.0/128.0)",
		"#define FXAA_REDUCE_MUL   (1.0/8.0)",
		"#define FXAA_SPAN_MAX     8.0",

		"void main() {",

			"vec3 rgbNW = texture2D( tDiffuse, ( gl_FragCoord.xy + vec2( -1.0, -1.0 ) ) * resolution ).xyz;",
			"vec3 rgbNE = texture2D( tDiffuse, ( gl_FragCoord.xy + vec2( 1.0, -1.0 ) ) * resolution ).xyz;",
			"vec3 rgbSW = texture2D( tDiffuse, ( gl_FragCoord.xy + vec2( -1.0, 1.0 ) ) * resolution ).xyz;",
			"vec3 rgbSE = texture2D( tDiffuse, ( gl_FragCoord.xy + vec2( 1.0, 1.0 ) ) * resolution ).xyz;",
			"vec4 rgbaM  = texture2D( tDiffuse,  gl_FragCoord.xy  * resolution );",
			"vec3 rgbM  = rgbaM.xyz;",
			"vec3 luma = vec3( 0.299, 0.587, 0.114 );",

			"float lumaNW = dot( rgbNW, luma );",
			"float lumaNE = dot( rgbNE, luma );",
			"float lumaSW = dot( rgbSW, luma );",
			"float lumaSE = dot( rgbSE, luma );",
			"float lumaM  = dot( rgbM,  luma );",
			"float lumaMin = min( lumaM, min( min( lumaNW, lumaNE ), min( lumaSW, lumaSE ) ) );",
			"float lumaMax = max( lumaM, max( max( lumaNW, lumaNE) , max( lumaSW, lumaSE ) ) );",

			"vec2 dir;",
			"dir.x = -((lumaNW + lumaNE) - (lumaSW + lumaSE));",
			"dir.y =  ((lumaNW + lumaSW) - (lumaNE + lumaSE));",

			"float dirReduce = max( ( lumaNW + lumaNE + lumaSW + lumaSE ) * ( 0.25 * FXAA_REDUCE_MUL ), FXAA_REDUCE_MIN );",

			"float rcpDirMin = 1.0 / ( min( abs( dir.x ), abs( dir.y ) ) + dirReduce );",
			"dir = min( vec2( FXAA_SPAN_MAX,  FXAA_SPAN_MAX),",
				  "max( vec2(-FXAA_SPAN_MAX, -FXAA_SPAN_MAX),",
						"dir * rcpDirMin)) * resolution;",
			"vec4 rgbA = (1.0/2.0) * (",
        	"texture2D(tDiffuse,  gl_FragCoord.xy  * resolution + dir * (1.0/3.0 - 0.5)) +",
			"texture2D(tDiffuse,  gl_FragCoord.xy  * resolution + dir * (2.0/3.0 - 0.5)));",
    		"vec4 rgbB = rgbA * (1.0/2.0) + (1.0/4.0) * (",
			"texture2D(tDiffuse,  gl_FragCoord.xy  * resolution + dir * (0.0/3.0 - 0.5)) +",
      		"texture2D(tDiffuse,  gl_FragCoord.xy  * resolution + dir * (3.0/3.0 - 0.5)));",
    		"float lumaB = dot(rgbB, vec4(luma, 0.0));",

			"if ( ( lumaB < lumaMin ) || ( lumaB > lumaMax ) ) {",

				"gl_FragColor = rgbA;",

			"} else {",
				"gl_FragColor = rgbB;",

			"}",

		"}"

	].join("\n")

};