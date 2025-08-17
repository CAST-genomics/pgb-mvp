const features =
    {
    "spine": {
    "assemblyKey": "GRCh38#0#chr1",
        "nodes": [
        {
            "id": "2912+",
            "bpStart": 25240000,
            "bpEnd": 25309825,
            "lenBp": 69825
        },
        {
            "id": "2913+",
            "bpStart": 25309825,
            "bpEnd": 25324951,
            "lenBp": 15126
        },
        {
            "id": "2915+",
            "bpStart": 25324951,
            "bpEnd": 25340844,
            "lenBp": 15893
        },
        {
            "id": "2922+",
            "bpStart": 25340844,
            "bpEnd": 25364943,
            "lenBp": 24099
        },
        {
            "id": "2923+",
            "bpStart": 25364943,
            "bpEnd": 25371377,
            "lenBp": 6434
        },
        {
            "id": "2924+",
            "bpStart": 25371377,
            "bpEnd": 25372355,
            "lenBp": 978
        },
        {
            "id": "2925+",
            "bpStart": 25372355,
            "bpEnd": 25408138,
            "lenBp": 35783
        },
        {
            "id": "2926+",
            "bpStart": 25408138,
            "bpEnd": 25408183,
            "lenBp": 45
        },
        {
            "id": "2927+",
            "bpStart": 25408183,
            "bpEnd": 25408698,
            "lenBp": 515
        },
        {
            "id": "2928+",
            "bpStart": 25408698,
            "bpEnd": 25408829,
            "lenBp": 131
        },
        {
            "id": "2929+",
            "bpStart": 25408829,
            "bpEnd": 25532024,
            "lenBp": 123195
        },
        {
            "id": "2930+",
            "bpStart": 25532024,
            "bpEnd": 25604065,
            "lenBp": 72041
        }
    ],
        "edges": [
        "edge:2912+:2913+",
        "edge:2913+:2915+",
        "edge:2915+:2922+",
        "edge:2922+:2923+",
        "edge:2923+:2924+",
        "edge:2924+:2925+",
        "edge:2925+:2926+",
        "edge:2926+:2927+",
        "edge:2927+:2928+",
        "edge:2928+:2929+",
        "edge:2929+:2930+"
    ],
        "lengthBp": 364065
},
    "events": [
    {
        "id": "2912+~2913+",
        "type": "pill",
        "anchors": {
            "leftId": "2912+",
            "rightId": "2913+",
            "spanStart": 25309825,
            "spanEnd": 25309825,
            "refLenBp": 0,
            "orientation": "forward",
            "leftBpStart": 25240000,
            "leftBpEnd": 25309825,
            "rightBpStart": 25309825,
            "rightBpEnd": 25324951
        },
        "region": {
            "nodes": [
                "294049+"
            ],
            "edges": [],
            "anchorEdges": [
                "edge:2912+:294049+",
                "edge:294049+:2913+"
            ],
            "truncated": false
        },
        "paths": [
            {
                "nodes": [
                    "2912+",
                    "294049+",
                    "2913+"
                ],
                "edges": [
                    "edge:2912+:294049+",
                    "edge:294049+:2913+"
                ],
                "altLenBp": 338,
                "altPathLenBp": 338,
                "nodesDetailed": [
                    {
                        "id": "2912+",
                        "isSpine": true,
                        "lenBp": 69825,
                        "altStartBp": 0,
                        "altEndBp": 0,
                        "refBpStart": 25240000,
                        "refBpEnd": 25309825
                    },
                    {
                        "id": "294049+",
                        "isSpine": false,
                        "lenBp": 338,
                        "altStartBp": 0,
                        "altEndBp": 338,
                        "refBpStart": 25309825,
                        "refBpEnd": 25309825
                    },
                    {
                        "id": "2913+",
                        "isSpine": true,
                        "lenBp": 15126,
                        "altStartBp": 338,
                        "altEndBp": 338,
                        "refBpStart": 25309825,
                        "refBpEnd": 25324951
                    }
                ]
            }
        ],
        "stats": {
            "nPaths": 1,
            "minAltLenBp": 338,
            "maxAltLenBp": 338,
            "truncatedPaths": false,
            "removedSpineLeg": true
        },
        "relations": {
            "parentId": "2915+~2913+",
            "childrenIds": [],
            "overlapGroup": null,
            "sameAnchorGroup": 1
        }
    },
    {
        "id": "2913+~2915+",
        "type": "pill",
        "anchors": {
            "leftId": "2913+",
            "rightId": "2915+",
            "spanStart": 25324951,
            "spanEnd": 25324951,
            "refLenBp": 0,
            "orientation": "forward",
            "leftBpStart": 25309825,
            "leftBpEnd": 25324951,
            "rightBpStart": 25324951,
            "rightBpEnd": 25340844
        },
        "region": {
            "nodes": [
                "2914+"
            ],
            "edges": [],
            "anchorEdges": [
                "edge:2913+:2914+",
                "edge:2914+:2915+"
            ],
            "truncated": false
        },
        "paths": [
            {
                "nodes": [
                    "2913+",
                    "2914+",
                    "2915+"
                ],
                "edges": [
                    "edge:2913+:2914+",
                    "edge:2914+:2915+"
                ],
                "altLenBp": 173,
                "altPathLenBp": 173,
                "nodesDetailed": [
                    {
                        "id": "2913+",
                        "isSpine": true,
                        "lenBp": 15126,
                        "altStartBp": 0,
                        "altEndBp": 0,
                        "refBpStart": 25309825,
                        "refBpEnd": 25324951
                    },
                    {
                        "id": "2914+",
                        "isSpine": false,
                        "lenBp": 173,
                        "altStartBp": 0,
                        "altEndBp": 173,
                        "refBpStart": 25324951,
                        "refBpEnd": 25324951
                    },
                    {
                        "id": "2915+",
                        "isSpine": true,
                        "lenBp": 15893,
                        "altStartBp": 173,
                        "altEndBp": 173,
                        "refBpStart": 25324951,
                        "refBpEnd": 25340844
                    }
                ]
            }
        ],
        "stats": {
            "nPaths": 1,
            "minAltLenBp": 173,
            "maxAltLenBp": 173,
            "truncatedPaths": false,
            "removedSpineLeg": true
        },
        "relations": {
            "parentId": "2922+~2915+",
            "childrenIds": [],
            "overlapGroup": null,
            "sameAnchorGroup": 2
        }
    },
    {
        "id": "2913+~2912+",
        "type": "pill",
        "anchors": {
            "leftId": "2913+",
            "rightId": "2912+",
            "spanStart": 25324951,
            "spanEnd": 25240000,
            "refLenBp": 0,
            "orientation": "upstream",
            "leftBpStart": 25309825,
            "leftBpEnd": 25324951,
            "rightBpStart": 25240000,
            "rightBpEnd": 25309825
        },
        "region": {
            "nodes": [
                "294049+"
            ],
            "edges": [],
            "anchorEdges": [
                "edge:2912+:294049+",
                "edge:294049+:2913+"
            ],
            "truncated": false
        },
        "paths": [
            {
                "nodes": [
                    "2913+",
                    "294049+",
                    "2912+"
                ],
                "edges": [
                    "edge:294049+:2913+",
                    "edge:2912+:294049+"
                ],
                "altLenBp": 338,
                "altPathLenBp": 338,
                "nodesDetailed": [
                    {
                        "id": "2913+",
                        "isSpine": true,
                        "lenBp": 15126,
                        "altStartBp": 0,
                        "altEndBp": 0,
                        "refBpStart": 25309825,
                        "refBpEnd": 25324951
                    },
                    {
                        "id": "294049+",
                        "isSpine": false,
                        "lenBp": 338,
                        "altStartBp": 0,
                        "altEndBp": 338,
                        "refBpStart": 25324951,
                        "refBpEnd": 25324951
                    },
                    {
                        "id": "2912+",
                        "isSpine": true,
                        "lenBp": 69825,
                        "altStartBp": 338,
                        "altEndBp": 338,
                        "refBpStart": 25240000,
                        "refBpEnd": 25309825
                    }
                ]
            }
        ],
        "stats": {
            "nPaths": 1,
            "minAltLenBp": 338,
            "maxAltLenBp": 338,
            "truncatedPaths": false,
            "removedSpineLeg": true
        },
        "relations": {
            "parentId": null,
            "childrenIds": [
                "2912+~2913+",
                "2913+~2915+"
            ],
            "overlapGroup": 1,
            "sameAnchorGroup": 3
        }
    },
    {
        "id": "2915+~2913+",
        "type": "pill",
        "anchors": {
            "leftId": "2915+",
            "rightId": "2913+",
            "spanStart": 25340844,
            "spanEnd": 25309825,
            "refLenBp": 0,
            "orientation": "upstream",
            "leftBpStart": 25324951,
            "leftBpEnd": 25340844,
            "rightBpStart": 25309825,
            "rightBpEnd": 25324951
        },
        "region": {
            "nodes": [
                "2914+"
            ],
            "edges": [],
            "anchorEdges": [
                "edge:2913+:2914+",
                "edge:2914+:2915+"
            ],
            "truncated": false
        },
        "paths": [
            {
                "nodes": [
                    "2915+",
                    "2914+",
                    "2913+"
                ],
                "edges": [
                    "edge:2914+:2915+",
                    "edge:2913+:2914+"
                ],
                "altLenBp": 173,
                "altPathLenBp": 173,
                "nodesDetailed": [
                    {
                        "id": "2915+",
                        "isSpine": true,
                        "lenBp": 15893,
                        "altStartBp": 0,
                        "altEndBp": 0,
                        "refBpStart": 25324951,
                        "refBpEnd": 25340844
                    },
                    {
                        "id": "2914+",
                        "isSpine": false,
                        "lenBp": 173,
                        "altStartBp": 0,
                        "altEndBp": 173,
                        "refBpStart": 25340844,
                        "refBpEnd": 25340844
                    },
                    {
                        "id": "2913+",
                        "isSpine": true,
                        "lenBp": 15126,
                        "altStartBp": 173,
                        "altEndBp": 173,
                        "refBpStart": 25309825,
                        "refBpEnd": 25324951
                    }
                ]
            }
        ],
        "stats": {
            "nPaths": 1,
            "minAltLenBp": 173,
            "maxAltLenBp": 173,
            "truncatedPaths": false,
            "removedSpineLeg": true
        },
        "relations": {
            "parentId": null,
            "childrenIds": [
                "2912+~2913+",
                "2913+~2915+",
                "2915+~2922+"
            ],
            "overlapGroup": 1,
            "sameAnchorGroup": 4
        }
    },
    {
        "id": "2915+~2922+",
        "type": "pill",
        "anchors": {
            "leftId": "2915+",
            "rightId": "2922+",
            "spanStart": 25340844,
            "spanEnd": 25340844,
            "refLenBp": 0,
            "orientation": "forward",
            "leftBpStart": 25324951,
            "leftBpEnd": 25340844,
            "rightBpStart": 25340844,
            "rightBpEnd": 25364943
        },
        "region": {
            "nodes": [
                "2916+",
                "2917+",
                "2918+",
                "2919+",
                "2920+",
                "2921+"
            ],
            "edges": [
                "edge:2916+:2917+",
                "edge:2917+:2918+",
                "edge:2918+:2919+",
                "edge:2919+:2920+",
                "edge:2920+:2921+"
            ],
            "anchorEdges": [
                "edge:2915+:2916+",
                "edge:2921+:2922+"
            ],
            "truncated": false
        },
        "paths": [
            {
                "nodes": [
                    "2915+",
                    "2916+",
                    "2917+",
                    "2918+",
                    "2919+",
                    "2920+",
                    "2921+",
                    "2922+"
                ],
                "edges": [
                    "edge:2915+:2916+",
                    "edge:2916+:2917+",
                    "edge:2917+:2918+",
                    "edge:2918+:2919+",
                    "edge:2919+:2920+",
                    "edge:2920+:2921+",
                    "edge:2921+:2922+"
                ],
                "altLenBp": 70329,
                "altPathLenBp": 70329,
                "nodesDetailed": [
                    {
                        "id": "2915+",
                        "isSpine": true,
                        "lenBp": 15893,
                        "altStartBp": 0,
                        "altEndBp": 0,
                        "refBpStart": 25324951,
                        "refBpEnd": 25340844
                    },
                    {
                        "id": "2916+",
                        "isSpine": false,
                        "lenBp": 32024,
                        "altStartBp": 0,
                        "altEndBp": 32024,
                        "refBpStart": 25340844,
                        "refBpEnd": 25340844
                    },
                    {
                        "id": "2917+",
                        "isSpine": false,
                        "lenBp": 9,
                        "altStartBp": 32024,
                        "altEndBp": 32033,
                        "refBpStart": 25340844,
                        "refBpEnd": 25340844
                    },
                    {
                        "id": "2918+",
                        "isSpine": false,
                        "lenBp": 1244,
                        "altStartBp": 32033,
                        "altEndBp": 33277,
                        "refBpStart": 25340844,
                        "refBpEnd": 25340844
                    },
                    {
                        "id": "2919+",
                        "isSpine": false,
                        "lenBp": 21295,
                        "altStartBp": 33277,
                        "altEndBp": 54572,
                        "refBpStart": 25340844,
                        "refBpEnd": 25340844
                    },
                    {
                        "id": "2920+",
                        "isSpine": false,
                        "lenBp": 6462,
                        "altStartBp": 54572,
                        "altEndBp": 61034,
                        "refBpStart": 25340844,
                        "refBpEnd": 25340844
                    },
                    {
                        "id": "2921+",
                        "isSpine": false,
                        "lenBp": 9295,
                        "altStartBp": 61034,
                        "altEndBp": 70329,
                        "refBpStart": 25340844,
                        "refBpEnd": 25340844
                    },
                    {
                        "id": "2922+",
                        "isSpine": true,
                        "lenBp": 24099,
                        "altStartBp": 70329,
                        "altEndBp": 70329,
                        "refBpStart": 25340844,
                        "refBpEnd": 25364943
                    }
                ]
            }
        ],
        "stats": {
            "nPaths": 1,
            "minAltLenBp": 70329,
            "maxAltLenBp": 70329,
            "truncatedPaths": false,
            "removedSpineLeg": true
        },
        "relations": {
            "parentId": "2922+~2915+",
            "childrenIds": [],
            "overlapGroup": null,
            "sameAnchorGroup": 5
        }
    },
    {
        "id": "2922+~2915+",
        "type": "pill",
        "anchors": {
            "leftId": "2922+",
            "rightId": "2915+",
            "spanStart": 25364943,
            "spanEnd": 25324951,
            "refLenBp": 0,
            "orientation": "upstream",
            "leftBpStart": 25340844,
            "leftBpEnd": 25364943,
            "rightBpStart": 25324951,
            "rightBpEnd": 25340844
        },
        "region": {
            "nodes": [
                "2921+",
                "2920+",
                "2919+",
                "2918+",
                "2917+",
                "2916+"
            ],
            "edges": [
                "edge:2920+:2921+",
                "edge:2919+:2920+",
                "edge:2918+:2919+",
                "edge:2917+:2918+",
                "edge:2916+:2917+"
            ],
            "anchorEdges": [
                "edge:2921+:2922+",
                "edge:2915+:2916+"
            ],
            "truncated": false
        },
        "paths": [
            {
                "nodes": [
                    "2922+",
                    "2921+",
                    "2920+",
                    "2919+",
                    "2918+",
                    "2917+",
                    "2916+",
                    "2915+"
                ],
                "edges": [
                    "edge:2921+:2922+",
                    "edge:2920+:2921+",
                    "edge:2919+:2920+",
                    "edge:2918+:2919+",
                    "edge:2917+:2918+",
                    "edge:2916+:2917+",
                    "edge:2915+:2916+"
                ],
                "altLenBp": 70329,
                "altPathLenBp": 70329,
                "nodesDetailed": [
                    {
                        "id": "2922+",
                        "isSpine": true,
                        "lenBp": 24099,
                        "altStartBp": 0,
                        "altEndBp": 0,
                        "refBpStart": 25340844,
                        "refBpEnd": 25364943
                    },
                    {
                        "id": "2921+",
                        "isSpine": false,
                        "lenBp": 9295,
                        "altStartBp": 0,
                        "altEndBp": 9295,
                        "refBpStart": 25364943,
                        "refBpEnd": 25364943
                    },
                    {
                        "id": "2920+",
                        "isSpine": false,
                        "lenBp": 6462,
                        "altStartBp": 9295,
                        "altEndBp": 15757,
                        "refBpStart": 25364943,
                        "refBpEnd": 25364943
                    },
                    {
                        "id": "2919+",
                        "isSpine": false,
                        "lenBp": 21295,
                        "altStartBp": 15757,
                        "altEndBp": 37052,
                        "refBpStart": 25364943,
                        "refBpEnd": 25364943
                    },
                    {
                        "id": "2918+",
                        "isSpine": false,
                        "lenBp": 1244,
                        "altStartBp": 37052,
                        "altEndBp": 38296,
                        "refBpStart": 25364943,
                        "refBpEnd": 25364943
                    },
                    {
                        "id": "2917+",
                        "isSpine": false,
                        "lenBp": 9,
                        "altStartBp": 38296,
                        "altEndBp": 38305,
                        "refBpStart": 25364943,
                        "refBpEnd": 25364943
                    },
                    {
                        "id": "2916+",
                        "isSpine": false,
                        "lenBp": 32024,
                        "altStartBp": 38305,
                        "altEndBp": 70329,
                        "refBpStart": 25364943,
                        "refBpEnd": 25364943
                    },
                    {
                        "id": "2915+",
                        "isSpine": true,
                        "lenBp": 15893,
                        "altStartBp": 70329,
                        "altEndBp": 70329,
                        "refBpStart": 25324951,
                        "refBpEnd": 25340844
                    }
                ]
            }
        ],
        "stats": {
            "nPaths": 1,
            "minAltLenBp": 70329,
            "maxAltLenBp": 70329,
            "truncatedPaths": false,
            "removedSpineLeg": true
        },
        "relations": {
            "parentId": null,
            "childrenIds": [
                "2913+~2915+",
                "2915+~2922+"
            ],
            "overlapGroup": 1,
            "sameAnchorGroup": 6
        }
    },
    {
        "id": "2925+~2927+",
        "type": "simple_bubble",
        "anchors": {
            "leftId": "2925+",
            "rightId": "2927+",
            "spanStart": 25408138,
            "spanEnd": 25408183,
            "refLenBp": 45,
            "orientation": "forward",
            "leftBpStart": 25372355,
            "leftBpEnd": 25408138,
            "rightBpStart": 25408183,
            "rightBpEnd": 25408698
        },
        "region": {
            "nodes": [
                "185644+"
            ],
            "edges": [],
            "anchorEdges": [
                "edge:2925+:185644+",
                "edge:185644+:2927+"
            ],
            "truncated": false
        },
        "paths": [],
        "stats": {
            "nPaths": 0,
            "minAltLenBp": 0,
            "maxAltLenBp": 0,
            "truncatedPaths": false,
            "removedSpineLeg": true
        },
        "relations": {
            "parentId": "2927+~2925+",
            "childrenIds": [],
            "overlapGroup": null,
            "sameAnchorGroup": 7
        }
    },
    {
        "id": "2927+~2929+",
        "type": "simple_bubble",
        "anchors": {
            "leftId": "2927+",
            "rightId": "2929+",
            "spanStart": 25408698,
            "spanEnd": 25408829,
            "refLenBp": 131,
            "orientation": "forward",
            "leftBpStart": 25408183,
            "leftBpEnd": 25408698,
            "rightBpStart": 25408829,
            "rightBpEnd": 25532024
        },
        "region": {
            "nodes": [
                "185645+"
            ],
            "edges": [],
            "anchorEdges": [
                "edge:2927+:185645+",
                "edge:185645+:2929+"
            ],
            "truncated": false
        },
        "paths": [
            {
                "nodes": [
                    "2927+",
                    "185645+",
                    "2929+"
                ],
                "edges": [
                    "edge:2927+:185645+",
                    "edge:185645+:2929+"
                ],
                "altLenBp": 104,
                "altPathLenBp": 104,
                "nodesDetailed": [
                    {
                        "id": "2927+",
                        "isSpine": true,
                        "lenBp": 515,
                        "altStartBp": 0,
                        "altEndBp": 0,
                        "refBpStart": 25408183,
                        "refBpEnd": 25408698
                    },
                    {
                        "id": "185645+",
                        "isSpine": false,
                        "lenBp": 104,
                        "altStartBp": 0,
                        "altEndBp": 104,
                        "refBpStart": 25408698,
                        "refBpEnd": 25408829
                    },
                    {
                        "id": "2929+",
                        "isSpine": true,
                        "lenBp": 123195,
                        "altStartBp": 104,
                        "altEndBp": 104,
                        "refBpStart": 25408829,
                        "refBpEnd": 25532024
                    }
                ]
            }
        ],
        "stats": {
            "nPaths": 1,
            "minAltLenBp": 104,
            "maxAltLenBp": 104,
            "truncatedPaths": false,
            "removedSpineLeg": true
        },
        "relations": {
            "parentId": "2929+~2927+",
            "childrenIds": [],
            "overlapGroup": null,
            "sameAnchorGroup": 8
        }
    },
    {
        "id": "2927+~2925+",
        "type": "pill",
        "anchors": {
            "leftId": "2927+",
            "rightId": "2925+",
            "spanStart": 25408698,
            "spanEnd": 25372355,
            "refLenBp": 0,
            "orientation": "upstream",
            "leftBpStart": 25408183,
            "leftBpEnd": 25408698,
            "rightBpStart": 25372355,
            "rightBpEnd": 25408138
        },
        "region": {
            "nodes": [
                "185644+"
            ],
            "edges": [],
            "anchorEdges": [
                "edge:2925+:185644+",
                "edge:185644+:2927+"
            ],
            "truncated": false
        },
        "paths": [],
        "stats": {
            "nPaths": 0,
            "minAltLenBp": 0,
            "maxAltLenBp": 0,
            "truncatedPaths": false,
            "removedSpineLeg": true
        },
        "relations": {
            "parentId": null,
            "childrenIds": [
                "2925+~2927+"
            ],
            "overlapGroup": 2,
            "sameAnchorGroup": 9
        }
    },
    {
        "id": "2929+~2930+",
        "type": "pill",
        "anchors": {
            "leftId": "2929+",
            "rightId": "2930+",
            "spanStart": 25532024,
            "spanEnd": 25532024,
            "refLenBp": 0,
            "orientation": "forward",
            "leftBpStart": 25408829,
            "leftBpEnd": 25532024,
            "rightBpStart": 25532024,
            "rightBpEnd": 25604065
        },
        "region": {
            "nodes": [
                "185646+"
            ],
            "edges": [],
            "anchorEdges": [
                "edge:2929+:185646+",
                "edge:185646+:2930+"
            ],
            "truncated": false
        },
        "paths": [
            {
                "nodes": [
                    "2929+",
                    "185646+",
                    "2930+"
                ],
                "edges": [
                    "edge:2929+:185646+",
                    "edge:185646+:2930+"
                ],
                "altLenBp": 962,
                "altPathLenBp": 962,
                "nodesDetailed": [
                    {
                        "id": "2929+",
                        "isSpine": true,
                        "lenBp": 123195,
                        "altStartBp": 0,
                        "altEndBp": 0,
                        "refBpStart": 25408829,
                        "refBpEnd": 25532024
                    },
                    {
                        "id": "185646+",
                        "isSpine": false,
                        "lenBp": 962,
                        "altStartBp": 0,
                        "altEndBp": 962,
                        "refBpStart": 25532024,
                        "refBpEnd": 25532024
                    },
                    {
                        "id": "2930+",
                        "isSpine": true,
                        "lenBp": 72041,
                        "altStartBp": 962,
                        "altEndBp": 962,
                        "refBpStart": 25532024,
                        "refBpEnd": 25604065
                    }
                ]
            }
        ],
        "stats": {
            "nPaths": 1,
            "minAltLenBp": 962,
            "maxAltLenBp": 962,
            "truncatedPaths": false,
            "removedSpineLeg": true
        },
        "relations": {
            "parentId": "2930+~2929+",
            "childrenIds": [],
            "overlapGroup": null,
            "sameAnchorGroup": 10
        }
    },
    {
        "id": "2929+~2927+",
        "type": "pill",
        "anchors": {
            "leftId": "2929+",
            "rightId": "2927+",
            "spanStart": 25532024,
            "spanEnd": 25408183,
            "refLenBp": 0,
            "orientation": "upstream",
            "leftBpStart": 25408829,
            "leftBpEnd": 25532024,
            "rightBpStart": 25408183,
            "rightBpEnd": 25408698
        },
        "region": {
            "nodes": [
                "185645+"
            ],
            "edges": [],
            "anchorEdges": [
                "edge:2927+:185645+",
                "edge:185645+:2929+"
            ],
            "truncated": false
        },
        "paths": [
            {
                "nodes": [
                    "2929+",
                    "185645+",
                    "2927+"
                ],
                "edges": [
                    "edge:185645+:2929+",
                    "edge:2927+:185645+"
                ],
                "altLenBp": 104,
                "altPathLenBp": 104,
                "nodesDetailed": [
                    {
                        "id": "2929+",
                        "isSpine": true,
                        "lenBp": 123195,
                        "altStartBp": 0,
                        "altEndBp": 0,
                        "refBpStart": 25408829,
                        "refBpEnd": 25532024
                    },
                    {
                        "id": "185645+",
                        "isSpine": false,
                        "lenBp": 104,
                        "altStartBp": 0,
                        "altEndBp": 104,
                        "refBpStart": 25532024,
                        "refBpEnd": 25532024
                    },
                    {
                        "id": "2927+",
                        "isSpine": true,
                        "lenBp": 515,
                        "altStartBp": 104,
                        "altEndBp": 104,
                        "refBpStart": 25408183,
                        "refBpEnd": 25408698
                    }
                ]
            }
        ],
        "stats": {
            "nPaths": 1,
            "minAltLenBp": 104,
            "maxAltLenBp": 104,
            "truncatedPaths": false,
            "removedSpineLeg": true
        },
        "relations": {
            "parentId": null,
            "childrenIds": [
                "2927+~2929+",
                "2929+~2930+"
            ],
            "overlapGroup": 2,
            "sameAnchorGroup": 11
        }
    },
    {
        "id": "2930+~2929+",
        "type": "pill",
        "anchors": {
            "leftId": "2930+",
            "rightId": "2929+",
            "spanStart": 25604065,
            "spanEnd": 25408829,
            "refLenBp": 0,
            "orientation": "upstream",
            "leftBpStart": 25532024,
            "leftBpEnd": 25604065,
            "rightBpStart": 25408829,
            "rightBpEnd": 25532024
        },
        "region": {
            "nodes": [
                "185646+"
            ],
            "edges": [],
            "anchorEdges": [
                "edge:2929+:185646+",
                "edge:185646+:2930+"
            ],
            "truncated": false
        },
        "paths": [
            {
                "nodes": [
                    "2930+",
                    "185646+",
                    "2929+"
                ],
                "edges": [
                    "edge:185646+:2930+",
                    "edge:2929+:185646+"
                ],
                "altLenBp": 962,
                "altPathLenBp": 962,
                "nodesDetailed": [
                    {
                        "id": "2930+",
                        "isSpine": true,
                        "lenBp": 72041,
                        "altStartBp": 0,
                        "altEndBp": 0,
                        "refBpStart": 25532024,
                        "refBpEnd": 25604065
                    },
                    {
                        "id": "185646+",
                        "isSpine": false,
                        "lenBp": 962,
                        "altStartBp": 0,
                        "altEndBp": 962,
                        "refBpStart": 25604065,
                        "refBpEnd": 25604065
                    },
                    {
                        "id": "2929+",
                        "isSpine": true,
                        "lenBp": 123195,
                        "altStartBp": 962,
                        "altEndBp": 962,
                        "refBpStart": 25408829,
                        "refBpEnd": 25532024
                    }
                ]
            }
        ],
        "stats": {
            "nPaths": 1,
            "minAltLenBp": 962,
            "maxAltLenBp": 962,
            "truncatedPaths": false,
            "removedSpineLeg": true
        },
        "relations": {
            "parentId": null,
            "childrenIds": [
                "2929+~2930+"
            ],
            "overlapGroup": 2,
            "sameAnchorGroup": 12
        }
    }
],
    "offSpine": [
    {
        "nodes": [
            "2914+"
        ],
        "edges": [],
        "size": 1
    },
    {
        "nodes": [
            "2916+",
            "2917+",
            "2918+",
            "2919+",
            "2920+",
            "2921+"
        ],
        "edges": [
            "edge:2916+:2917+",
            "edge:2917+:2918+",
            "edge:2918+:2919+",
            "edge:2919+:2920+",
            "edge:2920+:2921+"
        ],
        "size": 6
    },
    {
        "nodes": [
            "185644+"
        ],
        "edges": [],
        "size": 1
    },
    {
        "nodes": [
            "185645+"
        ],
        "edges": [],
        "size": 1
    },
    {
        "nodes": [
            "185646+"
        ],
        "edges": [],
        "size": 1
    },
    {
        "nodes": [
            "289919+"
        ],
        "edges": [],
        "size": 1
    },
    {
        "nodes": [
            "289920+"
        ],
        "edges": [],
        "size": 1
    },
    {
        "nodes": [
            "289921+"
        ],
        "edges": [],
        "size": 1
    },
    {
        "nodes": [
            "294049+"
        ],
        "edges": [],
        "size": 1
    },
    {
        "nodes": [
            "409624+"
        ],
        "edges": [],
        "size": 1
    }
]
}
