import * as THREE from 'three';

// Refer to: https://mokole.com/palette.html
const colors64Distinct = [
  // row 1
  new THREE.Color(0xa9a9a9), // darkgray
  new THREE.Color(0xdcdcdc), // gainsboro
  new THREE.Color(0x2f4f4f), // darkslategray
  new THREE.Color(0x556b2f), // darkolivegreen
  new THREE.Color(0x8b4513), // saddlebrown
  new THREE.Color(0x6b8e23), // olivedrab
  new THREE.Color(0x2e8b57), // seagreen

  // row 2
  new THREE.Color(0x7f0000), // maroon2
  new THREE.Color(0x191970), // midnightblue
  new THREE.Color(0x708090), // slategray
  new THREE.Color(0x483d8b), // darkslateblue
  new THREE.Color(0x5f9ea0), // cadetblue
  new THREE.Color(0x008000), // green
  new THREE.Color(0xbc8f8f), // rosybrown

  // row 3
  new THREE.Color(0x663399), // rebeccapurple
  new THREE.Color(0xb8860b), // darkgoldenrod
  new THREE.Color(0xbdb76b), // darkkhaki
  new THREE.Color(0xcd853f), // peru
  new THREE.Color(0x4682b4), // steelblue
  new THREE.Color(0xd2691e), // chocolate
  new THREE.Color(0x9acd32), // yellowgreen

  // row 4
  new THREE.Color(0x20b2aa), // lightseagreen
  new THREE.Color(0xcd5c5c), // indianred
  new THREE.Color(0x00008b), // darkblue
  new THREE.Color(0x32cd32), // limegreen
  new THREE.Color(0x8fbc8f), // darkseagreen
  new THREE.Color(0x8b008b), // darkmagenta
  new THREE.Color(0xb03060), // maroon3

  // row 5
  new THREE.Color(0x66cdaa), // mediumaquamarine
  new THREE.Color(0x9932cc), // darkorchid
  new THREE.Color(0xff4500), // orangered
  new THREE.Color(0xff8c00), // darkorange
  new THREE.Color(0xffd700), // gold
  new THREE.Color(0xc71585), // mediumvioletred

  // row 6
  new THREE.Color(0x0000cd), // mediumblue
  new THREE.Color(0x7cfc00), // lawngreen
  new THREE.Color(0xdeb887), // burlywood
  new THREE.Color(0x00ff00), // lime
  new THREE.Color(0x00fa9a), // mediumspringgreen
  new THREE.Color(0x4169e1), // royalblue
  new THREE.Color(0xdc143c), // crimson

  // row 7
  new THREE.Color(0x00ffff), // aqua
  new THREE.Color(0x00bfff), // deepskyblue
  new THREE.Color(0x9370db), // mediumpurple
  new THREE.Color(0x0000ff), // blue
  new THREE.Color(0xa020f0), // purple3
  new THREE.Color(0xff6347), // tomato
  new THREE.Color(0xda70d6), // orchid
  new THREE.Color(0xd8bfd8), // thistle

  // row 8
  new THREE.Color(0xff00ff), // fuchsia
  new THREE.Color(0xdb7093), // palevioletred
  new THREE.Color(0xf0e68c), // khaki
  new THREE.Color(0xffff54), // laserlemon
  new THREE.Color(0x6495ed), // cornflower
  new THREE.Color(0xdda0dd), // plum
  new THREE.Color(0x90ee90), // lightgreen
  new THREE.Color(0x87ceeb), // skyblue

  // row 9
  new THREE.Color(0xff1493), // deeppink
  new THREE.Color(0xffa07a), // lightsalmon
  new THREE.Color(0xafeeee), // paleturquoise
  new THREE.Color(0x7fffd4), // aquamarine
  new THREE.Color(0xff69b4), // hotpink
  new THREE.Color(0xffe4c4), // bisque
  new THREE.Color(0xffb6c1), // lightpink
];

export { colors64Distinct };
