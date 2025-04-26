// Color utility functions will be added here
import * as THREE from 'three'

/**
 * Apple Crayon color palette
 * A collection of 25 colors used in Apple's classic Mac OS
 */
const appleCrayonColors = new Map([
    // Colors
    ['snow', new THREE.Color(0xFFFAFA)],
    ['salmon', new THREE.Color(0xFF6F61)],
    ['tangerine', new THREE.Color(0xFFA500)],
    ['marigold', new THREE.Color(0xFFD700)],
    ['lemon', new THREE.Color(0xFFFF66)],
    ['honeydew', new THREE.Color(0xF0FFF0)],
    ['mint', new THREE.Color(0x98FF98)],
    ['aqua', new THREE.Color(0x00FFFF)],
    ['sky', new THREE.Color(0x87CEEB)],
    ['ocean', new THREE.Color(0x4682B4)],
    ['blueberry', new THREE.Color(0x4F86F7)],
    ['lavender', new THREE.Color(0xE6E6FA)],
    ['plum', new THREE.Color(0xDDA0DD)],
    ['magenta', new THREE.Color(0xFF00FF)],
    ['bubblegum', new THREE.Color(0xFFC1CC)],
    ['carnation', new THREE.Color(0xFFA6C9)],
    // Grays
    ['licorice', new THREE.Color(0x000000)],
    ['lead', new THREE.Color(0x545454)],
    ['tin', new THREE.Color(0x888888)],
    ['nickel', new THREE.Color(0xAAAAAA)],
    ['aluminum', new THREE.Color(0xCCCCCC)],
    ['magnesium', new THREE.Color(0xDDDDDD)],
    ['silver', new THREE.Color(0xEEEEEE)],
    ['mercury', new THREE.Color(0xF3F3F3)],
    ['snow2', new THREE.Color(0xFFFFFF)]
]);

// Predefined color categories
const colorCategories = {
    vibrant: [
        'salmon',
        'tangerine',
        'marigold',
        'lemon',
        'mint',
        'aqua',
        'sky',
        'ocean',
        'blueberry',
        'plum',
        'magenta',
        'bubblegum',
        'carnation'
    ],
    grays: [
        'licorice',
        'lead',
        'tin',
        'nickel',
        'aluminum',
        'magnesium',
        'silver',
        'mercury',
        'snow2'
    ],
    pastels: [
        'snow',
        'honeydew',
        'lavender',
        'bubblegum',
        'carnation'
    ]
};

// Color complements mapping
const colorComplements = new Map([
    ['salmon', 'sky'],
    ['tangerine', 'ocean'],
    ['marigold', 'blueberry'],
    ['lemon', 'plum'],
    ['mint', 'magenta'],
    ['aqua', 'bubblegum'],
    ['sky', 'salmon'],
    ['ocean', 'tangerine'],
    ['blueberry', 'marigold'],
    ['plum', 'lemon'],
    ['magenta', 'mint'],
    ['bubblegum', 'aqua'],
    ['carnation', 'mint'],
    // For grays, return a vibrant color
    ['licorice', 'lemon'],
    ['lead', 'marigold'],
    ['tin', 'salmon'],
    ['nickel', 'tangerine'],
    ['aluminum', 'ocean'],
    ['magnesium', 'blueberry'],
    ['silver', 'plum'],
    ['mercury', 'magenta'],
    ['snow2', 'bubblegum'],
    // For pastels, return a vibrant color
    ['snow', 'blueberry'],
    ['honeydew', 'plum'],
    ['lavender', 'lemon']
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

export { 
    getRandomAppleCrayonColor, 
    getRandomVibrantAppleCrayonColor,
    getRandomPastelAppleCrayonColor,
    getRandomGrayAppleCrayonColor,
    getAppleCrayonColorByName,
    getComplementaryColor,
    generateUniqueColors
};