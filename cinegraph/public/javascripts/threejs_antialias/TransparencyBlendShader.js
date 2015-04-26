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
