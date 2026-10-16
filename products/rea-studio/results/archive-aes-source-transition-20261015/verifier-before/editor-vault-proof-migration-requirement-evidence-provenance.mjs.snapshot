import assert from 'node:assert/strict';
import {readFileSync,lstatSync,realpathSync} from 'node:fs';
import {resolve,relative,sep} from 'node:path';
import {createHash} from 'node:crypto';
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
        "bytes": 45876,
        "sha256": "856eeba61b820260f7e1bdc8d9bb9e8924e3ae3183a0c3c0495471e6152a8b5f"
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
        "bytes": 148688,
        "sha256": "cd524543c7b6c9bf2050194994667e3e805165a934da209957ecbb5559d211c4"
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
const sha=b=>createHash('sha256').update(b).digest('hex');
const identity=b=>({bytes:b.length,sha256:sha(b)});
function same(a,b,n){assert.equal(a.bytes,b.bytes,n+' bytes');assert.equal(a.sha256,b.sha256,n+' SHA256');}
function safe(p){assert(typeof p==='string'&&p.length>0&&p.length<=4096&&!/[\\:\x00-\x1f\x7f]/.test(p)&&!p.startsWith('/'));for(const s of p.split('/'))assert(s&&s!=='.'&&s!=='..'&&!['.local','work','node_modules','artifacts','tooling'].includes(s),'Unsafe public proof path');return p;}
function expected(r){assert(r&&Number.isSafeInteger(r.bytes)&&r.bytes>=0&&r.bytes<=32*1024*1024&&/^[0-9a-f]{64}$/.test(r.sha256));return {bytes:r.bytes,sha256:r.sha256};}
/** Fixed source-only transition. No caller supplied routes or disable flag.
 * The before bytes remain historical; every named installed after is required.
 * This is bounded I/O authentication, not an atomic filesystem snapshot.
 */
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
export function createEditorVaultProofMigration(rawRead){assert.equal(typeof rawRead,'function');const seen=new Map();let total=0;
 function read(p,r){safe(p);if(p===groupEditDocumentTransition.path){assert(r,'Named GROUP-EDIT document read requires explicit identity');const requested=expected(r);if(requested.bytes===groupEditDocumentTransition.before.bytes&&requested.sha256===groupEditDocumentTransition.before.sha256)p=groupEditDocumentTransition.beforeImage.path;else same(requested,groupEditDocumentTransition.after,'No unlisted GROUP-EDIT document read identity allowed');}const b=rawRead(p);assert(Buffer.isBuffer(b)&&b.length<=32*1024*1024);const id=identity(b);if(r)same(id,expected(r),p);if(seen.has(p))same(id,seen.get(p),'Changed proof '+p);else{seen.set(p,id);total+=b.length;assert(seen.size<=160&&total<=16*1024*1024,'Transition aggregate bound');}return b;}
 const requirementDeclaration=JSON.parse(read(requirementEvidenceTransition.manifest.path,requirementEvidenceTransition.manifest));assert.equal(requirementDeclaration.schema,'rea-requirement-evidence-provenance-transition/v1');assert.equal(requirementDeclaration.sourceOnly,true);for(const flag of ['registriesRewritten','capabilityGatesChanged','currentBehavioralAcceptanceRebound','unknownNamedIdentitiesAccepted','genericHistoricalFallback','oldReceiptsRewritten','applicationRuntimeChanged'])assert.equal(requirementDeclaration[flag],false);assert.equal(requirementDeclaration.optionalSizeAssertionPreserved,true);assert.deepEqual(requirementDeclaration.records,[requirementEvidenceTransition.rootBefore,requirementEvidenceTransition.migrationBefore]);same(requirementDeclaration.rootBefore,requirementEvidenceTransition.rootBefore,'Exact prior requirement root epoch');same(requirementDeclaration.migrationBefore,requirementEvidenceTransition.migrationBefore,'Exact prior requirement migration epoch');same(requirementDeclaration.rootAfter,fixed.verifiers.find(r=>r.path==='scripts/verify-records.mjs').after,'Current requirement read-site root epoch');for(const r of requirementDeclaration.records)read(r.path,r);
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
 const verifierRoutes=new Map(fixed.verifiers.map(r=>[r.path,r]));assert.equal(verifierRoutes.size,7);for(const r of fixed.verifiers){read(r.path,r.after);read(r.historicalPath,r.before);}
 read(publicationRootTransition.middle.path,publicationRootTransition.middle);read(publicationRootTransition.migrationBefore.path,publicationRootTransition.migrationBefore);read(publicationRootTransition.finiteVerifier.path,publicationRootTransition.finiteVerifier);
 for(const r of [gitDirectoryVerifierTransition.manifest,gitDirectoryVerifierTransition.payload,gitDirectoryVerifierTransition.middle,gitDirectoryVerifierTransition.migrationBefore])read(r.path,r);
 const editorSaveClosure=JSON.parse(read(editorSaveGitDirectoryTransition.manifest.path,editorSaveGitDirectoryTransition.manifest));assert.equal(editorSaveClosure.schema,'rea-publication-editor-save-git-closure/v1');assert.equal(editorSaveClosure.reader,editorSaveGitDirectoryTransition.path);same(editorSaveClosure.readerBefore,editorSaveGitDirectoryTransition.middle,'Exact Editor save middle epoch');same(editorSaveClosure.readerAfter,verifierRoutes.get(editorSaveGitDirectoryTransition.path).after,'Exact Editor save current epoch');assert.equal(editorSaveClosure.files.length,5);for(const r of editorSaveClosure.files)read(editorSaveGitDirectoryTransition.prefix+r.path,r);read(editorSaveGitDirectoryTransition.middle.path,editorSaveGitDirectoryTransition.middle);
 const mismatchCorrection=JSON.parse(read(editorGitMismatchTransition.manifest.path,editorGitMismatchTransition.manifest));assert.equal(mismatchCorrection.schema,'rea-publication-editor-git-observer-transition/v1');assert.equal(mismatchCorrection.sourceOnly,true);assert.equal(mismatchCorrection.records.length,9);assert.equal(mismatchCorrection.failedRun.sourceControlsPassed,65);assert.equal(mismatchCorrection.failedRun.publicationAccepted,false);assert.equal(mismatchCorrection.failedRun.fullProducerEvidenceUploaded,false);for(const r of mismatchCorrection.records)read(editorGitMismatchTransition.prefix+r.path,r);same(mismatchCorrection.newExactMismatch.before,windowsRoutes.get('products/rea-studio/apps/editor/git.test.mjs').before,'Exact Editor Git mismatch before');same(mismatchCorrection.newExactMismatch.after,windowsRoutes.get('products/rea-studio/apps/editor/git.test.mjs').after,'Exact Editor Git mismatch after');
 const carrierDeclaration=JSON.parse(read(historicalCarrierTransition.manifest.path,historicalCarrierTransition.manifest));assert.equal(carrierDeclaration.schema,'rea-historical-carrier-delivery-transition/v1');assert.equal(carrierDeclaration.sourceOnly,true);assert.equal(carrierDeclaration.auditCoverageComplete,false);assert.equal(carrierDeclaration.genericDirectoryException,false);assert.equal(carrierDeclaration.restoredCarriers.length,80);assert.equal(carrierDeclaration.exceptions.length,11);assert.deepEqual(carrierDeclaration.records,[historicalCarrierTransition.rootBefore,historicalCarrierTransition.migrationBefore]);for(const r of [historicalCarrierTransition.rootBefore,historicalCarrierTransition.migrationBefore,historicalCarrierTransition.helper])read(r.path,r);
 for(const r of fixed.routes){read(r.historicalPath,r.before);const installationRow=installed.installed.find(s=>s.destination===r.path);assert(installationRow);same(installationRow.before,r.before,r.path);same(installationRow.after,r.after,r.path);}
 for(const r of Object.values(fixed.metadata))read(r.historicalPath,r);
 function resolveHistorical(p,r){
  safe(p);if(p===groupEditDocumentTransition.path){assert(r,'Named GROUP-EDIT document transition requires explicit identity');const requested=expected(r);if(requested.bytes===groupEditDocumentTransition.after.bytes&&requested.sha256===groupEditDocumentTransition.after.sha256)return null;if(requested.bytes===groupEditDocumentTransition.before.bytes&&requested.sha256===groupEditDocumentTransition.before.sha256)return groupEditDocumentTransition.beforeImage.path;throw new Error('No unlisted GROUP-EDIT document historical identity allowed');}const windows=windowsRoutes.get(p),newer=nextRoutes.get(p),row=sourceRoutes.get(p),v=verifierRoutes.get(p);
  if(!windows&&!newer&&!row&&!v)return null;
  assert(r,'Named transition requires an explicit expected identity: '+p);const id=expected(r);
  if(windows){if(id.bytes===windows.after.bytes&&id.sha256===windows.after.sha256)return null;if(windows.before&&id.bytes===windows.before.bytes&&id.sha256===windows.before.sha256)return windows.beforeImage;throw new Error('No unlisted Windows path historical identity allowed: '+p);}
  if(p==='scripts/verify-records.mjs'&&id.bytes===requirementEvidenceTransition.rootBefore.bytes&&id.sha256===requirementEvidenceTransition.rootBefore.sha256)return requirementEvidenceTransition.rootBefore.path;
  if(p==='scripts/verify-records.mjs'&&id.bytes===historicalCarrierTransition.rootBefore.bytes&&id.sha256===historicalCarrierTransition.rootBefore.sha256)return historicalCarrierTransition.rootBefore.path;
  if(p==='scripts/verify-records.mjs'&&id.bytes===windowsPathTransition.rootBefore.bytes&&id.sha256===windowsPathTransition.rootBefore.sha256)return windowsPathTransition.rootBefore.path;
  if(p===publicationRootTransition.path&&id.bytes===publicationRootTransition.middle.bytes&&id.sha256===publicationRootTransition.middle.sha256)return publicationRootTransition.middle.path;
  if(p===gitDirectoryVerifierTransition.path&&id.bytes===gitDirectoryVerifierTransition.middle.bytes&&id.sha256===gitDirectoryVerifierTransition.middle.sha256)return gitDirectoryVerifierTransition.middle.path;
  if(p===editorSaveGitDirectoryTransition.path&&id.bytes===editorSaveGitDirectoryTransition.middle.bytes&&id.sha256===editorSaveGitDirectoryTransition.middle.sha256)return editorSaveGitDirectoryTransition.middle.path;
  if(newer){if(id.bytes===newer.after.bytes&&id.sha256===newer.after.sha256)return null;if(id.bytes===newer.before.bytes&&id.sha256===newer.before.sha256)return newer.historicalPath;if(!row&&!v)throw new Error('No unlisted historical identity allowed: '+p);}
  const older=row??v;if(!newer&&id.bytes===older.after.bytes&&id.sha256===older.after.sha256)return null;same(id,older.before,'No unlisted historical identity allowed: '+p);return older.historicalPath;
 }
 function summary(){for(const [p,r]of seen)read(p,r);return{sourceOnly:true,namedSourceRoutes:16,old720ChangedCodeRoutes:11,docsOutside720:5,groupEditDocumentCurrentSourceMandatory:1,groupEditDocumentHistoricalRoute:1,groupEditDocumentLinkOnlyTransition:true,requirementEvidenceHistoricalReadSite:true,requirementRegistriesRewritten:false,requirementEvidenceNotCurrentBehavioralAcceptance:true,currentInstalledSourcesMandatory:64,windowsPathCurrentSourcesMandatory:3,windowsPathHistoricalSourceRoutes:2,windowsPathSourceDeclarationOnly:true,historicalFiniteWindowsPathGroups:47,windowsPathFocusedEvidenceAuthenticated:true,windowsPathFocusedEvidenceSelectedMetadataOnly:true,windowsPathFocusedEvidenceFullSuiteAccepted:false,windowsPathFocusedEvidenceProductionInstalled:false,windowsPathBehavioralAcceptanceEstablished:false,windowsPathInstallationReceiptAuthenticated:false,latestInstalledSourcesMandatory:35,unchangedEarlierInstalledSourcesMandatory:26,historicalEarlierInstalledAfterSourcesAuthenticated:4,latestBeforeImagesMandatory:9,historical937NotCurrentAcceptance:true,historical937SelectedSnapshots:4,currentSharedHostMandatory:1,currentVerifierAfterMandatory:7,currentFiniteCloudVerifierMandatory:1,rootVerifierHistoricalBeforeImages:5,historicalCarrierPolicySourceMandatory:1,historicalCarrierExceptions:11,historicalCarrierKnownRestored:80,historicalCarrierAuditCoverageComplete:false,followupVerifierHistoricalBeforeImages:2,editorSaveVerifierHistoricalBeforeImages:2,gitDirectoryClosurePayloadMandatory:1,priorMigrationSourceMandatory:8,editorHistoricalMismatchProjectionRows:6,historical847NotCurrentAcceptance:true,historical78NotCurrentAcceptance:true,unknownPathsNotMapped:true,authenticatedFiles:seen.size,authenticatedBytes:total,applicationExecutions:0,originalExecutions:0,browserExecutions:0,benchmarks:0,fullParity:false};}
 return{resolve:resolveHistorical,historicalMetadata(name){assert(Object.hasOwn(fixed.metadata,name),'Only development/status beforemetadata');const r=fixed.metadata[name];return read(r.historicalPath,r);},historicalVerifier(p){assert(verifierRoutes.has(p),'Only named verifier beforeimages');const r=verifierRoutes.get(p);return read(r.historicalPath,r.before);},editorMismatchesIncludingHistoricalHost(rows){assert(Array.isArray(rows)&&rows.length===31);assert.equal(new Set(rows.map(r=>r.path)).size,31,'Distinct historical Editor source rows');const result=[];for(const r of rows){const route=sourceRoutes.get(r.path)??(r.path==='products/rea-studio/apps/editor/git.test.mjs'?windowsRoutes.get(r.path):null);if(route){same(r,route.before,'Fixed old Editor source');result.push({path:r.path,testedSha256:r.sha256,liveSha256:route.after.sha256});}else if(r.path===fixed.sharedHost.path){assert.equal(r.bytes,7741);assert.equal(r.sha256,'807a473ec0334f60dfd58f2df8901c722f1bd4eb1d64c62d9ba1ea65c2b6b55f');result.push({path:r.path,testedSha256:r.sha256,liveSha256:fixed.sharedHost.sha256});}}assert.equal(result.length,6);return result;},summary};
}
export function createEditorVaultProofMigrationFromRoot(root){const base=realpathSync(resolve(root));return createEditorVaultProofMigration(p=>{safe(p);let at=base;for(const s of p.split('/')){at=resolve(at,s);assert(!lstatSync(at).isSymbolicLink(),'Reparse proof path');}const real=realpathSync(at),rel=relative(base,real);assert(rel&&rel!=='..'&&!rel.startsWith('..'+sep)&&!rel.startsWith(sep));const stat=lstatSync(at);assert(stat.isFile()&&stat.size<=32*1024*1024);const b=readFileSync(at);assert.equal(b.length,stat.size);return b;});}
