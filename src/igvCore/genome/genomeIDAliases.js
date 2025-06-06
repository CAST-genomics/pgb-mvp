/**
 * Map of version identifiers to their genome IDs
 * @type {Map<string, string>}
 */
const genomeIDAliases = new Map([
    ['GRCh38', 'hg38'],
    ['GRCh37', 'hg19'],
    ['GRCm39', 'mm39'],
    ['GRCm38', 'mm10'],
    ['NCBI37', 'mm9'],
    ['Kamilah_GGO_v0', 'gorGor6'],
    ['gorGor4.1', 'gorGor4'],
    ['UU_Cfam_GSD_1.0', 'canFam4'],
    ['ARS-UCD1.2', 'bosTau9'],
    ['UMD_3.1.1', 'bosTau8'],
    ['GRCZ11', 'danRer11'],
    ['GRCZ10', 'danRer10']
]); 

/**
 * Reverse map of genome IDs to their version identifiers
 * @type {Map<string, string>}
 */
const genomeIDReverseAliases = new Map([
    ['hg38', 'GRCh38'],
    ['hg19', 'GRCh37'],
    ['mm39', 'GRCm39'],
    ['mm10', 'GRCm38'],
    ['mm9', 'NCBI37'],
    ['gorGor6', 'Kamilah_GGO_v0'],
    ['gorGor4', 'gorGor4.1'],
    ['canFam4', 'UU_Cfam_GSD_1.0'],
    ['bosTau9', 'ARS-UCD1.2'],
    ['bosTau8', 'UMD_3.1.1'],
    ['danRer11', 'GRCZ11'],
    ['danRer10', 'GRCZ10']
]);

export { genomeIDAliases, genomeIDReverseAliases };