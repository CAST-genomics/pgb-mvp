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
                    "orientations": [
                        "forward",
                        "upstream"
                    ]
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
                        "altLenBp": 338
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
                    "childrenIds": [],
                    "overlapGroup": null,
                    "sameAnchorGroup": 1
                },
                "_interval": {
                    "start": 25309825,
                    "end": 25309825
                },
                "_i": 0,
                "_j": 1
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
                    "orientations": [
                        "forward",
                        "upstream"
                    ]
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
                        "altLenBp": 173
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
                    "childrenIds": [],
                    "overlapGroup": null,
                    "sameAnchorGroup": 2
                },
                "_interval": {
                    "start": 25324951,
                    "end": 25324951
                },
                "_i": 1,
                "_j": 2
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
                    "orientations": [
                        "forward",
                        "upstream"
                    ]
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
                        "altLenBp": 70329
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
                    "childrenIds": [],
                    "overlapGroup": null,
                    "sameAnchorGroup": 3
                },
                "_interval": {
                    "start": 25340844,
                    "end": 25340844
                },
                "_i": 2,
                "_j": 3
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
                    "orientations": [
                        "forward",
                        "upstream"
                    ]
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
                    "childrenIds": [],
                    "overlapGroup": null,
                    "sameAnchorGroup": 4
                },
                "_interval": {
                    "start": 25408138,
                    "end": 25408183
                },
                "_i": 6,
                "_j": 8
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
                    "orientations": [
                        "forward",
                        "upstream"
                    ]
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
                        "altLenBp": 104
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
                    "childrenIds": [],
                    "overlapGroup": null,
                    "sameAnchorGroup": 5
                },
                "_interval": {
                    "start": 25408698,
                    "end": 25408829
                },
                "_i": 8,
                "_j": 10
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
                    "orientations": [
                        "forward",
                        "upstream"
                    ]
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
                        "altLenBp": 962
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
                    "childrenIds": [],
                    "overlapGroup": null,
                    "sameAnchorGroup": 6
                },
                "_interval": {
                    "start": 25532024,
                    "end": 25532024
                },
                "_i": 10,
                "_j": 11
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

