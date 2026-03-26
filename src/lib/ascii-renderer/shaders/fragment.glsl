precision mediump float;

varying vec2 vUV;
uniform sampler2D uVideo;
uniform vec2 uResolution;

void main() {
  gl_FragColor = texture2D(uVideo, vUV);
}
