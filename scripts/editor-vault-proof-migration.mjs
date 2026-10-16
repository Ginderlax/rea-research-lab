import assert from 'node:assert/strict';
import {readFileSync,lstatSync,realpathSync} from 'node:fs';
import {resolve,relative,sep} from 'node:path';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
const fixed={
  "schema": "rea-editor-vault-explicit-proof-transition/v1",
  "installation": {
    "manifest": {
      "path": "products/rea-studio/results/editor-vault-reviewed-production-installation-20261013/preservation-manifest.json",
      "bytes": 605900,
      "sha256": "3f810b748bfee60e396df83b668face23e52645871fcfcded3a4074445ce86d5"
    },
    "record": {
      "path": "products/rea-studio/results/editor-vault-reviewed-production-installation-20261013/installation.json",
      "bytes": 496101,
      "sha256": "89c6f2f0b5c81becc957506d590ead6c7cd550e33e8519f0ff2c3c77ec2d253d"
    },
    "records": 1098,
    "installed": 30
  },
  "sources": [
    {
      "path": "products/rea-studio/apps/editor/SEARCH-PATTERNS.md",
      "before": null,
      "after": {
        "bytes": 4541,
        "sha256": "10cf1448c9afcfffb50f775c382c8cf2ca5ec102c4e3ed52e18bd5431af4e744"
      }
    },
    {
      "path": "products/rea-studio/apps/editor/SEARCH.md",
      "before": {
        "bytes": 4604,
        "sha256": "3c13316ea1332fefdd86dbfdda55114cc0eae2f234094abbaa6ce9d7aa5878b4"
      },
      "after": {
        "bytes": 4957,
        "sha256": "601012ade78da4d20eac980d32172509772ddf73f7e45ffe62503205a363aac8"
      }
    },
    {
      "path": "products/rea-studio/apps/editor/client.mjs",
      "before": {
        "bytes": 17759,
        "sha256": "295e557ee7c341f2e1ca6fb68aac32e558455556d0c6490f6075970025afb65c"
      },
      "after": {
        "bytes": 19681,
        "sha256": "113a0781b166c9fb4c8994abcefeac0818d55719975e35dfdbead13fa4f3d62a"
      }
    },
    {
      "path": "products/rea-studio/apps/editor/search-pattern-session.mjs",
      "before": null,
      "after": {
        "bytes": 4350,
        "sha256": "01d81f633026bb8a2fa3f41af8b28cdc42821d95ac3e203f0c459c0bffdd88f6"
      }
    },
    {
      "path": "products/rea-studio/apps/editor/search-pattern-worker.mjs",
      "before": null,
      "after": {
        "bytes": 896,
        "sha256": "c09535024e5893587a0079fc2f40c2cf790e5e55c1c726433a1dbf136d0d7f8b"
      }
    },
    {
      "path": "products/rea-studio/apps/editor/search-pattern.NOTICE.md",
      "before": null,
      "after": {
        "bytes": 783,
        "sha256": "4edabb8ae68998f800378febc4b113f315dd33ca9263bdcc95ce5bfd9b81adcc"
      }
    },
    {
      "path": "products/rea-studio/apps/editor/search-pattern.integration.test.mjs",
      "before": null,
      "after": {
        "bytes": 2249,
        "sha256": "c43970eba9a07fdd3722b61237332400d707d016233a4a157a50dab78ebff219"
      }
    },
    {
      "path": "products/rea-studio/apps/editor/search-pattern.mjs",
      "before": null,
      "after": {
        "bytes": 2890,
        "sha256": "82956f54f988cb1229d51df9048974a47ec466db451f0687ed332347562ea4b5"
      }
    },
    {
      "path": "products/rea-studio/apps/editor/search-pattern.test.mjs",
      "before": null,
      "after": {
        "bytes": 7714,
        "sha256": "3b775e746c38c2f9c069bdcde1486c8e307803ca1655a9ce27344a736f6e9d23"
      }
    },
    {
      "path": "products/rea-studio/apps/editor/search-pattern.ui.test.mjs",
      "before": null,
      "after": {
        "bytes": 9654,
        "sha256": "c8ecdde9c4809bcc6d0209dc030e24dd1b7d1fdb87217b38df585c9c88ba6bb4"
      }
    },
    {
      "path": "products/rea-studio/apps/editor/server.mjs",
      "before": {
        "bytes": 6303,
        "sha256": "9036f3f139f6aeb31d07cf159694e8db127e3b65a136c1aaf20bebcf14e0acad"
      },
      "after": {
        "bytes": 6354,
        "sha256": "b745eaf2b8702f2ca8b31fcbf01b377fbbede89425ebb87c83f6bd0dc0269572"
      }
    },
    {
      "path": "products/rea-studio/apps/editor/workspace-search.mjs",
      "before": {
        "bytes": 6133,
        "sha256": "e0c53274f2577754064870d3613ed3fc0348c8c62d523d58223f80d3d6f5c38d"
      },
      "after": {
        "bytes": 8121,
        "sha256": "8c9fe66723e8de6b81244a593653c22f11cd87d0cffaeb09381e29d434b97c4f"
      }
    },
    {
      "path": "products/rea-studio/apps/editor/TEXTAREA-COORDINATES.md",
      "before": null,
      "after": {
        "bytes": 4087,
        "sha256": "77a79d482c54c097778b3b3af0b244bbbe33c7c131fe8564c6577c062541c1db"
      }
    },
    {
      "path": "products/rea-studio/apps/editor/textarea-navigation.ui.test.mjs",
      "before": null,
      "after": {
        "bytes": 10588,
        "sha256": "6540a581e17ccb3333c9894249833071c993302b1a6a9066d546af109ce63ad8"
      }
    },
    {
      "path": "products/rea-studio/apps/vault/GROUP-RECYCLE-NOTICE.md",
      "before": null,
      "after": {
        "bytes": 1863,
        "sha256": "5d1561da10d88a1c955afbec24cc39fc13ecbd8c0dca5b8c5cf3a4e93eb692c3"
      }
    },
    {
      "path": "products/rea-studio/apps/vault/GROUP-RECYCLE.md",
      "before": null,
      "after": {
        "bytes": 8377,
        "sha256": "8168d5bef70088c069b7f679ae56e6cfce65d5680e7b30a595b280a1f29e4de1"
      }
    },
    {
      "path": "products/rea-studio/apps/vault/README.md",
      "before": {
        "bytes": 9017,
        "sha256": "8d3a2adf135a05c75cde799cf716d26073714f630b7302691b0662813eedd336"
      },
      "after": {
        "bytes": 10690,
        "sha256": "656ae34d5675f34b84d0cd7c290821e3de843702310556a9240177e4ca3af3ba"
      }
    },
    {
      "path": "products/rea-studio/apps/vault/client.mjs",
      "before": {
        "bytes": 20650,
        "sha256": "85661f40f4176feeb8edf16d0dba77ec674c5123c1baf60a8fce2233d566f129"
      },
      "after": {
        "bytes": 24831,
        "sha256": "6409badcd044cadc07d17edd4d749165f5cd5498d206f946f299da48d05477a5"
      }
    },
    {
      "path": "products/rea-studio/apps/vault/group-active-controls.test.mjs",
      "before": null,
      "after": {
        "bytes": 4493,
        "sha256": "b93ff8426d2191f8b6eb35c382fe53cd14ad5db0d24129d2d945e28ecb8066c0"
      }
    },
    {
      "path": "products/rea-studio/apps/vault/group-active-root-replay.test.mjs",
      "before": null,
      "after": {
        "bytes": 9365,
        "sha256": "b235b225c87f5f62784d4f28adc52f14423ee647068155080686480d044418a7"
      }
    },
    {
      "path": "products/rea-studio/apps/vault/group-coherence-boundaries.test.mjs",
      "before": null,
      "after": {
        "bytes": 6819,
        "sha256": "b9b094ea7c8caeff769f0a9639b726bcbf5f7affa5978d42b2284768b55a9d77"
      }
    },
    {
      "path": "products/rea-studio/apps/vault/group-coherence-replay.test.mjs",
      "before": null,
      "after": {
        "bytes": 3201,
        "sha256": "dc170a96d41520e4f479ee22df8517630442a13ece49f63f48571f3c802f143d"
      }
    },
    {
      "path": "products/rea-studio/apps/vault/group-fixture.mjs",
      "before": null,
      "after": {
        "bytes": 2987,
        "sha256": "390837c8fc4b7001b0db04de7cdde1ca79aacdacba50e97a41bb2fde3e707bdd"
      }
    },
    {
      "path": "products/rea-studio/apps/vault/group-oracle.ps1",
      "before": null,
      "after": {
        "bytes": 7106,
        "sha256": "6eb69d263594cecb97b651b92bc780100d6de30ee84f3306021f97660eff85f7"
      }
    },
    {
      "path": "products/rea-studio/apps/vault/group-original.test.mjs",
      "before": null,
      "after": {
        "bytes": 10587,
        "sha256": "f8d7efe1eef99d60028895dc16efb8db771455eff2b2867cfefa3db1c48a41c4"
      }
    },
    {
      "path": "products/rea-studio/apps/vault/group-recycle.test.mjs",
      "before": null,
      "after": {
        "bytes": 10106,
        "sha256": "1c733f6a8c7c30cfba6ccff3ee589951445ae02d8011434cc39d3b166d38cfaf"
      }
    },
    {
      "path": "products/rea-studio/apps/vault/group-server.test.mjs",
      "before": null,
      "after": {
        "bytes": 3698,
        "sha256": "5876279b8febd852f5ee5df0969112b51c4ac86dee5fc89152fc7e878319a685"
      }
    },
    {
      "path": "products/rea-studio/apps/vault/group-ui.test.mjs",
      "before": null,
      "after": {
        "bytes": 6896,
        "sha256": "6f7be81d5f54f9766b34b29117827010335001ae2357dae72d9fe9256ad78c31"
      }
    },
    {
      "path": "products/rea-studio/apps/vault/recycle.mjs",
      "before": {
        "bytes": 9424,
        "sha256": "edcab6bd77e21bbc50924f593b88f3073860ff25d19db84bb234a5a3088061cb"
      },
      "after": {
        "bytes": 15642,
        "sha256": "7146759668dc03909ccb02123708c81cf23c4d125958078ae10f780723c1c3d5"
      }
    },
    {
      "path": "products/rea-studio/apps/vault/server.mjs",
      "before": {
        "bytes": 16483,
        "sha256": "ac6db70cc12c5af760b6940af76b2f4dfdbc1d7921a6ee12edd73e7ed524ddbc"
      },
      "after": {
        "bytes": 17211,
        "sha256": "1769f1ff70d92285a81f0ec9c61bd871d0d48978450915915c6f2489afa4ef8b"
      }
    }
  ],
  "routes": [
    {
      "path": "products/rea-studio/apps/editor/SEARCH.md",
      "before": {
        "bytes": 4604,
        "sha256": "3c13316ea1332fefdd86dbfdda55114cc0eae2f234094abbaa6ce9d7aa5878b4"
      },
      "after": {
        "bytes": 4957,
        "sha256": "601012ade78da4d20eac980d32172509772ddf73f7e45ffe62503205a363aac8"
      },
      "sourceRoot": "work/editor-search-pattern-textarea-fix-next",
      "sourcePath": "candidate/products/rea-studio/apps/editor/SEARCH.md",
      "originalDeclaredSource": "candidate/products/rea-studio/apps/editor/SEARCH.md",
      "sourcePlan": "work/editor-pattern-root-installation-plan-next",
      "historicalPath": "products/rea-studio/apps/editor/results/position-range-selection-followup/accepted-independent81/current-source/products/rea-studio/apps/editor/SEARCH.md.snapshot.snapshot",
      "authority": "existing-fixed-API81-source",
      "affectedInOld720": false
    },
    {
      "path": "products/rea-studio/apps/editor/client.mjs",
      "before": {
        "bytes": 17759,
        "sha256": "295e557ee7c341f2e1ca6fb68aac32e558455556d0c6490f6075970025afb65c"
      },
      "after": {
        "bytes": 19681,
        "sha256": "113a0781b166c9fb4c8994abcefeac0818d55719975e35dfdbead13fa4f3d62a"
      },
      "sourceRoot": "work/editor-search-pattern-textarea-fix-next",
      "sourcePath": "candidate/products/rea-studio/apps/editor/client.mjs",
      "originalDeclaredSource": "candidate/products/rea-studio/apps/editor/client.mjs",
      "sourcePlan": "work/editor-pattern-root-installation-plan-next",
      "historicalPath": "products/rea-studio/results/notes-layout-value-api-combined-20261013/source/apps/editor/client.mjs.snapshot.snapshot",
      "authority": "fixed-f0-847-source-capsule",
      "affectedInOld720": true
    },
    {
      "path": "products/rea-studio/apps/editor/server.mjs",
      "before": {
        "bytes": 6303,
        "sha256": "9036f3f139f6aeb31d07cf159694e8db127e3b65a136c1aaf20bebcf14e0acad"
      },
      "after": {
        "bytes": 6354,
        "sha256": "b745eaf2b8702f2ca8b31fcbf01b377fbbede89425ebb87c83f6bd0dc0269572"
      },
      "sourceRoot": "work/editor-search-pattern-textarea-fix-next",
      "sourcePath": "candidate/products/rea-studio/apps/editor/server.mjs",
      "originalDeclaredSource": "candidate/products/rea-studio/apps/editor/server.mjs",
      "sourcePlan": "work/editor-pattern-root-installation-plan-next",
      "historicalPath": "products/rea-studio/results/notes-layout-value-api-combined-20261013/source/apps/editor/server.mjs.snapshot.snapshot",
      "authority": "fixed-f0-847-source-capsule",
      "affectedInOld720": true
    },
    {
      "path": "products/rea-studio/apps/editor/workspace-search.mjs",
      "before": {
        "bytes": 6133,
        "sha256": "e0c53274f2577754064870d3613ed3fc0348c8c62d523d58223f80d3d6f5c38d"
      },
      "after": {
        "bytes": 8121,
        "sha256": "8c9fe66723e8de6b81244a593653c22f11cd87d0cffaeb09381e29d434b97c4f"
      },
      "sourceRoot": "work/editor-search-pattern-textarea-fix-next",
      "sourcePath": "candidate/products/rea-studio/apps/editor/workspace-search.mjs",
      "originalDeclaredSource": "candidate/products/rea-studio/apps/editor/workspace-search.mjs",
      "sourcePlan": "work/editor-pattern-root-installation-plan-next",
      "historicalPath": "products/rea-studio/results/notes-layout-value-api-combined-20261013/source/apps/editor/workspace-search.mjs.snapshot.snapshot",
      "authority": "fixed-f0-847-source-capsule",
      "affectedInOld720": true
    },
    {
      "path": "products/rea-studio/apps/vault/README.md",
      "before": {
        "bytes": 9017,
        "sha256": "8d3a2adf135a05c75cde799cf716d26073714f630b7302691b0662813eedd336"
      },
      "after": {
        "bytes": 10690,
        "sha256": "656ae34d5675f34b84d0cd7c290821e3de843702310556a9240177e4ca3af3ba"
      },
      "sourceRoot": "work/vault-group-publication-plan-next",
      "sourcePath": "documentation-proposal/README.md",
      "originalDeclaredSource": "documentation-proposal/README.md",
      "sourcePlan": "work/vault-group-publication-plan-next",
      "historicalPath": "products/rea-studio/results/editor-vault-reviewed-production-installation-20261013/before-images/products/rea-studio/apps/vault/README.md.snapshot",
      "authority": "new-fixed-Vault-README-before-image",
      "affectedInOld720": false
    },
    {
      "path": "products/rea-studio/apps/vault/client.mjs",
      "before": {
        "bytes": 20650,
        "sha256": "85661f40f4176feeb8edf16d0dba77ec674c5123c1baf60a8fce2233d566f129"
      },
      "after": {
        "bytes": 24831,
        "sha256": "6409badcd044cadc07d17edd4d749165f5cd5498d206f946f299da48d05477a5"
      },
      "sourceRoot": "work/vault-group-publication-plan-next",
      "sourcePath": "source-proof/payload/6409badcd044cadc07d17edd4d749165f5cd5498d206f946f299da48d05477a5.snapshot",
      "originalDeclaredSource": "products/rea-studio/apps/vault/client.mjs",
      "sourcePlan": "work/vault-group-publication-plan-next",
      "historicalPath": "products/rea-studio/results/notes-layout-value-api-combined-20261013/source/apps/vault/client.mjs.snapshot.snapshot",
      "authority": "fixed-f0-847-source-capsule",
      "affectedInOld720": true
    },
    {
      "path": "products/rea-studio/apps/vault/recycle.mjs",
      "before": {
        "bytes": 9424,
        "sha256": "edcab6bd77e21bbc50924f593b88f3073860ff25d19db84bb234a5a3088061cb"
      },
      "after": {
        "bytes": 15642,
        "sha256": "7146759668dc03909ccb02123708c81cf23c4d125958078ae10f780723c1c3d5"
      },
      "sourceRoot": "work/vault-group-publication-plan-next",
      "sourcePath": "source-proof/payload/7146759668dc03909ccb02123708c81cf23c4d125958078ae10f780723c1c3d5.snapshot",
      "originalDeclaredSource": "products/rea-studio/apps/vault/recycle.mjs",
      "sourcePlan": "work/vault-group-publication-plan-next",
      "historicalPath": "products/rea-studio/results/notes-layout-value-api-combined-20261013/source/apps/vault/recycle.mjs.snapshot.snapshot",
      "authority": "fixed-f0-847-source-capsule",
      "affectedInOld720": true
    },
    {
      "path": "products/rea-studio/apps/vault/server.mjs",
      "before": {
        "bytes": 16483,
        "sha256": "ac6db70cc12c5af760b6940af76b2f4dfdbc1d7921a6ee12edd73e7ed524ddbc"
      },
      "after": {
        "bytes": 17211,
        "sha256": "1769f1ff70d92285a81f0ec9c61bd871d0d48978450915915c6f2489afa4ef8b"
      },
      "sourceRoot": "work/vault-group-publication-plan-next",
      "sourcePath": "source-proof/payload/1769f1ff70d92285a81f0ec9c61bd871d0d48978450915915c6f2489afa4ef8b.snapshot",
      "originalDeclaredSource": "products/rea-studio/apps/vault/server.mjs",
      "sourcePlan": "work/vault-group-publication-plan-next",
      "historicalPath": "products/rea-studio/results/notes-layout-value-api-combined-20261013/source/apps/vault/server.mjs.snapshot.snapshot",
      "authority": "fixed-f0-847-source-capsule",
      "affectedInOld720": true
    }
  ],
  "sharedHost": {
    "path": "products/rea-studio/server.mjs",
    "bytes": 7840,
    "sha256": "85fe09b1b52a1d91e9d09c85d99c6e768ac4b793f5d7694a1760a4c0560a0a94"
  },
  "metadata": {
    "development": {
      "path": "products/rea-studio/results/development-validation.json",
      "bytes": 133943,
      "sha256": "1175423a8aa2660f3baea923f2ed0fdc932a53d176c0040901054eec0f1bd859",
      "historicalPath": "products/rea-studio/results/editor-vault-reviewed-production-installation-20261013/before-metadata/products/rea-studio/results/development-validation.json.snapshot",
      "tests": 847,
      "sources": 720
    },
    "status": {
      "path": "products/rea-studio/STATUS.json",
      "bytes": 9550,
      "sha256": "b41a3ece8ff01530c0174ad9c4c4d08f529e9185be5a2b3822c8bf4b92692b69",
      "historicalPath": "products/rea-studio/results/editor-vault-reviewed-production-installation-20261013/before-metadata/products/rea-studio/STATUS.json.snapshot"
    }
  },
  "verifiers": [
    {
      "path": "scripts/verify-editor-value-api-followups.mjs",
      "before": {
        "bytes": 22213,
        "sha256": "ff71c33e5f3261f5244af719722d83a651a2e41f3075466baeead16412631589"
      },
      "after": {
        "bytes": 22551,
        "sha256": "ef80f2ba98cf81b637fa8a361196ceab84f06fb9e1de5d87ccb1d0965e31017f"
      },
      "historicalPath": "products/rea-studio/results/editor-vault-proof-migration-20261013/verifier-before/verify-editor-value-api-followups.mjs.snapshot"
    },
    {
      "path": "scripts/verify-editor-save-followup.mjs",
      "before": {
        "bytes": 6745,
        "sha256": "4b93961b46b79fe901eafcfc3e1eda564803b60a12be411feb58350da604f001"
      },
      "after": {
        "bytes": 8581,
        "sha256": "2e32b4443efc07aa4a7d14a32629e2009ab94671cace973324ca5cd126c1dce8"
      },
      "historicalPath": "products/rea-studio/results/editor-vault-proof-migration-20261013/verifier-before/verify-editor-save-followup.mjs.snapshot"
    },
    {
      "path": "scripts/verify-notes-inline-followups.mjs",
      "before": {
        "bytes": 23739,
        "sha256": "b4387535d7fcbdecab43688fef286bbeccb87b826949b314fff5e5bbd6169c5e"
      },
      "after": {
        "bytes": 24029,
        "sha256": "9e8ce71e3b5bf794b3788e97cbc695223265154d48426201f5aa22f5dedd995f"
      },
      "historicalPath": "products/rea-studio/results/editor-vault-proof-migration-20261013/verifier-before/verify-notes-inline-followups.mjs.snapshot"
    },
    {
      "path": "scripts/verify-notes-vault-followups.mjs",
      "before": {
        "bytes": 24952,
        "sha256": "864794cf7fd9e875d05da339326a32e985182829a033324c014b7c2d775e6c6f"
      },
      "after": {
        "bytes": 25251,
        "sha256": "645cf96a7edd098f3d310b24ee949bc5a150190d9b0984cc61ab03f282bbe59c"
      },
      "historicalPath": "products/rea-studio/results/editor-vault-proof-migration-20261013/verifier-before/verify-notes-vault-followups.mjs.snapshot"
    },
    {
      "path": "scripts/verify-followup-records.mjs",
      "before": {
        "bytes": 37311,
        "sha256": "0d06219b7437fc99d27597713a176c108fd60c9c3a1fb016ffe3acf321a4d58d"
      },
      "after": {
        "bytes": 46118,
        "sha256": "4129e5ea25fca6b91804a6ee1ab12a3b0f7a9efa8f0e9bf8c766738a2e4ed019"
      },
      "historicalPath": "products/rea-studio/results/editor-vault-proof-migration-20261013/verifier-before/verify-followup-records.mjs.snapshot"
    },
    {
      "path": "scripts/verify-notes-layout-value-api-checkpoint.mjs",
      "before": {
        "bytes": 11580,
        "sha256": "41a503447b3fc260bfe36141dbf8aa2420d5ec0a96735f78c456c1595e95b6e0"
      },
      "after": {
        "bytes": 11915,
        "sha256": "b7db454e0d08779c6f0c0307c9fad4bd3ef5dc66c2aef5ee89eb05f168d1014a"
      },
      "historicalPath": "products/rea-studio/results/editor-vault-proof-migration-20261013/verifier-before/verify-notes-layout-value-api-checkpoint.mjs.snapshot"
    },
    {
      "path": "scripts/verify-records.mjs",
      "before": {
        "bytes": 142428,
        "sha256": "8283f709444328e1dee3483c46322a07652c2be1d2ac71ff94269c2e645e6702"
      },
      "after": {
        "bytes": 149123,
        "sha256": "b5d48417f94e9464c071610ffc2720451cebae126b94b674e67c8f6fe16967d8"
      },
      "historicalPath": "products/rea-studio/results/editor-vault-proof-migration-20261013/verifier-before/verify-records.mjs.snapshot"
    }
  ],
  "oldCapsule": {
    "path": "products/rea-studio/results/notes-layout-value-api-combined-20261013/preservation-manifest.json",
    "bytes": 237470,
    "sha256": "1826eba75ba777edbe69bdb44874a0827dbf684e9305ea49f51af134549b7004",
    "sourceFiles": 720,
    "snapshots": 727,
    "selectedAuthOnly": true
  },
  "scope": {
    "historical847NotCurrentAcceptance": true,
    "historical78NotCurrentAcceptance": true,
    "namedMigrationsOnly": true,
    "applicationExecutions": 0,
    "originalExecutions": 0,
    "browserExecutions": 0,
    "benchmarks": 0,
    "fullParity": false
  }
};
const next={
  "schema": "rea-fixed-flow-vault-proof-transition/v1",
  "sources": [
    {
      "path": "products/rea-studio/apps/flow/client.mjs",
      "before": {
        "bytes": 20564,
        "sha256": "8099ea7a96cb35aef20cd2f8610a6a346ee965a01804ebb45ef6657c3cfebb2e"
      },
      "after": {
        "bytes": 25892,
        "sha256": "8cdc00162a0ce9c96b90e7cb06ce849a99be0f92f89062e271c3a7cd490e7ab3"
      },
      "plan": "flow"
    },
    {
      "path": "products/rea-studio/apps/flow/link-http.test.mjs",
      "before": null,
      "after": {
        "bytes": 7252,
        "sha256": "496c6b86af2f5fb83384ec63a38fb7ec8efda2140875920bd077b9533f0a8b00"
      },
      "plan": "flow"
    },
    {
      "path": "products/rea-studio/apps/flow/link-original.test.mjs",
      "before": null,
      "after": {
        "bytes": 7208,
        "sha256": "6e57d79f6785fe66542013cee6f59f2f431bee671edb7071dad5923f96c9a864"
      },
      "plan": "flow"
    },
    {
      "path": "products/rea-studio/apps/flow/link-runtime-worker.mjs",
      "before": null,
      "after": {
        "bytes": 7099,
        "sha256": "1f1971b5832bc84ce2015dbd5aaa6c0a9c924405f7e1ac602e474bcb5c5ff458"
      },
      "plan": "flow"
    },
    {
      "path": "products/rea-studio/apps/flow/LINK-SOURCE-NOTICE.md",
      "before": null,
      "after": {
        "bytes": 4790,
        "sha256": "9b4b915b5cfc54efdfbce8f28f3ce0c90696078bc640cd3670b11c40729d1e70"
      },
      "plan": "flow"
    },
    {
      "path": "products/rea-studio/apps/flow/link-ui-fixture.mjs",
      "before": null,
      "after": {
        "bytes": 4333,
        "sha256": "3ded00a2e08bd94fa6da3938413903ad142022448e1afa6388c3c479fb76a4c9"
      },
      "plan": "flow"
    },
    {
      "path": "products/rea-studio/apps/flow/link-ui.test.mjs",
      "before": null,
      "after": {
        "bytes": 6758,
        "sha256": "cdb0cc48268b36ebc44124d376374e38e5605635530af97561410d161a8b84ef"
      },
      "plan": "flow"
    },
    {
      "path": "products/rea-studio/apps/flow/NATIVE-FLOWS.md",
      "before": {
        "bytes": 7041,
        "sha256": "c0a541bfd651f4ccedc7aeb741e03e485ab72b8d72f70c8097660ecdc888cd98"
      },
      "after": {
        "bytes": 10052,
        "sha256": "f2269d7749f6bb1e6974908defec6fa08e3a473ad1c343d4b50f3d16444e7d14"
      },
      "plan": "flow"
    },
    {
      "path": "products/rea-studio/apps/flow/native-link.mjs",
      "before": null,
      "after": {
        "bytes": 1989,
        "sha256": "e060d78806e1ccd25218fe3c28c58a5429206890e1b7e910e991f9e62d52721d"
      },
      "plan": "flow"
    },
    {
      "path": "products/rea-studio/apps/flow/native-link.test.mjs",
      "before": null,
      "after": {
        "bytes": 5115,
        "sha256": "734eb51ef298c9556a2f9b723aaef6346dc07746a5dd55abdfe6408c07474b12"
      },
      "plan": "flow"
    },
    {
      "path": "products/rea-studio/apps/flow/NATIVE-LINKS.md",
      "before": null,
      "after": {
        "bytes": 7291,
        "sha256": "d46a37dc9d8c2a0e652d0aec8cc4b524585dae8019892a5de651c2ec0b029553"
      },
      "plan": "flow"
    },
    {
      "path": "products/rea-studio/apps/flow/native.mjs",
      "before": {
        "bytes": 31651,
        "sha256": "dcbbc436ab79df77607eead8eefd0d6fdbc1d9623e2d28e75afc2b05292800fb"
      },
      "after": {
        "bytes": 32420,
        "sha256": "fd6157ee980e35f1e8a19dd10eeac7a74419a5e5d99064eed5b8b27fa1e3f7a0"
      },
      "plan": "flow"
    },
    {
      "path": "products/rea-studio/apps/flow/README.md",
      "before": {
        "bytes": 4615,
        "sha256": "03e5de53b392f12df9ac660a0828232012d9835e7fc0333d15bd67dd44624283"
      },
      "after": {
        "bytes": 7849,
        "sha256": "ec224ef6e793a24b85607b0713b4b78063a49fd5da9bc3266a15a039573a1b77"
      },
      "plan": "flow"
    },
    {
      "path": "products/rea-studio/apps/flow/server.mjs",
      "before": {
        "bytes": 6777,
        "sha256": "2299540b737274a75eba9e76a829ef49c7469a6d9345b2641f3891a9c24d7e34"
      },
      "after": {
        "bytes": 6814,
        "sha256": "1ef88eee32a3f97e84a348e664b66e408b32ccb80b80c7bb07897d79f77e4afc"
      },
      "plan": "flow"
    },
    {
      "path": "products/rea-studio/apps/flow/normalization-ui-fixture.mjs",
      "before": null,
      "after": {
        "bytes": 4718,
        "sha256": "142e1a31fd85ed2b547c2fcbe15a8e417dc2887cad99058b91e0122549debb5f"
      },
      "plan": "flow"
    },
    {
      "path": "products/rea-studio/apps/flow/normalization-ui.test.mjs",
      "before": null,
      "after": {
        "bytes": 8770,
        "sha256": "620ba640565a12b538e2151ebc7bdb4dba721bc5f9661fe96a006efb9baad343"
      },
      "plan": "flow"
    },
    {
      "path": "products/rea-studio/apps/flow/normalization-boundaries.test.mjs",
      "before": null,
      "after": {
        "bytes": 3841,
        "sha256": "f241662855736572c3484ef5ac07cacf91363c5a22eff21e83376df0acd8be78"
      },
      "plan": "flow"
    },
    {
      "path": "products/rea-studio/apps/flow/fixtures/normalization-seed.json",
      "before": null,
      "after": {
        "bytes": 3905,
        "sha256": "d55cbd939820a3322089f81427304442b0ba9c939c4f6534b0a585ded4b0d715"
      },
      "plan": "flow"
    },
    {
      "path": "products/rea-studio/apps/flow/NATIVE-TEXT-SOURCE.md",
      "before": null,
      "after": {
        "bytes": 5600,
        "sha256": "b7a864d1120a6f50a40d7c653662ead33eba5df21de81f98cf4b884434157b03"
      },
      "plan": "flow"
    },
    {
      "path": "products/rea-studio/apps/vault/client.mjs",
      "before": {
        "bytes": 24831,
        "sha256": "6409badcd044cadc07d17edd4d749165f5cd5498d206f946f299da48d05477a5"
      },
      "after": {
        "bytes": 29850,
        "sha256": "29f99c9132286e93ffdcc26105daa9d4209591b4aedad438cc6830841f227908"
      },
      "plan": "vault"
    },
    {
      "path": "products/rea-studio/apps/vault/server.mjs",
      "before": {
        "bytes": 17211,
        "sha256": "1769f1ff70d92285a81f0ec9c61bd871d0d48978450915915c6f2489afa4ef8b"
      },
      "after": {
        "bytes": 17806,
        "sha256": "fc2cb1a2fc8f1fcfcb8c2fee28f07c94820eb432aca1b98b40ad5bfedbcf435b"
      },
      "plan": "vault"
    },
    {
      "path": "products/rea-studio/apps/vault/recycle.mjs",
      "before": {
        "bytes": 15642,
        "sha256": "7146759668dc03909ccb02123708c81cf23c4d125958078ae10f780723c1c3d5"
      },
      "after": {
        "bytes": 18477,
        "sha256": "0e0009f551299e6e14dfe27d6853560a7abb326ae7743ea5e6863998ab8d760c"
      },
      "plan": "vault"
    },
    {
      "path": "products/rea-studio/apps/vault/group-edit.test.mjs",
      "before": null,
      "after": {
        "bytes": 12764,
        "sha256": "8579b366fc3cf291e62775cb5d82706e6e194007fc55f7a2d7b7a9fa7c52741e"
      },
      "plan": "vault"
    },
    {
      "path": "products/rea-studio/apps/vault/group-edit-server.test.mjs",
      "before": null,
      "after": {
        "bytes": 8272,
        "sha256": "36865fecc810481dd9b05d3eb80933750c92dff9c3f7ee2efb2b284b93e95902"
      },
      "plan": "vault"
    },
    {
      "path": "products/rea-studio/apps/vault/group-edit-ui.test.mjs",
      "before": null,
      "after": {
        "bytes": 15416,
        "sha256": "e51a5e5880723851cc3936a4eeaaa3ff0486254618611105117f3c117d4688f6"
      },
      "plan": "vault"
    },
    {
      "path": "products/rea-studio/apps/vault/group-edit-oracle.ps1",
      "before": null,
      "after": {
        "bytes": 5450,
        "sha256": "e32f0312e70a5fbcae816d9aab4a21248caf0f68fa114eef87abcd190c609fac"
      },
      "plan": "vault"
    },
    {
      "path": "products/rea-studio/apps/vault/group-edit-original.test.mjs",
      "before": null,
      "after": {
        "bytes": 8276,
        "sha256": "665803e04a0d19f4735b3f97db245a01145e92659415c27f9893ec97f8bc82e8"
      },
      "plan": "vault"
    },
    {
      "path": "products/rea-studio/apps/vault/group-edit-final-list-replay.test.mjs",
      "before": null,
      "after": {
        "bytes": 5654,
        "sha256": "73411eff142dd2a57cfd3da16e31179fe6a5bae75e640ad547c0c06dac7e57f6"
      },
      "plan": "vault"
    },
    {
      "path": "products/rea-studio/apps/vault/group-edit-adjacent-replay.test.mjs",
      "before": null,
      "after": {
        "bytes": 6676,
        "sha256": "ad759534d2a498b3fad70b3872a94d43321a38df45a1a290b08e9fc9143a466a"
      },
      "plan": "vault"
    },
    {
      "path": "products/rea-studio/apps/vault/group-edit-independent-persistence.test.mjs",
      "before": null,
      "after": {
        "bytes": 6728,
        "sha256": "f2d495eb1d17b245b5817686ebd508b70ce56a7bc0f161acef6cd21c257b9184"
      },
      "plan": "vault"
    },
    {
      "path": "products/rea-studio/apps/vault/group-edit-review-fixture.mjs",
      "before": null,
      "after": {
        "bytes": 5147,
        "sha256": "fa9ca0d0aceb777e82e37eab54451ccedf1011c5c2a9df81e3836c79e935d95a"
      },
      "plan": "vault"
    },
    {
      "path": "products/rea-studio/apps/vault/group-edit-correction-controls.test.mjs",
      "before": null,
      "after": {
        "bytes": 5633,
        "sha256": "d3e52a90721a884139aa6ca6d008dda9b4d231860fbe1aee5010e4e49443fa80"
      },
      "plan": "vault"
    },
    {
      "path": "products/rea-studio/apps/vault/GROUP-EDIT.md",
      "before": null,
      "after": {
        "bytes": 7847,
        "sha256": "a06a163ce96424fb4e5923b29c4acfdc9e9c7e2fa780f07e4751dad3fc30b8c4"
      },
      "plan": "vault"
    },
    {
      "path": "products/rea-studio/apps/vault/GROUP-EDIT-NOTICE.md",
      "before": null,
      "after": {
        "bytes": 1156,
        "sha256": "04585deca64963692796e99240da56d3aff8582f0eae1ef074e67f6b4a2c69ee"
      },
      "plan": "vault"
    },
    {
      "path": "products/rea-studio/apps/vault/README.md",
      "before": {
        "bytes": 10690,
        "sha256": "656ae34d5675f34b84d0cd7c290821e3de843702310556a9240177e4ca3af3ba"
      },
      "after": {
        "bytes": 11300,
        "sha256": "912c1d7db1b85fc76b39e65ee01d49f85d5f097839960ae249543a34f5a13550"
      },
      "plan": "vault"
    }
  ],
  "routes": [
    {
      "path": "products/rea-studio/apps/flow/client.mjs",
      "before": {
        "bytes": 20564,
        "sha256": "8099ea7a96cb35aef20cd2f8610a6a346ee965a01804ebb45ef6657c3cfebb2e"
      },
      "after": {
        "bytes": 25892,
        "sha256": "8cdc00162a0ce9c96b90e7cb06ce849a99be0f92f89062e271c3a7cd490e7ab3"
      },
      "plan": "flow",
      "historicalPath": "products/rea-studio/results/flow-vault-proof-transition-20261013/application-before/products/rea-studio/apps/flow/client.mjs.snapshot"
    },
    {
      "path": "products/rea-studio/apps/flow/NATIVE-FLOWS.md",
      "before": {
        "bytes": 7041,
        "sha256": "c0a541bfd651f4ccedc7aeb741e03e485ab72b8d72f70c8097660ecdc888cd98"
      },
      "after": {
        "bytes": 10052,
        "sha256": "f2269d7749f6bb1e6974908defec6fa08e3a473ad1c343d4b50f3d16444e7d14"
      },
      "plan": "flow",
      "historicalPath": "products/rea-studio/results/flow-vault-proof-transition-20261013/application-before/products/rea-studio/apps/flow/NATIVE-FLOWS.md.snapshot"
    },
    {
      "path": "products/rea-studio/apps/flow/native.mjs",
      "before": {
        "bytes": 31651,
        "sha256": "dcbbc436ab79df77607eead8eefd0d6fdbc1d9623e2d28e75afc2b05292800fb"
      },
      "after": {
        "bytes": 32420,
        "sha256": "fd6157ee980e35f1e8a19dd10eeac7a74419a5e5d99064eed5b8b27fa1e3f7a0"
      },
      "plan": "flow",
      "historicalPath": "products/rea-studio/results/flow-vault-proof-transition-20261013/application-before/products/rea-studio/apps/flow/native.mjs.snapshot"
    },
    {
      "path": "products/rea-studio/apps/flow/README.md",
      "before": {
        "bytes": 4615,
        "sha256": "03e5de53b392f12df9ac660a0828232012d9835e7fc0333d15bd67dd44624283"
      },
      "after": {
        "bytes": 7849,
        "sha256": "ec224ef6e793a24b85607b0713b4b78063a49fd5da9bc3266a15a039573a1b77"
      },
      "plan": "flow",
      "historicalPath": "products/rea-studio/results/flow-vault-proof-transition-20261013/application-before/products/rea-studio/apps/flow/README.md.snapshot"
    },
    {
      "path": "products/rea-studio/apps/flow/server.mjs",
      "before": {
        "bytes": 6777,
        "sha256": "2299540b737274a75eba9e76a829ef49c7469a6d9345b2641f3891a9c24d7e34"
      },
      "after": {
        "bytes": 6814,
        "sha256": "1ef88eee32a3f97e84a348e664b66e408b32ccb80b80c7bb07897d79f77e4afc"
      },
      "plan": "flow",
      "historicalPath": "products/rea-studio/results/flow-vault-proof-transition-20261013/application-before/products/rea-studio/apps/flow/server.mjs.snapshot"
    },
    {
      "path": "products/rea-studio/apps/vault/client.mjs",
      "before": {
        "bytes": 24831,
        "sha256": "6409badcd044cadc07d17edd4d749165f5cd5498d206f946f299da48d05477a5"
      },
      "after": {
        "bytes": 29850,
        "sha256": "29f99c9132286e93ffdcc26105daa9d4209591b4aedad438cc6830841f227908"
      },
      "plan": "vault",
      "historicalPath": "products/rea-studio/results/flow-vault-proof-transition-20261013/application-before/products/rea-studio/apps/vault/client.mjs.snapshot"
    },
    {
      "path": "products/rea-studio/apps/vault/server.mjs",
      "before": {
        "bytes": 17211,
        "sha256": "1769f1ff70d92285a81f0ec9c61bd871d0d48978450915915c6f2489afa4ef8b"
      },
      "after": {
        "bytes": 17806,
        "sha256": "fc2cb1a2fc8f1fcfcb8c2fee28f07c94820eb432aca1b98b40ad5bfedbcf435b"
      },
      "plan": "vault",
      "historicalPath": "products/rea-studio/results/flow-vault-proof-transition-20261013/application-before/products/rea-studio/apps/vault/server.mjs.snapshot"
    },
    {
      "path": "products/rea-studio/apps/vault/recycle.mjs",
      "before": {
        "bytes": 15642,
        "sha256": "7146759668dc03909ccb02123708c81cf23c4d125958078ae10f780723c1c3d5"
      },
      "after": {
        "bytes": 18477,
        "sha256": "0e0009f551299e6e14dfe27d6853560a7abb326ae7743ea5e6863998ab8d760c"
      },
      "plan": "vault",
      "historicalPath": "products/rea-studio/results/flow-vault-proof-transition-20261013/application-before/products/rea-studio/apps/vault/recycle.mjs.snapshot"
    },
    {
      "path": "products/rea-studio/apps/vault/README.md",
      "before": {
        "bytes": 10690,
        "sha256": "656ae34d5675f34b84d0cd7c290821e3de843702310556a9240177e4ca3af3ba"
      },
      "after": {
        "bytes": 11300,
        "sha256": "912c1d7db1b85fc76b39e65ee01d49f85d5f097839960ae249543a34f5a13550"
      },
      "plan": "vault",
      "historicalPath": "products/rea-studio/results/flow-vault-proof-transition-20261013/application-before/products/rea-studio/apps/vault/README.md.snapshot"
    }
  ],
  "authorities": [
    {
      "path": "products/rea-studio/results/flow-vault-proof-transition-20261013/authority/flow-installation.json.snapshot",
      "bytes": 15694,
      "sha256": "6f619d3beb2a30539f0940d4869dfbdbe41a2116129999a4151fa6c6f8e58c5a",
      "name": "flow",
      "key": "proposals",
      "rows": 19,
      "sourceManifest": {
        "bytes": 14858,
        "sha256": "7fe69cfdd42a44716e31c07b3a65a2ee29634e105acfdb35865bc4e9beb5d7a4"
      },
      "sourceManifestFiles": 83
    },
    {
      "path": "products/rea-studio/results/flow-vault-proof-transition-20261013/authority/vault-installation.json.snapshot",
      "bytes": 11916,
      "sha256": "f917b8c7daba8396242a63628573b9f4075d7709b455de25f25af6c15df89bd0",
      "name": "vault",
      "key": "rows",
      "rows": 16,
      "sourceManifest": {
        "bytes": 63455,
        "sha256": "08ba0c57de6456c8cb5c508be318703a1c55977dc0c9d7f4bd6b5271f513d99d"
      },
      "sourceManifestFiles": 291
    }
  ],
  "historical937": {
    "path": "products/rea-studio/results/editor-vault-combined-20261013/preservation-manifest.json",
    "bytes": 226183,
    "sha256": "e1c9211ca4cd302faf4e819077e5809d01539091cc8fc541fbccfde428a0b80b",
    "sourceFiles": 737,
    "snapshots": 753,
    "tests": 937,
    "selected": [
      {
        "sourcePath": "source-before.json.snapshot",
        "path": "products/rea-studio/results/editor-vault-combined-20261013/source-before.json.snapshot",
        "bytes": 138572,
        "sha256": "8d2f8ca7414ed9db51d2980264da3daa660adef30ceedbc6c2a4c2b493bb97d1"
      },
      {
        "sourcePath": "source-after.json.snapshot",
        "path": "products/rea-studio/results/editor-vault-combined-20261013/source-after.json.snapshot",
        "bytes": 138572,
        "sha256": "8d2f8ca7414ed9db51d2980264da3daa660adef30ceedbc6c2a4c2b493bb97d1"
      },
      {
        "sourcePath": "attempt-validation.json.snapshot",
        "path": "products/rea-studio/results/editor-vault-combined-20261013/attempt-validation.json.snapshot",
        "bytes": 664,
        "sha256": "2804e2e757b5617416f79e99897a7cfe15048b08b6bcf7deb722e233ea5e098d"
      },
      {
        "sourcePath": "results/development-validation.json",
        "path": "products/rea-studio/results/editor-vault-combined-20261013/development-validation.json.snapshot",
        "bytes": 137063,
        "sha256": "333303c8bd8cd131da3f01e1414b0fba92bc321b2b63f178ab91d138b2bcfa44"
      }
    ],
    "statusBefore": {
      "path": "products/rea-studio/results/flow-vault-proof-transition-20261013/metadata-before/products/rea-studio/STATUS.json.snapshot",
      "bytes": 11536,
      "sha256": "1f6eec5b4a171713ed42374cd1fd5b3878e1cfe891173394e4cd20cf4396df4b"
    }
  },
  "scope": {
    "sourceOnly": true,
    "namedRoutesOnly": true,
    "applicationExecutions": 0,
    "originalExecutions": 0,
    "browserExecutions": 0,
    "benchmarks": 0,
    "fullParity": false,
    "universalSuperiority": false
  }
};
// Third named root-verifier epoch. The original before-image and the other six
// verifier transitions above keep their exact existing identities and routes.
const publicationRootTransition={
 path:'scripts/verify-records.mjs',
 middle:{path:'products/rea-studio/results/cloud-publication-source-transition-20261015/verifier-middle/verify-records.mjs.snapshot',bytes:142684,sha256:'42f2c1c25325867d9b366a71d9e17e87349fe258cdb1b24f9f5f5585b38d77c6'},
 migrationBefore:{path:'products/rea-studio/results/cloud-publication-source-transition-20261015/verifier-middle/editor-vault-proof-migration.mjs.snapshot',bytes:47841,sha256:'3d0a4ee0b5e9eef36c357c9a3c6170008a2bb0882cc8a755756358aabdf6ced1'},
 finiteVerifier:{path:'scripts/verify-cloud-recovery-records.mjs',bytes:15778,sha256:'405c90ac8c68acdc2b281e9563637cc391e1e0574705c1cbcdf7be8e1f794482'}
};
const gitDirectoryVerifierTransition={
 path:'scripts/verify-followup-records.mjs',
 manifest:{path:'products/rea-studio/results/publication-git-directory-closure-20261015/preservation-manifest.json',bytes:7382,sha256:'37b34ad5324719094e9842343d7649af4ffbd5606f47488137e04a6ee380e49b'},
 payload:{path:'products/rea-studio/results/publication-git-directory-closure-20261015/payload/d29210777777dac0b3d12f6a656a073c9ba717cf6932dbc01b0cc6dc1e7779b8.snapshot',bytes:7,sha256:'d29210777777dac0b3d12f6a656a073c9ba717cf6932dbc01b0cc6dc1e7779b8'},
 middle:{path:'products/rea-studio/results/publication-git-directory-closure-20261015/verifier-before/verify-followup-records.mjs.snapshot',bytes:37879,sha256:'92a23a59963713966f8e6c630ea6f89e2dfe8248d8dadfacd662bf349bcd6f7e'},
 migrationBefore:{path:'products/rea-studio/results/publication-git-directory-closure-20261015/verifier-before/editor-vault-proof-migration.mjs.snapshot',bytes:49253,sha256:'4175770874c4e00e0c22f13741e4224f28bc933e4447cd78adb889bac01dc81f'}
};
const editorSaveGitDirectoryTransition={
 path:'scripts/verify-editor-save-followup.mjs',
 prefix:'products/rea-studio/results/publication-editor-save-git-closure-20261015/',
 manifest:{path:'products/rea-studio/results/publication-editor-save-git-closure-20261015/preservation-manifest.json',bytes:3291,sha256:'543db5761be73b19447bb6d0d9113efd77d80c105a3c894a38baa524a27d76c9'},
 middle:{path:'products/rea-studio/results/publication-editor-save-git-closure-20261015/verifier-before/verify-editor-save-followup.mjs.snapshot',bytes:7424,sha256:'fb3f465eaaefab1197c170410355f30764308e3f5b4e58e30d0c8059fe3e96c3'}
};
// Fourth named root epoch and exact Windows path source identities only.
const windowsPathTransition={
  "manifest": {
    "path": "products/rea-studio/results/windows-path-source-transition-20261015/preservation-manifest.json",
    "bytes": 5631,
    "sha256": "eda0b8a73da84ba425d726760b76868ddd4c4aced8130d55f79f626b659ba385"
  },
  "sources": [
    {
      "path": "products/rea-studio/apps/editor/git.test.mjs",
      "before": {
        "bytes": 11458,
        "sha256": "ab8213c182d1568254ea73db57133affbd48304b98f0d275d27c1fcf8b33f0cc"
      },
      "after": {
        "bytes": 11853,
        "sha256": "c40c070ab2dc74e6d1de1d8b80a02744740864b566d2e5de695baf3ca00da3a2"
      },
      "beforeImage": "products/rea-studio/results/windows-path-source-transition-20261015/before/products/rea-studio/apps/editor/git.test.mjs.snapshot",
      "afterImage": "products/rea-studio/results/windows-path-source-transition-20261015/after/products/rea-studio/apps/editor/git.test.mjs.snapshot"
    },
    {
      "path": "products/rea-studio/apps/sync/dav-transfer.mjs",
      "before": {
        "bytes": 14717,
        "sha256": "591146243ed9b378aed70ce4beedceeec1b12319d7747b1e21fad2282286c9bb"
      },
      "after": {
        "bytes": 15511,
        "sha256": "fa04b006d713e493827540fa04bf5e420762b5dd0bfe33e3b2e23d43c909dbbc"
      },
      "beforeImage": "products/rea-studio/results/windows-path-source-transition-20261015/before/products/rea-studio/apps/sync/dav-transfer.mjs.snapshot",
      "afterImage": "products/rea-studio/results/windows-path-source-transition-20261015/after/products/rea-studio/apps/sync/dav-transfer.mjs.snapshot"
    },
    {
      "path": "products/rea-studio/apps/sync/webdav.windows-path.test.mjs",
      "before": null,
      "after": {
        "bytes": 6871,
        "sha256": "d8cf54ed4c03321c7782c2f23fd9b3d390ea1e6660d90087183d8d528a1f4c7c"
      },
      "beforeImage": null,
      "afterImage": "products/rea-studio/results/windows-path-source-transition-20261015/after/products/rea-studio/apps/sync/webdav.windows-path.test.mjs.snapshot"
    }
  ],
  "rootBefore": {
    "path": "products/rea-studio/results/windows-path-source-transition-20261015/verifier-before/verify-records.mjs.snapshot",
    "bytes": 147529,
    "sha256": "82fc7f36c0805ee163a93aa1720ed708629ac455d90a9bdd343b30f554335304"
  },
  "migrationBefore": {
    "path": "products/rea-studio/results/windows-path-source-transition-20261015/verifier-before/editor-vault-proof-migration.mjs.snapshot",
    "bytes": 50750,
    "sha256": "8e72b3b70a9b44d1ef5ab33c11a7c28a0cda90d79f22375771a2a4dceee22f48"
  },
  "migrationLatestBefore": {
    "path": "products/rea-studio/results/windows-path-source-transition-20261015/verifier-before/editor-vault-proof-migration-editor-save-closure.mjs.snapshot",
    "bytes": 52393,
    "sha256": "f0c0b3e47c153e31764686f14d07834ad27f40bf82fe35f4c1ad6fb6dcff7651"
  }
};
const windowsPathFocusedEvidence={
  "prefix": "products/rea-studio/results/cloud-windows-path-finite-pass-20261015/",
  "manifest": {
    "path": "products/rea-studio/results/cloud-windows-path-finite-pass-20261015/preservation-manifest.json",
    "bytes": 78616,
    "sha256": "ffe6e1976f896cb50991460f598f8cb714762c6eff42087896e0096ae22d9b1d"
  },
  "selected": [
    {
      "sourcePath": "attempt-validation.json",
      "path": "products/rea-studio/results/cloud-windows-path-finite-pass-20261015/payload/41d3a9da24ee7effedbd2af7bc6dd6952a5a59895edc92b5cff7f8a33cba72c0.snapshot",
      "bytes": 4234,
      "sha256": "41d3a9da24ee7effedbd2af7bc6dd6952a5a59895edc92b5cff7f8a33cba72c0"
    },
    {
      "sourcePath": "windows-path-composition.json",
      "path": "products/rea-studio/results/cloud-windows-path-finite-pass-20261015/payload/7774bfa56f708adbe35eacebc21385a9eed56175e2df6f67c8fec0350af4b7b0.snapshot",
      "bytes": 4286,
      "sha256": "7774bfa56f708adbe35eacebc21385a9eed56175e2df6f67c8fec0350af4b7b0"
    },
    {
      "sourcePath": "windows-path-postrun-source-check.json",
      "path": "products/rea-studio/results/cloud-windows-path-finite-pass-20261015/payload/adf03e13193e81997ee515bb0e0c4ea4f790120c35ff5bf351f5a5b19bce4ea1.snapshot",
      "bytes": 3167,
      "sha256": "adf03e13193e81997ee515bb0e0c4ea4f790120c35ff5bf351f5a5b19bce4ea1"
    },
    {
      "sourcePath": "source-before.json",
      "path": "products/rea-studio/results/cloud-windows-path-finite-pass-20261015/payload/41f2b7950a3fa24d278bd5f6b912bdf221a8f7ee7af8eaa70a5a6201ae2406f2.snapshot",
      "bytes": 144298,
      "sha256": "41f2b7950a3fa24d278bd5f6b912bdf221a8f7ee7af8eaa70a5a6201ae2406f2"
    },
    {
      "sourcePath": "source-after.json",
      "path": "products/rea-studio/results/cloud-windows-path-finite-pass-20261015/payload/41f2b7950a3fa24d278bd5f6b912bdf221a8f7ee7af8eaa70a5a6201ae2406f2.snapshot",
      "bytes": 144298,
      "sha256": "41f2b7950a3fa24d278bd5f6b912bdf221a8f7ee7af8eaa70a5a6201ae2406f2"
    },
    {
      "sourcePath": "source-snapshot-manifest.json",
      "path": "products/rea-studio/results/cloud-windows-path-finite-pass-20261015/payload/126e1a9fb2e939ab8a767b6facd723cb823505846711de4114d6c560a6861212.snapshot",
      "bytes": 85162,
      "sha256": "126e1a9fb2e939ab8a767b6facd723cb823505846711de4114d6c560a6861212"
    },
    {
      "sourcePath": "stdout.txt",
      "path": "products/rea-studio/results/cloud-windows-path-finite-pass-20261015/payload/d5b87bec1e71b8ca96821de21fa2d6c7520586cf0cef4cdfa0f28392f5504dca.snapshot",
      "bytes": 11300,
      "sha256": "d5b87bec1e71b8ca96821de21fa2d6c7520586cf0cef4cdfa0f28392f5504dca"
    },
    {
      "sourcePath": "stderr.txt",
      "path": "products/rea-studio/results/cloud-windows-path-finite-pass-20261015/payload/e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855.snapshot",
      "bytes": 0,
      "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
    }
  ],
  "selectedMetadataOnly": true
};
const editorGitMismatchTransition={
  "prefix": "products/rea-studio/results/publication-editor-git-observer-20261015/",
  "manifest": {
    "path": "products/rea-studio/results/publication-editor-git-observer-20261015/preservation-manifest.json",
    "bytes": 4222,
    "sha256": "0fde86c42377c6267ba08dfa11366582d9f4d8ed9662a6a566619d5f0015c3b5"
  }
};
const archiveTransition={
  "prefix": "products/rea-studio/results/archive-aes-source-transition-20261015/",
  "sources": [
    {
      "path": "products/rea-studio/apps/archive/client.mjs",
      "before": {
        "bytes": 8881,
        "sha256": "21a5ee67b639ebb56208defd56b195d6fe9ee2bbe911976033d106951ffe6b01"
      },
      "after": {
        "bytes": 10936,
        "sha256": "56a61b81715c7cbafb4d5c9db6a2925372d050d51a6533e4e7f7fdfd2e6fd103"
      },
      "beforeImage": "products/rea-studio/results/archive-aes-source-transition-20261015/before/products/rea-studio/apps/archive/client.mjs.snapshot",
      "afterImage": "products/rea-studio/experiments/archive-aes/snapshots/proposal/products/rea-studio/apps/archive/client.mjs.snapshot"
    },
    {
      "path": "products/rea-studio/apps/archive/LZMA-COMPATIBILITY.md",
      "before": {
        "bytes": 8171,
        "sha256": "6e29d723e149422bc1ba69988b9780b55cb4cad9667c7b33824d28fe54aa1b11"
      },
      "after": {
        "bytes": 8325,
        "sha256": "294b981bcc145817694e14cd5f4d85b060b81ac6d9b915f045abe39532e78109"
      },
      "beforeImage": "products/rea-studio/results/archive-aes-source-transition-20261015/before/products/rea-studio/apps/archive/LZMA-COMPATIBILITY.md.snapshot",
      "afterImage": "products/rea-studio/experiments/archive-aes/snapshots/proposal/products/rea-studio/apps/archive/LZMA-COMPATIBILITY.md.snapshot"
    },
    {
      "path": "products/rea-studio/apps/archive/NOTICE-SOURCE-METADATA.txt",
      "before": null,
      "after": {
        "bytes": 1632,
        "sha256": "2f633fb40d69afb10e613132f2582acc41d9721e34ac88e4faa2f2b1cbb12e12"
      },
      "beforeImage": null,
      "afterImage": "products/rea-studio/experiments/archive-aes/snapshots/timestamp/products/rea-studio/apps/archive/NOTICE-SOURCE-METADATA.txt.snapshot"
    },
    {
      "path": "products/rea-studio/apps/archive/original-aes-test-helper.mjs",
      "before": null,
      "after": {
        "bytes": 2966,
        "sha256": "60505de35288e47be1fb55b6438a4db3a7ce2dc3431c1c6a989da7f0c16e6051"
      },
      "beforeImage": null,
      "afterImage": "products/rea-studio/experiments/archive-aes/snapshots/proposal/products/rea-studio/apps/archive/original-aes-test-helper.mjs.snapshot"
    },
    {
      "path": "products/rea-studio/apps/archive/README.md",
      "before": {
        "bytes": 14861,
        "sha256": "f796caf227929a00bec27df7e912e1f634e1d0fadbf6dc66c0f3310c26d668e0"
      },
      "after": {
        "bytes": 16291,
        "sha256": "42e5f0b9a90b40e04640efcf59dd50d8344d31cd95ca2e18f49dfa22ed084d53"
      },
      "beforeImage": "products/rea-studio/results/archive-aes-source-transition-20261015/before/products/rea-studio/apps/archive/README.md.snapshot",
      "afterImage": "products/rea-studio/experiments/archive-aes/snapshots/proposal/products/rea-studio/apps/archive/README.md.snapshot"
    },
    {
      "path": "products/rea-studio/apps/archive/server.mjs",
      "before": {
        "bytes": 11633,
        "sha256": "f64a7d232552eb351ee15563b53abfe88afac667c7b005747b590ab9a580410d"
      },
      "after": {
        "bytes": 13610,
        "sha256": "3aeb207a4a4f07d785493bba21dc299368d758dc1877703d2c5dc7c3c0174507"
      },
      "beforeImage": "products/rea-studio/results/archive-aes-source-transition-20261015/before/products/rea-studio/apps/archive/server.mjs.snapshot",
      "afterImage": "products/rea-studio/experiments/archive-aes/snapshots/timestamp/products/rea-studio/apps/archive/server.mjs.snapshot"
    },
    {
      "path": "products/rea-studio/apps/archive/sevenzip-aes-bounds.test.mjs",
      "before": null,
      "after": {
        "bytes": 4437,
        "sha256": "de8b502980907967bab762da46e6056b024dc93a5ddd5b1bd5e21610e6980c71"
      },
      "beforeImage": null,
      "afterImage": "products/rea-studio/experiments/archive-aes/snapshots/proposal/products/rea-studio/apps/archive/sevenzip-aes-bounds.test.mjs.snapshot"
    },
    {
      "path": "products/rea-studio/apps/archive/SEVENZIP-AES-COMPATIBILITY.md",
      "before": null,
      "after": {
        "bytes": 7268,
        "sha256": "f8a2956e326ab5f7650a8b0ddb546cab9df1671806a4a2078fdeb9c26ad76077"
      },
      "beforeImage": null,
      "afterImage": "products/rea-studio/experiments/archive-aes/snapshots/proposal/products/rea-studio/apps/archive/SEVENZIP-AES-COMPATIBILITY.md.snapshot"
    },
    {
      "path": "products/rea-studio/apps/archive/sevenzip-aes-container.test.mjs",
      "before": null,
      "after": {
        "bytes": 2010,
        "sha256": "2b58b500143fb4965f4c71f0c69469709923284303cf4b00ec178828c71f23d0"
      },
      "beforeImage": null,
      "afterImage": "products/rea-studio/experiments/archive-aes/snapshots/proposal/products/rea-studio/apps/archive/sevenzip-aes-container.test.mjs.snapshot"
    },
    {
      "path": "products/rea-studio/apps/archive/sevenzip-aes-http.test.mjs",
      "before": null,
      "after": {
        "bytes": 6069,
        "sha256": "0269e0c5be99c4da048e99a1bfaa2767260346e9d32509d9353fcf3bbe1f268a"
      },
      "beforeImage": null,
      "afterImage": "products/rea-studio/experiments/archive-aes/snapshots/proposal/products/rea-studio/apps/archive/sevenzip-aes-http.test.mjs.snapshot"
    },
    {
      "path": "products/rea-studio/apps/archive/SEVENZIP-AES-LGPL.txt",
      "before": null,
      "after": {
        "bytes": 27032,
        "sha256": "1e7e6bae5a5bde32f1ae5a7c37a082d1ab03cf89354f7f936ac40be9e39a6531"
      },
      "beforeImage": null,
      "afterImage": "products/rea-studio/experiments/archive-aes/snapshots/proposal/products/rea-studio/apps/archive/SEVENZIP-AES-LGPL.txt.snapshot"
    },
    {
      "path": "products/rea-studio/apps/archive/sevenzip-aes-original.test.mjs",
      "before": null,
      "after": {
        "bytes": 4113,
        "sha256": "21dee30cf10463464e21c4821574e74ff2b806b05ca659f5c34c16c22be0d1e9"
      },
      "beforeImage": null,
      "afterImage": "products/rea-studio/experiments/archive-aes/snapshots/proposal/products/rea-studio/apps/archive/sevenzip-aes-original.test.mjs.snapshot"
    },
    {
      "path": "products/rea-studio/apps/archive/sevenzip-aes-ui-fixture.mjs",
      "before": null,
      "after": {
        "bytes": 2496,
        "sha256": "5a1fdbc3be0f9d9e77ada96fa5b610d51b9c4df66be6bc2dba5e4e9bb527f81d"
      },
      "beforeImage": null,
      "afterImage": "products/rea-studio/experiments/archive-aes/snapshots/proposal/products/rea-studio/apps/archive/sevenzip-aes-ui-fixture.mjs.snapshot"
    },
    {
      "path": "products/rea-studio/apps/archive/sevenzip-aes-ui.test.mjs",
      "before": null,
      "after": {
        "bytes": 4649,
        "sha256": "46cebe79126c4f22b392e5a1f3af193465d18accb689858b6627a4544cf2ac34"
      },
      "beforeImage": null,
      "afterImage": "products/rea-studio/experiments/archive-aes/snapshots/proposal/products/rea-studio/apps/archive/sevenzip-aes-ui.test.mjs.snapshot"
    },
    {
      "path": "products/rea-studio/apps/archive/sevenzip-aes.mjs",
      "before": null,
      "after": {
        "bytes": 5144,
        "sha256": "6f505517c220126ba9ba7594fdc74f54bdfb570b4b94ca1a9df9ccf215cb4e27"
      },
      "beforeImage": null,
      "afterImage": "products/rea-studio/experiments/archive-aes/snapshots/proposal/products/rea-studio/apps/archive/sevenzip-aes.mjs.snapshot"
    },
    {
      "path": "products/rea-studio/apps/archive/sevenzip-aes.test.mjs",
      "before": null,
      "after": {
        "bytes": 3209,
        "sha256": "261fb39f84b87dcf91e03655d2bdd9bc0304fe4ebb315986f8f782d4523870a5"
      },
      "beforeImage": null,
      "afterImage": "products/rea-studio/experiments/archive-aes/snapshots/proposal/products/rea-studio/apps/archive/sevenzip-aes.test.mjs.snapshot"
    },
    {
      "path": "products/rea-studio/apps/archive/SEVENZIP-COMPATIBILITY.md",
      "before": {
        "bytes": 10417,
        "sha256": "1d8041a403c4de8f2bedaf6ed8fcb75fe237c49b6cdbd7190f1caca72a81fd89"
      },
      "after": {
        "bytes": 10585,
        "sha256": "54e8f99fe4348b8d23941d8d9fbf54b7b2164dafd95e8ee3ee3630fb9b74cd66"
      },
      "beforeImage": "products/rea-studio/results/archive-aes-source-transition-20261015/before/products/rea-studio/apps/archive/SEVENZIP-COMPATIBILITY.md.snapshot",
      "afterImage": "products/rea-studio/experiments/archive-aes/snapshots/proposal/products/rea-studio/apps/archive/SEVENZIP-COMPATIBILITY.md.snapshot"
    },
    {
      "path": "products/rea-studio/apps/archive/sevenzip.mjs",
      "before": {
        "bytes": 25949,
        "sha256": "7b8b775816951bd7fdbc25821503236732831169e0e35e7f4dfc3b9d719f016c"
      },
      "after": {
        "bytes": 30483,
        "sha256": "4f8aa3eb4dfb6ebbfa08068b310449ea9cb1e788df8ff6dd889a04e533136782"
      },
      "beforeImage": "products/rea-studio/results/archive-aes-source-transition-20261015/before/products/rea-studio/apps/archive/sevenzip.mjs.snapshot",
      "afterImage": "products/rea-studio/experiments/archive-aes/snapshots/proposal/products/rea-studio/apps/archive/sevenzip.mjs.snapshot"
    },
    {
      "path": "products/rea-studio/apps/archive/source-metadata.mjs",
      "before": null,
      "after": {
        "bytes": 8968,
        "sha256": "79bf64f3cf9f8a25ce73faf45201aa5b9a547ff4cb3d019fe046dbf7ba4bbeed"
      },
      "beforeImage": null,
      "afterImage": "products/rea-studio/experiments/archive-aes/snapshots/timestamp/products/rea-studio/apps/archive/source-metadata.mjs.snapshot"
    },
    {
      "path": "products/rea-studio/apps/archive/source-metadata.test.mjs",
      "before": null,
      "after": {
        "bytes": 21423,
        "sha256": "27f2d65571fa31c0db55f29c4270903dd9322dba7458ba406a017c3a4ed9469a"
      },
      "beforeImage": null,
      "afterImage": "products/rea-studio/experiments/archive-aes/snapshots/timestamp/products/rea-studio/apps/archive/source-metadata.test.mjs.snapshot"
    },
    {
      "path": "products/rea-studio/apps/archive/WINDOWS-SOURCE-METADATA.md",
      "before": null,
      "after": {
        "bytes": 4025,
        "sha256": "7b799afbdcd6713c5ab5a23954c67408f0c70aba137023109d6045b44a09a5bb"
      },
      "beforeImage": null,
      "afterImage": "products/rea-studio/experiments/archive-aes/snapshots/timestamp/products/rea-studio/apps/archive/WINDOWS-SOURCE-METADATA.md.snapshot"
    }
  ],
  "manifest": {
    "path": "products/rea-studio/results/archive-aes-source-transition-20261015/preservation-manifest.json",
    "bytes": 17491,
    "sha256": "2587f9e158445a5ce48533aa92d0c7b4568a267a6ebe669387addb5e00b45e1d"
  },
  "index": {
    "path": "products/rea-studio/apps/archive/results/aes-followup/publication-index.json",
    "bytes": 31564,
    "sha256": "cb1547b75fa9039f21b71ab40952c8b348c4253e47f9df3272e799375d8ab7dc"
  },
  "bundle": {
    "path": "products/rea-studio/experiments/archive-aes/bundle.json",
    "bytes": 80331,
    "sha256": "ed6d16f52f9209ac144f1f08d395c3e86e4c124c73a3a18a488654506ff155bb"
  },
  "finitePrefix": "products/rea-studio/results/cloud-archive-aes-finite-pass-20261015/",
  "finiteManifest": {
    "path": "products/rea-studio/results/cloud-archive-aes-finite-pass-20261015/preservation-manifest.json",
    "bytes": 87704,
    "sha256": "0231c511359d8ed8cf0de75b23a9b703fbfdbb65d816d74bf6a1a563e83dec0d"
  },
  "rootBefore": {
    "path": "products/rea-studio/results/archive-aes-source-transition-20261015/verifier-before/verify-records-requirement-evidence-provenance.mjs.snapshot",
    "bytes": 148688,
    "sha256": "cd524543c7b6c9bf2050194994667e3e805165a934da209957ecbb5559d211c4"
  },
  "migrationBefore": {
    "path": "products/rea-studio/results/archive-aes-source-transition-20261015/verifier-before/editor-vault-proof-migration-requirement-evidence-provenance.mjs.snapshot",
    "bytes": 77007,
    "sha256": "44d91261320d1ba3abbe57a2bdb2ca4466f8c2921602457cd83a1f602bbafd2c"
  },
  "integrityReader": {
    "path": "scripts/verify-archive-integration-records.mjs",
    "bytes": 6451,
    "sha256": "4e945c7ccbd9833a460f0d609e298ac94a53081635afa971d07ce7f3358071e0"
  }
};
const sha=b=>createHash('sha256').update(b).digest('hex');
const identity=b=>({bytes:b.length,sha256:sha(b)});
function same(a,b,n){assert.equal(a.bytes,b.bytes,n+' bytes');assert.equal(a.sha256,b.sha256,n+' SHA256');}
function safe(p){assert(typeof p==='string'&&p.length>0&&p.length<=4096&&!/[\\:\x00-\x1f\x7f]/.test(p)&&!p.startsWith('/'));for(const s of p.split('/'))assert(s&&s!=='.'&&s!=='..'&&!['.local','work','node_modules','artifacts','tooling'].includes(s),'Unsafe public proof path');return p;}
function expected(r){assert(r&&Number.isSafeInteger(r.bytes)&&r.bytes>=0&&r.bytes<=32*1024*1024&&/^[0-9a-f]{64}$/.test(r.sha256));return {bytes:r.bytes,sha256:r.sha256};}
/** Fixed source-only transition. No caller supplied routes or disable flag.
 * The before bytes remain historical; every named installed after is required.
 * This is bounded I/O authentication, not an atomic filesystem snapshot.
 */
const archiveFixtureCorrection={
  "manifest": {
    "path": "products/rea-studio/results/archive-aes-properties-fixture-correction-20261016/source-transition.json",
    "bytes": 2486,
    "sha256": "c076b092431eae7bc3c468d168633ee07aa7858aba1291d510edcaa1ded4919f"
  },
  "declaration": {
    "schema": "rea-archive-aes-single-test-source-correction/v1",
    "sourceOnly": true,
    "currentTarget": "products/rea-studio/apps/archive/sevenzip-aes-bounds.test.mjs",
    "before": {
      "bytes": 4437,
      "sha256": "de8b502980907967bab762da46e6056b024dc93a5ddd5b1bd5e21610e6980c71"
    },
    "after": {
      "bytes": 5255,
      "sha256": "1bdeed45439ab2094c55973d0790866991ed3f81ab5eca505d01977dee84b303"
    },
    "beforeImage": {
      "path": "products/rea-studio/results/archive-aes-properties-fixture-correction-20261016/source-before/sevenzip-aes-bounds.test.mjs.snapshot",
      "bytes": 4437,
      "sha256": "de8b502980907967bab762da46e6056b024dc93a5ddd5b1bd5e21610e6980c71"
    },
    "afterImage": {
      "path": "products/rea-studio/results/archive-aes-properties-fixture-correction-20261016/source-after/sevenzip-aes-bounds.test.mjs.snapshot",
      "bytes": 5255,
      "sha256": "1bdeed45439ab2094c55973d0790866991ed3f81ab5eca505d01977dee84b303"
    },
    "historicalAfterImage": "products/rea-studio/experiments/archive-aes/snapshots/proposal/products/rea-studio/apps/archive/sevenzip-aes-bounds.test.mjs.snapshot",
    "originalDecoder": {
      "path": "products/rea-studio/experiments/archive-aes/selected-original-source/official-source/full-source/CPP/7zip/Crypto/7zAes.cpp.snapshot",
      "bytes": 7244,
      "sha256": "d1d45ef7740bb3dadb39dfeb07834d7261b8ec7ad9e01ccdab521e08a5a011c8"
    },
    "currentArchiveFiles": 62,
    "currentTargetCount": 21,
    "changedTargetCount": 1,
    "unchangedTargets": 20,
    "topLevelTestGroupsBefore": 3,
    "topLevelTestGroupsAfter": 3,
    "historicalFiniteGroups": 161,
    "historicalFiniteSelectionContainsBoundsTestPath": true,
    "historicalFiniteBoundsContentIsPredecessor": true,
    "freshFiniteIncludesCorrectedBoundsGroups": 3,
    "targeted3OverlapFiniteSelection": true,
    "propertiesRejectionAssertionPreserved": true,
    "deterministicCounterexamples": [
      {
        "firstSaltByte": 239,
        "droppedLeadingBytes": 33,
        "cyclesPower": 63,
        "saltBytes": 15,
        "encodedIvBytes": 16
      },
      {
        "firstSaltByte": 254,
        "droppedLeadingBytes": 33,
        "cyclesPower": 63,
        "saltBytes": 16,
        "encodedIvBytes": 15
      }
    ],
    "runtimeChanged": false,
    "historicalBundleRewritten": false,
    "historicalFiniteReceiptRewritten": false,
    "historicalInstallationJournalRewritten": false,
    "genericHistoricalFallback": false,
    "currentBehavioralAcceptanceEstablished": false,
    "localProductExecutions": 0,
    "localTests": 0
  }
};

function verifyArchiveSourceTransition(rawRead, priorBefore, oldCapsule){
 const seen=new Map();let total=0;
 function read(p,r){safe(p);const b=rawRead(p);assert(Buffer.isBuffer(b)&&b.length<=256*1024);const observed=identity(b);same(observed,expected(r),p);if(seen.has(p))same(observed,seen.get(p),'Changed fixed Archive proof '+p);else{seen.set(p,observed);total+=b.length;assert(seen.size<=96&&total<=8*1024*1024,'Fixed Archive proof aggregate bound');}return b;}
 const declaration=JSON.parse(read(archiveTransition.manifest.path,archiveTransition.manifest));
 assert.equal(declaration.schema,'rea-archive-aes-source-proof-transition/v1');assert.equal(declaration.sourceOnly,true);assert.equal(declaration.productionInstalled,false);assert.equal(declaration.actualInstallationReceiptAvailable,false);assert.equal(declaration.actualFocusedAttemptAcceptedByDeclaration,false);assert.equal(declaration.oldReceiptsRewritten,false);assert.equal(declaration.oracleThreePermanentlyInstalled,false);assert.deepEqual(declaration.sources,archiveTransition.sources);assert.equal(declaration.currentSourcesMandatory,21);assert.equal(declaration.historicalReplacementRoutes,6);
 const index=JSON.parse(read(archiveTransition.index.path,archiveTransition.index));
 assert.equal(index.schema,'rea-archive-aes-installed-source-publication-map/v1');assert.equal(index.status,'source-plan-not-installation-receipt');assert.equal(index.sourceOnly,true);assert.equal(index.productionInstallationReceiptVerified,false);assert.equal(index.newBehaviorExecutedByMap,0);assert.equal(index.historicalReceiptsRebound,false);assert.equal(index.distinctTargets,21);assert.equal(index.replacements,6);assert.equal(index.additions,15);assert.deepEqual(index.currentTargets,archiveTransition.sources);assert.equal(index.currentSourceMatchingAfterPinsRequired,true);assert.equal(index.selectedReleasedSourceFiles,22);assert.equal(index.selectedSourcesAreInert,true);assert.equal(index.fullUpstreamSourceCorpusClaimed,false);
 const bundle=JSON.parse(read(archiveTransition.bundle.path,archiveTransition.bundle));assert.equal(bundle.schema,'rea-archive-aes-hosted-experimental-source-bundle/v1');assert.equal(bundle.productionInstalled,false);assert.equal(bundle.sourceOnly,true);assert.equal(bundle.finalTargets.length,21);assert.equal(bundle.archiveBaseline.length,47);assert.equal(bundle.selectedOriginalSources.length,22);assert.deepEqual(index.selectedOriginalSources,bundle.selectedOriginalSources);
 const correction=JSON.parse(read(archiveFixtureCorrection.manifest.path,archiveFixtureCorrection.manifest));assert.deepEqual(correction,archiveFixtureCorrection.declaration);read(correction.beforeImage.path,correction.before);read(correction.afterImage.path,correction.after);assert.equal(correction.currentTarget,'products/rea-studio/apps/archive/sevenzip-aes-bounds.test.mjs');assert.equal(correction.changedTargetCount,1);assert.equal(correction.unchangedTargets,20);
 const routes=new Map(archiveTransition.sources.map(r=>[r.path,r]));assert.equal(routes.size,21);let replacements=0,previousRuntimeRoutes=0;
 for(const row of archiveTransition.sources){const original=bundle.finalTargets.find(r=>r.target===row.path);assert(original);assert.deepEqual(row.before,original.before);assert.deepEqual(row.after,original.after);assert.equal(row.afterImage,original.source);if(row.path===correction.currentTarget){assert.deepEqual(row.after,correction.before);assert.equal(row.afterImage,correction.historicalAfterImage);read(row.path,correction.after);}else read(row.path,row.after);read(row.afterImage,row.after);if(row.before){read(row.beforeImage,row.before);assert.equal(row.beforeImage,archiveTransition.prefix+'before/'+row.path+'.snapshot');replacements++;const prior=priorBefore.find(r=>'products/rea-studio/'+r.path===row.path);if(prior){same(prior,row.before,'Exact Archive old937 source');const old720=oldCapsule.snapshots.find(r=>r.sourcePath==='source/'+row.path.slice('products/rea-studio/'.length)+'.snapshot');assert(old720);same(old720,row.before,'Exact Archive old720 source');previousRuntimeRoutes++;}else assert(row.path.endsWith('.md'));}else{assert.equal(row.beforeImage,null);assert.equal(priorBefore.some(r=>'products/rea-studio/'+r.path===row.path),false);}}
 assert.equal(replacements,6);assert.equal(previousRuntimeRoutes,3);
 for(const row of index.selectedOriginalSources){assert(row.publicSnapshot.startsWith('products/rea-studio/experiments/archive-aes/selected-original-source/')&&row.publicSnapshot.endsWith('.snapshot'));read(row.publicSnapshot,row);}
 assert.equal(index.license.currentNotice,'products/rea-studio/apps/archive/SEVENZIP-AES-LGPL.txt');assert.equal(index.license.metadataOwnCodeNotice,'products/rea-studio/apps/archive/NOTICE-SOURCE-METADATA.txt');
 assert.equal(declaration.records.length,14);assert.deepEqual(declaration.publicationIndex,archiveTransition.index);assert.deepEqual(declaration.oldRoot,archiveTransition.rootBefore);assert.deepEqual(declaration.oldMigration,archiveTransition.migrationBefore);for(const row of declaration.records)read(archiveTransition.prefix+row.path,row);read(archiveTransition.rootBefore.path,archiveTransition.rootBefore);read(archiveTransition.migrationBefore.path,archiveTransition.migrationBefore);read(archiveTransition.integrityReader.path,archiveTransition.integrityReader);
 const finite=index.recordedFiniteEvidence;assert.deepEqual(finite.manifest,archiveTransition.finiteManifest);assert.equal(finite.run,38808918976);assert.equal(finite.attempt,1);assert.equal(finite.testedMerge,'7d5bde3fb94e3383e6d85e50e7d567516cc6202c');assert.equal(finite.pullRequestHeadPrefix,'aeb62e6');assert.equal(finite.originalProductionInstalledField,false);assert.equal(finite.publicActiveSourcePayloads,0);assert.equal(finite.completeLocalBackupVerified,true);
 const preservation=JSON.parse(read(finite.manifest.path,finite.manifest));assert.equal(preservation.schema,'rea-cloud-archive-aes-finite-pass-preservation/v1');assert.equal(preservation.status,'passed-finite-experimental-contracts');assert.equal(preservation.runId,finite.run);assert.equal(preservation.runAttempt,1);assert.equal(preservation.sourceCommit,finite.testedMerge);assert.equal(preservation.testedGitCommit,finite.testedMerge);assert.equal(preservation.artifactId,12007542747);assert.equal(preservation.artifactSHA256,'dda4e991a00ab59484b0dda0524e8189b8abce0263c4c7631ca1aa411bb6caf9');assert.equal(preservation.records.length,35);assert.equal(preservation.uniqueInertObjects,26);assert.equal(preservation.sourceFiles,779);assert.equal(preservation.sourceStableDuringRecordedComposedRun,true);assert.equal(preservation.activeSourceSnapshotsInVerifiedLocalBackup,357);assert.equal(preservation.publicSourceSnapshotPayloads,0);assert.equal(preservation.omittedSourceSnapshotPayloads.length,357);assert.equal(preservation.completeLocalBackupVerified,true);
 assert.equal(preservation.browserAcceptance,'pending');
 for(const flag of ['productionInstalled','productionIntegrationAccepted','fullArchiveAcceptance','historicalReceiptsRebound','fullDevelopmentSuiteAcceptance','fullParity','superiority'])assert.equal(preservation[flag],false);
 const expectedNames=['composition.json','postrun-source-check.json','test-selection.json','verification/attempt-validation.json','verification/source-before.json','verification/source-after.json','verification/source-snapshot-manifest.json','verification/stdout.txt','verification/stderr.txt'];assert.deepEqual(finite.selected.map(r=>r.sourcePath),expectedNames);const selected=new Map();
 for(const row of finite.selected){const original=preservation.records.filter(r=>r.sourcePath===row.sourcePath);assert.equal(original.length,1);same(original[0],row,'Selected immutable161 metadata');assert.equal(row.path,archiveTransition.finitePrefix+original[0].path);assert.equal(selected.has(row.sourcePath),false);selected.set(row.sourcePath,read(row.path,row));}
 const json=name=>JSON.parse(selected.get(name)),composition=json('composition.json'),post=json('postrun-source-check.json'),selection=json('test-selection.json'),attempt=json('verification/attempt-validation.json'),before=json('verification/source-before.json'),after=json('verification/source-after.json'),snapshots=json('verification/source-snapshot-manifest.json');
 assert.equal(composition.schema,'rea-archive-aes-hosted-composition/v1');assert.equal(composition.status,'composed-unexecuted-experimental-overlay');assert.equal(composition.productionInstalled,false);assert.equal(composition.baselineGitCommit,finite.testedMerge);assert.equal(composition.sourceCommit,finite.testedMerge);assert.deepEqual(composition.sourceBundle,{path:archiveTransition.bundle.path,bytes:archiveTransition.bundle.bytes,sha256:archiveTransition.bundle.sha256});assert.equal(composition.beforeSourceCensus.length,47);assert.equal(composition.afterSourceCensus.length,62);assert.equal(composition.transitions.length,22);assert.deepEqual(composition.sharedBefore,composition.sharedAfter);
 const expectedTransitions=[];for(const [phase,rows]of [['proposal17',bundle.proposal],['timestamp5',bundle.timestamp]])for(const row of rows)expectedTransitions.push({phase,target:row.target,before:row.before,after:row.after,source:row.source,sourceGitCommit:finite.testedMerge,originEpoch:row.originEpoch});assert.deepEqual(composition.transitions,expectedTransitions);
 assert.equal(post.schema,'rea-archive-aes-hosted-postrun-source-check/v1');assert.equal(post.sourceStable,true);assert.equal(post.sharedStable,true);assert.equal(post.modifiedGitWorktree,true);assert.equal(post.baselineGitCommit,finite.testedMerge);assert.equal(post.currentArchiveSourceFiles,62);assert.deepEqual(post.afterSourceCensus,composition.afterSourceCensus);assert.deepEqual(post.gitStatusAfter,composition.gitStatusAfter);
 for(const execution of [composition.execution,post.execution,attempt.environment]){assert.equal(execution.GITHUB_SHA,finite.testedMerge);assert.equal(execution.GITHUB_RUN_ID,'38808918976');assert.equal(execution.GITHUB_RUN_ATTEMPT,'1');assert.equal(execution.GITHUB_REPOSITORY,'Ginderlax/rea-research-lab');}
 assert.equal(attempt.schema,'rea-cloud-development-attempt/v1');assert.equal(attempt.status,'passed');assert.equal(attempt.scope,'archive-aes-experiment');assert.equal(attempt.repositoryCommit,finite.testedMerge);assert.equal(attempt.executionEnvironment,'github-hosted');assert.equal(attempt.runtime.version,'v24.16.0');assert.equal(attempt.exitCode,0);assert.equal(attempt.signal,null);assert.equal(attempt.failure,null);assert.equal(attempt.sourceStable,true);assert.equal(attempt.sourceCapturedBeforeExecution,true);assert.equal(attempt.sourceSnapshotsInert,true);assert.equal(attempt.sourceFiles,779);assert.equal(attempt.sourceSnapshotFiles,357);assert.equal(attempt.childCloseObserved,true);assert.equal(attempt.output.retainedOutputTruncated,false);assert.equal(attempt.output.droppedOutputBytes,0);assert.equal(attempt.experimentalOverlay.productionInstalled,false);assert.equal(attempt.experimentalOverlay.finalTargets,21);assert.equal(attempt.experimentalOverlay.transitions,22);assert.equal(attempt.experimentalOverlay.sha256,finite.compositionSHA256);assert.equal(sha(selected.get('composition.json')),finite.compositionSHA256);assert.equal(preservation.sourceIdentity.compositionSHA256,finite.compositionSHA256);
 assert.equal(attempt.summary.tests,161);assert.equal(attempt.summary.pass,161);for(const key of ['fail','cancelled','skipped','todo'])assert.equal(attempt.summary[key],0);assert.deepEqual(attempt.summary,preservation.summary);assert.deepEqual(attempt.summary,finite.summary);assert.equal(attempt.fullFeatureParityEstablished,false);assert.equal(attempt.universalSuperiorityEstablished,false);assert.equal(attempt.historicalReceiptsRebound,false);assert.equal(attempt.historicalDevelopmentReceiptOverwritten,false);
 assert.equal(selection.schema,'rea-archive-aes-cloud-experimental-selection/v1');assert.equal(selection.expectedGroupsOnWindows,161);assert.equal(selection.fullArchiveSuite,false);assert.equal(selection.tests.length,13);assert.deepEqual(attempt.selectedTestFiles,selection.tests.map(p=>p.slice('products/rea-studio/'.length)));assert.deepEqual(attempt.command.slice(4),attempt.selectedTestFiles);
 assert.deepEqual(before,after);assert.equal(before.length,779);assert.equal(new Set(before.map(r=>r.path)).size,779);assert.equal(snapshots.schema,'rea-cloud-source-snapshots/v1');assert.equal(snapshots.censusFiles,779);assert.equal(snapshots.snapshotScope,'active');assert.equal(snapshots.files.length,357);let eligible=0;
 for(const row of archiveTransition.sources){const composed=composition.afterSourceCensus.find(r=>r.path===row.path);assert(composed);same(composed,row.after,'Finite161 final composed source');const prior=before.find(r=>'products/rea-studio/'+r.path===row.path),snapshot=snapshots.files.find(r=>'products/rea-studio/'+r.sourcePath===row.path);if(/\.(mjs|json|html|css|ps1)$/.test(row.path)){assert(prior&&snapshot);same(prior,row.after,'Finite161 eligible tested source');same(snapshot,row.after,'Finite161 source snapshot identity');eligible++;}else{assert.equal(prior,undefined);assert.equal(snapshot,undefined);}}assert.equal(eligible,14);
 const raw=selected.get('verification/stdout.txt').toString('utf8');for(const key of ['tests','pass','fail','cancelled','skipped','todo'])assert.equal(Number(raw.match(new RegExp('^# '+key+' ([0-9.]+)$','m'))?.[1]),attempt.summary[key]);assert.equal(selected.get('verification/stderr.txt').length,0);
 return{routes,read,recheck(){for(const[p,r]of seen)read(p,r);},summary(){return{archiveCurrentSourcesMandatory:21,archiveSingleTestCorrectionMandatory:1,archiveCorrectedTestHistoricalAfterRoute:1,archiveCorrectionFreshBehavioralAcceptance:false,archiveHistoricalReplacementRoutes:6,archiveHistorical937RuntimeRoutes:3,archiveSelectedReleasedSourceFiles:22,archiveFiniteExperimentalGroups:161,archiveFiniteSelectedMetadataAuthenticated:true,archiveFiniteSelectedMetadataOnly:true,archiveInstallationReceiptAuthenticated:false,archiveFreshBehavioralAcceptance:false,archiveAuthenticatedFiles:seen.size,archiveAuthenticatedBytes:total,archiveFixedReadFileLimit:96,archiveFixedReadByteLimit:8*1024*1024};}};
}

const historicalCarrierTransition={
  "manifest": {
    "path": "products/rea-studio/results/historical-carrier-delivery-20261015/preservation-manifest.json",
    "bytes": 47735,
    "sha256": "0b31135d5091b8cbf64ce4d21475f3e1c32605cccccfb3eb3d4b05c858105f1e"
  },
  "rootBefore": {
    "path": "products/rea-studio/results/historical-carrier-delivery-20261015/verifier-before/verify-records.mjs.snapshot",
    "bytes": 148351,
    "sha256": "a81c2f4b53fd346a6b86e4dcb63c9b39fb07a4f1e551bcfdbc3c755fce394046"
  },
  "migrationBefore": {
    "path": "products/rea-studio/results/historical-carrier-delivery-20261015/verifier-before/editor-vault-proof-migration.mjs.snapshot",
    "bytes": 69184,
    "sha256": "c9fe15f147349c9be6565cfaa3d6316a808a2a8d21d76e753601886f8d80e5c2"
  },
  "helper": {
    "path": "scripts/historical-carrier-policy.mjs",
    "bytes": 4327,
    "sha256": "671de635f8f3289b51e9ad5296706e4d884202e2ebdd4ba3fbe7038803fe51fd"
  }
};
const groupEditDocumentTransition={
  "path": "products/rea-studio/apps/vault/GROUP-EDIT.md",
  "before": {
    "bytes": 7847,
    "sha256": "a06a163ce96424fb4e5923b29c4acfdc9e9c7e2fa780f07e4751dad3fc30b8c4"
  },
  "after": {
    "bytes": 7861,
    "sha256": "05c2d2989f154e312228062b40aba90ab610960fd51ab1eaa65144ecdc77abf9"
  },
  "beforeImage": {
    "path": "products/rea-studio/results/vault-group-edit-document-route-20261015/before/products/rea-studio/apps/vault/GROUP-EDIT.md.snapshot",
    "bytes": 7847,
    "sha256": "a06a163ce96424fb4e5923b29c4acfdc9e9c7e2fa780f07e4751dad3fc30b8c4"
  },
  "oldMigration": {
    "path": "products/rea-studio/results/vault-group-edit-document-route-20261015/verifier-before/editor-vault-proof-migration.mjs.snapshot",
    "bytes": 71277,
    "sha256": "32c55edd351ea5145bc0b7c973fac32d8480386f7c172248aa90a340ac50903b"
  },
  "manifest": {
    "path": "products/rea-studio/results/vault-group-edit-document-route-20261015/preservation-manifest.json",
    "bytes": 3102,
    "sha256": "8c5646cac620cfbdd4649004158c643aa0df1543d6e11953014399dd98fd3212"
  }
};
const requirementEvidenceTransition={
  "manifest": {
    "path": "products/rea-studio/results/requirement-evidence-provenance-20261015/preservation-manifest.json",
    "bytes": 2591,
    "sha256": "0d2247d59d194d8b39b832465731201404e14d6feace530ea2821079222daaa1"
  },
  "rootBefore": {
    "path": "products/rea-studio/results/requirement-evidence-provenance-20261015/verifier-before/verify-records.mjs.snapshot",
    "bytes": 148558,
    "sha256": "a78a9467ecd76ae44c3d2413b6d341c735bb1f98a657646d3b00a13dccf066f8"
  },
  "migrationBefore": {
    "path": "products/rea-studio/results/requirement-evidence-provenance-20261015/verifier-before/editor-vault-proof-migration.mjs.snapshot",
    "bytes": 74644,
    "sha256": "1c11ce481db1d51e1d8f2e0483c78f02e8ad59f7a53510be2df517715cd1568e"
  }
};
const notesSourceTransition={
  "manifest": {
    "path": "products/rea-studio/results/notes-todo-source-transition-20261016/preservation-manifest.json",
    "bytes": 7317,
    "sha256": "234cb40ab67e6d27efccfd174ad2eaee0676f7e5a5cab0bfd1ba34e49c57aee9"
  },
  "index": {
    "path": "products/rea-studio/apps/notes/results/todo-followup/publication-index.json",
    "bytes": 5086,
    "sha256": "3889a8d676930dde323edd5a37a74393093dc334ee7557ded90804ed925cc731"
  },
  "bundle": {
    "path": "products/rea-studio/experiments/notes-todo/bundle.json",
    "bytes": 10977,
    "sha256": "6489170855483748eaff4ece03bdbadc29f79ab87cf9a16015dede504891bd62"
  },
  "sources": [
    {
      "path": "products/rea-studio/apps/notes/server.mjs",
      "before": {
        "bytes": 23320,
        "sha256": "e592e599c414cd38e8b3b278896792713e001a51950b8a4b3f3e0bc6662f900d"
      },
      "after": {
        "bytes": 24800,
        "sha256": "492ab5fb79a077a888376f8f8b6b13c830fc4004e21a0e2033546e90e0e36181"
      },
      "beforeImage": "products/rea-studio/experiments/notes-todo/before/products/rea-studio/apps/notes/server.mjs.snapshot",
      "afterImage": "products/rea-studio/experiments/notes-todo/after/products/rea-studio/apps/notes/server.mjs.snapshot"
    },
    {
      "path": "products/rea-studio/apps/notes/client.mjs",
      "before": {
        "bytes": 23038,
        "sha256": "90886819feef847847fcae8c442e0a401a1146a7a4aa1fd862a54b5e01f41da9"
      },
      "after": {
        "bytes": 28048,
        "sha256": "09f7a63badf83336b1b0fd36935256461babcb31333ff500b192307b587928db"
      },
      "beforeImage": "products/rea-studio/experiments/notes-todo/before/products/rea-studio/apps/notes/client.mjs.snapshot",
      "afterImage": "products/rea-studio/experiments/notes-todo/after/products/rea-studio/apps/notes/client.mjs.snapshot"
    },
    {
      "path": "products/rea-studio/apps/notes/README.md",
      "before": {
        "bytes": 16506,
        "sha256": "6325d142e7dfeb0bebb625699eb2b0d3967ab47f94d6b929fd73c49616a49524"
      },
      "after": {
        "bytes": 18406,
        "sha256": "65b8eec8da3295d44adb0afd0b9840fe38107b676af750d0a2be27243857705d"
      },
      "beforeImage": "products/rea-studio/experiments/notes-todo/before/products/rea-studio/apps/notes/README.md.snapshot",
      "afterImage": "products/rea-studio/experiments/notes-todo/after/products/rea-studio/apps/notes/README.md.snapshot"
    },
    {
      "path": "products/rea-studio/apps/notes/core.mjs",
      "before": null,
      "after": {
        "bytes": 2657,
        "sha256": "06bf9ad2485e39d6c7dea51a3be9a232fefe9d1a2ed1e46482b0459d605aa44c"
      },
      "beforeImage": null,
      "afterImage": "products/rea-studio/experiments/notes-todo/after/products/rea-studio/apps/notes/core.mjs.snapshot"
    },
    {
      "path": "products/rea-studio/apps/notes/todo.test.mjs",
      "before": null,
      "after": {
        "bytes": 10873,
        "sha256": "38c66f3b553888923098c98bb083899f00ca42df45dab30ad66548d4ff576e18"
      },
      "beforeImage": null,
      "afterImage": "products/rea-studio/experiments/notes-todo/after/products/rea-studio/apps/notes/todo.test.mjs.snapshot"
    },
    {
      "path": "products/rea-studio/apps/notes/todo.ui.test.mjs",
      "before": null,
      "after": {
        "bytes": 8623,
        "sha256": "65de552f75be2e7b6ebbd45723740c76e55bda09d13d550bf38ec6228e4d83f5"
      },
      "beforeImage": null,
      "afterImage": "products/rea-studio/experiments/notes-todo/after/products/rea-studio/apps/notes/todo.ui.test.mjs.snapshot"
    },
    {
      "path": "products/rea-studio/apps/notes/todo.integration.test.mjs",
      "before": null,
      "after": {
        "bytes": 5802,
        "sha256": "442da2522755a4a0c02a6602a8a63ce367a20d2a65d940a53062a7dc08e9d05e"
      },
      "beforeImage": null,
      "afterImage": "products/rea-studio/experiments/notes-todo/after/products/rea-studio/apps/notes/todo.integration.test.mjs.snapshot"
    },
    {
      "path": "products/rea-studio/apps/notes/todo-original.test.mjs",
      "before": null,
      "after": {
        "bytes": 4397,
        "sha256": "51e4f9594525b046ae3b6a5ed2af92736df158743049e792fff50e9b774717d0"
      },
      "beforeImage": null,
      "afterImage": "products/rea-studio/experiments/notes-todo/after/products/rea-studio/apps/notes/todo-original.test.mjs.snapshot"
    }
  ],
  "readerBeforeImages": [
    {
      "reader": "scripts/verify-records.mjs",
      "path": "products/rea-studio/results/notes-todo-source-transition-20261016/verifier-before/verify-records.mjs.snapshot",
      "bytes": 149064,
      "sha256": "3878efc73e671246305e4368f7d3c52f288473591a4fe1697b343ab70249ae1e"
    },
    {
      "reader": "scripts/editor-vault-proof-migration.mjs",
      "path": "products/rea-studio/results/notes-todo-source-transition-20261016/verifier-before/editor-vault-proof-migration.mjs.snapshot",
      "bytes": 107538,
      "sha256": "8e5a048dba78b58faeed3455cc19f60981f5a6320babd60cf837120b54aef1d8"
    },
    {
      "reader": "scripts/verify-followup-records.mjs",
      "path": "products/rea-studio/results/notes-todo-source-transition-20261016/verifier-before/verify-followup-records.mjs.snapshot",
      "bytes": 45876,
      "sha256": "856eeba61b820260f7e1bdc8d9bb9e8924e3ae3183a0c3c0495471e6152a8b5f"
    }
  ],
  "currentVerifierAfter": [
    {
      "path": "scripts/verify-records.mjs",
      "bytes": 149123,
      "sha256": "b5d48417f94e9464c071610ffc2720451cebae126b94b674e67c8f6fe16967d8"
    },
    {
      "path": "scripts/verify-followup-records.mjs",
      "bytes": 46118,
      "sha256": "4129e5ea25fca6b91804a6ee1ab12a3b0f7a9efa8f0e9bf8c766738a2e4ed019"
    }
  ],
  "finitePrefix": "products/rea-studio/results/cloud-notes-todo-first-pass-20261016/",
  "browserPrefix": "products/rea-studio/results/cloud-notes-todo-browser-first-pass-20261016/",
  "objects": [
    {
      "role": "mandatory-current-eight-afterimage",
      "path": "products/rea-studio/apps/notes/server.mjs",
      "stored": {
        "bytes": 24800,
        "sha256": "492ab5fb79a077a888376f8f8b6b13c830fc4004e21a0e2033546e90e0e36181"
      }
    },
    {
      "role": "mandatory-current-eight-afterimage",
      "path": "products/rea-studio/apps/notes/client.mjs",
      "stored": {
        "bytes": 28048,
        "sha256": "09f7a63badf83336b1b0fd36935256461babcb31333ff500b192307b587928db"
      }
    },
    {
      "role": "mandatory-current-eight-afterimage",
      "path": "products/rea-studio/apps/notes/README.md",
      "stored": {
        "bytes": 18406,
        "sha256": "65b8eec8da3295d44adb0afd0b9840fe38107b676af750d0a2be27243857705d"
      }
    },
    {
      "role": "mandatory-current-eight-afterimage",
      "path": "products/rea-studio/apps/notes/core.mjs",
      "stored": {
        "bytes": 2657,
        "sha256": "06bf9ad2485e39d6c7dea51a3be9a232fefe9d1a2ed1e46482b0459d605aa44c"
      }
    },
    {
      "role": "mandatory-current-eight-afterimage",
      "path": "products/rea-studio/apps/notes/todo.test.mjs",
      "stored": {
        "bytes": 10873,
        "sha256": "38c66f3b553888923098c98bb083899f00ca42df45dab30ad66548d4ff576e18"
      }
    },
    {
      "role": "mandatory-current-eight-afterimage",
      "path": "products/rea-studio/apps/notes/todo.ui.test.mjs",
      "stored": {
        "bytes": 8623,
        "sha256": "65de552f75be2e7b6ebbd45723740c76e55bda09d13d550bf38ec6228e4d83f5"
      }
    },
    {
      "role": "mandatory-current-eight-afterimage",
      "path": "products/rea-studio/apps/notes/todo.integration.test.mjs",
      "stored": {
        "bytes": 5802,
        "sha256": "442da2522755a4a0c02a6602a8a63ce367a20d2a65d940a53062a7dc08e9d05e"
      }
    },
    {
      "role": "mandatory-current-eight-afterimage",
      "path": "products/rea-studio/apps/notes/todo-original.test.mjs",
      "stored": {
        "bytes": 4397,
        "sha256": "51e4f9594525b046ae3b6a5ed2af92736df158743049e792fff50e9b774717d0"
      }
    },
    {
      "role": "unchanged-reviewed-Notes-source-payload",
      "path": "products/rea-studio/experiments/notes-todo/after/products/rea-studio/apps/notes/server.mjs.snapshot",
      "stored": {
        "bytes": 24800,
        "sha256": "492ab5fb79a077a888376f8f8b6b13c830fc4004e21a0e2033546e90e0e36181"
      }
    },
    {
      "role": "unchanged-reviewed-Notes-source-payload",
      "path": "products/rea-studio/experiments/notes-todo/before/products/rea-studio/apps/notes/server.mjs.snapshot",
      "stored": {
        "bytes": 23320,
        "sha256": "e592e599c414cd38e8b3b278896792713e001a51950b8a4b3f3e0bc6662f900d"
      }
    },
    {
      "role": "unchanged-reviewed-Notes-source-payload",
      "path": "products/rea-studio/experiments/notes-todo/after/products/rea-studio/apps/notes/client.mjs.snapshot",
      "stored": {
        "bytes": 28048,
        "sha256": "09f7a63badf83336b1b0fd36935256461babcb31333ff500b192307b587928db"
      }
    },
    {
      "role": "unchanged-reviewed-Notes-source-payload",
      "path": "products/rea-studio/experiments/notes-todo/before/products/rea-studio/apps/notes/client.mjs.snapshot",
      "stored": {
        "bytes": 23038,
        "sha256": "90886819feef847847fcae8c442e0a401a1146a7a4aa1fd862a54b5e01f41da9"
      }
    },
    {
      "role": "unchanged-reviewed-Notes-source-payload",
      "path": "products/rea-studio/experiments/notes-todo/after/products/rea-studio/apps/notes/README.md.snapshot",
      "stored": {
        "bytes": 18406,
        "sha256": "65b8eec8da3295d44adb0afd0b9840fe38107b676af750d0a2be27243857705d"
      }
    },
    {
      "role": "unchanged-reviewed-Notes-source-payload",
      "path": "products/rea-studio/experiments/notes-todo/before/products/rea-studio/apps/notes/README.md.snapshot",
      "stored": {
        "bytes": 16506,
        "sha256": "6325d142e7dfeb0bebb625699eb2b0d3967ab47f94d6b929fd73c49616a49524"
      }
    },
    {
      "role": "unchanged-reviewed-Notes-source-payload",
      "path": "products/rea-studio/experiments/notes-todo/after/products/rea-studio/apps/notes/core.mjs.snapshot",
      "stored": {
        "bytes": 2657,
        "sha256": "06bf9ad2485e39d6c7dea51a3be9a232fefe9d1a2ed1e46482b0459d605aa44c"
      }
    },
    {
      "role": "unchanged-reviewed-Notes-source-payload",
      "path": "products/rea-studio/experiments/notes-todo/after/products/rea-studio/apps/notes/todo.test.mjs.snapshot",
      "stored": {
        "bytes": 10873,
        "sha256": "38c66f3b553888923098c98bb083899f00ca42df45dab30ad66548d4ff576e18"
      }
    },
    {
      "role": "unchanged-reviewed-Notes-source-payload",
      "path": "products/rea-studio/experiments/notes-todo/after/products/rea-studio/apps/notes/todo.ui.test.mjs.snapshot",
      "stored": {
        "bytes": 8623,
        "sha256": "65de552f75be2e7b6ebbd45723740c76e55bda09d13d550bf38ec6228e4d83f5"
      }
    },
    {
      "role": "unchanged-reviewed-Notes-source-payload",
      "path": "products/rea-studio/experiments/notes-todo/after/products/rea-studio/apps/notes/todo.integration.test.mjs.snapshot",
      "stored": {
        "bytes": 5802,
        "sha256": "442da2522755a4a0c02a6602a8a63ce367a20d2a65d940a53062a7dc08e9d05e"
      }
    },
    {
      "role": "unchanged-reviewed-Notes-source-payload",
      "path": "products/rea-studio/experiments/notes-todo/after/products/rea-studio/apps/notes/todo-original.test.mjs.snapshot",
      "stored": {
        "bytes": 4397,
        "sha256": "51e4f9594525b046ae3b6a5ed2af92736df158743049e792fff50e9b774717d0"
      }
    },
    {
      "role": "unchanged-reviewed-Notes-source-payload",
      "path": "products/rea-studio/experiments/notes-todo/original/to-dos.md.snapshot",
      "stored": {
        "bytes": 1821,
        "sha256": "69032c8f30c6aa782b105fe852a38a7756cfa16bcc3fcd426e2b09d9fedb1c11"
      }
    },
    {
      "role": "unchanged-reviewed-Notes-source-payload",
      "path": "products/rea-studio/experiments/notes-todo/original/LICENSE.snapshot",
      "stored": {
        "bytes": 998,
        "sha256": "f6b29267fe2c4251ed95cf9c846b47774a970c5960be9eb8a409f21ffd98425e"
      }
    },
    {
      "role": "unchanged-reviewed-Notes-source-payload",
      "path": "products/rea-studio/experiments/notes-todo/SOURCE-CONTRACT.md.snapshot",
      "stored": {
        "bytes": 7826,
        "sha256": "18ef024b4262a9534837683d819cdefb82d6f50dad1b370441b534e6db2ca24a"
      }
    },
    {
      "role": "unchanged-reviewed-Notes-source-payload",
      "path": "products/rea-studio/experiments/notes-todo/source-authority.json.snapshot",
      "stored": {
        "bytes": 6217,
        "sha256": "335d78a02f53174f8c33a0fe918157418a23eceb80d6ba0e02371f0e8aee32f0"
      }
    },
    {
      "role": "unchanged-reviewed-Notes-source-payload",
      "path": "products/rea-studio/experiments/notes-todo/independent-r2-review.json.snapshot",
      "stored": {
        "bytes": 4156,
        "sha256": "3ffa761a14ab2ed2f853b1cd3c36e3ed6099ea045fd92ca6c0ed190c021ec0c9"
      }
    },
    {
      "role": "unchanged-reviewed-Notes-source-payload",
      "path": "products/rea-studio/experiments/notes-todo/README.txt",
      "stored": {
        "bytes": 866,
        "sha256": "0789e3f28ba6c87c8c32a83058db4ca4bfe0bf39d49be826508595b8e180a01c"
      }
    },
    {
      "role": "unchanged-reviewed-Notes-source-bundle",
      "path": "products/rea-studio/experiments/notes-todo/bundle.json",
      "stored": {
        "bytes": 10977,
        "sha256": "6489170855483748eaff4ece03bdbadc29f79ab87cf9a16015dede504891bd62"
      }
    },
    {
      "role": "unchanged-released-original-Note-source",
      "path": "products/rea-studio/apps/notes/results/notebooks-followup/stage/original/packages/lib/models/Note.ts.snapshot.snapshot",
      "stored": {
        "bytes": 45302,
        "sha256": "5f1a200dc970179ad6fd193f7ffc47f09f88261cff8f893ccc793517ebbe9647"
      }
    },
    {
      "role": "exact-pre-Notes-reader-beforeimage",
      "path": "products/rea-studio/results/notes-todo-source-transition-20261016/verifier-before/verify-records.mjs.snapshot",
      "stored": {
        "bytes": 149064,
        "sha256": "3878efc73e671246305e4368f7d3c52f288473591a4fe1697b343ab70249ae1e"
      }
    },
    {
      "role": "exact-pre-Notes-reader-beforeimage",
      "path": "products/rea-studio/results/notes-todo-source-transition-20261016/verifier-before/editor-vault-proof-migration.mjs.snapshot",
      "stored": {
        "bytes": 107538,
        "sha256": "8e5a048dba78b58faeed3455cc19f60981f5a6320babd60cf837120b54aef1d8"
      }
    },
    {
      "role": "exact-pre-Notes-reader-beforeimage",
      "path": "products/rea-studio/results/notes-todo-source-transition-20261016/verifier-before/verify-followup-records.mjs.snapshot",
      "stored": {
        "bytes": 45876,
        "sha256": "856eeba61b820260f7e1bdc8d9bb9e8924e3ae3183a0c3c0495471e6152a8b5f"
      }
    },
    {
      "role": "closed-Notes-transition-declaration",
      "path": "products/rea-studio/results/notes-todo-source-transition-20261016/preservation-manifest.json",
      "stored": {
        "bytes": 7317,
        "sha256": "234cb40ab67e6d27efccfd174ad2eaee0676f7e5a5cab0bfd1ba34e49c57aee9"
      }
    },
    {
      "role": "Notes-source-publication-map",
      "path": "products/rea-studio/apps/notes/results/todo-followup/publication-index.json",
      "stored": {
        "bytes": 5086,
        "sha256": "3889a8d676930dde323edd5a37a74393093dc334ee7557ded90804ed925cc731"
      }
    },
    {
      "role": "immutable-Notes92-public-preservation-manifest",
      "path": "products/rea-studio/results/cloud-notes-todo-first-pass-20261016/preservation-manifest.json",
      "stored": {
        "bytes": 109749,
        "sha256": "b8fce979bcc24c869c51ae745f7f6df9280b0cbf19b688777b799f6f3bbf1bee"
      }
    },
    {
      "role": "immutable-Notes92/attempt-validation.json",
      "path": "products/rea-studio/results/cloud-notes-todo-first-pass-20261016/payload/36f83a2bdc7b7b4ada8430da0428052d513eae4891c716a87d3ae344d34e0166.snapshot",
      "stored": {
        "bytes": 5856,
        "sha256": "36f83a2bdc7b7b4ada8430da0428052d513eae4891c716a87d3ae344d34e0166"
      },
      "decoded": {
        "bytes": 5856,
        "sha256": "36f83a2bdc7b7b4ada8430da0428052d513eae4891c716a87d3ae344d34e0166"
      },
      "encoding": "identity"
    },
    {
      "role": "immutable-Notes92/notes-todo-composition.json",
      "path": "products/rea-studio/results/cloud-notes-todo-first-pass-20261016/payload/d9b56b119f60edf8525f216484b50401f5b0717cf09dee571ad5a9d8be9b5b25.snapshot",
      "stored": {
        "bytes": 9081,
        "sha256": "d9b56b119f60edf8525f216484b50401f5b0717cf09dee571ad5a9d8be9b5b25"
      },
      "decoded": {
        "bytes": 9081,
        "sha256": "d9b56b119f60edf8525f216484b50401f5b0717cf09dee571ad5a9d8be9b5b25"
      },
      "encoding": "identity"
    },
    {
      "role": "immutable-Notes92/notes-todo-postrun-source-check.json",
      "path": "products/rea-studio/results/cloud-notes-todo-first-pass-20261016/payload/13c4f7a431ba827a92d284b03eaa8be92ea75e482c886fa9ac517cb8cfc8474c.snapshot",
      "stored": {
        "bytes": 6282,
        "sha256": "13c4f7a431ba827a92d284b03eaa8be92ea75e482c886fa9ac517cb8cfc8474c"
      },
      "decoded": {
        "bytes": 6282,
        "sha256": "13c4f7a431ba827a92d284b03eaa8be92ea75e482c886fa9ac517cb8cfc8474c"
      },
      "encoding": "identity"
    },
    {
      "role": "immutable-Notes92/source-before.json",
      "path": "products/rea-studio/results/cloud-notes-todo-first-pass-20261016/payload/2e0ff567a871d045e3dc0fba1abac5a629780f72f486dbfb68a5398e0f3f8bf2.gz.snapshot",
      "stored": {
        "bytes": 31881,
        "sha256": "36bf4d6f211b8085ebc85ff9e58c7da8094df14bb9448c70b06bf1d587f07a04"
      },
      "decoded": {
        "bytes": 145392,
        "sha256": "2e0ff567a871d045e3dc0fba1abac5a629780f72f486dbfb68a5398e0f3f8bf2"
      },
      "encoding": "gzip"
    },
    {
      "role": "immutable-Notes92/source-snapshot-manifest.json",
      "path": "products/rea-studio/results/cloud-notes-todo-first-pass-20261016/payload/cd86d1b3a47f06d71d16ba896dbdf9ab2ae36d68e1c03b124cffd5a0a5175c59.gz.snapshot",
      "stored": {
        "bytes": 19670,
        "sha256": "7772c363ab9ee665033610ca9f418a427d9749e1feb1b72c8dec85a4964fb245"
      },
      "decoded": {
        "bytes": 86822,
        "sha256": "cd86d1b3a47f06d71d16ba896dbdf9ab2ae36d68e1c03b124cffd5a0a5175c59"
      },
      "encoding": "gzip"
    },
    {
      "role": "immutable-Notes92/stdout.txt",
      "path": "products/rea-studio/results/cloud-notes-todo-first-pass-20261016/payload/3a596c108f7ac1de40121eeec135c0925a7f51f3e8dd49d26d3e663403f9c529.snapshot",
      "stored": {
        "bytes": 29616,
        "sha256": "3a596c108f7ac1de40121eeec135c0925a7f51f3e8dd49d26d3e663403f9c529"
      },
      "decoded": {
        "bytes": 29616,
        "sha256": "3a596c108f7ac1de40121eeec135c0925a7f51f3e8dd49d26d3e663403f9c529"
      },
      "encoding": "identity"
    },
    {
      "role": "immutable-Notes92/stderr.txt",
      "path": "products/rea-studio/results/cloud-notes-todo-first-pass-20261016/payload/e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855.snapshot",
      "stored": {
        "bytes": 0,
        "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
      },
      "decoded": {
        "bytes": 0,
        "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
      },
      "encoding": "identity"
    },
    {
      "role": "immutable-Notes8-public-preservation-manifest",
      "path": "products/rea-studio/results/cloud-notes-todo-browser-first-pass-20261016/preservation-manifest.json",
      "stored": {
        "bytes": 61825,
        "sha256": "47b21811f00088b895107f9122c98adab97268ed9ba6393eb63dfe55883f6291"
      }
    },
    {
      "role": "immutable-Notes8/artifact/browser-attempt.json",
      "path": "products/rea-studio/results/cloud-notes-todo-browser-first-pass-20261016/payload/dc7f8c101111836973a84a8f5ca76de2d1a4315b30b5cd457ada0faef8e46751.snapshot",
      "stored": {
        "bytes": 14926,
        "sha256": "dc7f8c101111836973a84a8f5ca76de2d1a4315b30b5cd457ada0faef8e46751"
      },
      "decoded": {
        "bytes": 14926,
        "sha256": "dc7f8c101111836973a84a8f5ca76de2d1a4315b30b5cd457ada0faef8e46751"
      },
      "encoding": "identity"
    },
    {
      "role": "immutable-Notes8/artifact/notes-todo-composition.json",
      "path": "products/rea-studio/results/cloud-notes-todo-browser-first-pass-20261016/payload/7e55bf8dabd1f4a056901703055aae258ceaf76d6e175e0a3e9fa9d31df37c8b.snapshot",
      "stored": {
        "bytes": 9081,
        "sha256": "7e55bf8dabd1f4a056901703055aae258ceaf76d6e175e0a3e9fa9d31df37c8b"
      },
      "decoded": {
        "bytes": 9081,
        "sha256": "7e55bf8dabd1f4a056901703055aae258ceaf76d6e175e0a3e9fa9d31df37c8b"
      },
      "encoding": "identity"
    },
    {
      "role": "immutable-Notes8/artifact/notes-todo-postrun-source-check.json",
      "path": "products/rea-studio/results/cloud-notes-todo-browser-first-pass-20261016/payload/03576df3955385fef0601b24256dfb56d3aa30dbe040ed5ffd1cfe5c54029614.snapshot",
      "stored": {
        "bytes": 6282,
        "sha256": "03576df3955385fef0601b24256dfb56d3aa30dbe040ed5ffd1cfe5c54029614"
      },
      "decoded": {
        "bytes": 6282,
        "sha256": "03576df3955385fef0601b24256dfb56d3aa30dbe040ed5ffd1cfe5c54029614"
      },
      "encoding": "identity"
    },
    {
      "role": "immutable-Notes8/artifact/browser-postrun-source-check.json",
      "path": "products/rea-studio/results/cloud-notes-todo-browser-first-pass-20261016/payload/c99c82c51eae708f23a29a563738d8dc47dc45ee324a83c4f0c6355ae958e98b.snapshot",
      "stored": {
        "bytes": 3896,
        "sha256": "c99c82c51eae708f23a29a563738d8dc47dc45ee324a83c4f0c6355ae958e98b"
      },
      "decoded": {
        "bytes": 3896,
        "sha256": "c99c82c51eae708f23a29a563738d8dc47dc45ee324a83c4f0c6355ae958e98b"
      },
      "encoding": "identity"
    },
    {
      "role": "immutable-Notes8/artifact/browser-source-before.json",
      "path": "products/rea-studio/results/cloud-notes-todo-browser-first-pass-20261016/payload/8ea77373c45541a6e59ea9fac6f60804424a484064f937923219c1f88928bb14.gz.snapshot",
      "stored": {
        "bytes": 20053,
        "sha256": "9b9d9588f4a77620053f546d52213b341b7d78ce8fb254be1806b0dca0bac871"
      },
      "decoded": {
        "bytes": 60916,
        "sha256": "8ea77373c45541a6e59ea9fac6f60804424a484064f937923219c1f88928bb14"
      },
      "encoding": "gzip"
    },
    {
      "role": "immutable-Notes8/artifact/playwright-results.json",
      "path": "products/rea-studio/results/cloud-notes-todo-browser-first-pass-20261016/payload/3c72cb8b46819c5bd645530775afa187b2a2a2daafa6b17f29bbe12c6592f3e0.snapshot",
      "stored": {
        "bytes": 15264,
        "sha256": "3c72cb8b46819c5bd645530775afa187b2a2a2daafa6b17f29bbe12c6592f3e0"
      },
      "decoded": {
        "bytes": 15264,
        "sha256": "3c72cb8b46819c5bd645530775afa187b2a2a2daafa6b17f29bbe12c6592f3e0"
      },
      "encoding": "identity"
    },
    {
      "role": "immutable-Notes8/artifact/browser-observation-process-7536.json",
      "path": "products/rea-studio/results/cloud-notes-todo-browser-first-pass-20261016/payload/e62bc7de93399cabbd9b5c67264ec7676283e424afa7b0364a899164d0b33917.snapshot",
      "stored": {
        "bytes": 1961,
        "sha256": "e62bc7de93399cabbd9b5c67264ec7676283e424afa7b0364a899164d0b33917"
      },
      "decoded": {
        "bytes": 1961,
        "sha256": "e62bc7de93399cabbd9b5c67264ec7676283e424afa7b0364a899164d0b33917"
      },
      "encoding": "identity"
    },
    {
      "role": "immutable-Notes8/artifact/notes-browser-workflow-attempt.json",
      "path": "products/rea-studio/results/cloud-notes-todo-browser-first-pass-20261016/payload/f15997348b7e81ebb287b16a14949aad4fbb67408ec46ff9548b86ec794ae69a.snapshot",
      "stored": {
        "bytes": 631,
        "sha256": "f15997348b7e81ebb287b16a14949aad4fbb67408ec46ff9548b86ec794ae69a"
      },
      "decoded": {
        "bytes": 631,
        "sha256": "f15997348b7e81ebb287b16a14949aad4fbb67408ec46ff9548b86ec794ae69a"
      },
      "encoding": "identity"
    },
    {
      "role": "immutable-Notes8/completed-backup-reader-v2-report",
      "path": "products/rea-studio/results/cloud-notes-todo-browser-first-pass-20261016/payload/859eeeaee3d90d295b45d08e6c6de8ab4a9de9efa34405588090a5cf9f71ee31.gz.snapshot",
      "stored": {
        "bytes": 32126,
        "sha256": "ac0b982d1dbef559ed63c03a2248012df1dd63e82a5460458772fd13788c99cc"
      },
      "decoded": {
        "bytes": 129863,
        "sha256": "859eeeaee3d90d295b45d08e6c6de8ab4a9de9efa34405588090a5cf9f71ee31"
      },
      "encoding": "gzip"
    },
    {
      "role": "immutable-Notes8/independent-backup-source-and-evidence-review",
      "path": "products/rea-studio/results/cloud-notes-todo-browser-first-pass-20261016/payload/b3a90572fb2f976047a344393c742b3bf9a973e6a1f248c5cd48e974af3fefcc.snapshot",
      "stored": {
        "bytes": 5372,
        "sha256": "b3a90572fb2f976047a344393c742b3bf9a973e6a1f248c5cd48e974af3fefcc"
      },
      "decoded": {
        "bytes": 5372,
        "sha256": "b3a90572fb2f976047a344393c742b3bf9a973e6a1f248c5cd48e974af3fefcc"
      },
      "encoding": "identity"
    },
    {
      "role": "immutable-Notes8/independent-backup-git-audit-result",
      "path": "products/rea-studio/results/cloud-notes-todo-browser-first-pass-20261016/payload/66d5f61b136007f6e3dfec51ff95c9599b19b31034cc6a11a35e3a06fa4203ee.gz.snapshot",
      "stored": {
        "bytes": 30629,
        "sha256": "65ef99b06bc942d7442bf9a7b623001a32f55979db0600dfc43f351397d97ae3"
      },
      "decoded": {
        "bytes": 98669,
        "sha256": "66d5f61b136007f6e3dfec51ff95c9599b19b31034cc6a11a35e3a06fa4203ee"
      },
      "encoding": "gzip"
    }
  ],
  "roles": [
    {
      "role": "mandatory-current-eight-afterimage",
      "path": "products/rea-studio/apps/notes/server.mjs",
      "stored": {
        "bytes": 24800,
        "sha256": "492ab5fb79a077a888376f8f8b6b13c830fc4004e21a0e2033546e90e0e36181"
      }
    },
    {
      "role": "mandatory-current-eight-afterimage",
      "path": "products/rea-studio/apps/notes/client.mjs",
      "stored": {
        "bytes": 28048,
        "sha256": "09f7a63badf83336b1b0fd36935256461babcb31333ff500b192307b587928db"
      }
    },
    {
      "role": "mandatory-current-eight-afterimage",
      "path": "products/rea-studio/apps/notes/README.md",
      "stored": {
        "bytes": 18406,
        "sha256": "65b8eec8da3295d44adb0afd0b9840fe38107b676af750d0a2be27243857705d"
      }
    },
    {
      "role": "mandatory-current-eight-afterimage",
      "path": "products/rea-studio/apps/notes/core.mjs",
      "stored": {
        "bytes": 2657,
        "sha256": "06bf9ad2485e39d6c7dea51a3be9a232fefe9d1a2ed1e46482b0459d605aa44c"
      }
    },
    {
      "role": "mandatory-current-eight-afterimage",
      "path": "products/rea-studio/apps/notes/todo.test.mjs",
      "stored": {
        "bytes": 10873,
        "sha256": "38c66f3b553888923098c98bb083899f00ca42df45dab30ad66548d4ff576e18"
      }
    },
    {
      "role": "mandatory-current-eight-afterimage",
      "path": "products/rea-studio/apps/notes/todo.ui.test.mjs",
      "stored": {
        "bytes": 8623,
        "sha256": "65de552f75be2e7b6ebbd45723740c76e55bda09d13d550bf38ec6228e4d83f5"
      }
    },
    {
      "role": "mandatory-current-eight-afterimage",
      "path": "products/rea-studio/apps/notes/todo.integration.test.mjs",
      "stored": {
        "bytes": 5802,
        "sha256": "442da2522755a4a0c02a6602a8a63ce367a20d2a65d940a53062a7dc08e9d05e"
      }
    },
    {
      "role": "mandatory-current-eight-afterimage",
      "path": "products/rea-studio/apps/notes/todo-original.test.mjs",
      "stored": {
        "bytes": 4397,
        "sha256": "51e4f9594525b046ae3b6a5ed2af92736df158743049e792fff50e9b774717d0"
      }
    },
    {
      "role": "unchanged-reviewed-Notes-source-payload",
      "path": "products/rea-studio/experiments/notes-todo/after/products/rea-studio/apps/notes/server.mjs.snapshot",
      "stored": {
        "bytes": 24800,
        "sha256": "492ab5fb79a077a888376f8f8b6b13c830fc4004e21a0e2033546e90e0e36181"
      }
    },
    {
      "role": "unchanged-reviewed-Notes-source-payload",
      "path": "products/rea-studio/experiments/notes-todo/before/products/rea-studio/apps/notes/server.mjs.snapshot",
      "stored": {
        "bytes": 23320,
        "sha256": "e592e599c414cd38e8b3b278896792713e001a51950b8a4b3f3e0bc6662f900d"
      }
    },
    {
      "role": "unchanged-reviewed-Notes-source-payload",
      "path": "products/rea-studio/experiments/notes-todo/after/products/rea-studio/apps/notes/client.mjs.snapshot",
      "stored": {
        "bytes": 28048,
        "sha256": "09f7a63badf83336b1b0fd36935256461babcb31333ff500b192307b587928db"
      }
    },
    {
      "role": "unchanged-reviewed-Notes-source-payload",
      "path": "products/rea-studio/experiments/notes-todo/before/products/rea-studio/apps/notes/client.mjs.snapshot",
      "stored": {
        "bytes": 23038,
        "sha256": "90886819feef847847fcae8c442e0a401a1146a7a4aa1fd862a54b5e01f41da9"
      }
    },
    {
      "role": "unchanged-reviewed-Notes-source-payload",
      "path": "products/rea-studio/experiments/notes-todo/after/products/rea-studio/apps/notes/README.md.snapshot",
      "stored": {
        "bytes": 18406,
        "sha256": "65b8eec8da3295d44adb0afd0b9840fe38107b676af750d0a2be27243857705d"
      }
    },
    {
      "role": "unchanged-reviewed-Notes-source-payload",
      "path": "products/rea-studio/experiments/notes-todo/before/products/rea-studio/apps/notes/README.md.snapshot",
      "stored": {
        "bytes": 16506,
        "sha256": "6325d142e7dfeb0bebb625699eb2b0d3967ab47f94d6b929fd73c49616a49524"
      }
    },
    {
      "role": "unchanged-reviewed-Notes-source-payload",
      "path": "products/rea-studio/experiments/notes-todo/after/products/rea-studio/apps/notes/core.mjs.snapshot",
      "stored": {
        "bytes": 2657,
        "sha256": "06bf9ad2485e39d6c7dea51a3be9a232fefe9d1a2ed1e46482b0459d605aa44c"
      }
    },
    {
      "role": "unchanged-reviewed-Notes-source-payload",
      "path": "products/rea-studio/experiments/notes-todo/after/products/rea-studio/apps/notes/todo.test.mjs.snapshot",
      "stored": {
        "bytes": 10873,
        "sha256": "38c66f3b553888923098c98bb083899f00ca42df45dab30ad66548d4ff576e18"
      }
    },
    {
      "role": "unchanged-reviewed-Notes-source-payload",
      "path": "products/rea-studio/experiments/notes-todo/after/products/rea-studio/apps/notes/todo.ui.test.mjs.snapshot",
      "stored": {
        "bytes": 8623,
        "sha256": "65de552f75be2e7b6ebbd45723740c76e55bda09d13d550bf38ec6228e4d83f5"
      }
    },
    {
      "role": "unchanged-reviewed-Notes-source-payload",
      "path": "products/rea-studio/experiments/notes-todo/after/products/rea-studio/apps/notes/todo.integration.test.mjs.snapshot",
      "stored": {
        "bytes": 5802,
        "sha256": "442da2522755a4a0c02a6602a8a63ce367a20d2a65d940a53062a7dc08e9d05e"
      }
    },
    {
      "role": "unchanged-reviewed-Notes-source-payload",
      "path": "products/rea-studio/experiments/notes-todo/after/products/rea-studio/apps/notes/todo-original.test.mjs.snapshot",
      "stored": {
        "bytes": 4397,
        "sha256": "51e4f9594525b046ae3b6a5ed2af92736df158743049e792fff50e9b774717d0"
      }
    },
    {
      "role": "unchanged-reviewed-Notes-source-payload",
      "path": "products/rea-studio/experiments/notes-todo/original/to-dos.md.snapshot",
      "stored": {
        "bytes": 1821,
        "sha256": "69032c8f30c6aa782b105fe852a38a7756cfa16bcc3fcd426e2b09d9fedb1c11"
      }
    },
    {
      "role": "unchanged-reviewed-Notes-source-payload",
      "path": "products/rea-studio/experiments/notes-todo/original/LICENSE.snapshot",
      "stored": {
        "bytes": 998,
        "sha256": "f6b29267fe2c4251ed95cf9c846b47774a970c5960be9eb8a409f21ffd98425e"
      }
    },
    {
      "role": "unchanged-reviewed-Notes-source-payload",
      "path": "products/rea-studio/experiments/notes-todo/SOURCE-CONTRACT.md.snapshot",
      "stored": {
        "bytes": 7826,
        "sha256": "18ef024b4262a9534837683d819cdefb82d6f50dad1b370441b534e6db2ca24a"
      }
    },
    {
      "role": "unchanged-reviewed-Notes-source-payload",
      "path": "products/rea-studio/experiments/notes-todo/source-authority.json.snapshot",
      "stored": {
        "bytes": 6217,
        "sha256": "335d78a02f53174f8c33a0fe918157418a23eceb80d6ba0e02371f0e8aee32f0"
      }
    },
    {
      "role": "unchanged-reviewed-Notes-source-payload",
      "path": "products/rea-studio/experiments/notes-todo/independent-r2-review.json.snapshot",
      "stored": {
        "bytes": 4156,
        "sha256": "3ffa761a14ab2ed2f853b1cd3c36e3ed6099ea045fd92ca6c0ed190c021ec0c9"
      }
    },
    {
      "role": "unchanged-reviewed-Notes-source-payload",
      "path": "products/rea-studio/experiments/notes-todo/README.txt",
      "stored": {
        "bytes": 866,
        "sha256": "0789e3f28ba6c87c8c32a83058db4ca4bfe0bf39d49be826508595b8e180a01c"
      }
    },
    {
      "role": "unchanged-reviewed-Notes-source-bundle",
      "path": "products/rea-studio/experiments/notes-todo/bundle.json",
      "stored": {
        "bytes": 10977,
        "sha256": "6489170855483748eaff4ece03bdbadc29f79ab87cf9a16015dede504891bd62"
      }
    },
    {
      "role": "unchanged-released-original-Note-source",
      "path": "products/rea-studio/apps/notes/results/notebooks-followup/stage/original/packages/lib/models/Note.ts.snapshot.snapshot",
      "stored": {
        "bytes": 45302,
        "sha256": "5f1a200dc970179ad6fd193f7ffc47f09f88261cff8f893ccc793517ebbe9647"
      }
    },
    {
      "role": "exact-pre-Notes-reader-beforeimage",
      "path": "products/rea-studio/results/notes-todo-source-transition-20261016/verifier-before/verify-records.mjs.snapshot",
      "stored": {
        "bytes": 149064,
        "sha256": "3878efc73e671246305e4368f7d3c52f288473591a4fe1697b343ab70249ae1e"
      }
    },
    {
      "role": "exact-pre-Notes-reader-beforeimage",
      "path": "products/rea-studio/results/notes-todo-source-transition-20261016/verifier-before/editor-vault-proof-migration.mjs.snapshot",
      "stored": {
        "bytes": 107538,
        "sha256": "8e5a048dba78b58faeed3455cc19f60981f5a6320babd60cf837120b54aef1d8"
      }
    },
    {
      "role": "exact-pre-Notes-reader-beforeimage",
      "path": "products/rea-studio/results/notes-todo-source-transition-20261016/verifier-before/verify-followup-records.mjs.snapshot",
      "stored": {
        "bytes": 45876,
        "sha256": "856eeba61b820260f7e1bdc8d9bb9e8924e3ae3183a0c3c0495471e6152a8b5f"
      }
    },
    {
      "role": "closed-Notes-transition-declaration",
      "path": "products/rea-studio/results/notes-todo-source-transition-20261016/preservation-manifest.json",
      "stored": {
        "bytes": 7317,
        "sha256": "234cb40ab67e6d27efccfd174ad2eaee0676f7e5a5cab0bfd1ba34e49c57aee9"
      }
    },
    {
      "role": "Notes-source-publication-map",
      "path": "products/rea-studio/apps/notes/results/todo-followup/publication-index.json",
      "stored": {
        "bytes": 5086,
        "sha256": "3889a8d676930dde323edd5a37a74393093dc334ee7557ded90804ed925cc731"
      }
    },
    {
      "role": "immutable-Notes92-public-preservation-manifest",
      "path": "products/rea-studio/results/cloud-notes-todo-first-pass-20261016/preservation-manifest.json",
      "stored": {
        "bytes": 109749,
        "sha256": "b8fce979bcc24c869c51ae745f7f6df9280b0cbf19b688777b799f6f3bbf1bee"
      }
    },
    {
      "role": "immutable-Notes92/attempt-validation.json",
      "path": "products/rea-studio/results/cloud-notes-todo-first-pass-20261016/payload/36f83a2bdc7b7b4ada8430da0428052d513eae4891c716a87d3ae344d34e0166.snapshot",
      "stored": {
        "bytes": 5856,
        "sha256": "36f83a2bdc7b7b4ada8430da0428052d513eae4891c716a87d3ae344d34e0166"
      },
      "decoded": {
        "bytes": 5856,
        "sha256": "36f83a2bdc7b7b4ada8430da0428052d513eae4891c716a87d3ae344d34e0166"
      },
      "encoding": "identity"
    },
    {
      "role": "immutable-Notes92/notes-todo-composition.json",
      "path": "products/rea-studio/results/cloud-notes-todo-first-pass-20261016/payload/d9b56b119f60edf8525f216484b50401f5b0717cf09dee571ad5a9d8be9b5b25.snapshot",
      "stored": {
        "bytes": 9081,
        "sha256": "d9b56b119f60edf8525f216484b50401f5b0717cf09dee571ad5a9d8be9b5b25"
      },
      "decoded": {
        "bytes": 9081,
        "sha256": "d9b56b119f60edf8525f216484b50401f5b0717cf09dee571ad5a9d8be9b5b25"
      },
      "encoding": "identity"
    },
    {
      "role": "immutable-Notes92/notes-todo-postrun-source-check.json",
      "path": "products/rea-studio/results/cloud-notes-todo-first-pass-20261016/payload/13c4f7a431ba827a92d284b03eaa8be92ea75e482c886fa9ac517cb8cfc8474c.snapshot",
      "stored": {
        "bytes": 6282,
        "sha256": "13c4f7a431ba827a92d284b03eaa8be92ea75e482c886fa9ac517cb8cfc8474c"
      },
      "decoded": {
        "bytes": 6282,
        "sha256": "13c4f7a431ba827a92d284b03eaa8be92ea75e482c886fa9ac517cb8cfc8474c"
      },
      "encoding": "identity"
    },
    {
      "role": "immutable-Notes92/source-before.json",
      "path": "products/rea-studio/results/cloud-notes-todo-first-pass-20261016/payload/2e0ff567a871d045e3dc0fba1abac5a629780f72f486dbfb68a5398e0f3f8bf2.gz.snapshot",
      "stored": {
        "bytes": 31881,
        "sha256": "36bf4d6f211b8085ebc85ff9e58c7da8094df14bb9448c70b06bf1d587f07a04"
      },
      "decoded": {
        "bytes": 145392,
        "sha256": "2e0ff567a871d045e3dc0fba1abac5a629780f72f486dbfb68a5398e0f3f8bf2"
      },
      "encoding": "gzip"
    },
    {
      "role": "immutable-Notes92/source-after.json",
      "path": "products/rea-studio/results/cloud-notes-todo-first-pass-20261016/payload/2e0ff567a871d045e3dc0fba1abac5a629780f72f486dbfb68a5398e0f3f8bf2.gz.snapshot",
      "stored": {
        "bytes": 31881,
        "sha256": "36bf4d6f211b8085ebc85ff9e58c7da8094df14bb9448c70b06bf1d587f07a04"
      },
      "decoded": {
        "bytes": 145392,
        "sha256": "2e0ff567a871d045e3dc0fba1abac5a629780f72f486dbfb68a5398e0f3f8bf2"
      },
      "encoding": "gzip"
    },
    {
      "role": "immutable-Notes92/source-snapshot-manifest.json",
      "path": "products/rea-studio/results/cloud-notes-todo-first-pass-20261016/payload/cd86d1b3a47f06d71d16ba896dbdf9ab2ae36d68e1c03b124cffd5a0a5175c59.gz.snapshot",
      "stored": {
        "bytes": 19670,
        "sha256": "7772c363ab9ee665033610ca9f418a427d9749e1feb1b72c8dec85a4964fb245"
      },
      "decoded": {
        "bytes": 86822,
        "sha256": "cd86d1b3a47f06d71d16ba896dbdf9ab2ae36d68e1c03b124cffd5a0a5175c59"
      },
      "encoding": "gzip"
    },
    {
      "role": "immutable-Notes92/stdout.txt",
      "path": "products/rea-studio/results/cloud-notes-todo-first-pass-20261016/payload/3a596c108f7ac1de40121eeec135c0925a7f51f3e8dd49d26d3e663403f9c529.snapshot",
      "stored": {
        "bytes": 29616,
        "sha256": "3a596c108f7ac1de40121eeec135c0925a7f51f3e8dd49d26d3e663403f9c529"
      },
      "decoded": {
        "bytes": 29616,
        "sha256": "3a596c108f7ac1de40121eeec135c0925a7f51f3e8dd49d26d3e663403f9c529"
      },
      "encoding": "identity"
    },
    {
      "role": "immutable-Notes92/stderr.txt",
      "path": "products/rea-studio/results/cloud-notes-todo-first-pass-20261016/payload/e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855.snapshot",
      "stored": {
        "bytes": 0,
        "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
      },
      "decoded": {
        "bytes": 0,
        "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
      },
      "encoding": "identity"
    },
    {
      "role": "immutable-Notes8-public-preservation-manifest",
      "path": "products/rea-studio/results/cloud-notes-todo-browser-first-pass-20261016/preservation-manifest.json",
      "stored": {
        "bytes": 61825,
        "sha256": "47b21811f00088b895107f9122c98adab97268ed9ba6393eb63dfe55883f6291"
      }
    },
    {
      "role": "immutable-Notes8/artifact/browser-attempt.json",
      "path": "products/rea-studio/results/cloud-notes-todo-browser-first-pass-20261016/payload/dc7f8c101111836973a84a8f5ca76de2d1a4315b30b5cd457ada0faef8e46751.snapshot",
      "stored": {
        "bytes": 14926,
        "sha256": "dc7f8c101111836973a84a8f5ca76de2d1a4315b30b5cd457ada0faef8e46751"
      },
      "decoded": {
        "bytes": 14926,
        "sha256": "dc7f8c101111836973a84a8f5ca76de2d1a4315b30b5cd457ada0faef8e46751"
      },
      "encoding": "identity"
    },
    {
      "role": "immutable-Notes8/artifact/notes-todo-composition.json",
      "path": "products/rea-studio/results/cloud-notes-todo-browser-first-pass-20261016/payload/7e55bf8dabd1f4a056901703055aae258ceaf76d6e175e0a3e9fa9d31df37c8b.snapshot",
      "stored": {
        "bytes": 9081,
        "sha256": "7e55bf8dabd1f4a056901703055aae258ceaf76d6e175e0a3e9fa9d31df37c8b"
      },
      "decoded": {
        "bytes": 9081,
        "sha256": "7e55bf8dabd1f4a056901703055aae258ceaf76d6e175e0a3e9fa9d31df37c8b"
      },
      "encoding": "identity"
    },
    {
      "role": "immutable-Notes8/artifact/notes-todo-postrun-source-check.json",
      "path": "products/rea-studio/results/cloud-notes-todo-browser-first-pass-20261016/payload/03576df3955385fef0601b24256dfb56d3aa30dbe040ed5ffd1cfe5c54029614.snapshot",
      "stored": {
        "bytes": 6282,
        "sha256": "03576df3955385fef0601b24256dfb56d3aa30dbe040ed5ffd1cfe5c54029614"
      },
      "decoded": {
        "bytes": 6282,
        "sha256": "03576df3955385fef0601b24256dfb56d3aa30dbe040ed5ffd1cfe5c54029614"
      },
      "encoding": "identity"
    },
    {
      "role": "immutable-Notes8/artifact/browser-postrun-source-check.json",
      "path": "products/rea-studio/results/cloud-notes-todo-browser-first-pass-20261016/payload/c99c82c51eae708f23a29a563738d8dc47dc45ee324a83c4f0c6355ae958e98b.snapshot",
      "stored": {
        "bytes": 3896,
        "sha256": "c99c82c51eae708f23a29a563738d8dc47dc45ee324a83c4f0c6355ae958e98b"
      },
      "decoded": {
        "bytes": 3896,
        "sha256": "c99c82c51eae708f23a29a563738d8dc47dc45ee324a83c4f0c6355ae958e98b"
      },
      "encoding": "identity"
    },
    {
      "role": "immutable-Notes8/artifact/browser-source-before.json",
      "path": "products/rea-studio/results/cloud-notes-todo-browser-first-pass-20261016/payload/8ea77373c45541a6e59ea9fac6f60804424a484064f937923219c1f88928bb14.gz.snapshot",
      "stored": {
        "bytes": 20053,
        "sha256": "9b9d9588f4a77620053f546d52213b341b7d78ce8fb254be1806b0dca0bac871"
      },
      "decoded": {
        "bytes": 60916,
        "sha256": "8ea77373c45541a6e59ea9fac6f60804424a484064f937923219c1f88928bb14"
      },
      "encoding": "gzip"
    },
    {
      "role": "immutable-Notes8/artifact/browser-source-after.json",
      "path": "products/rea-studio/results/cloud-notes-todo-browser-first-pass-20261016/payload/8ea77373c45541a6e59ea9fac6f60804424a484064f937923219c1f88928bb14.gz.snapshot",
      "stored": {
        "bytes": 20053,
        "sha256": "9b9d9588f4a77620053f546d52213b341b7d78ce8fb254be1806b0dca0bac871"
      },
      "decoded": {
        "bytes": 60916,
        "sha256": "8ea77373c45541a6e59ea9fac6f60804424a484064f937923219c1f88928bb14"
      },
      "encoding": "gzip"
    },
    {
      "role": "immutable-Notes8/artifact/browser-postrun-source-after.json",
      "path": "products/rea-studio/results/cloud-notes-todo-browser-first-pass-20261016/payload/8ea77373c45541a6e59ea9fac6f60804424a484064f937923219c1f88928bb14.gz.snapshot",
      "stored": {
        "bytes": 20053,
        "sha256": "9b9d9588f4a77620053f546d52213b341b7d78ce8fb254be1806b0dca0bac871"
      },
      "decoded": {
        "bytes": 60916,
        "sha256": "8ea77373c45541a6e59ea9fac6f60804424a484064f937923219c1f88928bb14"
      },
      "encoding": "gzip"
    },
    {
      "role": "immutable-Notes8/artifact/playwright-results.json",
      "path": "products/rea-studio/results/cloud-notes-todo-browser-first-pass-20261016/payload/3c72cb8b46819c5bd645530775afa187b2a2a2daafa6b17f29bbe12c6592f3e0.snapshot",
      "stored": {
        "bytes": 15264,
        "sha256": "3c72cb8b46819c5bd645530775afa187b2a2a2daafa6b17f29bbe12c6592f3e0"
      },
      "decoded": {
        "bytes": 15264,
        "sha256": "3c72cb8b46819c5bd645530775afa187b2a2a2daafa6b17f29bbe12c6592f3e0"
      },
      "encoding": "identity"
    },
    {
      "role": "immutable-Notes8/artifact/browser-observation-process-7536.json",
      "path": "products/rea-studio/results/cloud-notes-todo-browser-first-pass-20261016/payload/e62bc7de93399cabbd9b5c67264ec7676283e424afa7b0364a899164d0b33917.snapshot",
      "stored": {
        "bytes": 1961,
        "sha256": "e62bc7de93399cabbd9b5c67264ec7676283e424afa7b0364a899164d0b33917"
      },
      "decoded": {
        "bytes": 1961,
        "sha256": "e62bc7de93399cabbd9b5c67264ec7676283e424afa7b0364a899164d0b33917"
      },
      "encoding": "identity"
    },
    {
      "role": "immutable-Notes8/artifact/notes-browser-workflow-attempt.json",
      "path": "products/rea-studio/results/cloud-notes-todo-browser-first-pass-20261016/payload/f15997348b7e81ebb287b16a14949aad4fbb67408ec46ff9548b86ec794ae69a.snapshot",
      "stored": {
        "bytes": 631,
        "sha256": "f15997348b7e81ebb287b16a14949aad4fbb67408ec46ff9548b86ec794ae69a"
      },
      "decoded": {
        "bytes": 631,
        "sha256": "f15997348b7e81ebb287b16a14949aad4fbb67408ec46ff9548b86ec794ae69a"
      },
      "encoding": "identity"
    },
    {
      "role": "immutable-Notes8/completed-backup-reader-v2-report",
      "path": "products/rea-studio/results/cloud-notes-todo-browser-first-pass-20261016/payload/859eeeaee3d90d295b45d08e6c6de8ab4a9de9efa34405588090a5cf9f71ee31.gz.snapshot",
      "stored": {
        "bytes": 32126,
        "sha256": "ac0b982d1dbef559ed63c03a2248012df1dd63e82a5460458772fd13788c99cc"
      },
      "decoded": {
        "bytes": 129863,
        "sha256": "859eeeaee3d90d295b45d08e6c6de8ab4a9de9efa34405588090a5cf9f71ee31"
      },
      "encoding": "gzip"
    },
    {
      "role": "immutable-Notes8/independent-backup-source-and-evidence-review",
      "path": "products/rea-studio/results/cloud-notes-todo-browser-first-pass-20261016/payload/b3a90572fb2f976047a344393c742b3bf9a973e6a1f248c5cd48e974af3fefcc.snapshot",
      "stored": {
        "bytes": 5372,
        "sha256": "b3a90572fb2f976047a344393c742b3bf9a973e6a1f248c5cd48e974af3fefcc"
      },
      "decoded": {
        "bytes": 5372,
        "sha256": "b3a90572fb2f976047a344393c742b3bf9a973e6a1f248c5cd48e974af3fefcc"
      },
      "encoding": "identity"
    },
    {
      "role": "immutable-Notes8/independent-backup-git-audit-result",
      "path": "products/rea-studio/results/cloud-notes-todo-browser-first-pass-20261016/payload/66d5f61b136007f6e3dfec51ff95c9599b19b31034cc6a11a35e3a06fa4203ee.gz.snapshot",
      "stored": {
        "bytes": 30629,
        "sha256": "65ef99b06bc942d7442bf9a7b623001a32f55979db0600dfc43f351397d97ae3"
      },
      "decoded": {
        "bytes": 98669,
        "sha256": "66d5f61b136007f6e3dfec51ff95c9599b19b31034cc6a11a35e3a06fa4203ee"
      },
      "encoding": "gzip"
    }
  ]
};
// This separate group authenticates committed current36 sources. The old52 view
// is a bounded historical data projection, never an overlay or behavior receipt.
const notes36Declaration={path:'products/rea-studio/results/notes36-source-transition-20261016/current-source-declaration.json',bytes:60830,sha256:'c0a488389094d898a7f6d308e9977192327f194ce3d271135dfcd2007e8a73bb'};
function verifyNotes36SourceTransition(rawRead){
 const seen=new Map();let total=0;function read(row){safe(row.path);const b=rawRead(row.path);assert(Buffer.isBuffer(b)&&b.length<=256*1024);same(identity(b),row,'Exact current36 proof object '+row.path);if(seen.has(row.path))same(identity(b),seen.get(row.path),'Changed current36 proof object');else{seen.set(row.path,identity(b));total+=b.length;assert(seen.size<=64&&total<=8*1024*1024,'Separate current36 proof aggregate bound');}return b;}
 const raw=read(notes36Declaration),plan=JSON.parse(raw);assert.equal(plan.schema,'rea-Notes36-current-source-declaration/v1');assert.equal(plan.sourceOnly,true);assert.equal(plan.sourceInstallationPerformedByDeclaration,false);assert.equal(plan.actualInstalledBehaviorAccepted,false);assert.equal(plan.historicalReceiptsRebound,false);assert.equal(plan.externalDeclarationPinRequired,true);assert.equal(plan.selfIdentityContained,false);assert.equal(plan.otherProofRowCount,59);assert.equal(plan.combinedProofRowCount,60);assert.equal(plan.proofFileLimit,64);assert.equal(plan.proofByteLimit,8*1024*1024);assert.equal(plan.proofIndividualByteLimit,256*1024);assert.equal(plan.otherProofRows.length,59);
 const objects=new Map(plan.otherProofRows.map(row=>[row.path,row]));assert.equal(objects.size,59);assert(!objects.has(notes36Declaration.path),'Declaration identity is externally pinned only');for(const row of objects.values())read(row);assert.equal(seen.size,60);
 assert.equal(plan.currentNotesSources.length,36);assert.equal(new Set(plan.currentNotesSources.map(row=>row.path)).size,36);assert.equal(plan.currentNotesSources.filter(row=>/\.(mjs|json|html|css|ps1)$/.test(row.path)).length,34);for(const row of plan.currentNotesSources){const fixed=objects.get(row.path);assert(fixed);same(fixed,row,'Closed current36 source pin');}
 const bundle=JSON.parse(read(plan.frozenFeatureBundle));assert.equal(bundle.schema,'rea-Notes-new-to-do-cloud-source-bundle/v1');assert.equal(bundle.productionInstalled,false);assert.equal(bundle.historicalReceiptsRebound,false);assert.deepEqual(bundle.featureAuthority,plan.frozenFeatureAuthority);assert.deepEqual(bundle.featureIndependentPeer,plan.frozenFeatureIndependentPeer);assert.deepEqual(bundle.composedNotesSources,plan.currentNotesSources);assert.deepEqual(bundle.transitions,plan.installedTargets);assert.deepEqual(bundle.fixedTests,plan.fixedTests);assert.equal(plan.fixedTests.length,21);assert.equal(plan.finiteGroups,111);assert.deepEqual(plan.currentNotesSources.filter(row=>row.path.endsWith('.test.mjs')).map(row=>row.path.slice('products/rea-studio/'.length)).sort(),[...plan.fixedTests].sort());assert.deepEqual(bundle.oldNamedGroupsRequired,plan.oldNamedGroupsRequired);assert.equal(plan.oldNamedGroupsRequired.length,23);assert.deepEqual(bundle.newNamedGroupsRequired,plan.newNamedGroupsRequired);assert.equal(plan.newNamedGroupsRequired.length,19);assert.deepEqual(plan.separateComparisonCounts,{existingConversionAndCompletion:20,newParentAndType:4,newDesktopCommandArguments:2,addedToTestGroupCounts:false});assert.deepEqual(bundle.separateComparisonCounts,plan.separateComparisonCounts);
 const routes=new Map(plan.installedTargets.map(row=>[row.path,row]));assert.equal(routes.size,7);assert.equal(plan.installedTargets.filter(row=>row.before).length,3);assert.equal(plan.installedTargets.filter(row=>!row.before).length,4);assert.equal(plan.installedTargets.filter(row=>/\.(mjs|json|html|css|ps1)$/.test(row.path)).length,6);for(const row of plan.installedTargets){same(objects.get(row.path),row.after,'Mandatory R5 current app pin');same(identity(read(row.afterImage)),row.after,'Mandatory frozen R5 after alias');if(row.before)same(identity(read(row.beforeImage)),row.before,'Mandatory exact current32 predecessor');else assert.equal(row.beforeImage,null);}
 assert.equal(bundle.payloads.length,17);for(const row of bundle.payloads)same(identity(read(row)),row,'Mandatory frozen R5 payload');
 const legacyRows=plan.legacy52LogicalToPhysicalRows,legacy=new Map(legacyRows.map(row=>[row.sourcePath,row]));assert.equal(legacyRows.length,52);assert.equal(legacy.size,52);assert.equal(new Set(legacyRows.map(row=>row.readPath)).size,52);assert.deepEqual([...legacy.keys()].sort(),notesSourceTransition.objects.map(row=>row.path).sort());let projected=0;
 for(const old of notesSourceTransition.objects){const row=legacy.get(old.path),current=routes.get(old.path);same(row,old.stored,'Exact historical52 identity');if(current&&current.before){assert.equal(row.readPath,current.beforeImage.path);same(row,current.before,'Only exact current32 predecessor can project');projected++;}else assert.equal(row.readPath,old.path);safe(row.readPath);}assert.equal(projected,3);
 const toolingRows=plan.legacyInstalledToolingRows;assert.equal(toolingRows.length,4);assert.equal(new Set(toolingRows.map(row=>row.sourcePath)).size,4);assert.equal(new Set(toolingRows.map(row=>row.readPath)).size,4);assert.equal(new Set([...legacyRows,...toolingRows].map(row=>row.sourcePath)).size,56);assert.equal(new Set([...legacyRows,...toolingRows].map(row=>row.readPath)).size,56);assert.equal(toolingRows.filter(row=>row.readPath!==row.sourcePath).length,1);for(const row of toolingRows){safe(row.sourcePath);safe(row.readPath);if(row.readPath!==row.sourcePath){assert.equal(row.sourcePath,'.github/workflows/notes-installed-cloud.yml');assert.equal(row.readPath,'products/rea-studio/results/notes36-source-transition-20261016/historical-workflows/notes-installed-cloud.yml.snapshot');}}
 return{plan,routes,legacyRead(p){const row=legacy.get(p);assert(row,'No unlisted historical52 logical read: '+p);const bytes=rawRead(row.readPath);same(identity(bytes),row,'Historical52 physical source '+p);return bytes;},recheck(){read(notes36Declaration);for(const row of objects.values())read(row);},summary(){return{notes36NamedCurrentSourcePinsOnly:true,notes36LiveDirectoryClosureEstablishedByModule:false,notes36LiveDirectoryClosureRequiresInstalledHelper:true,notes36Common85IsSeparateLegacyGroup:true,notes36CurrentSourcesMandatory:36,notes36EligibleCurrentSourcesMandatory:34,notes36InstalledTargetsMandatory:7,notes36UnchangedOlderTargetsMandatory:5,notes36CurrentTargetUnion:12,notes36CurrentReadObjects:seen.size,notes36CurrentReadBytes:total,notes36FixedReadFileLimit:64,notes36FixedReadByteLimit:8*1024*1024,notes36ExternalDeclarationPinRequired:true,notes36Historical32SourceProjections:3,notes36Historical52LogicalObjects:52,notes36Historical52PhysicalObjects:52,notes36LegacyToolingMapIsSourceMetadataOnly:true,notes36CurrentSourcePlanNotInstallationReceipt:true,notes36FreshInstalledBehaviorAccepted:false,notes36OriginalFullApplicationExecutions:0};}};
}

function verifyNotesSourceTransition(rawRead, priorBefore, oldCapsule) {
 const plan=notesSourceTransition,seen=new Map();let total=0;
 const objects=new Map(plan.objects.map(row=>[row.path,row]));assert.equal(objects.size,plan.objects.length);assert.equal(objects.size,52);
 function read(p){safe(p);const row=objects.get(p);assert(row,'No unlisted Notes proof path: '+p);const b=rawRead(p);assert(Buffer.isBuffer(b)&&b.length<=256*1024);same(identity(b),row.stored,p);if(seen.has(p))same(identity(b),seen.get(p),'Changed Notes proof '+p);else{seen.set(p,identity(b));total+=b.length;assert(seen.size<=64&&total<=8*1024*1024,'Separate Notes proof aggregate bound');}return b;}
 for(const row of plan.objects)read(row.path);
 function role(name){const matches=plan.roles.filter(row=>row.role===name);assert.equal(matches.length,1,'One fixed Notes role: '+name);const row=matches[0],stored=read(row.path);if(!row.decoded)return stored;const b=row.encoding==='gzip'?gunzipSync(stored,{maxOutputLength:256*1024}):stored;assert(b.length<=256*1024);same(identity(b),row.decoded,name);return b;}
 const json=name=>JSON.parse(role(name)),sourceJSON=p=>JSON.parse(read(p));
 const declaration=sourceJSON(plan.manifest.path),index=sourceJSON(plan.index.path),bundle=sourceJSON(plan.bundle.path);
 assert.equal(declaration.schema,'rea-notes-todo-source-proof-transition/v1');assert.equal(declaration.sourceOnly,true);assert.equal(declaration.applicationInstallationPerformedByDeclaration,false);assert.equal(declaration.actualInstalledBehaviorAccepted,false);assert.equal(declaration.historicalReceiptsRebound,false);assert.equal(declaration.registriesRewritten,false);assert.equal(declaration.capabilityIDsChanged,false);assert.deepEqual(declaration.sources,plan.sources);assert.deepEqual(declaration.readerBeforeImages,plan.readerBeforeImages);assert.deepEqual(declaration.currentVerifierAfter,plan.currentVerifierAfter);assert.deepEqual(declaration.publicationIndex,plan.index);assert.equal(declaration.currentSourcesMandatory,8);assert.equal(declaration.historicalReplacementRoutes,3);assert.equal(declaration.futureInstalledAcceptanceRequired,true);
 assert.equal(index.schema,'rea-notes-todo-installed-source-publication-map/v1');assert.equal(index.status,'source-plan-not-installation-receipt');assert.equal(index.sourceOnly,true);assert.equal(index.actualInstallationReceiptAuthenticated,false);assert.equal(index.newBehaviorExecutedByMap,0);assert.equal(index.historicalReceiptsRebound,false);assert.deepEqual(index.currentTargets,plan.sources);assert.equal(index.distinctTargets,8);assert.equal(index.replacements,3);assert.equal(index.additions,5);assert.equal(index.currentSourceMatchingAfterPinsRequired,true);
 assert.equal(bundle.schema,'rea-notes-todo-hosted-source-bundle/v1');assert.equal(bundle.productionInstalled,false);assert.equal(bundle.sourceAuthoringOnly,true);assert.equal(bundle.historicalReceiptsRebound,false);assert.equal(bundle.transitions.length,8);assert.equal(bundle.payloads.length,17);assert.equal(bundle.tests.length,17);assert.equal(bundle.authoredAdditionalGroups,23);assert.equal(bundle.originalHelperComparisons,20);assert.equal(bundle.originalComparisonsAddedToTestGroups,false);assert.equal(bundle.originalFullApplicationExecutions,0);
 const prefix='products/rea-studio/experiments/notes-todo/';for(const row of bundle.payloads)same(identity(read(prefix+row.path)),row,'Fixed Notes payload');same(identity(read(bundle.originalNote.path)),bundle.originalNote,'Fixed released original Note source');
 const routes=new Map(plan.sources.map(row=>[row.path,row]));assert.equal(routes.size,8);let replacements=0,oldRuntime=0;
 for(const row of plan.sources){const original=bundle.transitions.find(item=>item.target===row.path);assert(original);same(row.after,original.after,'Exact Notes after');assert.equal(row.afterImage,prefix+original.after.sourcePath);same(identity(read(row.path)),row.after,'Mandatory current Notes after');same(identity(read(row.afterImage)),row.after,'Mandatory Notes after alias');if(row.before){same(row.before,original.before,'Exact Notes before');assert.equal(row.beforeImage,prefix+original.before.sourcePath);same(identity(read(row.beforeImage)),row.before,'Mandatory Notes before alias');replacements++;const prior=priorBefore.find(item=>'products/rea-studio/'+item.path===row.path);if(prior){same(prior,row.before,'Exact Notes old937 source');const old=oldCapsule.snapshots.find(item=>item.sourcePath==='source/'+row.path.slice('products/rea-studio/'.length)+'.snapshot');assert(old);same(old,row.before,'Exact Notes old720 source');oldRuntime++;}else assert(row.path.endsWith('/README.md'));}else{assert.equal(original.before,null);assert.equal(row.beforeImage,null);assert.equal(priorBefore.some(item=>'products/rea-studio/'+item.path===row.path),false);}}
 assert.equal(replacements,3);assert.equal(oldRuntime,2);
 function execution(value,head,run){assert.deepEqual(value,{CI:'true',GITHUB_ACTIONS:'true',RUNNER_ENVIRONMENT:'github-hosted',RUNNER_OS:'Windows',RUNNER_ARCH:'X64',GITHUB_SHA:head,GITHUB_RUN_ID:run,GITHUB_RUN_ATTEMPT:'1',GITHUB_REPOSITORY:'Ginderlax/rea-research-lab'});}
 function actualTargets(composition,post,rawComposition){assert.equal(composition.transitions.length,8);assert.equal(composition.productionInstalled,false);assert.equal(composition.historicalReceiptsRebound,false);assert.equal(post.productionInstalled,false);assert.equal(post.historicalReceiptsRebound,false);assert.equal(post.status,'passed');assert.equal(post.sourceStable,true);assert.equal(post.checkedTargets,8);assert.equal(post.compositionSHA256,identity(rawComposition).sha256);for(const row of plan.sources){const before=composition.transitions.find(item=>item.path===row.path),after=post.currentTargets.find(item=>item.path===row.path);assert(before&&after);assert.deepEqual(before.before,row.before);same(before.after,row.after,'Actual composed Notes after');same(after,row.after,'Actual Notes composer postcheck');}}
 function eligible(before,snapshots){let count=0;for(const row of plan.sources){const relative=row.path.slice('products/rea-studio/'.length),source=before.find(item=>item.path===relative),snapshot=snapshots?.find(item=>item.sourcePath===relative);if(/\.(mjs|json|html|css|ps1)$/.test(row.path)){assert(source);same(source,row.after,'Actual eligible Notes source');if(snapshots){assert(snapshot);same(snapshot,row.after,'Actual eligible Notes snapshot');}count++;}else{assert.equal(source,undefined);if(snapshots)assert.equal(snapshot,undefined);}}assert.equal(count,7);}
 const finiteManifest=json('immutable-Notes92-public-preservation-manifest'),finiteHead='1d6fd83d6e40453e6db96420de15baf7eca50fa0',finiteRun='38903252258';
 assert.equal(finiteManifest.schema,'rea-hosted-notes-todo-first-pass-preservation/v1');assert.equal(finiteManifest.status,'passed-finite-notes-contracts');assert.equal(finiteManifest.runId,finiteRun);assert.equal(finiteManifest.runAttempt,1);assert.equal(finiteManifest.sourceCommit,finiteHead);assert.equal(finiteManifest.artifactId,'12047197582');assert.equal(finiteManifest.artifactSHA256,'ea18255d9915633c5fcdbc1676a9912a66ab5a6efdaa70be2bd17dad40726185');assert.equal(finiteManifest.authoredNewGroups,23);assert.equal(finiteManifest.originalHelperComparisons,20);assert.equal(finiteManifest.originalConversionComparisons,16);assert.equal(finiteManifest.originalCompletionComparisons,4);assert.equal(finiteManifest.comparisonsAddedToTestGroups,false);assert.equal(finiteManifest.fullOriginalApplicationExecutions,0);assert.equal(finiteManifest.originalDatabaseExecutions,0);assert.equal(finiteManifest.originalGuiSessions,0);assert.equal(finiteManifest.productionInstalled,false);assert.equal(finiteManifest.fullDevelopmentSuiteAcceptance,false);assert.equal(finiteManifest.historicalReceiptsRebound,false);assert.equal(finiteManifest.fullFeatureParityEstablished,false);assert.equal(finiteManifest.superiorityEstablished,false);
 for(const row of plan.roles.filter(item=>item.role.startsWith('immutable-Notes92/'))){const name='artifact/'+row.role.slice('immutable-Notes92/'.length),aliases=finiteManifest.records.filter(item=>item.sourcePath===name);assert.equal(aliases.length,1);const alias=aliases[0];assert.equal(plan.finitePrefix+alias.path,row.path);same(alias,row.decoded,'Selected Notes92 decoded role');same(alias.storage,row.stored,'Selected Notes92 stored role');assert.equal(alias.storage.encoding,row.encoding);}
 const fj=name=>json('immutable-Notes92/'+name),fa=fj('attempt-validation.json'),fc=fj('notes-todo-composition.json'),fp=fj('notes-todo-postrun-source-check.json'),fb=fj('source-before.json'),fe=fj('source-after.json'),fs=fj('source-snapshot-manifest.json'),fraw=role('immutable-Notes92/stdout.txt').toString('utf8');
 assert.equal(fa.status,'passed');assert.equal(fa.scope,'notes-todo-experiment');assert.equal(fa.repositoryCommit,finiteHead);assert.equal(fa.exitCode,0);assert.equal(fa.signal,null);assert.equal(fa.failure,null);assert.equal(fa.childCloseObserved,true);assert.equal(fa.executionEnvironment,'github-hosted');assert.equal(fa.runtime.version,'v24.16.0');assert.equal(fa.sourceFiles,779);assert.equal(fa.sourceSnapshotFiles,357);assert.equal(fa.sourceStable,true);assert.equal(fa.sourceCapturedBeforeExecution,true);assert.equal(fa.output.retainedOutputTruncated,false);assert.equal(fa.output.droppedOutputBytes,0);assert.deepEqual(fa.summary,finiteManifest.summary);assert.equal(fa.summary.tests,92);assert.equal(fa.summary.pass,92);for(const key of ['fail','cancelled','skipped','todo'])assert.equal(fa.summary[key],0);assert.deepEqual(fa.selectedTestFiles,bundle.tests.map(p=>p.slice('products/rea-studio/'.length)));assert.deepEqual(finiteManifest.selectedTestFiles,fa.selectedTestFiles);execution(Object.fromEntries(['CI','GITHUB_ACTIONS','RUNNER_ENVIRONMENT','RUNNER_OS','RUNNER_ARCH','GITHUB_SHA','GITHUB_RUN_ID','GITHUB_RUN_ATTEMPT','GITHUB_REPOSITORY'].map(name=>[name,fa.environment[name]])),finiteHead,finiteRun);assert.equal(fa.environment.GITHUB_REF,'refs/heads/codex/rea-cloud-recovery-20261015');assert.equal(fa.environment.GITHUB_WORKFLOW,'Cloud Notes to-do experiment');execution(fc.execution,finiteHead,finiteRun);execution(fp.execution,finiteHead,finiteRun);assert.equal(fc.sourceCommit,finiteHead);assert.equal(fp.sourceCommit,finiteHead);assert.equal(fc.baselineGitCommit,finiteHead);assert.equal(fp.baselineGitCommit,finiteHead);actualTargets(fc,fp,role('immutable-Notes92/notes-todo-composition.json'));assert.deepEqual(fb,fe);assert.equal(fb.length,779);assert.equal(fs.files.length,357);eligible(fb,fs.files);
 for(const [key,value]of Object.entries(fa.summary)){const matches=[...fraw.matchAll(new RegExp('^# '+key+' (\\d+(?:\\.\\d+)?)\\r?$','gm'))];assert(matches.length);assert.equal(Number(matches.at(-1)[1]),value);}assert.equal(role('immutable-Notes92/stderr.txt').length,0);assert.equal(bundle.authoredNewGroupNames.length,23);for(const name of bundle.authoredNewGroupNames)assert.equal(fraw.split(/\r?\n/).filter(line=>line==='# Subtest: '+name).length,1);
 const observations=fraw.split(/\r?\n/).filter(line=>line.startsWith('# {')).map(line=>{try{return JSON.parse(line.slice(2));}catch{return null;}}).filter(Boolean),helpers=observations.filter(item=>item.notesTodoOriginalComparisons).map(item=>item.notesTodoOriginalComparisons),delivery=observations.filter(item=>item.notesTodoActualHttpModuleDelivery).map(item=>item.notesTodoActualHttpModuleDelivery);assert.equal(helpers.length,1);assert.equal(helpers[0].conversionComparisons,16);assert.equal(helpers[0].completionComparisons,4);assert.equal(helpers[0].sourceSha256,bundle.originalNote.sha256);assert.equal(helpers[0].clock,1790000000123);assert.deepEqual(helpers[0].bindings.map(row=>row.name),['changeNoteType','toggleTodoCompleted']);for(const key of ['originalFullApplicationExecutions','originalDatabaseExecutions','originalGuiSessions'])assert.equal(helpers[0][key],0);assert.equal(delivery.length,1);assert.equal(delivery[0].unchangedPublicModuleBoundary,true);assert.equal(delivery[0].actualBrowserExecution,false);assert.deepEqual(delivery[0].delivered.map(row=>row.path),['/apps/notes/markdown.mjs','/apps/notes/core.mjs']);
 const browserManifest=json('immutable-Notes8-public-preservation-manifest'),browserHead='f61cb2ee1969b5fc4059f4e20961526d0594c519',browserRun='38908759571';assert.equal(browserManifest.schema,'rea-notes8-public-preservation-manifest/v1');assert.equal(browserManifest.sourceCommit,browserHead);assert.equal(browserManifest.runId,browserRun);assert.equal(browserManifest.roleCount,105);assert.equal(browserManifest.all467ArtifactMembersPreserved,true);assert.deepEqual(browserManifest.sourceSnapshotOmissions,[]);assert.equal(browserManifest.productionInstalled,false);assert.equal(browserManifest.historicalReceiptsRebound,false);
 for(const row of plan.roles.filter(item=>item.role.startsWith('immutable-Notes8/'))){const name=row.role.slice('immutable-Notes8/'.length),aliases=browserManifest.roles.filter(item=>item.role===name);assert.equal(aliases.length,1);const alias=aliases[0];assert.equal(plan.browserPrefix+alias.path,row.path);same(alias.decoded,row.decoded,'Selected browser8 decoded role');same(alias.stored,row.stored,'Selected browser8 stored role');assert.equal(alias.encoding==='raw'?'identity':alias.encoding,row.encoding);}
 const bj=name=>json('immutable-Notes8/'+name),ba=bj('artifact/browser-attempt.json'),bc=bj('artifact/notes-todo-composition.json'),bp=bj('artifact/notes-todo-postrun-source-check.json'),bb=bj('artifact/browser-source-before.json'),be=bj('artifact/browser-source-after.json'),bpost=bj('artifact/browser-postrun-source-check.json'),bpostAfter=bj('artifact/browser-postrun-source-after.json'),report=bj('artifact/playwright-results.json'),worker=bj('artifact/browser-observation-process-7536.json'),workflow=bj('artifact/notes-browser-workflow-attempt.json'),backup=bj('completed-backup-reader-v2-report'),peer=bj('independent-backup-source-and-evidence-review'),gitAudit=bj('independent-backup-git-audit-result');
 assert.equal(ba.schema,'rea-cloud-browser-attempt/v1');assert.equal(ba.status,'passed');assert.equal(ba.sourceCommit,browserHead);assert.equal(ba.failure,null);assert.equal(ba.retries,0);assert.equal(ba.workers,1);assert.equal(ba.testsByteOverlay,true);assert.equal(ba.notesOverlay.productionInstalled,false);assert.equal(ba.notesOverlay.exactAppTargets,8);assert.equal(ba.originalProductExecutions,0);assert.equal(ba.sourceCapturedBeforeExecution,true);assert.equal(ba.sourceStable,true);assert.equal(ba.sourceFiles,383);assert.equal(ba.applicationSourcesChanged,false);assert.equal(ba.historicalReceiptsRebound,false);assert.deepEqual(ba.summary,{tests:8,passed:8,failed:0,skipped:0,flaky:0,retries:0,exactRealDownloads:2,actualResponseHolds:4,genuineRevisionConflicts:1,originalProcesses:0});execution(ba.execution,browserHead,browserRun);execution(bc.execution,browserHead,browserRun);execution(bp.execution,browserHead,browserRun);execution(bpost.execution,browserHead,browserRun);assert.equal(bc.sourceCommit,browserHead);assert.equal(bp.sourceCommit,browserHead);actualTargets(bc,bp,role('immutable-Notes8/artifact/notes-todo-composition.json'));assert.deepEqual(bb,be);assert.deepEqual(bb,bpostAfter);assert.equal(bb.length,383);eligible(bb);assert.deepEqual(ba.sourceAuthentication,{eligibleSources:383,exactAfterimagesInEligibleCensus:7,allOtherEligibleGitBlobs:376,exactNotesTargets:8,separatelyPinnedMarkdownTargets:1,fullSixDirectoryActiveCensus:true,sourceOverlay:true});assert.deepEqual(bpost.sourceAuthentication,ba.sourceAuthentication);assert.equal(bpost.schema,'rea-cloud-notes-browser-postrun-source-check/v1');assert.equal(bpost.status,'source-verified');assert.equal(bpost.priorBrowserStatus,'passed');assert.equal(bpost.sourceStable,true);assert.equal(bpost.productTests,0);same(bpost.browserAttempt,identity(role('immutable-Notes8/artifact/browser-attempt.json')),'Actual browser postcheck attempt');same(bpost.composerPostcheck,identity(role('immutable-Notes8/artifact/notes-todo-postrun-source-check.json')),'Actual browser composer postcheck');
 assert.deepEqual(report.errors,[]);assert.deepEqual([report.stats.expected,report.stats.unexpected,report.stats.skipped,report.stats.flaky],[8,0,0,0]);const specs=[];function visit(suite){specs.push(...(suite.specs??[]));for(const sub of suite.suites??[])visit(sub);}for(const suite of report.suites)visit(suite);assert.equal(specs.length,8);assert.deepEqual(specs.map(row=>row.title).sort(),[...ba.scenarios].sort());for(const spec of specs){assert.equal(spec.ok,true);assert.equal(spec.tests.length,1);assert.equal(spec.tests[0].status,'expected');assert.equal(spec.tests[0].results.length,1);assert.equal(spec.tests[0].results[0].status,'passed');assert.equal(spec.tests[0].results[0].retry,0);}
 assert.equal(worker.schema,'rea-cloud-notes-todo-browser-worker-observation/v1');execution(worker.execution,browserHead,browserRun);assert.equal(worker.pid,7536);assert.equal(worker.observation.version,'156.0.8078.4');assert.equal(worker.observation.realBrowserFixtureCreated,true);assert.deepEqual([...worker.sourcePins].sort((a,b)=>a.path.localeCompare(b.path)),plan.sources.map(row=>({path:row.path.slice('products/rea-studio/'.length),...row.after})).sort((a,b)=>a.path.localeCompare(b.path)));assert.equal(workflow.sourceCommit,browserHead);assert.equal(workflow.runId,browserRun);assert.equal(workflow.runAttempt,'1');for(const key of ['checkoutOutcome','acquisitionOutcome','compositionOutcome','browserOutcome','composerPostcheckOutcome','browserPostcheckOutcome'])assert.equal(workflow[key],'success');assert.equal(workflow.productionInstalled,false);assert.equal(workflow.fullParity,false);assert.equal(workflow.superiority,false);
 assert.equal(backup.allCRCAndBytesReadable,true);assert.deepEqual(backup.auditErrors,[]);assert.equal(backup.recordedEightScenarioNotesGatesConsistent,true);assert.equal(backup.files.length,467);assert.equal(backup.sourceSnapshotFilesVerified,383);assert.equal(backup.realHoldsVerified.length,4);assert.equal(backup.realDownloadsVerified.length,2);assert.equal(backup.pngCRCReadbacks.length,8);assert.equal(backup.ownedCleanupRecordsVerified.length,8);assert.equal(backup.independentTarReadback.unchangedRawRecords,6);assert.equal(peer.actualHostedIdentityRead.sourceCommit,browserHead);assert.equal(peer.actualHostedIdentityRead.runId,browserRun);assert.equal(peer.recordedBackupResultRead.eightCaseConsistencyPassed,true);assert.equal(peer.independentBackupGitAudit.otherEligibleSourcesIndependentlyMatchedToExactSourceCommitGitBlobs,376);assert.equal(gitAudit.sourceCommit,browserHead);assert.equal(peer.localActivity.productExecutions,0);
 const readerRoutes=new Map(plan.currentVerifierAfter.map(row=>{const before=plan.readerBeforeImages.find(item=>item.reader===row.path);assert(before);return[row.path,{path:row.path,before:{bytes:before.bytes,sha256:before.sha256},after:{bytes:row.bytes,sha256:row.sha256},beforeImage:before.path}];}));assert.equal(readerRoutes.size,2);
 return {routes,readerRoutes,recheck(){for(const[p]of seen)read(p);},summary(){return{notesCurrentSourcesMandatory:8,notesHistoricalReplacementRoutes:3,notesHistorical937RuntimeRoutes:2,notesHistoricalFiniteGroups:92,notesHistoricalAuthoredNewGroups:23,notesHistoricalOriginalHelperComparisons:20,notesHistoricalBrowserCases:8,notesHistoricalBrowserRealHolds:4,notesHistoricalBrowserActualDownloads:2,notesSelectedImmutableMetadataOnly:true,notesSourcePlanNotInstallationReceipt:true,notesFreshInstalledBehavioralAcceptance:false,notesCurrentVerifierIntermediateRoutes:2,notesAuthenticatedFiles:seen.size,notesAuthenticatedBytes:total,notesFixedReadFileLimit:64,notesFixedReadByteLimit:8*1024*1024};}};
}

export function createEditorVaultProofMigration(rawRead){assert.equal(typeof rawRead,'function');const seen=new Map();let total=0;
 function read(p,r){safe(p);if(p===groupEditDocumentTransition.path){assert(r,'Named GROUP-EDIT document read requires explicit identity');const requested=expected(r);if(requested.bytes===groupEditDocumentTransition.before.bytes&&requested.sha256===groupEditDocumentTransition.before.sha256)p=groupEditDocumentTransition.beforeImage.path;else same(requested,groupEditDocumentTransition.after,'No unlisted GROUP-EDIT document read identity allowed');}const b=rawRead(p);assert(Buffer.isBuffer(b)&&b.length<=32*1024*1024);const id=identity(b);if(r)same(id,expected(r),p);if(seen.has(p))same(id,seen.get(p),'Changed proof '+p);else{seen.set(p,id);total+=b.length;assert(seen.size<=160&&total<=16*1024*1024,'Transition aggregate bound');}return b;}
 const requirementDeclaration=JSON.parse(read(requirementEvidenceTransition.manifest.path,requirementEvidenceTransition.manifest));assert.equal(requirementDeclaration.schema,'rea-requirement-evidence-provenance-transition/v1');assert.equal(requirementDeclaration.sourceOnly,true);for(const flag of ['registriesRewritten','capabilityGatesChanged','currentBehavioralAcceptanceRebound','unknownNamedIdentitiesAccepted','genericHistoricalFallback','oldReceiptsRewritten','applicationRuntimeChanged'])assert.equal(requirementDeclaration[flag],false);assert.equal(requirementDeclaration.optionalSizeAssertionPreserved,true);assert.deepEqual(requirementDeclaration.records,[requirementEvidenceTransition.rootBefore,requirementEvidenceTransition.migrationBefore]);same(requirementDeclaration.rootBefore,requirementEvidenceTransition.rootBefore,'Exact prior requirement root epoch');same(requirementDeclaration.migrationBefore,requirementEvidenceTransition.migrationBefore,'Exact prior requirement migration epoch');same(requirementDeclaration.rootAfter,archiveTransition.rootBefore,'Exact predecessor requirement read-site root epoch');for(const r of requirementDeclaration.records)read(r.path,r);
 const groupEditDocumentDeclaration=JSON.parse(read(groupEditDocumentTransition.manifest.path,groupEditDocumentTransition.manifest));assert.equal(groupEditDocumentDeclaration.schema,'rea-vault-group-edit-document-link-transition/v1');assert.equal(groupEditDocumentDeclaration.sourceOnly,true);assert.equal(groupEditDocumentDeclaration.immutableNextSourcesAndAuthoritiesRewritten,false);assert.equal(groupEditDocumentDeclaration.arbitraryFallback,false);assert.equal(groupEditDocumentDeclaration.genericPathAlias,false);assert.equal(groupEditDocumentDeclaration.oldReceiptsRewritten,false);assert.equal(groupEditDocumentDeclaration.target,groupEditDocumentTransition.path);same(groupEditDocumentDeclaration.before,groupEditDocumentTransition.before,'Exact GROUP-EDIT document before identity');same(groupEditDocumentDeclaration.after,groupEditDocumentTransition.after,'Exact GROUP-EDIT document after identity');assert.deepEqual(groupEditDocumentDeclaration.records,[groupEditDocumentTransition.beforeImage,groupEditDocumentTransition.oldMigration]);for(const r of groupEditDocumentDeclaration.records)read(r.path,r);read(groupEditDocumentTransition.path,groupEditDocumentTransition.after);
 const manifest=JSON.parse(read(fixed.installation.manifest.path,fixed.installation.manifest));assert.equal(manifest.schema,'rea-editor-vault-root-installation-preservation/v1');assert.equal(manifest.records.length,1098);
 const oldCapsule=JSON.parse(read(fixed.oldCapsule.path,fixed.oldCapsule));assert.equal(oldCapsule.sourceFiles,720);assert.equal(oldCapsule.snapshots.length,727);assert.equal(oldCapsule.developmentValidationSHA256,fixed.metadata.development.sha256);
 const installed=JSON.parse(read(fixed.installation.record.path,fixed.installation.record));assert.equal(installed.installed.length,30);assert.deepEqual(installed.installed.map(r=>({path:r.destination,before:r.before,after:r.after})),fixed.sources);
 const sourceRoutes=new Map(fixed.routes.map(r=>[r.path,r]));assert.equal(sourceRoutes.size,8);assert.equal(fixed.routes.filter(r=>r.affectedInOld720).length,6);
 const nextRoutes=new Map(next.routes.map(r=>[r.path,r]));assert.equal(nextRoutes.size,9);assert.equal(next.sources.length,35);assert.equal(new Set(next.sources.map(r=>r.path)).size,35);
 for(const authority of next.authorities){const declaration=JSON.parse(read(authority.path,authority)),rows=declaration[authority.key];assert.equal(rows.length,authority.rows);assert.deepEqual(rows.map(r=>({path:r.destination??r.target,before:r.before,after:r.after,plan:authority.name})),next.sources.filter(r=>r.plan===authority.name));}
 let movedEarlierSources=0;for(const r of fixed.sources){const route=nextRoutes.get(r.path);if(route){same(r.after,route.before,'Exact second transition '+r.path);read(route.historicalPath,route.before);movedEarlierSources++;}else read(r.path,r.after);}assert.equal(movedEarlierSources,4);
 for(const r of next.sources)read(r.path,r.after);for(const r of next.routes)read(r.historicalPath,r.before);read(fixed.sharedHost.path,fixed.sharedHost);
 const previous=JSON.parse(read(next.historical937.path,next.historical937));assert.equal(previous.sourceFiles,737);assert.equal(previous.snapshots.length,753);assert.equal(previous.summary.tests,937);assert.equal(previous.summary.pass,937);assert.equal(previous.summary.fail+previous.summary.skipped+previous.summary.cancelled+previous.summary.todo,0);assert.equal(previous.sourceStable,true);assert.equal(previous.fullProductParity,false);assert.equal(previous.universalSuperiority,false);
 const previousSelected=new Map(next.historical937.selected.map(r=>[r.sourcePath,r]));for(const r of next.historical937.selected){const original=previous.snapshots.find(s=>s.sourcePath===r.sourcePath);assert(original);same(original,r,'Fixed937 selected alias');assert.equal(r.path,'products/rea-studio/results/editor-vault-combined-20261013/'+original.path);read(r.path,r);}
 const previousJSON=n=>JSON.parse(read(previousSelected.get(n).path,previousSelected.get(n))),priorBefore=previousJSON('source-before.json.snapshot'),priorAfter=previousJSON('source-after.json.snapshot'),priorAttempt=previousJSON('attempt-validation.json.snapshot'),priorDevelopment=previousJSON('results/development-validation.json');assert.deepEqual(priorBefore,priorAfter);assert.equal(priorBefore.length,737);assert.equal(priorAttempt.exitCode,0);assert.equal(priorAttempt.sourceStable,true);assert.deepEqual(priorAttempt.summary,previous.summary);assert.deepEqual(priorDevelopment.summary,previous.summary);assert.equal(previous.developmentValidationSHA256,previousSelected.get('results/development-validation.json').sha256);
 for(const r of next.routes.filter(r=>r.path.endsWith('.mjs'))){const original=priorBefore.find(s=>'products/rea-studio/'+s.path===r.path);assert(original);same(original,r.before,'Previous937 source transition');}
 const priorStatus=JSON.parse(read(next.historical937.statusBefore.path,next.historical937.statusBefore));assert.equal(priorStatus.goal_status,'active');assert.equal(priorStatus.complete_replacement_products,0);assert.equal(priorStatus.source_stable_combined_checks.pass,937);assert.equal(priorStatus.source_stable_combined_checks.source_fingerprints,737);
 const windowsRoutes=new Map(windowsPathTransition.sources.map(r=>[r.path,r]));assert.equal(windowsRoutes.size,3);
 const windowsDeclaration=JSON.parse(read(windowsPathTransition.manifest.path,windowsPathTransition.manifest));assert.equal(windowsDeclaration.schema,'rea-windows-path-source-proof-transition/v1');assert.equal(windowsDeclaration.sourceOnly,true);assert.equal(windowsDeclaration.productionInstalled,false);assert.equal(windowsDeclaration.actualFocusedAttemptAccepted,false);assert.equal(windowsDeclaration.actualInstallationReceiptAvailable,false);assert.deepEqual(windowsDeclaration.sources,windowsPathTransition.sources);assert.equal(windowsDeclaration.records.length,8);
 let windowsHistoricalRoutes=0;for(const r of windowsPathTransition.sources){read(r.path,r.after);read(r.afterImage,r.after);if(r.before){read(r.beforeImage,r.before);const prior=priorBefore.find(s=>'products/rea-studio/'+s.path===r.path);assert(prior);same(prior,r.before,'Exact Windows path previous937 source');const prior720=oldCapsule.snapshots.find(s=>s.sourcePath==='source/'+r.path.slice('products/rea-studio/'.length)+'.snapshot');assert(prior720);same(prior720,r.before,'Exact Windows path previous720 source');windowsHistoricalRoutes++;}else{assert.equal(r.path,'products/rea-studio/apps/sync/webdav.windows-path.test.mjs');assert.equal(priorBefore.some(s=>'products/rea-studio/'+s.path===r.path),false);assert.equal(r.beforeImage,null);}}assert.equal(windowsHistoricalRoutes,2);
 read(windowsPathTransition.rootBefore.path,windowsPathTransition.rootBefore);read(windowsPathTransition.migrationBefore.path,windowsPathTransition.migrationBefore);read(windowsPathTransition.migrationLatestBefore.path,windowsPathTransition.migrationLatestBefore);
 const focused=JSON.parse(read(windowsPathFocusedEvidence.manifest.path,windowsPathFocusedEvidence.manifest));assert.equal(focused.schema,'rea-cloud-windows-path-finite-pass-preservation/v1');assert.equal(focused.status,'passed-finite-experimental-contracts');assert.equal(focused.runId,38814327316);assert.equal(focused.runAttempt,1);assert.equal(focused.sourceCommit,'93b5dbe79f100781fd847af4c1ce76b25a2f21aa');assert.equal(focused.pullRequestHead,'b0cdb55065e52b0ec7774cce1271fb82b72864bd');assert.equal(focused.artifactId,12010251786);assert.equal(focused.artifactSHA256,'9a6160f65fb72ffcb15f9a9960b9165461fd264cc0d342932cdab871d52d4835');assert.equal(focused.records.length,32);assert.equal(focused.uniqueInertObjects,24);assert.equal(focused.omittedSourceSnapshotPayloads.length,350);assert.equal(focused.publicSourceSnapshotPayloads,0);for(const flag of ['productionInstalled','fullDevelopmentSuiteAcceptance','browserAcceptance','historicalReceiptsRebound','fullParity','superiority'])assert.equal(focused[flag],false);assert.equal(focused.completeReadableLocalBackupVerified,true);assert.equal(focused.localBackupFiles,380);assert.equal(focused.sourceFiles,772);assert.equal(focused.sourceStable,true);assert.equal(focused.separatePostrunSourceCheck,'passed');
 const selectedFocused=new Map();for(const r of windowsPathFocusedEvidence.selected){const aliases=focused.records.filter(s=>s.sourcePath===r.sourcePath);assert.equal(aliases.length,1);same(aliases[0],r,'Selected finite47 metadata');assert.equal(windowsPathFocusedEvidence.prefix+aliases[0].path,r.path);assert.equal(selectedFocused.has(r.sourcePath),false);selectedFocused.set(r.sourcePath,read(r.path,r));}assert.equal(selectedFocused.size,8);
 const fj=n=>JSON.parse(selectedFocused.get(n));const fa=fj('attempt-validation.json'),fc=fj('windows-path-composition.json'),fp=fj('windows-path-postrun-source-check.json'),fb=fj('source-before.json'),fe=fj('source-after.json'),fs=fj('source-snapshot-manifest.json');
 assert.equal(fa.schema,'rea-cloud-development-attempt/v1');assert.equal(fa.status,'passed');assert.equal(fa.scope,'windows-path-experiment');assert.equal(fa.repositoryCommit,focused.sourceCommit);assert.equal(fa.exitCode,0);assert.equal(fa.signal,null);assert.equal(fa.failure,null);assert.equal(fa.sourceFiles,772);assert.equal(fa.sourceStable,true);assert.equal(fa.sourceCapturedBeforeExecution,true);assert.equal(fa.sourceSnapshotFiles,350);assert.equal(fa.historicalReceiptsRebound,false);assert.equal(fa.historicalDevelopmentReceiptOverwritten,false);assert.equal(fa.fullFeatureParityEstablished,false);assert.equal(fa.universalSuperiorityEstablished,false);assert.deepEqual(fa.summary,{tests:47,pass:47,fail:0,cancelled:0,skipped:0,todo:0,duration_ms:20326.034});assert.deepEqual(fa.summary,focused.summary);assert.deepEqual(fa.selectedTestFiles,['apps/editor/git.test.mjs','apps/sync/webdav.test.mjs','apps/sync/webdav.actions.test.mjs','apps/sync/webdav.integration.test.mjs','apps/sync/webdav.windows-path.test.mjs']);
 for(const environment of [fa.environment,fc.execution,fp.execution]){assert.equal(environment.GITHUB_SHA,focused.sourceCommit);assert.equal(environment.GITHUB_RUN_ID,'38814327316');assert.equal(environment.GITHUB_RUN_ATTEMPT,'1');assert.equal(environment.GITHUB_REPOSITORY,'Ginderlax/rea-research-lab');assert.equal(environment.RUNNER_ENVIRONMENT,'github-hosted');assert.equal(environment.RUNNER_OS,'Windows');}assert.equal(fc.schema,'rea-windows-path-hosted-composition/v1');assert.equal(fc.status,'composed-unexecuted-windows-path-overlay');assert.equal(fp.schema,'rea-windows-path-hosted-postrun-source-check/v1');assert.equal(fp.status,'passed');assert.equal(fc.baselineGitCommit,focused.sourceCommit);assert.equal(fp.baselineGitCommit,focused.sourceCommit);assert.equal(fc.productionInstalled,false);assert.equal(fp.productionInstalled,false);assert.equal(fc.historicalReceiptsRebound,false);assert.equal(fp.historicalReceiptsRebound,false);assert.equal(fp.sourceStable,true);assert.equal(fp.checkedTargets,3);assert.equal(fc.transitions.length,3);assert.equal(fc.gitStatus.length,3);
 const composition=windowsPathFocusedEvidence.selected.find(r=>r.sourcePath==='windows-path-composition.json');assert.equal(composition.sha256,'7774bfa56f708adbe35eacebc21385a9eed56175e2df6f67c8fec0350af4b7b0');assert.equal(focused.compositionSHA256,composition.sha256);assert.equal(fp.compositionSHA256,composition.sha256);assert.equal(fa.windowsPathOverlay.sha256,composition.sha256);assert.equal(fa.windowsPathOverlay.productionInstalled,false);assert.equal(fa.windowsPathOverlay.fullDevelopmentReceiptEmitted,false);assert.equal(fa.windowsPathOverlay.gitBaselineEligibleActiveFiles,347);assert.equal(fa.windowsPathOverlay.gitBaselineEligibleActiveBytesAuthenticated,true);assert.equal(fa.windowsPathOverlay.gitWorkingTreeMatchesOverlayAfter,true);assert.equal(fa.windowsPathAliasObservation.differentSpelling,true);assert.equal(fa.windowsPathAliasObservation.observedShortComponent,true);assert.equal(fa.windowsPathAliasObservation.syntheticAliasConstructed,false);assert.deepEqual(fa.windowsPathAliasObservation,focused.actualWindowsShortPathObservation);
 assert.deepEqual(fb,fe);assert.equal(fb.length,772);assert.equal(new Set(fb.map(r=>r.path)).size,772);assert.equal(fs.schema,'rea-cloud-source-snapshots/v1');assert.equal(fs.censusFiles,772);assert.equal(fs.snapshotScope,'active');assert.equal(fs.files.length,350);for(const r of windowsPathTransition.sources){const entry=fb.find(s=>'products/rea-studio/'+s.path===r.path),snapshot=fs.files.find(s=>'products/rea-studio/'+s.sourcePath===r.path);assert(entry&&snapshot);same(entry,r.after,'Actual finite47 tested target');same(snapshot,r.after,'Actual finite47 snapshot identity');const transition=fc.transitions.find(s=>s.path===r.path),post=fp.currentTargets.find(s=>s.path===r.path);assert(transition&&post);assert.deepEqual(transition.before,r.before);same(transition.after,r.after,'Actual finite47 composed after');same(post,r.after,'Actual finite47 postcheck target');}
 const raw=selectedFocused.get('stdout.txt').toString('utf8');for(const text of ['# tests 47','# pass 47','# fail 0','# cancelled 0','# skipped 0','# todo 0'])assert(raw.includes(text),'Actual finite47 raw TAP summary');assert.equal(selectedFocused.get('stderr.txt').length,0);assert.equal(fa.output.droppedOutputBytes,0);assert.equal(fa.output.retainedOutputTruncated,false);assert.equal(fa.output.childCloseObserved,true);
 const archiveProof=verifyArchiveSourceTransition(rawRead,priorBefore,oldCapsule);
 const notes36Proof=verifyNotes36SourceTransition(rawRead);
 const notesProof=verifyNotesSourceTransition(notes36Proof.legacyRead,priorBefore,oldCapsule);
 const verifierRoutes=new Map(fixed.verifiers.map(r=>[r.path,r]));assert.equal(verifierRoutes.size,7);for(const r of fixed.verifiers){read(r.path,r.after);read(r.historicalPath,r.before);}
 for(const r of notesSourceTransition.currentVerifierAfter){const fixedCurrent=verifierRoutes.get(r.path);assert(fixedCurrent);same(fixedCurrent.after,r,'Exact Notes current root reader after');}
 read(publicationRootTransition.middle.path,publicationRootTransition.middle);read(publicationRootTransition.migrationBefore.path,publicationRootTransition.migrationBefore);read(publicationRootTransition.finiteVerifier.path,publicationRootTransition.finiteVerifier);
 for(const r of [gitDirectoryVerifierTransition.manifest,gitDirectoryVerifierTransition.payload,gitDirectoryVerifierTransition.middle,gitDirectoryVerifierTransition.migrationBefore])read(r.path,r);
 const editorSaveClosure=JSON.parse(read(editorSaveGitDirectoryTransition.manifest.path,editorSaveGitDirectoryTransition.manifest));assert.equal(editorSaveClosure.schema,'rea-publication-editor-save-git-closure/v1');assert.equal(editorSaveClosure.reader,editorSaveGitDirectoryTransition.path);same(editorSaveClosure.readerBefore,editorSaveGitDirectoryTransition.middle,'Exact Editor save middle epoch');same(editorSaveClosure.readerAfter,verifierRoutes.get(editorSaveGitDirectoryTransition.path).after,'Exact Editor save current epoch');assert.equal(editorSaveClosure.files.length,5);for(const r of editorSaveClosure.files)read(editorSaveGitDirectoryTransition.prefix+r.path,r);read(editorSaveGitDirectoryTransition.middle.path,editorSaveGitDirectoryTransition.middle);
 const mismatchCorrection=JSON.parse(read(editorGitMismatchTransition.manifest.path,editorGitMismatchTransition.manifest));assert.equal(mismatchCorrection.schema,'rea-publication-editor-git-observer-transition/v1');assert.equal(mismatchCorrection.sourceOnly,true);assert.equal(mismatchCorrection.records.length,9);assert.equal(mismatchCorrection.failedRun.sourceControlsPassed,65);assert.equal(mismatchCorrection.failedRun.publicationAccepted,false);assert.equal(mismatchCorrection.failedRun.fullProducerEvidenceUploaded,false);for(const r of mismatchCorrection.records)read(editorGitMismatchTransition.prefix+r.path,r);same(mismatchCorrection.newExactMismatch.before,windowsRoutes.get('products/rea-studio/apps/editor/git.test.mjs').before,'Exact Editor Git mismatch before');same(mismatchCorrection.newExactMismatch.after,windowsRoutes.get('products/rea-studio/apps/editor/git.test.mjs').after,'Exact Editor Git mismatch after');
 const carrierDeclaration=JSON.parse(read(historicalCarrierTransition.manifest.path,historicalCarrierTransition.manifest));assert.equal(carrierDeclaration.schema,'rea-historical-carrier-delivery-transition/v1');assert.equal(carrierDeclaration.sourceOnly,true);assert.equal(carrierDeclaration.auditCoverageComplete,false);assert.equal(carrierDeclaration.genericDirectoryException,false);assert.equal(carrierDeclaration.restoredCarriers.length,80);assert.equal(carrierDeclaration.exceptions.length,11);assert.deepEqual(carrierDeclaration.records,[historicalCarrierTransition.rootBefore,historicalCarrierTransition.migrationBefore]);for(const r of [historicalCarrierTransition.rootBefore,historicalCarrierTransition.migrationBefore,historicalCarrierTransition.helper])read(r.path,r);
 for(const r of fixed.routes){read(r.historicalPath,r.before);const installationRow=installed.installed.find(s=>s.destination===r.path);assert(installationRow);same(installationRow.before,r.before,r.path);same(installationRow.after,r.after,r.path);}
 for(const r of Object.values(fixed.metadata))read(r.historicalPath,r);
 function resolveHistorical(p,r){
  safe(p);if(p===groupEditDocumentTransition.path){assert(r,'Named GROUP-EDIT document transition requires explicit identity');const requested=expected(r);if(requested.bytes===groupEditDocumentTransition.after.bytes&&requested.sha256===groupEditDocumentTransition.after.sha256)return null;if(requested.bytes===groupEditDocumentTransition.before.bytes&&requested.sha256===groupEditDocumentTransition.before.sha256)return groupEditDocumentTransition.beforeImage.path;throw new Error('No unlisted GROUP-EDIT document historical identity allowed');}const current36=notes36Proof.routes.get(p),notes=notesProof.routes.get(p),archive=archiveProof.routes.get(p),windows=windowsRoutes.get(p),newer=nextRoutes.get(p),row=sourceRoutes.get(p),v=verifierRoutes.get(p);
  if(!current36&&!notes&&!archive&&!windows&&!newer&&!row&&!v)return null;
  assert(r,'Named transition requires an explicit expected identity: '+p);const id=expected(r);
  const notesReader=notesProof.readerRoutes.get(p);if(notesReader&&id.bytes===notesReader.before.bytes&&id.sha256===notesReader.before.sha256)return notesReader.beforeImage;
  if(current36){if(id.bytes===current36.after.bytes&&id.sha256===current36.after.sha256)return null;if(current36.before&&id.bytes===current36.before.bytes&&id.sha256===current36.before.sha256)return current36.beforeImage.path;assert(notes&&notes.before&&id.bytes===notes.before.bytes&&id.sha256===notes.before.sha256,'No unlisted current36 or historical32 Notes identity allowed: '+p);}
  if(notes){if(id.bytes===notes.after.bytes&&id.sha256===notes.after.sha256)return null;if(notes.before&&id.bytes===notes.before.bytes&&id.sha256===notes.before.sha256)return notes.beforeImage;throw new Error('No unlisted Notes historical identity allowed: '+p);}
  if(archive){if(p===archiveFixtureCorrection.declaration.currentTarget){const correction=archiveFixtureCorrection.declaration;if(id.bytes===correction.after.bytes&&id.sha256===correction.after.sha256)return null;if(id.bytes===correction.before.bytes&&id.sha256===correction.before.sha256)return correction.historicalAfterImage;throw new Error('No unlisted Archive corrected-test identity allowed: '+p);}if(id.bytes===archive.after.bytes&&id.sha256===archive.after.sha256)return null;if(archive.before&&id.bytes===archive.before.bytes&&id.sha256===archive.before.sha256)return archive.beforeImage;throw new Error('No unlisted Archive historical identity allowed: '+p);}
  if(windows){if(id.bytes===windows.after.bytes&&id.sha256===windows.after.sha256)return null;if(windows.before&&id.bytes===windows.before.bytes&&id.sha256===windows.before.sha256)return windows.beforeImage;throw new Error('No unlisted Windows path historical identity allowed: '+p);}
  if(p==='scripts/verify-records.mjs'&&id.bytes===archiveTransition.rootBefore.bytes&&id.sha256===archiveTransition.rootBefore.sha256)return archiveTransition.rootBefore.path;
  if(p==='scripts/verify-records.mjs'&&id.bytes===requirementEvidenceTransition.rootBefore.bytes&&id.sha256===requirementEvidenceTransition.rootBefore.sha256)return requirementEvidenceTransition.rootBefore.path;
  if(p==='scripts/verify-records.mjs'&&id.bytes===historicalCarrierTransition.rootBefore.bytes&&id.sha256===historicalCarrierTransition.rootBefore.sha256)return historicalCarrierTransition.rootBefore.path;
  if(p==='scripts/verify-records.mjs'&&id.bytes===windowsPathTransition.rootBefore.bytes&&id.sha256===windowsPathTransition.rootBefore.sha256)return windowsPathTransition.rootBefore.path;
  if(p===publicationRootTransition.path&&id.bytes===publicationRootTransition.middle.bytes&&id.sha256===publicationRootTransition.middle.sha256)return publicationRootTransition.middle.path;
  if(p===gitDirectoryVerifierTransition.path&&id.bytes===gitDirectoryVerifierTransition.middle.bytes&&id.sha256===gitDirectoryVerifierTransition.middle.sha256)return gitDirectoryVerifierTransition.middle.path;
  if(p===editorSaveGitDirectoryTransition.path&&id.bytes===editorSaveGitDirectoryTransition.middle.bytes&&id.sha256===editorSaveGitDirectoryTransition.middle.sha256)return editorSaveGitDirectoryTransition.middle.path;
  if(newer){if(id.bytes===newer.after.bytes&&id.sha256===newer.after.sha256)return null;if(id.bytes===newer.before.bytes&&id.sha256===newer.before.sha256)return newer.historicalPath;if(!row&&!v)throw new Error('No unlisted historical identity allowed: '+p);}
  const older=row??v;if(!newer&&id.bytes===older.after.bytes&&id.sha256===older.after.sha256)return null;same(id,older.before,'No unlisted historical identity allowed: '+p);return older.historicalPath;
 }
 function summary(){notes36Proof.recheck();notesProof.recheck();archiveProof.recheck();for(const [p,r]of seen)read(p,r);return{sourceOnly:true,...archiveProof.summary(),...notesProof.summary(),...notes36Proof.summary(),notesHistorical32SourcePlanMandatoryTargets:8,notesCurrentSourcesMandatory:12,namedSourceRoutes:22,old720ChangedCodeRoutes:14,docsOutside720:8,groupEditDocumentCurrentSourceMandatory:1,groupEditDocumentHistoricalRoute:1,groupEditDocumentLinkOnlyTransition:true,requirementEvidenceHistoricalReadSite:true,requirementRegistriesRewritten:false,requirementEvidenceNotCurrentBehavioralAcceptance:true,currentInstalledSourcesMandatory:85,windowsPathCurrentSourcesMandatory:3,windowsPathHistoricalSourceRoutes:2,windowsPathSourceDeclarationOnly:true,historicalFiniteWindowsPathGroups:47,windowsPathFocusedEvidenceAuthenticated:true,windowsPathFocusedEvidenceSelectedMetadataOnly:true,windowsPathFocusedEvidenceFullSuiteAccepted:false,windowsPathFocusedEvidenceProductionInstalled:false,windowsPathBehavioralAcceptanceEstablished:false,windowsPathInstallationReceiptAuthenticated:false,latestInstalledSourcesMandatory:35,unchangedEarlierInstalledSourcesMandatory:26,historicalEarlierInstalledAfterSourcesAuthenticated:4,latestBeforeImagesMandatory:9,historical937NotCurrentAcceptance:true,historical937SelectedSnapshots:4,currentSharedHostMandatory:1,currentVerifierAfterMandatory:7,currentFiniteCloudVerifierMandatory:1,rootVerifierHistoricalBeforeImages:6,historicalCarrierPolicySourceMandatory:1,historicalCarrierExceptions:11,historicalCarrierKnownRestored:80,historicalCarrierAuditCoverageComplete:false,followupVerifierHistoricalBeforeImages:2,editorSaveVerifierHistoricalBeforeImages:2,gitDirectoryClosurePayloadMandatory:1,priorMigrationSourceMandatory:9,editorHistoricalMismatchProjectionRows:6,historical847NotCurrentAcceptance:true,historical78NotCurrentAcceptance:true,unknownPathsNotMapped:true,authenticatedFiles:seen.size,authenticatedBytes:total,applicationExecutions:0,originalExecutions:0,browserExecutions:0,benchmarks:0,fullParity:false};}
 return{resolve:resolveHistorical,historicalMetadata(name){assert(Object.hasOwn(fixed.metadata,name),'Only development/status beforemetadata');const r=fixed.metadata[name];return read(r.historicalPath,r);},historicalVerifier(p){assert(verifierRoutes.has(p),'Only named verifier beforeimages');const r=verifierRoutes.get(p);return read(r.historicalPath,r.before);},editorMismatchesIncludingHistoricalHost(rows){assert(Array.isArray(rows)&&rows.length===31);assert.equal(new Set(rows.map(r=>r.path)).size,31,'Distinct historical Editor source rows');const result=[];for(const r of rows){const route=sourceRoutes.get(r.path)??(r.path==='products/rea-studio/apps/editor/git.test.mjs'?windowsRoutes.get(r.path):null);if(route){same(r,route.before,'Fixed old Editor source');result.push({path:r.path,testedSha256:r.sha256,liveSha256:route.after.sha256});}else if(r.path===fixed.sharedHost.path){assert.equal(r.bytes,7741);assert.equal(r.sha256,'807a473ec0334f60dfd58f2df8901c722f1bd4eb1d64c62d9ba1ea65c2b6b55f');result.push({path:r.path,testedSha256:r.sha256,liveSha256:fixed.sharedHost.sha256});}}assert.equal(result.length,6);return result;},summary};
}
export function createEditorVaultProofMigrationFromRoot(root){const base=realpathSync(resolve(root));return createEditorVaultProofMigration(p=>{safe(p);let at=base;for(const s of p.split('/')){at=resolve(at,s);assert(!lstatSync(at).isSymbolicLink(),'Reparse proof path');}const real=realpathSync(at),rel=relative(base,real);assert(rel&&rel!=='..'&&!rel.startsWith('..'+sep)&&!rel.startsWith(sep));const stat=lstatSync(at);assert(stat.isFile()&&stat.size<=32*1024*1024);const b=readFileSync(at);assert.equal(b.length,stat.size);return b;});}
