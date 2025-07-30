# Statistics Notes for Node Assembly Percentage Analysis

## Problem Statement

The majority of node assembly percentages are clustered around low values, resulting in a heatmap with little or no visual variation. This is a classic data distribution problem where most values are concentrated at the low end of the range.

## 1. Distribution Analysis Tools

### Descriptive Statistics
- **Range**: Min, max, and actual spread of percentage values
- **Percentiles**: 25th, 50th (median), 75th, 90th, 95th percentiles
- **Mean vs Median**: If mean >> median, indicates right-skewed distribution
- **Standard Deviation**: Measure of spread around the mean
- **Coefficient of Variation**: Standard deviation / mean (normalized spread)

### Distribution Shape Analysis
- **Skewness**: Measure of distribution asymmetry (likely positive/right-skewed)
- **Kurtosis**: Measure of "tailedness" (how many outliers exist)
- **Histogram Analysis**: Visualize the actual distribution shape

## 2. Data Transformation Approaches

### Percentile-Based Normalization
Instead of using raw percentages (0-1), map to actual data percentiles:
- Map 0th percentile → 0.0
- Map 50th percentile → 0.5  
- Map 100th percentile → 1.0
- This spreads out the clustered low values

### Logarithmic Transformation
- Apply log transformation to spread out clustered values
- `normalized = log(1 + percentage) / log(1 + max_percentage)`
- Good for right-skewed data

### Square Root Transformation
- `normalized = sqrt(percentage) / sqrt(max_percentage)`
- Less aggressive than log, good for moderate skew

### Power Law Transformation
- `normalized = percentage^power / max_percentage^power`
- Where `power < 1` spreads out low values, `power > 1` compresses them

## 3. Robust Scaling Methods

### Min-Max Scaling with Outlier Handling
- Use percentiles instead of min/max to avoid outlier influence
- `normalized = (value - p5) / (p95 - p5)` where p5/p95 are 5th/95th percentiles

### Z-Score Normalization
- `normalized = (value - mean) / std_dev`
- Then map to 0-1 range
- Good for approximately normal distributions

### Quantile Normalization
- Map each value to its quantile rank (0-1)
- Forces uniform distribution

## 4. Recommended Implementation Approach

### Phase 1: Characterize the Data
1. Calculate basic statistics (min, max, mean, median, std dev)
2. Generate percentiles (10th, 25th, 50th, 75th, 90th, 95th, 99th)
3. Create a histogram to visualize the distribution

### Phase 2: Choose Transformation
Based on data characteristics:
- **If highly skewed**: Use percentile-based normalization
- **If moderately skewed**: Try square root or power law transformation
- **If you want to emphasize differences**: Use quantile normalization

### Phase 3: Enhanced nodeAssemblyStats Structure
```javascript
{
    incomingAssemblies: Set,
    outgoingAssemblies: Set,
    percentage: number,                    // Raw percentage
    normalizedPercentage: number,          // Transformed value
    percentile: number,                    // Rank among all nodes
    distributionStats: {
        min, max, mean, median, stdDev,
        percentiles: {p10, p25, p50, p75, p90, p95}
    }
}
```

## 5. Visualization Considerations

### Color Scale
- Consider using perceptually uniform color maps (like viridis, plasma)
- Ensure colorblind-friendly palettes

### Dynamic Range
- Let users choose between different normalization methods
- Provide real-time switching between raw and normalized views

### Legend
- Show the actual percentage values alongside the heatmap
- Include distribution statistics in the legend

## 6. Implementation Strategy

### Data Collection
1. Calculate raw percentages for all nodes
2. Compute distribution statistics across all nodes
3. Apply chosen transformation method
4. Store both raw and normalized values

### Performance Considerations
- Pre-calculate all statistics during initial data processing
- Cache transformation results to avoid recalculation
- Use efficient percentile calculation algorithms

### User Experience
- Provide multiple visualization modes
- Include statistical summary in UI
- Allow users to adjust transformation parameters

## 7. Expected Outcomes

### Before Transformation
- Most nodes appear similar (low color variation)
- Heatmap lacks visual distinction between nodes
- Poor user experience for identifying high-assembly nodes

### After Transformation
- Better visual separation between nodes
- Clear identification of high-assembly nodes
- More informative heatmap visualization
- Improved user understanding of assembly distribution

## 8. Future Enhancements

### Advanced Statistical Methods
- Kernel density estimation for smooth distributions
- Outlier detection and handling
- Confidence intervals for percentage estimates

### Interactive Features
- Real-time transformation parameter adjustment
- Multiple color scheme options
- Statistical summary tooltips

### Data Export
- Export distribution statistics
- Save transformation parameters
- Generate statistical reports 