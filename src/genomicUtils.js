const chromosomeData = {
    "chr1": 248956422,
    "chr2": 242193529,
    "chr3": 198295559,
    "chr4": 190214555,
    "chr5": 181538259,
    "chr6": 170805979,
    "chr7": 159345973,
    "chrX": 156040895,
    "chr8": 145138636,
    "chr9": 138394717,
    "chr10": 133797422,
    "chr11": 135086622,
    "chr12": 133275309,
    "chr13": 114364328,
    "chr14": 107043718,
    "chr15": 101991189,
    "chr16": 90338345,
    "chr17": 83257441,
    "chr18": 80373285,
    "chr20": 64444167,
    "chr19": 58617616,
    "chr21": 46709983,
    "chr22": 50818468,
};

function getChromosomeNames() {
    return Object.keys(chromosomeData)
}

function getRandomChromosomeName() {
    const chromosomeNames = Object.keys(chromosomeData);
    const randomIndex = Math.floor(Math.random() * chromosomeNames.length);
    return chromosomeNames[randomIndex];
}
function getChromosomeLength(chromosomeName) {
    if (chromosomeData.hasOwnProperty(chromosomeName)) {
        return chromosomeData[chromosomeName];
    } else {
        console.warn(`Chromosome '${chromosomeName}' not found in the data.`);
        return null;
    }
}

function prettyPrint(value) {
    return value.toLocaleString(); // Adds commas for readability
}

export { getRandomChromosomeName, getChromosomeLength, prettyPrint }
