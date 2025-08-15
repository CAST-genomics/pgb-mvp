const features =
    {
        "spine": {
            "assemblyKey": "GRCh38#0#chr1",
            "nodes": [
                {
                    "id": "5504+",
                    "bpStart": 25240000,
                    "bpEnd": 25275895,
                    "lenBp": 35895
                },
                {
                    "id": "5505+",
                    "bpStart": 25275895,
                    "bpEnd": 25291018,
                    "lenBp": 15123
                },
                {
                    "id": "5507+",
                    "bpStart": 25291018,
                    "bpEnd": 25304400,
                    "lenBp": 13382
                },
                {
                    "id": "5522+",
                    "bpStart": 25304400,
                    "bpEnd": 25331022,
                    "lenBp": 26622
                },
                {
                    "id": "5523+",
                    "bpStart": 25331022,
                    "bpEnd": 25337462,
                    "lenBp": 6440
                },
                {
                    "id": "5524+",
                    "bpStart": 25337462,
                    "bpEnd": 25338449,
                    "lenBp": 987
                },
                {
                    "id": "5525+",
                    "bpStart": 25338449,
                    "bpEnd": 25359762,
                    "lenBp": 21313
                },
                {
                    "id": "5527+",
                    "bpStart": 25359762,
                    "bpEnd": 25361018,
                    "lenBp": 1256
                },
                {
                    "id": "5529+",
                    "bpStart": 25361018,
                    "bpEnd": 25373255,
                    "lenBp": 12237
                },
                {
                    "id": "5530+",
                    "bpStart": 25373255,
                    "bpEnd": 25373256,
                    "lenBp": 1
                },
                {
                    "id": "5531+",
                    "bpStart": 25373256,
                    "bpEnd": 25425092,
                    "lenBp": 51836
                },
                {
                    "id": "5532+",
                    "bpStart": 25425092,
                    "bpEnd": 25497159,
                    "lenBp": 72067
                },
                {
                    "id": "5533+",
                    "bpStart": 25497159,
                    "bpEnd": 25550118,
                    "lenBp": 52959
                }
            ],
            "edges": [
                "edge:5504+:5505+",
                "edge:5505+:5507+",
                "edge:5507+:5522+",
                "edge:5522+:5523+",
                "edge:5523+:5524+",
                "edge:5524+:5525+",
                "edge:5525+:5527+",
                "edge:5527+:5529+",
                "edge:5529+:5530+",
                "edge:5530+:5531+",
                "edge:5531+:5532+",
                "edge:5532+:5533+"
            ],
            "lengthBp": 310118
        },
        "events": [
            {
                "id": "5504+~5505+",
                "type": "pill",
                "anchors": {
                    "leftId": "5504+",
                    "rightId": "5505+",
                    "spanStart": 25275895,
                    "spanEnd": 25275895,
                    "refLenBp": 0,
                    "orientation": "forward",
                    "orientations": [
                        "forward",
                        "upstream"
                    ]
                },
                "region": {
                    "nodes": [
                        "618382+"
                    ],
                    "edges": [],
                    "anchorEdges": [
                        "edge:5504+:618382+",
                        "edge:618382+:5505+"
                    ],
                    "truncated": false
                },
                "paths": [
                    {
                        "nodes": [
                            "5504+",
                            "618382+",
                            "5505+"
                        ],
                        "edges": [
                            "edge:5504+:618382+",
                            "edge:618382+:5505+"
                        ],
                        "altLenBp": 332
                    }
                ],
                "stats": {
                    "nPaths": 1,
                    "minAltLenBp": 332,
                    "maxAltLenBp": 332,
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
                    "start": 25275895,
                    "end": 25275895
                },
                "_i": 0,
                "_j": 1
            },
            {
                "id": "5505+~5507+",
                "type": "pill",
                "anchors": {
                    "leftId": "5505+",
                    "rightId": "5507+",
                    "spanStart": 25291018,
                    "spanEnd": 25291018,
                    "refLenBp": 0,
                    "orientation": "forward",
                    "orientations": [
                        "forward",
                        "upstream"
                    ]
                },
                "region": {
                    "nodes": [
                        "5506+"
                    ],
                    "edges": [],
                    "anchorEdges": [
                        "edge:5505+:5506+",
                        "edge:5506+:5507+"
                    ],
                    "truncated": false
                },
                "paths": [
                    {
                        "nodes": [
                            "5505+",
                            "5506+",
                            "5507+"
                        ],
                        "edges": [
                            "edge:5505+:5506+",
                            "edge:5506+:5507+"
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
                    "start": 25291018,
                    "end": 25291018
                },
                "_i": 1,
                "_j": 2
            },
            {
                "id": "5507+~5523+",
                "type": "braid",
                "anchors": {
                    "leftId": "5507+",
                    "rightId": "5523+",
                    "spanStart": 25304400,
                    "spanEnd": 25331022,
                    "refLenBp": 26622,
                    "orientation": "forward",
                    "orientations": [
                        "forward",
                        "upstream"
                    ]
                },
                "region": {
                    "nodes": [
                        "5508+",
                        "5509+",
                        "750140+",
                        "5510+",
                        "652987+",
                        "5511+",
                        "5512+",
                        "644132+",
                        "5513+",
                        "5514+",
                        "644133+",
                        "5515+",
                        "626344+",
                        "5516+",
                        "644134+",
                        "5517+",
                        "493032+",
                        "5518+",
                        "493033+",
                        "519405+",
                        "5519+",
                        "5520+",
                        "5521+",
                        "470948+"
                    ],
                    "edges": [
                        "edge:5508+:5509+",
                        "edge:5508+:750140+",
                        "edge:5509+:5510+",
                        "edge:5509+:652987+",
                        "edge:750140+:5509+",
                        "edge:5510+:5511+",
                        "edge:652987+:5511+",
                        "edge:5511+:5512+",
                        "edge:5511+:644132+",
                        "edge:5512+:5513+",
                        "edge:644132+:5513+",
                        "edge:5513+:5514+",
                        "edge:5513+:644133+",
                        "edge:5514+:5515+",
                        "edge:5514+:626344+",
                        "edge:644133+:5514+",
                        "edge:5515+:5516+",
                        "edge:5515+:644134+",
                        "edge:626344+:5515+",
                        "edge:5516+:5517+",
                        "edge:5516+:493032+",
                        "edge:644134+:5516+",
                        "edge:5517+:5518+",
                        "edge:493032+:493033+",
                        "edge:493032+:519405+",
                        "edge:5518+:5519+",
                        "edge:5518+:5520+",
                        "edge:493033+:5518+",
                        "edge:5519+:5520+",
                        "edge:5520+:5521+",
                        "edge:5520+:470948+",
                        "edge:470948+:5521+"
                    ],
                    "anchorEdges": [
                        "edge:5507+:5508+",
                        "edge:519405+:5523+",
                        "edge:5521+:5522+"
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
                        "5507+~5522+",
                        "5522+~5523+"
                    ],
                    "overlapGroup": null,
                    "sameAnchorGroup": 3
                },
                "_interval": {
                    "start": 25304400,
                    "end": 25331022
                },
                "_i": 2,
                "_j": 4
            },
            {
                "id": "5507+~5522+",
                "type": "pill",
                "anchors": {
                    "leftId": "5507+",
                    "rightId": "5522+",
                    "spanStart": 25304400,
                    "spanEnd": 25304400,
                    "refLenBp": 0,
                    "orientation": "forward",
                    "orientations": [
                        "forward",
                        "upstream"
                    ]
                },
                "region": {
                    "nodes": [
                        "5508+",
                        "5509+",
                        "750140+",
                        "5510+",
                        "652987+",
                        "5511+",
                        "5512+",
                        "644132+",
                        "5513+",
                        "5514+",
                        "644133+",
                        "5515+",
                        "626344+",
                        "5516+",
                        "644134+",
                        "5517+",
                        "493032+",
                        "5518+",
                        "493033+",
                        "519405+",
                        "5519+",
                        "5520+",
                        "5521+",
                        "470948+"
                    ],
                    "edges": [
                        "edge:5508+:5509+",
                        "edge:5508+:750140+",
                        "edge:5509+:5510+",
                        "edge:5509+:652987+",
                        "edge:750140+:5509+",
                        "edge:5510+:5511+",
                        "edge:652987+:5511+",
                        "edge:5511+:5512+",
                        "edge:5511+:644132+",
                        "edge:5512+:5513+",
                        "edge:644132+:5513+",
                        "edge:5513+:5514+",
                        "edge:5513+:644133+",
                        "edge:5514+:5515+",
                        "edge:5514+:626344+",
                        "edge:644133+:5514+",
                        "edge:5515+:5516+",
                        "edge:5515+:644134+",
                        "edge:626344+:5515+",
                        "edge:5516+:5517+",
                        "edge:5516+:493032+",
                        "edge:644134+:5516+",
                        "edge:5517+:5518+",
                        "edge:493032+:493033+",
                        "edge:493032+:519405+",
                        "edge:5518+:5519+",
                        "edge:5518+:5520+",
                        "edge:493033+:5518+",
                        "edge:5519+:5520+",
                        "edge:5520+:5521+",
                        "edge:5520+:470948+",
                        "edge:470948+:5521+"
                    ],
                    "anchorEdges": [
                        "edge:5507+:5508+",
                        "edge:5521+:5522+"
                    ],
                    "truncated": false
                },
                "paths": [
                    {
                        "nodes": [
                            "5507+",
                            "5508+",
                            "5509+",
                            "5510+",
                            "5511+",
                            "5512+",
                            "5513+",
                            "5514+",
                            "5515+",
                            "5516+",
                            "5517+",
                            "5518+",
                            "5520+",
                            "5521+",
                            "5522+"
                        ],
                        "edges": [
                            "edge:5507+:5508+",
                            "edge:5508+:5509+",
                            "edge:5509+:5510+",
                            "edge:5510+:5511+",
                            "edge:5511+:5512+",
                            "edge:5512+:5513+",
                            "edge:5513+:5514+",
                            "edge:5514+:5515+",
                            "edge:5515+:5516+",
                            "edge:5516+:5517+",
                            "edge:5517+:5518+",
                            "edge:5518+:5520+",
                            "edge:5520+:5521+",
                            "edge:5521+:5522+"
                        ],
                        "altLenBp": 69723
                    }
                ],
                "stats": {
                    "nPaths": 1,
                    "minAltLenBp": 69723,
                    "maxAltLenBp": 69723,
                    "truncatedPaths": false,
                    "removedSpineLeg": true
                },
                "relations": {
                    "parentId": "5507+~5523+",
                    "childrenIds": [],
                    "overlapGroup": null,
                    "sameAnchorGroup": 4
                },
                "_interval": {
                    "start": 25304400,
                    "end": 25304400
                },
                "_i": 2,
                "_j": 3
            },
            {
                "id": "5522+~5523+",
                "type": "pill",
                "anchors": {
                    "leftId": "5522+",
                    "rightId": "5523+",
                    "spanStart": 25331022,
                    "spanEnd": 25331022,
                    "refLenBp": 0,
                    "orientation": "forward",
                    "orientations": [
                        "forward",
                        "upstream"
                    ]
                },
                "region": {
                    "nodes": [
                        "5521+",
                        "5520+",
                        "470948+",
                        "5518+",
                        "5519+",
                        "5517+",
                        "493033+",
                        "5516+",
                        "493032+",
                        "5515+",
                        "644134+",
                        "519405+",
                        "5514+",
                        "626344+",
                        "5513+",
                        "644133+",
                        "5512+",
                        "644132+",
                        "5511+",
                        "5510+",
                        "652987+",
                        "5509+",
                        "5508+",
                        "750140+"
                    ],
                    "edges": [
                        "edge:5520+:5521+",
                        "edge:470948+:5521+",
                        "edge:5518+:5520+",
                        "edge:5519+:5520+",
                        "edge:5520+:470948+",
                        "edge:5517+:5518+",
                        "edge:5518+:5519+",
                        "edge:493033+:5518+",
                        "edge:5516+:5517+",
                        "edge:493032+:493033+",
                        "edge:5515+:5516+",
                        "edge:5516+:493032+",
                        "edge:644134+:5516+",
                        "edge:493032+:519405+",
                        "edge:5514+:5515+",
                        "edge:5515+:644134+",
                        "edge:626344+:5515+",
                        "edge:5513+:5514+",
                        "edge:5514+:626344+",
                        "edge:644133+:5514+",
                        "edge:5512+:5513+",
                        "edge:5513+:644133+",
                        "edge:644132+:5513+",
                        "edge:5511+:5512+",
                        "edge:5511+:644132+",
                        "edge:5510+:5511+",
                        "edge:652987+:5511+",
                        "edge:5509+:5510+",
                        "edge:5509+:652987+",
                        "edge:5508+:5509+",
                        "edge:750140+:5509+",
                        "edge:5508+:750140+"
                    ],
                    "anchorEdges": [
                        "edge:5521+:5522+",
                        "edge:519405+:5523+"
                    ],
                    "truncated": false
                },
                "paths": [
                    {
                        "nodes": [
                            "5522+",
                            "5521+",
                            "5520+",
                            "5518+",
                            "493033+",
                            "493032+",
                            "519405+",
                            "5523+"
                        ],
                        "edges": [
                            "edge:5521+:5522+",
                            "edge:5520+:5521+",
                            "edge:5518+:5520+",
                            "edge:493033+:5518+",
                            "edge:493032+:493033+",
                            "edge:493032+:519405+",
                            "edge:519405+:5523+"
                        ],
                        "altLenBp": 38878
                    }
                ],
                "stats": {
                    "nPaths": 1,
                    "minAltLenBp": 38878,
                    "maxAltLenBp": 38878,
                    "truncatedPaths": false,
                    "removedSpineLeg": true
                },
                "relations": {
                    "parentId": "5507+~5523+",
                    "childrenIds": [],
                    "overlapGroup": null,
                    "sameAnchorGroup": 5
                },
                "_interval": {
                    "start": 25331022,
                    "end": 25331022
                },
                "_i": 3,
                "_j": 4
            },
            {
                "id": "5523+~5525+",
                "type": "simple_bubble",
                "anchors": {
                    "leftId": "5523+",
                    "rightId": "5525+",
                    "spanStart": 25337462,
                    "spanEnd": 25338449,
                    "refLenBp": 987,
                    "orientation": "forward",
                    "orientations": [
                        "forward",
                        "upstream"
                    ]
                },
                "region": {
                    "nodes": [
                        "470949+"
                    ],
                    "edges": [],
                    "anchorEdges": [
                        "edge:5523+:470949+",
                        "edge:470949+:5525+"
                    ],
                    "truncated": false
                },
                "paths": [
                    {
                        "nodes": [
                            "5523+",
                            "470949+",
                            "5525+"
                        ],
                        "edges": [
                            "edge:5523+:470949+",
                            "edge:470949+:5525+"
                        ],
                        "altLenBp": 9
                    }
                ],
                "stats": {
                    "nPaths": 1,
                    "minAltLenBp": 9,
                    "maxAltLenBp": 9,
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
                    "start": 25337462,
                    "end": 25338449
                },
                "_i": 4,
                "_j": 6
            },
            {
                "id": "5525+~5527+",
                "type": "pill",
                "anchors": {
                    "leftId": "5525+",
                    "rightId": "5527+",
                    "spanStart": 25359762,
                    "spanEnd": 25359762,
                    "refLenBp": 0,
                    "orientation": "forward",
                    "orientations": [
                        "forward",
                        "upstream"
                    ]
                },
                "region": {
                    "nodes": [
                        "5526+"
                    ],
                    "edges": [],
                    "anchorEdges": [
                        "edge:5525+:5526+",
                        "edge:5526+:5527+"
                    ],
                    "truncated": false
                },
                "paths": [
                    {
                        "nodes": [
                            "5525+",
                            "5526+",
                            "5527+"
                        ],
                        "edges": [
                            "edge:5525+:5526+",
                            "edge:5526+:5527+"
                        ],
                        "altLenBp": 652
                    }
                ],
                "stats": {
                    "nPaths": 1,
                    "minAltLenBp": 652,
                    "maxAltLenBp": 652,
                    "truncatedPaths": false,
                    "removedSpineLeg": true
                },
                "relations": {
                    "parentId": null,
                    "childrenIds": [],
                    "overlapGroup": null,
                    "sameAnchorGroup": 7
                },
                "_interval": {
                    "start": 25359762,
                    "end": 25359762
                },
                "_i": 6,
                "_j": 7
            },
            {
                "id": "5527+~5529+",
                "type": "pill",
                "anchors": {
                    "leftId": "5527+",
                    "rightId": "5529+",
                    "spanStart": 25361018,
                    "spanEnd": 25361018,
                    "refLenBp": 0,
                    "orientation": "forward",
                    "orientations": [
                        "forward",
                        "upstream"
                    ]
                },
                "region": {
                    "nodes": [
                        "5528+"
                    ],
                    "edges": [],
                    "anchorEdges": [
                        "edge:5527+:5528+",
                        "edge:5528+:5529+"
                    ],
                    "truncated": false
                },
                "paths": [
                    {
                        "nodes": [
                            "5527+",
                            "5528+",
                            "5529+"
                        ],
                        "edges": [
                            "edge:5527+:5528+",
                            "edge:5528+:5529+"
                        ],
                        "altLenBp": 288
                    }
                ],
                "stats": {
                    "nPaths": 1,
                    "minAltLenBp": 288,
                    "maxAltLenBp": 288,
                    "truncatedPaths": false,
                    "removedSpineLeg": true
                },
                "relations": {
                    "parentId": null,
                    "childrenIds": [],
                    "overlapGroup": null,
                    "sameAnchorGroup": 8
                },
                "_interval": {
                    "start": 25361018,
                    "end": 25361018
                },
                "_i": 7,
                "_j": 8
            },
            {
                "id": "5529+~5531+",
                "type": "simple_bubble",
                "anchors": {
                    "leftId": "5529+",
                    "rightId": "5531+",
                    "spanStart": 25373255,
                    "spanEnd": 25373256,
                    "refLenBp": 1,
                    "orientation": "forward",
                    "orientations": [
                        "forward",
                        "upstream"
                    ]
                },
                "region": {
                    "nodes": [
                        "354719+"
                    ],
                    "edges": [],
                    "anchorEdges": [
                        "edge:5529+:354719+",
                        "edge:354719+:5531+"
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
                    "sameAnchorGroup": 9
                },
                "_interval": {
                    "start": 25373255,
                    "end": 25373256
                },
                "_i": 8,
                "_j": 10
            },
            {
                "id": "5531+~5532+",
                "type": "pill",
                "anchors": {
                    "leftId": "5531+",
                    "rightId": "5532+",
                    "spanStart": 25425092,
                    "spanEnd": 25425092,
                    "refLenBp": 0,
                    "orientation": "forward",
                    "orientations": [
                        "forward",
                        "upstream"
                    ]
                },
                "region": {
                    "nodes": [
                        "706338+"
                    ],
                    "edges": [],
                    "anchorEdges": [
                        "edge:5531+:706338+",
                        "edge:706338+:5532+"
                    ],
                    "truncated": false
                },
                "paths": [
                    {
                        "nodes": [
                            "5531+",
                            "706338+",
                            "5532+"
                        ],
                        "edges": [
                            "edge:5531+:706338+",
                            "edge:706338+:5532+"
                        ],
                        "altLenBp": 281
                    }
                ],
                "stats": {
                    "nPaths": 1,
                    "minAltLenBp": 281,
                    "maxAltLenBp": 281,
                    "truncatedPaths": false,
                    "removedSpineLeg": true
                },
                "relations": {
                    "parentId": null,
                    "childrenIds": [],
                    "overlapGroup": null,
                    "sameAnchorGroup": 10
                },
                "_interval": {
                    "start": 25425092,
                    "end": 25425092
                },
                "_i": 10,
                "_j": 11
            },
            {
                "id": "5532+~5533+",
                "type": "pill",
                "anchors": {
                    "leftId": "5532+",
                    "rightId": "5533+",
                    "spanStart": 25497159,
                    "spanEnd": 25497159,
                    "refLenBp": 0,
                    "orientation": "forward",
                    "orientations": [
                        "forward",
                        "upstream"
                    ]
                },
                "region": {
                    "nodes": [
                        "354720+"
                    ],
                    "edges": [],
                    "anchorEdges": [
                        "edge:5532+:354720+",
                        "edge:354720+:5533+"
                    ],
                    "truncated": false
                },
                "paths": [
                    {
                        "nodes": [
                            "5532+",
                            "354720+",
                            "5533+"
                        ],
                        "edges": [
                            "edge:5532+:354720+",
                            "edge:354720+:5533+"
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
                    "sameAnchorGroup": 11
                },
                "_interval": {
                    "start": 25497159,
                    "end": 25497159
                },
                "_i": 11,
                "_j": 12
            }
        ],
        "offSpine": [
            {
                "nodes": [
                    "5506+"
                ],
                "edges": [],
                "size": 1
            },
            {
                "nodes": [
                    "5508+",
                    "5509+",
                    "750140+",
                    "5510+",
                    "652987+",
                    "5511+",
                    "5512+",
                    "644132+",
                    "5513+",
                    "5514+",
                    "644133+",
                    "5515+",
                    "626344+",
                    "5516+",
                    "644134+",
                    "5517+",
                    "493032+",
                    "5518+",
                    "493033+",
                    "519405+",
                    "5519+",
                    "5520+",
                    "5521+",
                    "470948+"
                ],
                "edges": [
                    "edge:5508+:5509+",
                    "edge:5508+:750140+",
                    "edge:5509+:5510+",
                    "edge:5509+:652987+",
                    "edge:750140+:5509+",
                    "edge:5510+:5511+",
                    "edge:5511+:5512+",
                    "edge:5511+:644132+",
                    "edge:652987+:5511+",
                    "edge:5512+:5513+",
                    "edge:5513+:5514+",
                    "edge:5513+:644133+",
                    "edge:644132+:5513+",
                    "edge:5514+:5515+",
                    "edge:5514+:626344+",
                    "edge:644133+:5514+",
                    "edge:5515+:5516+",
                    "edge:5515+:644134+",
                    "edge:626344+:5515+",
                    "edge:5516+:5517+",
                    "edge:5516+:493032+",
                    "edge:644134+:5516+",
                    "edge:5517+:5518+",
                    "edge:493032+:493033+",
                    "edge:493032+:519405+",
                    "edge:5518+:5519+",
                    "edge:5518+:5520+",
                    "edge:493033+:5518+",
                    "edge:5519+:5520+",
                    "edge:5520+:5521+",
                    "edge:5520+:470948+",
                    "edge:470948+:5521+"
                ],
                "size": 24
            },
            {
                "nodes": [
                    "5526+"
                ],
                "edges": [],
                "size": 1
            },
            {
                "nodes": [
                    "5528+"
                ],
                "edges": [],
                "size": 1
            },
            {
                "nodes": [
                    "354719+"
                ],
                "edges": [],
                "size": 1
            },
            {
                "nodes": [
                    "354720+"
                ],
                "edges": [],
                "size": 1
            },
            {
                "nodes": [
                    "470949+"
                ],
                "edges": [],
                "size": 1
            },
            {
                "nodes": [
                    "618382+"
                ],
                "edges": [],
                "size": 1
            },
            {
                "nodes": [
                    "706338+"
                ],
                "edges": [],
                "size": 1
            }
        ]
    }

