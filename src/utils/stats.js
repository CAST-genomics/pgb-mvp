/**
 * Statistics utility functions for analyzing and transforming data distributions
 */

/**
 * Calculate basic descriptive statistics for an array of numbers
 * @param {number[]} values - Array of numeric values
 * @returns {Object} Object containing min, max, mean, median, stdDev
 */
export function calculateBasicStats(values) {
    if (!values || values.length === 0) {
        return { min: 0, max: 0, mean: 0, median: 0, stdDev: 0 };
    }

    const sorted = [...values].sort((a, b) => a - b);
    const n = sorted.length;

    // Min and max
    const min = sorted[0];
    const max = sorted[n - 1];

    // Mean
    const sum = sorted.reduce((acc, val) => acc + val, 0);
    const mean = sum / n;

    // Median
    const median = n % 2 === 0 
        ? (sorted[n/2 - 1] + sorted[n/2]) / 2 
        : sorted[Math.floor(n/2)];

    // Standard deviation
    const variance = sorted.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / n;
    const stdDev = Math.sqrt(variance);

    return { min, max, mean, median, stdDev };
}

/**
 * Calculate percentiles for an array of numbers
 * @param {number[]} values - Array of numeric values
 * @param {number[]} percentiles - Array of percentile values (e.g., [10, 25, 50, 75, 90, 95])
 * @returns {Object} Object with percentile values as keys
 */
export function calculatePercentiles(values, percentiles = [10, 25, 50, 75, 90, 95]) {
    if (!values || values.length === 0) {
        const result = {};
        percentiles.forEach(p => result[`p${p}`] = 0);
        return result;
    }

    const sorted = [...values].sort((a, b) => a - b);
    const n = sorted.length;
    const result = {};

    percentiles.forEach(p => {
        const index = (p / 100) * (n - 1);
        const lowerIndex = Math.floor(index);
        const upperIndex = Math.ceil(index);
        
        if (lowerIndex === upperIndex) {
            result[`p${p}`] = sorted[lowerIndex];
        } else {
            const weight = index - lowerIndex;
            result[`p${p}`] = sorted[lowerIndex] * (1 - weight) + sorted[upperIndex] * weight;
        }
    });

    return result;
}

/**
 * Calculate skewness of a distribution
 * @param {number[]} values - Array of numeric values
 * @returns {number} Skewness value
 */
export function calculateSkewness(values) {
    if (!values || values.length < 3) return 0;

    const { mean, stdDev } = calculateBasicStats(values);
    if (stdDev === 0) return 0;

    const n = values.length;
    const skewness = values.reduce((acc, val) => {
        return acc + Math.pow((val - mean) / stdDev, 3);
    }, 0) / n;

    return skewness;
}

/**
 * Calculate kurtosis of a distribution
 * @param {number[]} values - Array of numeric values
 * @returns {number} Kurtosis value
 */
export function calculateKurtosis(values) {
    if (!values || values.length < 4) return 0;

    const { mean, stdDev } = calculateBasicStats(values);
    if (stdDev === 0) return 0;

    const n = values.length;
    const kurtosis = values.reduce((acc, val) => {
        return acc + Math.pow((val - mean) / stdDev, 4);
    }, 0) / n - 3; // Subtract 3 for excess kurtosis

    return kurtosis;
}

/**
 * Normalize a value using percentile-based scaling
 * @param {number} value - Value to normalize
 * @param {Object} percentiles - Object with percentile values
 * @param {number} percentiles.p5 - 5th percentile
 * @param {number} percentiles.p95 - 95th percentile
 * @returns {number} Normalized value between 0 and 1
 */
export function normalizeByPercentiles(value, percentiles) {
    const { p5, p95 } = percentiles;
    if (p95 === p5) return 0.5; // Avoid division by zero
    
    const normalized = (value - p5) / (p95 - p5);
    return Math.max(0, Math.min(1, normalized)); // Clamp to [0, 1]
}

/**
 * Normalize a value using logarithmic transformation
 * @param {number} value - Value to normalize
 * @param {number} maxValue - Maximum value in the dataset
 * @returns {number} Normalized value between 0 and 1
 */
export function normalizeByLog(value, maxValue) {
    if (maxValue <= 0) return 0;
    return Math.log(1 + value) / Math.log(1 + maxValue);
}

/**
 * Normalize a value using square root transformation
 * @param {number} value - Value to normalize
 * @param {number} maxValue - Maximum value in the dataset
 * @returns {number} Normalized value between 0 and 1
 */
export function normalizeBySqrt(value, maxValue) {
    if (maxValue <= 0) return 0;
    return Math.sqrt(value) / Math.sqrt(maxValue);
}

/**
 * Normalize a value using power law transformation
 * @param {number} value - Value to normalize
 * @param {number} maxValue - Maximum value in the dataset
 * @param {number} power - Power to apply (power < 1 spreads out low values)
 * @returns {number} Normalized value between 0 and 1
 */
export function normalizeByPower(value, maxValue, power = 0.5) {
    if (maxValue <= 0) return 0;
    return Math.pow(value, power) / Math.pow(maxValue, power);
}

/**
 * Calculate quantile rank for a value
 * @param {number} value - Value to rank
 * @param {number[]} allValues - Array of all values in the dataset
 * @returns {number} Quantile rank between 0 and 1
 */
export function calculateQuantileRank(value, allValues) {
    if (!allValues || allValues.length === 0) return 0;
    
    const sorted = [...allValues].sort((a, b) => a - b);
    const index = sorted.findIndex(v => v >= value);
    
    if (index === -1) return 1; // Value is greater than all values
    if (index === 0) return 0;  // Value is less than or equal to all values
    
    return index / sorted.length;
}

/**
 * Calculate comprehensive distribution statistics
 * @param {number[]} values - Array of numeric values
 * @returns {Object} Complete distribution statistics
 */
export function calculateDistributionStats(values) {
    if (!values || values.length === 0) {
        return {
            basic: { min: 0, max: 0, mean: 0, median: 0, stdDev: 0 },
            percentiles: { p10: 0, p25: 0, p50: 0, p75: 0, p90: 0, p95: 0 },
            shape: { skewness: 0, kurtosis: 0 },
            count: 0
        };
    }

    const basic = calculateBasicStats(values);
    const percentiles = calculatePercentiles(values, [10, 25, 50, 75, 90, 95]);
    const skewness = calculateSkewness(values);
    const kurtosis = calculateKurtosis(values);

    return {
        basic,
        percentiles,
        shape: { skewness, kurtosis },
        count: values.length
    };
}

/**
 * Apply normalization to all values in a dataset
 * @param {number[]} values - Array of values to normalize
 * @param {string} method - Normalization method ('percentile', 'log', 'sqrt', 'power', 'quantile')
 * @param {Object} options - Options for normalization
 * @returns {number[]} Array of normalized values
 */
export function normalizeDataset(values, method = 'percentile', options = {}) {
    if (!values || values.length === 0) return [];

    switch (method) {
        case 'percentile':
            const percentiles = calculatePercentiles(values, [5, 95]);
            return values.map(v => normalizeByPercentiles(v, percentiles));
        
        case 'log':
            const maxLog = Math.max(...values);
            return values.map(v => normalizeByLog(v, maxLog));
        
        case 'sqrt':
            const maxSqrt = Math.max(...values);
            return values.map(v => normalizeBySqrt(v, maxSqrt));
        
        case 'power':
            const maxPower = Math.max(...values);
            const power = options.power || 0.5;
            return values.map(v => normalizeByPower(v, maxPower, power));
        
        case 'quantile':
            return values.map(v => calculateQuantileRank(v, values));
        
        default:
            console.warn(`Unknown normalization method: ${method}, using percentile`);
            const defaultPercentiles = calculatePercentiles(values, [5, 95]);
            return values.map(v => normalizeByPercentiles(v, defaultPercentiles));
    }
} 