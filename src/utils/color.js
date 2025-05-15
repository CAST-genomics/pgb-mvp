// Color utility functions will be added here
import * as THREE from 'three'

/**
 * Apple Crayon color palette
 * A collection of 25 colors used in Apple's classic Mac OS
 */
const appleCrayonColors = new Map([
    ['licorice',    new THREE.Color(0x000000)],
    ['lead',        new THREE.Color(0x1E1E1E)],
    ['tungsten',    new THREE.Color(0x3A3A3A)],
    ['iron',        new THREE.Color(0x545453)],
    ['steel',       new THREE.Color(0x6E6E6E)],
    ['tin',         new THREE.Color(0x878687)],
    ['nickel',      new THREE.Color(0x888787)],
    ['aluminum',    new THREE.Color(0xA09FA0)],
    ['magnesium',   new THREE.Color(0xB8B8B8)],
    ['silver',      new THREE.Color(0xD0D0D0)],
    ['mercury',     new THREE.Color(0xE8E8E8)],
    ['snow',        new THREE.Color(0xFFFFFF)],
    ['cayenne',     new THREE.Color(0x891100)],
    ['mocha',       new THREE.Color(0x894800)],
    ['asparagus',   new THREE.Color(0x888501)],
    ['fern',        new THREE.Color(0x458401)],
    ['clover',      new THREE.Color(0x028401)],
    ['moss',        new THREE.Color(0x018448)],
    ['teal',        new THREE.Color(0x008688)],
    ['ocean',       new THREE.Color(0x004A88)],
    ['midnight',    new THREE.Color(0x001888)],
    ['eggplant',    new THREE.Color(0x491A88)],
    ['plum',        new THREE.Color(0x891E88)],
    ['maroon',      new THREE.Color(0x891648)],
    ['maraschino',  new THREE.Color(0xFF2101)],
    ['tangerine',   new THREE.Color(0xFF8802)],
    ['lemon',       new THREE.Color(0xFFFA03)],
    ['lime',        new THREE.Color(0x83F902)],
    ['spring',      new THREE.Color(0x05F802)],
    ['sea foam',    new THREE.Color(0x03F987)],
    ['turquoise',   new THREE.Color(0x00FDFF)],
    ['aqua',        new THREE.Color(0x008CFF)],
    ['blueberry',   new THREE.Color(0x002EFF)],
    ['grape',       new THREE.Color(0x8931FF)],
    ['magenta',     new THREE.Color(0xFF39FF)],
    ['strawberry',  new THREE.Color(0xFF2987)],
    ['salmon',      new THREE.Color(0xFF726E)],
    ['cantaloupe',  new THREE.Color(0xFFCE6E)],
    ['banana',      new THREE.Color(0xFFFB6D)],
    ['honeydew',    new THREE.Color(0xCEFA6E)],
    ['flora',       new THREE.Color(0x68F96E)],
    ['spindrift',   new THREE.Color(0x68FBD0)],
    ['ice',         new THREE.Color(0x68FDFF)],
    ['sky',         new THREE.Color(0x6ACFFF)],
    ['orchid',      new THREE.Color(0x6E76FF)],
    ['lavender',    new THREE.Color(0xD278FF)],
    ['bubblegum',   new THREE.Color(0xFF7AFF)],
    ['carnation',   new THREE.Color(0xFF7FD3)]
]);

// Predefined color categories
const colorCategories = {
    vibrant: [
        'maraschino',
        'tangerine',
        'lemon',
        'lime',
        'spring',
        'sea foam',
        'turquoise',
        'aqua',
        'blueberry',
        'grape',
        'magenta',
        'strawberry',
        'carnation'
    ],
    grays: [
        'licorice',
        'lead',
        'tungsten',
        'iron',
        'steel',
        'tin',
        'nickel',
        'aluminum',
        'magnesium',
        'silver',
        'mercury',
        'snow'
    ],
    pastels: [
        'snow',
        'salmon',
        'cantaloupe',
        'banana',
        'honeydew',
        'flora',
        'spindrift',
        'ice',
        'sky',
        'orchid',
        'lavender',
        'bubblegum',
        'carnation'
    ],
    earth: [
        'cayenne',
        'mocha',
        'asparagus',
        'fern',
        'clover',
        'moss',
        'teal',
        'ocean',
        'midnight',
        'eggplant',
        'plum',
        'maroon'
    ]
};

// Color complements mapping
const colorComplements = new Map([
    // Vibrant colors
    ['maraschino', 'turquoise'],
    ['tangerine', 'blueberry'],
    ['lemon', 'grape'],
    ['lime', 'magenta'],
    ['spring', 'strawberry'],
    ['sea foam', 'carnation'],
    ['turquoise', 'maraschino'],
    ['aqua', 'strawberry'],
    ['blueberry', 'tangerine'],
    ['grape', 'lemon'],
    ['magenta', 'lime'],
    ['strawberry', 'spring'],
    ['carnation', 'sea foam'],
    
    // Pastels
    ['salmon', 'sky'],
    ['cantaloupe', 'orchid'],
    ['banana', 'lavender'],
    ['honeydew', 'bubblegum'],
    ['flora', 'ice'],
    ['spindrift', 'carnation'],
    ['ice', 'flora'],
    ['sky', 'salmon'],
    ['orchid', 'cantaloupe'],
    ['lavender', 'banana'],
    ['bubblegum', 'honeydew'],
    
    // Earth tones
    ['cayenne', 'teal'],
    ['mocha', 'ocean'],
    ['asparagus', 'midnight'],
    ['fern', 'eggplant'],
    ['clover', 'plum'],
    ['moss', 'maroon'],
    ['teal', 'cayenne'],
    ['ocean', 'mocha'],
    ['midnight', 'asparagus'],
    ['eggplant', 'fern'],
    ['plum', 'clover'],
    ['maroon', 'moss'],
    
    // Grays - complement with vibrant colors
    ['licorice', 'lemon'],
    ['lead', 'tangerine'],
    ['tungsten', 'maraschino'],
    ['iron', 'spring'],
    ['steel', 'sea foam'],
    ['tin', 'turquoise'],
    ['nickel', 'aqua'],
    ['aluminum', 'blueberry'],
    ['magnesium', 'grape'],
    ['silver', 'magenta'],
    ['mercury', 'strawberry'],
    ['snow', 'carnation']
]);

/**
 * Returns a random color from the Apple Crayon palette
 * @returns {THREE.Color} A THREE.Color object
 */
function getRandomAppleCrayonColor() {
    const colors = Array.from(appleCrayonColors.values());
    return colors[Math.floor(Math.random() * colors.length)].clone();
}

/**
 * Returns a random vibrant color from the Apple Crayon palette
 * Excludes grays and pastels
 * @returns {THREE.Color} A THREE.Color object
 */
function getRandomVibrantAppleCrayonColor() {
    const colorName = colorCategories.vibrant[Math.floor(Math.random() * colorCategories.vibrant.length)];
    return getAppleCrayonColorByName(colorName);
}

/**
 * Returns a random pastel color from the Apple Crayon palette
 * @returns {THREE.Color} A THREE.Color object
 */
function getRandomPastelAppleCrayonColor() {
    const colorName = colorCategories.pastels[Math.floor(Math.random() * colorCategories.pastels.length)];
    return getAppleCrayonColorByName(colorName);
}

/**
 * Returns a random gray from the Apple Crayon palette
 * @returns {THREE.Color} A THREE.Color object
 */
function getRandomGrayAppleCrayonColor() {
    const colorName = colorCategories.grays[Math.floor(Math.random() * colorCategories.grays.length)];
    return getAppleCrayonColorByName(colorName);
}

/**
 * Returns a color from the Apple Crayon palette by name
 * @param {string} name - The name of the color
 * @returns {THREE.Color|undefined} A THREE.Color object or undefined if not found
 */
function getAppleCrayonColorByName(name) {
    const color = appleCrayonColors.get(name);
    return color ? color.clone() : undefined;
}

/**
 * Returns the complementary color for a given color name
 * @param {string} name - The name of the color to find the complement for
 * @returns {THREE.Color|undefined} The complementary color or undefined if not found
 */
function getComplementaryColor(name) {
    const complementName = colorComplements.get(name);
    return complementName ? getAppleCrayonColorByName(complementName) : undefined;
}

/**
 * Generates N unique colors with varied hue, saturation, and lightness
 * Colors are distributed across the full color spectrum
 * @param {number} N - The number of unique colors to generate
 * @param {Object} options - Optional parameters
 * @param {number} options.minSaturation - Minimum saturation (0-100), default 20
 * @param {number} options.maxSaturation - Maximum saturation (0-100), default 100
 * @param {number} options.minLightness - Minimum lightness (0-100), default 20
 * @param {number} options.maxLightness - Maximum lightness (0-100), default 80
 * @returns {Array<THREE.Color>} An array of N unique THREE.Color objects
 */
function generateUniqueColors(N, options = {}) {
    if (N <= 0) return [];

    const {
        minSaturation = 20,
        maxSaturation = 100,
        minLightness = 20,
        maxLightness = 80
    } = options;

    const colors = [];
    const hueStep = 360 / N;  // Distribute colors evenly across the hue spectrum

    for (let i = 0; i < N; i++) {
        // Calculate hue, evenly distributed
        const hue = (i * hueStep) % 360;

        // Vary saturation and lightness for each color
        const saturation = minSaturation + Math.random() * (maxSaturation - minSaturation);
        const lightness = minLightness + Math.random() * (maxLightness - minLightness);

        const color = new THREE.Color();
        color.setHSL(hue / 360, saturation / 100, lightness / 100);
        colors.push(color);
    }

    return colors;
}

/**
 * Converts a THREE.Color object to an RGB string in the format "rgb(255, 255, 255)"
 * @param {THREE.Color} color - The THREE.Color object to convert
 * @returns {string} RGB string representation of the color
 */
function colorToRGBString(color) {
    const r = Math.round(color.r * 255);
    const g = Math.round(color.g * 255);
    const b = Math.round(color.b * 255);
    return `rgb(${r}, ${g}, ${b})`;
}

export {
    getRandomAppleCrayonColor,
    getRandomVibrantAppleCrayonColor,
    getRandomPastelAppleCrayonColor,
    getRandomGrayAppleCrayonColor,
    getAppleCrayonColorByName,
    getComplementaryColor,
    generateUniqueColors,
    colorToRGBString
};
