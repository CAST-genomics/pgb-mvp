const features =
    {
        "spine": {
            "assemblyKey": "GRCh38#0#chr2",
            "nodes": [
                {
                    "id": "22223+",
                    "bpStart": 879500,
                    "bpEnd": 879507,
                    "lenBp": 7
                },
                {
                    "id": "22224+",
                    "bpStart": 879507,
                    "bpEnd": 879598,
                    "lenBp": 91
                },
                {
                    "id": "22225+",
                    "bpStart": 879598,
                    "bpEnd": 881916,
                    "lenBp": 2318
                },
                {
                    "id": "22226+",
                    "bpStart": 881916,
                    "bpEnd": 881971,
                    "lenBp": 55
                },
                {
                    "id": "22227+",
                    "bpStart": 881971,
                    "bpEnd": 890685,
                    "lenBp": 8714
                }
            ],
            "edges": [
                "edge:22223+:22224+",
                "edge:22224+:22225+",
                "edge:22225+:22226+",
                "edge:22226+:22227+"
            ],
            "lengthBp": 11185
        },
        "events": [
            {
                "id": "22223+~22225+",
                "type": "braid",
                "anchors": {
                    "leftId": "22223+",
                    "rightId": "22225+",
                    "spanStart": 879507,
                    "spanEnd": 879598,
                    "refLenBp": 91,
                    "orientation": "forward",
                    "orientations": [
                        "forward",
                        "upstream"
                    ]
                },
                "region": {
                    "nodes": [
                        "690719+"
                    ],
                    "edges": [],
                    "anchorEdges": [
                        "edge:22223+:690719+",
                        "edge:690719+:22225+"
                    ],
                    "truncated": false
                },
                "paths": [
                    {
                        "nodes": [
                            "22223+",
                            "690719+",
                            "22225+"
                        ],
                        "edges": [
                            "edge:22223+:690719+",
                            "edge:690719+:22225+"
                        ],
                        "altLenBp": 1
                    }
                ],
                "stats": {
                    "nPaths": 1,
                    "minAltLenBp": 1,
                    "maxAltLenBp": 1,
                    "truncatedPaths": false,
                    "removedSpineLeg": true
                },
                "relations": {
                    "parentId": null,
                    "childrenIds": [
                        "22224+~22225+"
                    ],
                    "overlapGroup": null,
                    "sameAnchorGroup": 1
                },
                "_interval": {
                    "start": 879507,
                    "end": 879598
                },
                "_i": 0,
                "_j": 2
            },
            {
                "id": "22224+~22225+",
                "type": "pill",
                "anchors": {
                    "leftId": "22224+",
                    "rightId": "22225+",
                    "spanStart": 879598,
                    "spanEnd": 879598,
                    "refLenBp": 0,
                    "orientation": "forward",
                    "orientations": [
                        "forward",
                        "upstream"
                    ]
                },
                "region": {
                    "nodes": [
                        "535184+"
                    ],
                    "edges": [],
                    "anchorEdges": [
                        "edge:22224+:535184+",
                        "edge:535184+:22225+"
                    ],
                    "truncated": false
                },
                "paths": [
                    {
                        "nodes": [
                            "22224+",
                            "535184+",
                            "22225+"
                        ],
                        "edges": [
                            "edge:22224+:535184+",
                            "edge:535184+:22225+"
                        ],
                        "altLenBp": 60
                    }
                ],
                "stats": {
                    "nPaths": 1,
                    "minAltLenBp": 60,
                    "maxAltLenBp": 60,
                    "truncatedPaths": false,
                    "removedSpineLeg": true
                },
                "relations": {
                    "parentId": "22223+~22225+",
                    "childrenIds": [],
                    "overlapGroup": null,
                    "sameAnchorGroup": 2
                },
                "_interval": {
                    "start": 879598,
                    "end": 879598
                },
                "_i": 1,
                "_j": 2
            },
            {
                "id": "22225+~22227+",
                "type": "simple_bubble",
                "anchors": {
                    "leftId": "22225+",
                    "rightId": "22227+",
                    "spanStart": 881916,
                    "spanEnd": 881971,
                    "refLenBp": 55,
                    "orientation": "forward",
                    "orientations": [
                        "forward",
                        "upstream"
                    ]
                },
                "region": {
                    "nodes": [
                        "531230+"
                    ],
                    "edges": [],
                    "anchorEdges": [
                        "edge:22225+:531230+",
                        "edge:531230+:22227+"
                    ],
                    "truncated": false
                },
                "paths": [
                    {
                        "nodes": [
                            "22225+",
                            "531230+",
                            "22227+"
                        ],
                        "edges": [
                            "edge:22225+:531230+",
                            "edge:531230+:22227+"
                        ],
                        "altLenBp": 1
                    }
                ],
                "stats": {
                    "nPaths": 1,
                    "minAltLenBp": 1,
                    "maxAltLenBp": 1,
                    "truncatedPaths": false,
                    "removedSpineLeg": true
                },
                "relations": {
                    "parentId": null,
                    "childrenIds": [],
                    "overlapGroup": null,
                    "sameAnchorGroup": 3
                },
                "_interval": {
                    "start": 881916,
                    "end": 881971
                },
                "_i": 2,
                "_j": 4
            }
        ],
        "offSpine": [
            {
                "nodes": [
                    "531230+"
                ],
                "edges": [],
                "size": 1
            },
            {
                "nodes": [
                    "535184+"
                ],
                "edges": [],
                "size": 1
            },
            {
                "nodes": [
                    "690719+"
                ],
                "edges": [],
                "size": 1
            }
        ]
    }

