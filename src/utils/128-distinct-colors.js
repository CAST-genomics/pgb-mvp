import * as THREE from 'three';

const colors128Distinct = [
  // row 1
  new THREE.Color(0x696969), // dimgray
  new THREE.Color(0x808080), // gray
  new THREE.Color(0xa9a9a9), // darkgray
  new THREE.Color(0xd3d3d3), // lightgray
  new THREE.Color(0x2f4f4f), // darkslategray
  new THREE.Color(0x556b2f), // darkolivegreen
  new THREE.Color(0x8b4513), // saddlebrown

  // row 2
  new THREE.Color(0x6b8e23), // olivedrab
  new THREE.Color(0xa0522d), // sienna
  new THREE.Color(0xa52a2a), // brown
  new THREE.Color(0x2e8b57), // seagreen
  new THREE.Color(0x228b22), // forestgreen
  new THREE.Color(0x191970), // midnightblue
  new THREE.Color(0x006400), // darkgreen
  new THREE.Color(0x708090), // slategray

  // row 3
  new THREE.Color(0x8b0000), // darkred
  new THREE.Color(0x808000), // olive
  new THREE.Color(0x483d8b), // darkslateblue
  new THREE.Color(0xb22222), // firebrick
  new THREE.Color(0x5f9ea0), // cadetblue
  new THREE.Color(0x3cb371), // mediumseagreen
  new THREE.Color(0xbc8f8f), // rosybrown

  // row 4
  new THREE.Color(0x663399), // rebeccapurple
  new THREE.Color(0x008080), // teal
  new THREE.Color(0xb8860b), // darkgoldenrod
  new THREE.Color(0xbdb76b), // darkkhaki
  new THREE.Color(0xcd853f), // peru
  new THREE.Color(0x4682b4), // steelblue
  new THREE.Color(0xd2691e), // chocolate

  // row 5
  new THREE.Color(0x9acd32), // yellowgreen
  new THREE.Color(0x20b2aa), // lightseagreen
  new THREE.Color(0xcd5c5c), // indianred
  new THREE.Color(0x00008b), // darkblue
  new THREE.Color(0x4b0082), // indigo
  new THREE.Color(0x32cd32), // limegreen
  new THREE.Color(0xdaa520), // goldenrod
  new THREE.Color(0x7f007f), // purple2

  // row 6
  new THREE.Color(0x8fbc8f), // darkseagreen
  new THREE.Color(0xb03060), // maroon3
  new THREE.Color(0x66cdaa), // mediumaquamarine
  new THREE.Color(0x9932cc), // darkorchid
  new THREE.Color(0xff0000), // red
  new THREE.Color(0xff4500), // orangered
  new THREE.Color(0x00ced1), // darkturquoise

  // row 7
  new THREE.Color(0xff8c00), // darkorange
  new THREE.Color(0xffa500), // orange
  new THREE.Color(0xffd700), // gold
  new THREE.Color(0x6a5acd), // slateblue
  new THREE.Color(0xffff00), // yellow
  new THREE.Color(0xc71585), // mediumvioletred
  new THREE.Color(0x0000cd), // mediumblue
  new THREE.Color(0x7cfc00), // lawngreen

  // row 8
  new THREE.Color(0xdeb887), // burlywood
  new THREE.Color(0x40e0d0), // turquoise
  new THREE.Color(0x00ff00), // lime
  new THREE.Color(0x9400d3), // darkviolet
  new THREE.Color(0xba55d3), // mediumorchid
  new THREE.Color(0x00fa9a), // mediumspringgreen
  new THREE.Color(0x00ff7f), // springgreen

  // row 9
  new THREE.Color(0x4169e1), // royalblue
  new THREE.Color(0xe9967a), // darksalmon
  new THREE.Color(0xdc143c), // crimson
  new THREE.Color(0x00ffff), // aqua
  new THREE.Color(0x00bfff), // deepskyblue
  new THREE.Color(0xf4a460), // sandybrown
  new THREE.Color(0x9370db), // mediumpurple
  new THREE.Color(0x0000ff), // blue

  // row 10
  new THREE.Color(0xa020f0), // purple3
  new THREE.Color(0xf08080), // lightcoral
  new THREE.Color(0xadff2f), // greenyellow
  new THREE.Color(0xff6347), // tomato
  new THREE.Color(0xd8bfd8), // thistle
  new THREE.Color(0xb0c4de), // lightsteelblue
  new THREE.Color(0xff7f50), // coral
  new THREE.Color(0xff00ff), // fuchsia

  // row 11
  new THREE.Color(0x1e90ff), // dodgerblue
  new THREE.Color(0xdb7093), // palevioletred
  new THREE.Color(0xf0e68c), // khaki
  new THREE.Color(0xfa8072), // salmon
  new THREE.Color(0xeee8aa), // palegoldenrod
  new THREE.Color(0xffff54), // laserlemon
  new THREE.Color(0x6495ed), // cornflower

  // row 12
  new THREE.Color(0xdda0dd), // plum
  new THREE.Color(0x90ee90), // lightgreen
  new THREE.Color(0xadd8e6), // lightblue
  new THREE.Color(0x87ceeb), // skyblue
  new THREE.Color(0xff1493), // deeppink
  new THREE.Color(0x7b68ee), // mediumslateblue
  new THREE.Color(0xffa07a), // lightsalmon

  // row 13
  new THREE.Color(0xafeeee), // paleturquoise
  new THREE.Color(0xee82ee), // violet
  new THREE.Color(0x7fffd4), // aquamarine
  new THREE.Color(0xffdead), // navajowhite
  new THREE.Color(0xff69b4), // hotpink
  new THREE.Color(0xffe4c4), // bisque
  new THREE.Color(0xffb6c1), // lightpink
];

export { colors128Distinct };
