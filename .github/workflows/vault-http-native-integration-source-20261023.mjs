// Focused hosted original Vault HTTP/native integration diagnostic. Source review is separate from action admission.
// Only Node builtins are imported by this controller. Product modules load solely inside the authenticated test child.
import ctlAssert from 'node:assert/strict';
import ctlFs from 'node:fs';
import ctlOs from 'node:os';
import ctlPath from 'node:path';
import {fileURLToPath as ctlFileURLToPath} from 'node:url';
import {spawn as ctlSpawn,spawnSync as ctlSpawnSync} from 'node:child_process';
import {createHash as ctlCreateHash} from 'node:crypto';
import * as ctlCrypto from 'node:crypto';
import * as vendorFs from 'node:fs/promises';
import * as vendorPath from 'node:path';
import { createHash as vendorCreateHash, randomUUID as vendorRandomUUID } from 'node:crypto';
import { inflateRawSync as vendorInflateRawSync } from 'node:zlib';

import * as privateCrypto from 'node:crypto';
import * as privateFs from 'node:fs/promises';
import * as privatePath from 'node:path';

const CTL_PARENT='3f77897f8782093b6e828987ac9105b6b782e705';
const CTL_PARENT_TREE='f887cf24e819a95be956f1f6658d81ab492c8848';
const CTL_STUDIO_TREE='e57ad8a1e6d7c6969955348df66a30269eb8cfc7';
const CTL_SUPPLEMENTAL_CAMPAIGN={"path":"products/rea-studio/experiments/notes-open-todos-first-20261021/CAMPAIGN.json","rawMode":"100644","gitBlob":"9644795beb0739b891ce0b5d8535bb1e9a73c262","bytes":238920,"sha256":"1a54e3914eb662f7aebf2270e3eccb61878c221292dabdcc555acff93dd872ff"};
const CTL_PARENT_PARENT='13eb681da3ea83e12560f2a2a0321b23bc28edb4';
const CTL_REPOSITORY='Ginderlax/rea-research-lab';
const CTL_BRANCH='refs/heads/validation/vault-http-native-integration-20261023-r4';
const CTL_JOB='vault-http-native-integration';
const CTL_SCRIPT='.github/workflows/vault-http-native-integration-source-20261023.mjs';
const CTL_WORKFLOW='.github/workflows/vault-http-native-integration.yml';
const CTL_HTTP='products/rea-studio/apps/vault/http.test.mjs';
const CTL_MODULE_MS=1200000,CTL_STREAM_CAP=1048576,CTL_OBSERVATION_CAP=2097152;
const CTL_PRIVATE_SCHEMA='rea-vault-focused-private-details/v2';
const CTL_PUBLIC_PREFIX='REA_VAULT_FOCUSED_HTTP_NATIVE_REPORT_V5=';
const CTL_TEST_NAMES=Object.freeze([
'disk HTTP edit/history/confirmed restore survive genuine process restart and release opens native export',
'master-key rotation preserves history through restart, invalidates old private selection token and rejects old password'
]);
const CTL_PRODUCT_ROWS=[{"path":"products/rea-studio/STATUS.json","rawMode":"100644","gitBlob":"0677b736943d9662dc07533c7233b1f60ce6f7ac"},{"path":"products/rea-studio/apps/archive/app.integration.test.mjs","rawMode":"100644","gitBlob":"e49baacff5ce06445514e0118b720f16b4ac9c03"},{"path":"products/rea-studio/apps/archive/app.test.mjs","rawMode":"100644","gitBlob":"25ba5f32a8af838c98c4ab06e6978d12840fbb1d"},{"path":"products/rea-studio/apps/archive/bootstrap-original.mjs","rawMode":"100644","gitBlob":"2925739991a0474923f8a0254e225c4999ade997"},{"path":"products/rea-studio/apps/archive/bsdtar-original-test-helper.mjs","rawMode":"100644","gitBlob":"47f017fd8508660d82b7d221fb58e71ebf20a52a"},{"path":"products/rea-studio/apps/archive/client.mjs","rawMode":"100644","gitBlob":"d29da8d2899e3d274111ac4330e2b70f9d464985"},{"path":"products/rea-studio/apps/archive/compatibility-evidence.json","rawMode":"100644","gitBlob":"6eda5c3805908ae51e46f4ea764ce6557ed35945"},{"path":"products/rea-studio/apps/archive/encode-lzma.mjs","rawMode":"100644","gitBlob":"598cc0897105ebecba9606cb19ab4e73fc31a534"},{"path":"products/rea-studio/apps/archive/encoder.test.mjs","rawMode":"100644","gitBlob":"96f87a3f53a5dcbd886bf61f4037072057d64b6a"},{"path":"products/rea-studio/apps/archive/fixtures/generate-zstd-fixtures.mjs","rawMode":"100644","gitBlob":"7aacb940aafaea53725d72cbea1916a2b77d502a"},{"path":"products/rea-studio/apps/archive/fixtures/references/node-24.16.0-zlib.html","rawMode":"100644","gitBlob":"cc9ad0c67c92c2c9f66844010b13483ed40d4e03"},{"path":"products/rea-studio/apps/archive/fixtures/zstd/native-zip93.zip","rawMode":"100644","gitBlob":"b081db8c1ed2b9b2e2d6cd41ee5d9689e78ebd79"},{"path":"products/rea-studio/apps/archive/fixtures/zstd/native.tar.zst","rawMode":"100644","gitBlob":"39cfe10042602f0d5baf327c27bb5e7f2ac5203d"},{"path":"products/rea-studio/apps/archive/fixtures/zstd/native.zst","rawMode":"100644","gitBlob":"47dfa426c1ab464412e408d042b0462d88763846"},{"path":"products/rea-studio/apps/archive/fixtures/zstd/payload.bin","rawMode":"100644","gitBlob":"c6c10e5f020f323519aeb27e186fcc90ebf55db7"},{"path":"products/rea-studio/apps/archive/fixtures/zstd/provenance.json","rawMode":"100644","gitBlob":"46c9b15ad55ced49cef8f307679a391fd6ab66c3"},{"path":"products/rea-studio/apps/archive/flat-extract-original-helper.mjs","rawMode":"100644","gitBlob":"ea38f7c0212d6699cdd61080b7589e7409182c8d"},{"path":"products/rea-studio/apps/archive/flat-extract-original.test.mjs","rawMode":"100644","gitBlob":"2b516ff446d63b1f7e76f88d436b754747a59b3d"},{"path":"products/rea-studio/apps/archive/flat-extract-ui.test.mjs","rawMode":"100644","gitBlob":"60b79581a6cb256e76eeb74b869bc7da96992ba4"},{"path":"products/rea-studio/apps/archive/flat-extract.test.mjs","rawMode":"100644","gitBlob":"586765aa6daedbbec9c960cb9685977b3748dcdf"},{"path":"products/rea-studio/apps/archive/formats-validation.json","rawMode":"100644","gitBlob":"4c7580bd545dc5e52f6604c4a2348c16298640a3"},{"path":"products/rea-studio/apps/archive/formats.test.mjs","rawMode":"100644","gitBlob":"240c6babe434e603dc0702f866125b64c7b0e5e3"},{"path":"products/rea-studio/apps/archive/gzip.mjs","rawMode":"100644","gitBlob":"de7ed26ab638cd9a249a25921ecc023076510c5f"},{"path":"products/rea-studio/apps/archive/interop.ps1","rawMode":"100644","gitBlob":"0976e6402f695d24613234c9a4b6af7f51641f95"},{"path":"products/rea-studio/apps/archive/lzma-provenance.json","rawMode":"100644","gitBlob":"a13a8d62245702b548df78b4a14dd4b3fc495217"},{"path":"products/rea-studio/apps/archive/lzma-validation.json","rawMode":"100644","gitBlob":"d0db675b4708cc817894f9818a57f55b35a405c6"},{"path":"products/rea-studio/apps/archive/lzma.integration.test.mjs","rawMode":"100644","gitBlob":"6dd9647ffcc7378020f86fcbe8aca68e7edf4523"},{"path":"products/rea-studio/apps/archive/lzma.mjs","rawMode":"100644","gitBlob":"7b449aeebb0ee98373250cea1aa7ec11590aec25"},{"path":"products/rea-studio/apps/archive/lzma.test.mjs","rawMode":"100644","gitBlob":"ca9108089ef8fd5b76da7be3ccf704eb120f5631"},{"path":"products/rea-studio/apps/archive/operation-budget.mjs","rawMode":"100644","gitBlob":"0e1444c7b61d6dcb31101a6fd420d05305b6dec3"},{"path":"products/rea-studio/apps/archive/original-aes-test-helper.mjs","rawMode":"100644","gitBlob":"0c3b60a0bb92e9fe6e9887eabe9e21efed61fdd8"},{"path":"products/rea-studio/apps/archive/original-lzma-test-helper.mjs","rawMode":"100644","gitBlob":"209044bac91be5b5a4db666e2c7e59b873d83ba6"},{"path":"products/rea-studio/apps/archive/server.mjs","rawMode":"100644","gitBlob":"5b85184dcc7bcaf11fd68b05ddb75fbb6de9fd5b"},{"path":"products/rea-studio/apps/archive/sevenzip-aes-bounds.test.mjs","rawMode":"100644","gitBlob":"7721ab85dc2f878eb4df1096ff8810f9aebadc3d"},{"path":"products/rea-studio/apps/archive/sevenzip-aes-container.test.mjs","rawMode":"100644","gitBlob":"ed58867873c6ba4fc21c28c7dda4a74658bbaca8"},{"path":"products/rea-studio/apps/archive/sevenzip-aes-http.test.mjs","rawMode":"100644","gitBlob":"99058c8fbdd48b8e586888df40acb183ba75fea6"},{"path":"products/rea-studio/apps/archive/sevenzip-aes-original.test.mjs","rawMode":"100644","gitBlob":"99c38c85c204292da0bf438c8be1c7a34a475111"},{"path":"products/rea-studio/apps/archive/sevenzip-aes-ui-fixture.mjs","rawMode":"100644","gitBlob":"022f43217a72d162e57b0896da4df679bbe56888"},{"path":"products/rea-studio/apps/archive/sevenzip-aes-ui.test.mjs","rawMode":"100644","gitBlob":"9ecd5e1437678be3da44c6cf6a31644bc5869b5a"},{"path":"products/rea-studio/apps/archive/sevenzip-aes.mjs","rawMode":"100644","gitBlob":"db73841e206267516ec9f363c30f9097772d53ab"},{"path":"products/rea-studio/apps/archive/sevenzip-aes.test.mjs","rawMode":"100644","gitBlob":"dfd0f19e51fb09e4aeb5d822b94151631db8a7f2"},{"path":"products/rea-studio/apps/archive/sevenzip-source-references.json","rawMode":"100644","gitBlob":"f7952aa682430342175a38f241f9c6ffc246160b"},{"path":"products/rea-studio/apps/archive/sevenzip-validation.json","rawMode":"100644","gitBlob":"2bb01242d73e991ca1e511d52a4c31992b59c0dc"},{"path":"products/rea-studio/apps/archive/sevenzip.mjs","rawMode":"100644","gitBlob":"db3de08767307020374d83365297cc31ea529dce"},{"path":"products/rea-studio/apps/archive/sevenzip.test.mjs","rawMode":"100644","gitBlob":"ff03e354d3d0f7fecc693bf9f2c0290ef8cc4b8c"},{"path":"products/rea-studio/apps/archive/source-metadata.mjs","rawMode":"100644","gitBlob":"777b44e2ed4b3278b89f16b42d4fc956a684aae9"},{"path":"products/rea-studio/apps/archive/source-metadata.test.mjs","rawMode":"100644","gitBlob":"382f5bce443e21fef8c0592861d4faba75470596"},{"path":"products/rea-studio/apps/archive/tar.mjs","rawMode":"100644","gitBlob":"efd1d139a4c9d5c6b9f6c1275b95eba7258ef76b"},{"path":"products/rea-studio/apps/archive/verify-lzma.mjs","rawMode":"100644","gitBlob":"7c3f5f820c3447efd43489ff7ac234b13f5796a2"},{"path":"products/rea-studio/apps/archive/verify-sevenzip.mjs","rawMode":"100644","gitBlob":"24660976a587d0bca5e7925fee07508d957cde4d"},{"path":"products/rea-studio/apps/archive/zip-aes-http.test.mjs","rawMode":"100644","gitBlob":"4beaaa505db0084d7214f0893789fc67cf9767b3"},{"path":"products/rea-studio/apps/archive/zip-aes-original-fixture.mjs","rawMode":"100644","gitBlob":"c38b9c6bd04cf468bfd732e1c4da0174444349ff"},{"path":"products/rea-studio/apps/archive/zip-aes-original-helper.mjs","rawMode":"100644","gitBlob":"9ea96f46c215654e1f7816990f3b6417c56cbe72"},{"path":"products/rea-studio/apps/archive/zip-aes-original.test.mjs","rawMode":"100644","gitBlob":"c6bfb095225f3c60a246502006c49e3e9a35e104"},{"path":"products/rea-studio/apps/archive/zip-aes-ui.test.mjs","rawMode":"100644","gitBlob":"b2d732f535d4e329e3f66af875c4613c4ddbd8af"},{"path":"products/rea-studio/apps/archive/zip-aes.mjs","rawMode":"100644","gitBlob":"8bad1401af084f21befea294864ef21c5ba9b201"},{"path":"products/rea-studio/apps/archive/zip-aes.test.mjs","rawMode":"100644","gitBlob":"0809275dc2b1fa6344dc3e2cae1046f121bb9142"},{"path":"products/rea-studio/apps/archive/zip.mjs","rawMode":"100644","gitBlob":"eac91e495ad10b7707469b07a93b0da91e35d6ea"},{"path":"products/rea-studio/apps/archive/zip.test.mjs","rawMode":"100644","gitBlob":"e149688861ee9ba7444dc79f3882f0250d6872d1"},{"path":"products/rea-studio/apps/archive/zstd-validation.json","rawMode":"100644","gitBlob":"a0f0e409b1184a7dea75664252d90cbdbf2363e3"},{"path":"products/rea-studio/apps/archive/zstd.mjs","rawMode":"100644","gitBlob":"1d4f1427cdfced6623736c0a70e80a3ddb6d79a9"},{"path":"products/rea-studio/apps/archive/zstd.test.mjs","rawMode":"100644","gitBlob":"005f591f8fa8516c677cc6baaaff6f91e8efc4b4"},{"path":"products/rea-studio/apps/automation/app.test.mjs","rawMode":"100644","gitBlob":"0cbdafbbcb8ece268f3a355453772e646ae27a24"},{"path":"products/rea-studio/apps/automation/client.mjs","rawMode":"100644","gitBlob":"44fcdac115b0882585af09f0deec9f5fbc007570"},{"path":"products/rea-studio/apps/automation/compare-original.mjs","rawMode":"100644","gitBlob":"e719c229847047821fb0fefd91668dad0aa79198"},{"path":"products/rea-studio/apps/automation/core.mjs","rawMode":"100644","gitBlob":"738fc6de9a03428eea3feec9be4d8edad45305c5"},{"path":"products/rea-studio/apps/automation/engine.mjs","rawMode":"100644","gitBlob":"c954801067970ca8f3bd67e37332d184cedec776"},{"path":"products/rea-studio/apps/automation/execution-validation.json","rawMode":"100644","gitBlob":"e42d08ccf84caca8fbfae11b71afb2cc2549fbe6"},{"path":"products/rea-studio/apps/automation/execution.test.mjs","rawMode":"100644","gitBlob":"f45dea92828cffca0310e76ed1ef92633b402d64"},{"path":"products/rea-studio/apps/automation/http-boundary.test.mjs","rawMode":"100644","gitBlob":"d24deca288cdc8a60fc06ba7e6c335bb4105618d"},{"path":"products/rea-studio/apps/automation/native-client.mjs","rawMode":"100644","gitBlob":"f2f7f1dcdaf173204a617ec403212b430396e809"},{"path":"products/rea-studio/apps/automation/native-client.test.mjs","rawMode":"100644","gitBlob":"f7bba2d4d1e054cb165bb9f928d8dec235f91065"},{"path":"products/rea-studio/apps/automation/native-example.mjs","rawMode":"100644","gitBlob":"68db6b11f312ede18feea4fa13115259633eb321"},{"path":"products/rea-studio/apps/automation/native-http.test.mjs","rawMode":"100644","gitBlob":"4792facf687ac3193bede1a711c21be9ffee50ba"},{"path":"products/rea-studio/apps/automation/native-original-acquisition.json","rawMode":"100644","gitBlob":"45dca011f7803713adfa265c983a56746c8c42e8"},{"path":"products/rea-studio/apps/automation/native-original-manifest.json","rawMode":"100644","gitBlob":"8e7195814bcf30025ec751d03dacbc40dfdf2b37"},{"path":"products/rea-studio/apps/automation/native-original-package-lock.json","rawMode":"100644","gitBlob":"d587c0ff03f21fcd1b8633b15f0158704a32c3fd"},{"path":"products/rea-studio/apps/automation/native-original-package.json","rawMode":"100644","gitBlob":"81f4cc63401e65df69aeef42c3deebdbb0d0a016"},{"path":"products/rea-studio/apps/automation/native-server.mjs","rawMode":"100644","gitBlob":"5532db98125d2bb6c575a724ff73af8f846c4d42"},{"path":"products/rea-studio/apps/automation/native-server.test.mjs","rawMode":"100644","gitBlob":"8cbb044f4190cef24e893023c7773d0391142eb9"},{"path":"products/rea-studio/apps/automation/native-validation.json","rawMode":"100644","gitBlob":"e7bc237ae165d29f871d65c64eaeaa58b3577e11"},{"path":"products/rea-studio/apps/automation/native.mjs","rawMode":"100644","gitBlob":"0f5172fc6a55c3f724e9e219c3234604716988b8"},{"path":"products/rea-studio/apps/automation/native.test.mjs","rawMode":"100644","gitBlob":"53c706105f8313dff4c4e37495dd53d49105af1a"},{"path":"products/rea-studio/apps/automation/original-harness.mjs","rawMode":"100644","gitBlob":"e98c1902956c731740462f964f4a877b92270b00"},{"path":"products/rea-studio/apps/automation/routing-contracts.json","rawMode":"100644","gitBlob":"024009c7de0bdbd88cd316f8944b7662cb4efee3"},{"path":"products/rea-studio/apps/automation/routing-original-harness.mjs","rawMode":"100644","gitBlob":"89eb950929f56a2258438637c3768c756b39f622"},{"path":"products/rea-studio/apps/automation/routing-original-manifest.json","rawMode":"100644","gitBlob":"4e9b9c5a0ae3b22d07923ca4e083f930d38e1ead"},{"path":"products/rea-studio/apps/automation/routing-original.test.mjs","rawMode":"100644","gitBlob":"b61fe9c4087b2a8ec1a23e6af35efb9b22e51f6b"},{"path":"products/rea-studio/apps/automation/routing-recovery.test.mjs","rawMode":"100644","gitBlob":"8fa0cd57ece1dc452345c95ce1ce2b395895ecba"},{"path":"products/rea-studio/apps/automation/routing-source-option-inventory.json","rawMode":"100644","gitBlob":"0aa7e9d90ea26ee748f06a40151af48edf7c0356"},{"path":"products/rea-studio/apps/automation/routing.mjs","rawMode":"100644","gitBlob":"4c569bc1730b10a2de52c73c203caa4365e15acc"},{"path":"products/rea-studio/apps/automation/routing.test.mjs","rawMode":"100644","gitBlob":"88584777173bf6d492cc2a680b4a9556402ad101"},{"path":"products/rea-studio/apps/automation/server.mjs","rawMode":"100644","gitBlob":"0c4aaf2c32d60a900a5fcfed5bf69d7dea9c6728"},{"path":"products/rea-studio/apps/backup/app.integration.test.mjs","rawMode":"100644","gitBlob":"322e476ef1515b89171fed984a083ee8193b246d"},{"path":"products/rea-studio/apps/backup/app.test.mjs","rawMode":"100644","gitBlob":"23f05eaf6964a47bc6c08257a201157957897887"},{"path":"products/rea-studio/apps/backup/capture-rabin-file.mjs","rawMode":"100644","gitBlob":"fe91c2ed01b845650b99464cb7a09085fdd3b0cc"},{"path":"products/rea-studio/apps/backup/capture-rabin-file.test.mjs","rawMode":"100644","gitBlob":"96ab18d5f81888c8ac372a6cb3991cadc504de04"},{"path":"products/rea-studio/apps/backup/client.mjs","rawMode":"100644","gitBlob":"84443fb48621ed1a0a52162e4109edb1b9a4da8c"},{"path":"products/rea-studio/apps/backup/fixtures/legacy-v2-writer.mjs","rawMode":"100644","gitBlob":"3af8092dab2aa48f756ac14724090d78220e678d"},{"path":"products/rea-studio/apps/backup/native-host-pack.test.mjs","rawMode":"100644","gitBlob":"eac7c91050c46eb654cec37ecd4e2c7148555bc5"},{"path":"products/rea-studio/apps/backup/native-key-failure.test.mjs","rawMode":"100644","gitBlob":"8d391c85279d7fb6f537101656e2396de9d61077"},{"path":"products/rea-studio/apps/backup/native-key-original.test.mjs","rawMode":"100644","gitBlob":"4167e982702600b7e9200111bc5db7a15ca50ca6"},{"path":"products/rea-studio/apps/backup/native-key-test-fixture.mjs","rawMode":"100644","gitBlob":"b392ba1b156fda482a0658b821127ee542218213"},{"path":"products/rea-studio/apps/backup/native-key.http.test.mjs","rawMode":"100644","gitBlob":"9e9ab69288572b8370873510f8bd9032d83611e9"},{"path":"products/rea-studio/apps/backup/native-key.test.mjs","rawMode":"100644","gitBlob":"582ef281d01a948271c1a306a8400f0181cc4333"},{"path":"products/rea-studio/apps/backup/native-key.ui.test.mjs","rawMode":"100644","gitBlob":"32d029dd991e39b66fbdee64c0d4aaac2ea80db3"},{"path":"products/rea-studio/apps/backup/native-policy-assertions.mjs","rawMode":"100644","gitBlob":"19012ec6eb5522424bc00970c4453710dfad3204"},{"path":"products/rea-studio/apps/backup/native-small-mutation.test.mjs","rawMode":"100644","gitBlob":"8b6ba455e5045ddedad2f6cb302f5396a228a700"},{"path":"products/rea-studio/apps/backup/native-source-references.json","rawMode":"100644","gitBlob":"1b99753b0e0f28bbf0097043a7dae690ed9b1e31"},{"path":"products/rea-studio/apps/backup/native-validation.json","rawMode":"100644","gitBlob":"29aa7ca69b3822b5c3a57cdc1dbee6faef8040a6"},{"path":"products/rea-studio/apps/backup/native.test.mjs","rawMode":"100644","gitBlob":"2d8d64327e979530ea023efa61c23aebff6e0bed"},{"path":"products/rea-studio/apps/backup/rabin-original-compare.mjs","rawMode":"100644","gitBlob":"856a163289b852b604398ef8a05ad6a592b1eaa4"},{"path":"products/rea-studio/apps/backup/rabin-original.test.mjs","rawMode":"100644","gitBlob":"cb7fa9ff88380903bfa71ee4aefeceae29fdd4c8"},{"path":"products/rea-studio/apps/backup/rabin.mjs","rawMode":"100644","gitBlob":"7a9c0d55c46871006e812497bdc550b5b9794966"},{"path":"products/rea-studio/apps/backup/rabin.test.mjs","rawMode":"100644","gitBlob":"b7f4d03c8728d101b22e2294ce8956a0982185df"},{"path":"products/rea-studio/apps/backup/restic-compression-review.test.mjs","rawMode":"100644","gitBlob":"743a5720f90a604833582cc3c617d76a7955e449"},{"path":"products/rea-studio/apps/backup/restic-compression.mjs","rawMode":"100644","gitBlob":"9828d4390e11ad2b052867b618ceb90d34a601a8"},{"path":"products/rea-studio/apps/backup/restic-compression.test.mjs","rawMode":"100644","gitBlob":"8a2b4f9bf7c69cb65f25f0b5914ab30bee3c9204"},{"path":"products/rea-studio/apps/backup/restic-crypto.mjs","rawMode":"100644","gitBlob":"a0d48ca54fae8e4fb1530bf2ab67d25208a6b568"},{"path":"products/rea-studio/apps/backup/restic-data-pack-ownership.test.mjs","rawMode":"100644","gitBlob":"1939e4e4f3f0445a37325b247329f918be744c99"},{"path":"products/rea-studio/apps/backup/restic-data-pack.mjs","rawMode":"100644","gitBlob":"9de8cade19b93cd5b9e1683f9b3989725e09615e"},{"path":"products/rea-studio/apps/backup/restic-data-pack.test.mjs","rawMode":"100644","gitBlob":"8240b86834b0c99b21263a579426d154babd986f"},{"path":"products/rea-studio/apps/backup/restic-kdf-policy.mjs","rawMode":"100644","gitBlob":"858d128c552fd96a339da4098357801c85f1b773"},{"path":"products/rea-studio/apps/backup/restic-kdf-policy.test.mjs","rawMode":"100644","gitBlob":"94de954e5fd017ed6f2e9174984f2d0b6d26a246"},{"path":"products/rea-studio/apps/backup/restic-kdf.interop.test.mjs","rawMode":"100644","gitBlob":"ef25b73b2baa948f04f621966a8072a4c1817745"},{"path":"products/rea-studio/apps/backup/restic-rabin-deadline.test.mjs","rawMode":"100644","gitBlob":"74efe9aadc55e76ce72cde385b04706fd419a631"},{"path":"products/rea-studio/apps/backup/restic-rabin-lifecycle.test.mjs","rawMode":"100644","gitBlob":"0b570e0c6f130be70a28741e83ae53e3f7cc370e"},{"path":"products/rea-studio/apps/backup/restic-rabin-snapshot.test.mjs","rawMode":"100644","gitBlob":"f9c6fbeefe2ee83bb589d035ad8f6e9b85ade3ee"},{"path":"products/rea-studio/apps/backup/restic.mjs","rawMode":"100644","gitBlob":"4bdc9e34816f407e8abdb64b1cdd97ce8f9dcba5"},{"path":"products/rea-studio/apps/backup/server.mjs","rawMode":"100644","gitBlob":"4440140e0ff141fe0158b951bc059bc8bb08d03e"},{"path":"products/rea-studio/apps/editor/app.integration.test.mjs","rawMode":"100644","gitBlob":"c1f747c97aca80ecd8e1997a8abab9e8d0eea5a4"},{"path":"products/rea-studio/apps/editor/app.test.mjs","rawMode":"100644","gitBlob":"771a0f949c3f80de6424ddb393d6cddad3d494b5"},{"path":"products/rea-studio/apps/editor/client.mjs","rawMode":"100644","gitBlob":"cb693610f1dcf3f1b27c4820591285635a4308e5"},{"path":"products/rea-studio/apps/editor/file-path.mjs","rawMode":"100644","gitBlob":"23f7f00ca09f3b76054c8a298e902293b0876910"},{"path":"products/rea-studio/apps/editor/git.mjs","rawMode":"100644","gitBlob":"fa693b1120e20bef123142917af6e4f0f2636d38"},{"path":"products/rea-studio/apps/editor/git.test.mjs","rawMode":"100644","gitBlob":"240b0635dd3c0adfb5768db7940c35dcb0cfa771"},{"path":"products/rea-studio/apps/editor/position-range-selection.mjs","rawMode":"100644","gitBlob":"1adf2cd4f715bc4d846b928386dd8428c7a2c692"},{"path":"products/rea-studio/apps/editor/position-range-selection.test.mjs","rawMode":"100644","gitBlob":"9ec08852b2cf8a6f2f1571c980427d8c330a4ca1"},{"path":"products/rea-studio/apps/editor/save-publication.ui.test.mjs","rawMode":"100644","gitBlob":"795e63d7711fa5a4c80626c4240b7aed42bfe46a"},{"path":"products/rea-studio/apps/editor/save-review-adjacent.test.mjs","rawMode":"100644","gitBlob":"bd2c321672ee1eb36a2bd64ac6ae0020b6b21dbc"},{"path":"products/rea-studio/apps/editor/save-review-fixture.mjs","rawMode":"100644","gitBlob":"8681ef7aa314d76de62ffe74486e1547156ef0b2"},{"path":"products/rea-studio/apps/editor/save-review-held.test.mjs","rawMode":"100644","gitBlob":"d7ed2f50beeb772be1ad7974d2bad8e4d3e50716"},{"path":"products/rea-studio/apps/editor/save-review-revision.test.mjs","rawMode":"100644","gitBlob":"5f3fea044ec7db7ef5e5a903777c7e97ebbf1b11"},{"path":"products/rea-studio/apps/editor/search-pattern-session.mjs","rawMode":"100644","gitBlob":"5c3851b8d61d663417a8448decc234f17b2aae00"},{"path":"products/rea-studio/apps/editor/search-pattern-worker.mjs","rawMode":"100644","gitBlob":"bcefba4f3fb538fbf287ffc92705bb22f6aa15e3"},{"path":"products/rea-studio/apps/editor/search-pattern.integration.test.mjs","rawMode":"100644","gitBlob":"0ae6136844154fa67ba3fd0bd7adc9ed7c8e0339"},{"path":"products/rea-studio/apps/editor/search-pattern.mjs","rawMode":"100644","gitBlob":"5242bc72d0c2d6af4cb043af8d796d6e34cbb3dc"},{"path":"products/rea-studio/apps/editor/search-pattern.test.mjs","rawMode":"100644","gitBlob":"6631b1ea4ffb77ae1489970d82fee1bcd4fdb1c8"},{"path":"products/rea-studio/apps/editor/search-pattern.ui.test.mjs","rawMode":"100644","gitBlob":"f1b75b7ab68e8b805d969a5b76e3aebb964bb34a"},{"path":"products/rea-studio/apps/editor/sequence-diff.mjs","rawMode":"100644","gitBlob":"de84a7b81af39e7233e64e18cd98d287a185705d"},{"path":"products/rea-studio/apps/editor/sequence-diff.test.mjs","rawMode":"100644","gitBlob":"2ad036bfada69f796179fbcb4db1f277bcf455b2"},{"path":"products/rea-studio/apps/editor/server.mjs","rawMode":"100644","gitBlob":"3e906d9e1e82c4c6fd686a8fe33ee0ea7dc05e0d"},{"path":"products/rea-studio/apps/editor/textarea-navigation.ui.test.mjs","rawMode":"100644","gitBlob":"ade094301bccdb5faf80ac99f93590e27960ddf5"},{"path":"products/rea-studio/apps/editor/workspace-search-path.test.mjs","rawMode":"100644","gitBlob":"1a6767676d220796b01fe010dcc3e54b7ee63a52"},{"path":"products/rea-studio/apps/editor/workspace-search-review-held.test.mjs","rawMode":"100644","gitBlob":"3547ff0a07aa51be95ba0880657e2186928e7173"},{"path":"products/rea-studio/apps/editor/workspace-search-review-path.test.mjs","rawMode":"100644","gitBlob":"9bb94d279cfbcaca67c6a8dc1792c5649761904b"},{"path":"products/rea-studio/apps/editor/workspace-search-review-ui.test.mjs","rawMode":"100644","gitBlob":"b1d90390bb7b030c21a0aa3ca0ae255f7e9e8cf5"},{"path":"products/rea-studio/apps/editor/workspace-search.integration.test.mjs","rawMode":"100644","gitBlob":"e77020918a1f38bde233877962696a8446cd35f5"},{"path":"products/rea-studio/apps/editor/workspace-search.mjs","rawMode":"100644","gitBlob":"a6fdc8c01d1e5c1e63bf2736aab3828315fc3343"},{"path":"products/rea-studio/apps/editor/workspace-search.test.mjs","rawMode":"100644","gitBlob":"67fd218318c862b2298da204ac09b62d878a08b3"},{"path":"products/rea-studio/apps/editor/workspace-search.ui.test.mjs","rawMode":"100644","gitBlob":"2d18a4910ee7637205ee659f10774c08680a3477"},{"path":"products/rea-studio/apps/flow/app.test.mjs","rawMode":"100644","gitBlob":"2cb0fd2a819f058336719bb334e608ac5d64ddfd"},{"path":"products/rea-studio/apps/flow/client.mjs","rawMode":"100644","gitBlob":"21d48ca5820152d893d6257b92fceff26b1cd8ac"},{"path":"products/rea-studio/apps/flow/compare-original.mjs","rawMode":"100644","gitBlob":"9184377fe96acf56216e79762de2b61e5d05ea38"},{"path":"products/rea-studio/apps/flow/core.mjs","rawMode":"100644","gitBlob":"7774c628f22a0f51670c2a3ffa53e47f3a60104d"},{"path":"products/rea-studio/apps/flow/fixtures/native-demo.json","rawMode":"100644","gitBlob":"fcd8e36012083ddbe25373e8e0620043b730b780"},{"path":"products/rea-studio/apps/flow/fixtures/normalization-seed.json","rawMode":"100644","gitBlob":"b4207921f58fe5f21cf9d744aa883f22297d9e22"},{"path":"products/rea-studio/apps/flow/fixtures/oracle/package-lock.json","rawMode":"100644","gitBlob":"a7a35b49688e57ad7ed86ed8199bcf5a88283ef5"},{"path":"products/rea-studio/apps/flow/fixtures/oracle/package.json","rawMode":"100644","gitBlob":"314e9e60d8bfc03b6128e4d6701823b9ecfe0420"},{"path":"products/rea-studio/apps/flow/link-http.test.mjs","rawMode":"100644","gitBlob":"1b79cdf60f854dfd00458507241785dfff0c4203"},{"path":"products/rea-studio/apps/flow/link-original.test.mjs","rawMode":"100644","gitBlob":"bf677e9c26b9db2b4519a7e13fc7cae7384f0700"},{"path":"products/rea-studio/apps/flow/link-runtime-worker.mjs","rawMode":"100644","gitBlob":"33354656caa8b6ae77c25f0f77a0b01d6d8a66bb"},{"path":"products/rea-studio/apps/flow/link-ui-fixture.mjs","rawMode":"100644","gitBlob":"3156f12a35a818027bb16dab5679de1bd91858ed"},{"path":"products/rea-studio/apps/flow/link-ui.test.mjs","rawMode":"100644","gitBlob":"7d264920383a8ab40033c83ed6355a6748bb5337"},{"path":"products/rea-studio/apps/flow/native-link.mjs","rawMode":"100644","gitBlob":"40328644c9cf23cb29412a73bb6678a75aa0b86e"},{"path":"products/rea-studio/apps/flow/native-link.test.mjs","rawMode":"100644","gitBlob":"c809fad3806325263e69de8234fc8c03b27479b8"},{"path":"products/rea-studio/apps/flow/native-original.test.mjs","rawMode":"100644","gitBlob":"0a337d2687246a4f079cebc9f890e1cbb4ad7374"},{"path":"products/rea-studio/apps/flow/native-regex-worker.mjs","rawMode":"100644","gitBlob":"70b4e45fea3e2ade17fb74867acf464c2fbeccb6"},{"path":"products/rea-studio/apps/flow/native.mjs","rawMode":"100644","gitBlob":"2836eaefdbb19266b5d2872dd63e76cb1f661530"},{"path":"products/rea-studio/apps/flow/native.test.mjs","rawMode":"100644","gitBlob":"2fd0f518db5b84077f6f97f2edf7610fc87c6ef6"},{"path":"products/rea-studio/apps/flow/normalization-boundaries.test.mjs","rawMode":"100644","gitBlob":"b0af79bf5e796b64d022fbd2451ad4a782a30530"},{"path":"products/rea-studio/apps/flow/normalization-ui-fixture.mjs","rawMode":"100644","gitBlob":"28255249e7cea7332118517ee87f57645d5676dd"},{"path":"products/rea-studio/apps/flow/normalization-ui.test.mjs","rawMode":"100644","gitBlob":"e20a7dff520724722ebacbfa3fe86e406fff0be3"},{"path":"products/rea-studio/apps/flow/server.mjs","rawMode":"100644","gitBlob":"0bf53e97f7cb5f49ec1d6683e044e3c862c3b3cd"},{"path":"products/rea-studio/apps/metrics/app.integration.test.mjs","rawMode":"100644","gitBlob":"43695b3702bb126f315e9237327f0332659c884d"},{"path":"products/rea-studio/apps/metrics/app.test.mjs","rawMode":"100644","gitBlob":"544edf0443282cfc942383807307ef963af9b4d8"},{"path":"products/rea-studio/apps/metrics/client.mjs","rawMode":"100644","gitBlob":"0a9566af8ce97f0456472d365dd3c58ec50c215d"},{"path":"products/rea-studio/apps/metrics/core.mjs","rawMode":"100644","gitBlob":"d8a5c3a9972438d310979cba1629ceb738dbefdc"},{"path":"products/rea-studio/apps/metrics/fixtures/local-dashboard.json","rawMode":"100644","gitBlob":"febc33f956e13a91eb00bc48903659997db7c33e"},{"path":"products/rea-studio/apps/metrics/fixtures/native-calculation-field.json","rawMode":"100644","gitBlob":"d1805306f854fae5528e685bbb5ed56aa8a1cea7"},{"path":"products/rea-studio/apps/metrics/fixtures/native-stat-dashboard.json","rawMode":"100644","gitBlob":"b5d54787704cebe2df4f135177ec19075c9212e7"},{"path":"products/rea-studio/apps/metrics/fixtures/reducers/package.json","rawMode":"100644","gitBlob":"f635b4612ed02de59daf9f6ae4c6611903f83eaa"},{"path":"products/rea-studio/apps/metrics/fixtures/reducers/sources.json","rawMode":"100644","gitBlob":"4973b9eda7a127cb3be46c81cccc34c93a254a56"},{"path":"products/rea-studio/apps/metrics/fixtures/schema-generated-dashboard.json","rawMode":"100644","gitBlob":"c3c66d30f8a5a429a47a89bab98eef75745f9690"},{"path":"products/rea-studio/apps/metrics/fixtures/sources.json","rawMode":"100644","gitBlob":"00015db8f9d876dff57d7ec6ff2b02f54dd3343d"},{"path":"products/rea-studio/apps/metrics/fixtures/vendor/original-textbox.json","rawMode":"100644","gitBlob":"b844652f9361e9cf5d736823cc33d88ad2db3ceb"},{"path":"products/rea-studio/apps/metrics/fixtures/vendor/original-v1-resource.json","rawMode":"100644","gitBlob":"94b1395af1d339d277fdc43fe155a8f1d249884a"},{"path":"products/rea-studio/apps/metrics/fixtures/vendor/original-v2-text.json","rawMode":"100644","gitBlob":"bd384982568e8c0f67f45774abe7217d3d5338a5"},{"path":"products/rea-studio/apps/metrics/fixtures/vendor/schema-package.json","rawMode":"100644","gitBlob":"83aeff5addf279bce7dc195a5ecb81d91e4a0c9f"},{"path":"products/rea-studio/apps/metrics/fixtures/vendor/v1-openapi.json","rawMode":"100644","gitBlob":"7a03a464ae297e27d7353c79f667983a375c584c"},{"path":"products/rea-studio/apps/metrics/grafana.integration.test.mjs","rawMode":"100644","gitBlob":"e3ba97db7f9ec280e8f9f800540cb80846d5f1cf"},{"path":"products/rea-studio/apps/metrics/grafana.test.mjs","rawMode":"100644","gitBlob":"c14c3ec29bb61a4363d027f863f2cdc615c77cfb"},{"path":"products/rea-studio/apps/metrics/native-calculations.integration.test.mjs","rawMode":"100644","gitBlob":"01b75acc04ac4debed942d3382bbf7b8f1e895c8"},{"path":"products/rea-studio/apps/metrics/native-calculations.mjs","rawMode":"100644","gitBlob":"35ed0afacf7b6fa220ddf2f16eb3961ed78b30d2"},{"path":"products/rea-studio/apps/metrics/native-calculations.test.mjs","rawMode":"100644","gitBlob":"4cc7497944cfc1282da7236ffeb000e069653099"},{"path":"products/rea-studio/apps/metrics/scripts/acquire-grafana-fixtures.mjs","rawMode":"100644","gitBlob":"cb2b2ae536df8badcb91d848b7f898ff95421a95"},{"path":"products/rea-studio/apps/metrics/scripts/acquire-native-calculation-sources.mjs","rawMode":"100644","gitBlob":"4418fcb2c8b534e6e67be2e77082302edd727c1c"},{"path":"products/rea-studio/apps/metrics/scripts/verify-grafana-schema.mjs","rawMode":"100644","gitBlob":"2f3abc19e9d213dc17b77a67525318a2dee888fc"},{"path":"products/rea-studio/apps/metrics/scripts/verify-native-calculations.mjs","rawMode":"100644","gitBlob":"55fd7dc8cd9180e2ed727565026f97870dffef14"},{"path":"products/rea-studio/apps/metrics/server.mjs","rawMode":"100644","gitBlob":"21b8ad26090076c8a52ead1997da1d264ecc7f19"},{"path":"products/rea-studio/apps/notes/README.md","rawMode":"100644","gitBlob":"7452618f7118d7770d1638558c68ac1081c98dfd"},{"path":"products/rea-studio/apps/notes/app.integration.test.mjs","rawMode":"100644","gitBlob":"2728b7a1b641bd4ebd11ff9382b1b2a291402c11"},{"path":"products/rea-studio/apps/notes/app.test.mjs","rawMode":"100644","gitBlob":"01cc83826cfe3c2f7c4c4dabbd4465bc59b8289b"},{"path":"products/rea-studio/apps/notes/client.mjs","rawMode":"100644","gitBlob":"0a2b94d9337442fd82e0bdb9a8146a018185f6c1"},{"path":"products/rea-studio/apps/notes/core.mjs","rawMode":"100644","gitBlob":"d3626d601ad00dae1d1ceec3834ee42a120628ee"},{"path":"products/rea-studio/apps/notes/draft-recovery-test-fixture.mjs","rawMode":"100644","gitBlob":"34be1b574c4fffe087a666d4935043255e84eb4b"},{"path":"products/rea-studio/apps/notes/draft-recovery.http.test.mjs","rawMode":"100644","gitBlob":"d47b09dbcf17c8748f9839093e2e08953385a07b"},{"path":"products/rea-studio/apps/notes/draft-recovery.mjs","rawMode":"100644","gitBlob":"01cc3c6b8e3be317c812c2d7eaf419d64cbbdbf5"},{"path":"products/rea-studio/apps/notes/draft-recovery.test.mjs","rawMode":"100644","gitBlob":"3a18f6ce0fcfe350c3730526651203d4636074bb"},{"path":"products/rea-studio/apps/notes/draft-recovery.ui.test.mjs","rawMode":"100644","gitBlob":"ec92fe6faf7877a11255f12ddc1b6cb04d3f876f"},{"path":"products/rea-studio/apps/notes/fixtures/oracle-verification.json","rawMode":"100644","gitBlob":"a740283b942cfe6edd2e619e1e8fe4f472b109b8"},{"path":"products/rea-studio/apps/notes/fixtures/pinned-joplin.jex","rawMode":"100644","gitBlob":"0c0b2c59c4e561ac62d4f84e8cebaa991dabae83"},{"path":"products/rea-studio/apps/notes/fixtures/pinned-joplin.json","rawMode":"100644","gitBlob":"1274272baed925ef73cdf336f18d393983bf2f9d"},{"path":"products/rea-studio/apps/notes/interop-fixture-tool.mjs","rawMode":"100644","gitBlob":"592b988a57efc58d0cdecd39c0bbbec513483438"},{"path":"products/rea-studio/apps/notes/jex.mjs","rawMode":"100644","gitBlob":"32106367e7ff16c9a4f7cdbbe7a66cc3cf0d8f75"},{"path":"products/rea-studio/apps/notes/jex.test.mjs","rawMode":"100644","gitBlob":"dfebfd4a431a66c58bad025b59963ca37e7abd26"},{"path":"products/rea-studio/apps/notes/markdown.mjs","rawMode":"100644","gitBlob":"b56775faf0c527c19a6b7e15bee49784ccebd8f5"},{"path":"products/rea-studio/apps/notes/new-todo-original.test.mjs","rawMode":"100644","gitBlob":"10850f860357cb6200542a823982d2d15c962f71"},{"path":"products/rea-studio/apps/notes/new-todo.integration.test.mjs","rawMode":"100644","gitBlob":"5e6228c80c05685cb483162b09244e5495e6e49f"},{"path":"products/rea-studio/apps/notes/new-todo.test.mjs","rawMode":"100644","gitBlob":"0666cb7a321023760e988cd2a96c7d0866caa9e4"},{"path":"products/rea-studio/apps/notes/new-todo.ui.test.mjs","rawMode":"100644","gitBlob":"f93c9bac12808dddfb586a85a120556b13d5a768"},{"path":"products/rea-studio/apps/notes/notebook-confirmation-cancel-open-note.ui.test.mjs","rawMode":"100644","gitBlob":"51190e488cf84bf664c0584c2e94bd6076fe008c"},{"path":"products/rea-studio/apps/notes/notebook-confirmation.ui.test.mjs","rawMode":"100644","gitBlob":"34d94c700ff5956884de34846d55d6d50c41186c"},{"path":"products/rea-studio/apps/notes/notebook-original-oracle.mjs","rawMode":"100644","gitBlob":"39669db493085a04fcf82df5a5610f771de4d53c"},{"path":"products/rea-studio/apps/notes/notebook-trash-fresh-boundaries.test.mjs","rawMode":"100644","gitBlob":"4a6e71d49af0840eaa470c34eeef565238fc4d06"},{"path":"products/rea-studio/apps/notes/notebook-trash-original-oracle.mjs","rawMode":"100644","gitBlob":"03154a62935e20b4655176a313556570f8824c42"},{"path":"products/rea-studio/apps/notes/notebook-trash-publication-boundaries.test.mjs","rawMode":"100644","gitBlob":"37462cd9dbc1edf82ebfdbdb96506c737c915f81"},{"path":"products/rea-studio/apps/notes/notebook-trash-review-fixture.mjs","rawMode":"100644","gitBlob":"1c07ef9af71d12cf45a3fa555edece0337e3fcdb"},{"path":"products/rea-studio/apps/notes/notebook-trash-review.test.mjs","rawMode":"100644","gitBlob":"619e2f5e3f18f0121fa928ed04ede5c7986e1c8e"},{"path":"products/rea-studio/apps/notes/notebook-trash.integration.test.mjs","rawMode":"100644","gitBlob":"60a0fbf071bb24e8264d6789f8eecdae3c7860fa"},{"path":"products/rea-studio/apps/notes/notebook-trash.mjs","rawMode":"100644","gitBlob":"b0ed0af4ca8e97359700806c4ff2f9b9e0530fd4"},{"path":"products/rea-studio/apps/notes/notebook-trash.test.mjs","rawMode":"100644","gitBlob":"d153bf430a4cb8a8a0cc46dba1b30af1c51ba16f"},{"path":"products/rea-studio/apps/notes/notebook-trash.ui.test.mjs","rawMode":"100644","gitBlob":"75775ec0f48aa5f48bab250409915135453dffb6"},{"path":"products/rea-studio/apps/notes/notebooks.integration.test.mjs","rawMode":"100644","gitBlob":"42748dc55044e3bd854749a4373b9f6a4726d57d"},{"path":"products/rea-studio/apps/notes/notebooks.mjs","rawMode":"100644","gitBlob":"b2e05445e0a4cc6fefa05e1be59ffcfbe43b24aa"},{"path":"products/rea-studio/apps/notes/notebooks.test.mjs","rawMode":"100644","gitBlob":"678ca391a32c72926dae9bf5addfa90c915da831"},{"path":"products/rea-studio/apps/notes/open-todos-first-original.cloud-check.mjs","rawMode":"100644","gitBlob":"a1e0d684467f47f3a3ceefbfd9acf3d2b4de0da3"},{"path":"products/rea-studio/apps/notes/open-todos-first.cloud-check.mjs","rawMode":"100644","gitBlob":"fee16be5c59b8cdd5cd0afa5b06132c3d9abba02"},{"path":"products/rea-studio/apps/notes/search-query-original.test.mjs","rawMode":"100644","gitBlob":"ad87e34cb8656288a111ab9e4b083c6675c53a9e"},{"path":"products/rea-studio/apps/notes/search-query.integration.test.mjs","rawMode":"100644","gitBlob":"838debe02ee8690f7eb5833c18aec532eb0f47fb"},{"path":"products/rea-studio/apps/notes/search-query.mjs","rawMode":"100644","gitBlob":"9def8d4200eaf2c467c7dd0a95db4dacb61be209"},{"path":"products/rea-studio/apps/notes/search-query.test.mjs","rawMode":"100644","gitBlob":"e1a7685b64171398d1ea3f620d641741ade90e32"},{"path":"products/rea-studio/apps/notes/search-query.ui.test.mjs","rawMode":"100644","gitBlob":"083da442a20b7599202736f045addf0a2424ff45"},{"path":"products/rea-studio/apps/notes/server.mjs","rawMode":"100644","gitBlob":"6d67001b900205a59d187ac97cda31a13dd8ab4e"},{"path":"products/rea-studio/apps/notes/todo-original.test.mjs","rawMode":"100644","gitBlob":"5392c237181bf6ca514ccd86f01ae6e26c956b53"},{"path":"products/rea-studio/apps/notes/todo.integration.test.mjs","rawMode":"100644","gitBlob":"6fd22433d7dc2f7d9e3d3bad4815a0fc1cba0845"},{"path":"products/rea-studio/apps/notes/todo.test.mjs","rawMode":"100644","gitBlob":"23e90176ed70725665a1b3fcee454f452e87a615"},{"path":"products/rea-studio/apps/notes/todo.ui.test.mjs","rawMode":"100644","gitBlob":"8bbdb40fa2bc39942827e56c393273ca45f3eb0c"},{"path":"products/rea-studio/apps/sketch/app.test.mjs","rawMode":"100644","gitBlob":"9d9519d681f2637d93868fe24e9e58301a4e16f4"},{"path":"products/rea-studio/apps/sketch/client.mjs","rawMode":"100644","gitBlob":"4788f9ed2d5900fa8b9af0d5eb4a1b6f3293eef9"},{"path":"products/rea-studio/apps/sketch/client.test.mjs","rawMode":"100644","gitBlob":"cbf4cd926bebae2637e1ae4b709a7c8069608be9"},{"path":"products/rea-studio/apps/sketch/core.mjs","rawMode":"100644","gitBlob":"9498078d4e873ae0e4068ab5c55e23d89db72e16"},{"path":"products/rea-studio/apps/sketch/fixtures.mjs","rawMode":"100644","gitBlob":"b757cb4cc92a2feefd2a505f84145634d426f138"},{"path":"products/rea-studio/apps/sketch/geometry-client.test.mjs","rawMode":"100644","gitBlob":"a815a532ded07e1ae42a519e067111c174c9e654"},{"path":"products/rea-studio/apps/sketch/geometry-oracle.mjs","rawMode":"100644","gitBlob":"822dc7658be94e6d79661f09a40e1f2ff187fed0"},{"path":"products/rea-studio/apps/sketch/geometry.test.mjs","rawMode":"100644","gitBlob":"c360ebe29915b61d7e230f1a428f4e6f79e73016"},{"path":"products/rea-studio/apps/sketch/layout-original-oracle.mjs","rawMode":"100644","gitBlob":"cd4281cc1ed4eb4c87f3d6265fccd68ae84c1055"},{"path":"products/rea-studio/apps/sketch/layout-ui-fixture.mjs","rawMode":"100644","gitBlob":"112c6ff2c06c01cffb7065fc485538071e8e4973"},{"path":"products/rea-studio/apps/sketch/layout-ui.test.mjs","rawMode":"100644","gitBlob":"1604fbedd207fcc1a3ee060008ade99d0e6a4216"},{"path":"products/rea-studio/apps/sketch/layout.mjs","rawMode":"100644","gitBlob":"62982c459c8f581b609ac85417f7ef8d4a07fb6e"},{"path":"products/rea-studio/apps/sketch/layout.test.mjs","rawMode":"100644","gitBlob":"aaa2846e227af3efdb071e4f856945b8b41d7ddc"},{"path":"products/rea-studio/apps/sketch/precision.test.mjs","rawMode":"100644","gitBlob":"1fb378f774c446201559a9180c5eff0423921e25"},{"path":"products/rea-studio/apps/sketch/server.mjs","rawMode":"100644","gitBlob":"b8f25d04dcc863f73b4a7679befe61efa1e3fa76"},{"path":"products/rea-studio/apps/sketch/vendor-oracle.mjs","rawMode":"100644","gitBlob":"6cdcae240ad04ffbe8a76bbba4825eaeac65b5b8"},{"path":"products/rea-studio/apps/sketch/vendor-oracle.test.mjs","rawMode":"100644","gitBlob":"cc2dc2ee86b832845e389618bb21e2aaf75431ea"},{"path":"products/rea-studio/apps/sync/app.integration.test.mjs","rawMode":"100644","gitBlob":"ff1d128289d48a8515da09babbcc0fc611afdf10"},{"path":"products/rea-studio/apps/sync/app.test.mjs","rawMode":"100644","gitBlob":"d0a6acc8ec636d8d03e1889f96bf9db13780d426"},{"path":"products/rea-studio/apps/sync/client.mjs","rawMode":"100644","gitBlob":"5b60b9b5152d1757055ef679103f4988c4274048"},{"path":"products/rea-studio/apps/sync/dav-actions.mjs","rawMode":"100644","gitBlob":"9772f1ad596514c581e6fb023bcf7b5d2955554e"},{"path":"products/rea-studio/apps/sync/dav-comparison.mjs","rawMode":"100644","gitBlob":"4f8c17daa7d38ddbbb6fff8b85fb6f04466a2ebf"},{"path":"products/rea-studio/apps/sync/dav-download.mjs","rawMode":"100644","gitBlob":"0a334343a893f9880e6c4f6c08bb41d003560562"},{"path":"products/rea-studio/apps/sync/dav-input.mjs","rawMode":"100644","gitBlob":"323a2aab4f4c061efc0c4891f4573a85917d3679"},{"path":"products/rea-studio/apps/sync/dav-transfer.mjs","rawMode":"100644","gitBlob":"86a960a182de1951a5c63815a970b7dee4a00652"},{"path":"products/rea-studio/apps/sync/dav-xml.mjs","rawMode":"100644","gitBlob":"cd33ad334bab20e206c7b6f3175f6af3d286daf5"},{"path":"products/rea-studio/apps/sync/fixtures/native-local-workflow.json","rawMode":"100644","gitBlob":"536065e06a60620b42c5a98c5f367ffa9e55f2bf"},{"path":"products/rea-studio/apps/sync/native-comparison.mjs","rawMode":"100644","gitBlob":"aada8827c6c83b9a11769136e160f5ab94946c2b"},{"path":"products/rea-studio/apps/sync/native-filters.mjs","rawMode":"100644","gitBlob":"d4c8ab5a79db35702e2cd80511736f8313136fd4"},{"path":"products/rea-studio/apps/sync/native-source-references.json","rawMode":"100644","gitBlob":"7b5412fd937340cf617eb43509738cb68d83cff5"},{"path":"products/rea-studio/apps/sync/native.integration.test.mjs","rawMode":"100644","gitBlob":"cb5859a311515799ee42a388b445b1eeabc30fa8"},{"path":"products/rea-studio/apps/sync/native.mjs","rawMode":"100644","gitBlob":"97b85006e7a0f4013d773fe6b2fe0cb7b7670a12"},{"path":"products/rea-studio/apps/sync/native.test.mjs","rawMode":"100644","gitBlob":"9a985cebc37c11fd7cbaa08e75e953a1b8a307f7"},{"path":"products/rea-studio/apps/sync/scripts/download-corpus.json","rawMode":"100644","gitBlob":"87d0dd71cd8648ec561681c730e5fa9b924a2021"},{"path":"products/rea-studio/apps/sync/scripts/download-oracle.mjs","rawMode":"100644","gitBlob":"d1a3d1d0233d6e2a412d927e42ef2f91ca5d8f43"},{"path":"products/rea-studio/apps/sync/scripts/download-regression-local-comparisons.mjs","rawMode":"100644","gitBlob":"586efae8b962dcd1c3f48f9cdeb01c25f22eb8a1"},{"path":"products/rea-studio/apps/sync/scripts/download-regression-local-filters.mjs","rawMode":"100644","gitBlob":"5679ce87f94716d4f747ccf4c80df6d1624d2f39"},{"path":"products/rea-studio/apps/sync/scripts/download-regression-local-transfers.mjs","rawMode":"100644","gitBlob":"f3a4faf70cd885870e5f17d3c2c41fea94b30665"},{"path":"products/rea-studio/apps/sync/scripts/download-regression-webdav-upload.mjs","rawMode":"100644","gitBlob":"2a4d8fb77ac5758df412f369acf02b8464c197aa"},{"path":"products/rea-studio/apps/sync/scripts/oracle.mjs","rawMode":"100644","gitBlob":"a64401e1b4658f33ccc93bbd96cf897704e7dd2e"},{"path":"products/rea-studio/apps/sync/scripts/verify-bounds.mjs","rawMode":"100644","gitBlob":"ee02cf92344a9d7e88e9de4c041aa791b5303964"},{"path":"products/rea-studio/apps/sync/scripts/verify-comparisons.mjs","rawMode":"100644","gitBlob":"2c953734a29441867c6a12f4918ae94981731173"},{"path":"products/rea-studio/apps/sync/scripts/verify-filters.mjs","rawMode":"100644","gitBlob":"7e811f5f909b9fb6113a37c190101c6bc416d615"},{"path":"products/rea-studio/apps/sync/scripts/verify-native.mjs","rawMode":"100644","gitBlob":"c8e61dc2bbfd94a798c17b667be3c9d963f8c7c6"},{"path":"products/rea-studio/apps/sync/scripts/verify-sources.mjs","rawMode":"100644","gitBlob":"eee6ebe88b7edcf144ad6aa1508382f05fc5a6f9"},{"path":"products/rea-studio/apps/sync/scripts/verify-transfers.mjs","rawMode":"100644","gitBlob":"4dca4ef921b587279d1a04570f2c51f320fc22ee"},{"path":"products/rea-studio/apps/sync/scripts/verify-webdav.mjs","rawMode":"100644","gitBlob":"53d1c5553c61bb76571167a6c356f5ff9fd35067"},{"path":"products/rea-studio/apps/sync/scripts/webdav-fixture.mjs","rawMode":"100644","gitBlob":"efed4b690826878c3aeba6f206872644d43e71d9"},{"path":"products/rea-studio/apps/sync/scripts/webdav-oracle-basic.mjs","rawMode":"100644","gitBlob":"d02012b51a7c811b1e91aae14fd6e05006d2540f"},{"path":"products/rea-studio/apps/sync/scripts/webdav-oracle-transfer.mjs","rawMode":"100644","gitBlob":"7fd502e5f88f054952d8041811d5f3507ff805a2"},{"path":"products/rea-studio/apps/sync/scripts/webdav-resource-probes.mjs","rawMode":"100644","gitBlob":"36f8bcae0e0f30a813f825c0d641538d9600ca92"},{"path":"products/rea-studio/apps/sync/server.mjs","rawMode":"100644","gitBlob":"435f339fadb43142154c0630bcc2b8107ab457b6"},{"path":"products/rea-studio/apps/sync/webdav-download-original.test.mjs","rawMode":"100644","gitBlob":"bbfcefd35421f73ddd5fd3929add74b24d269392"},{"path":"products/rea-studio/apps/sync/webdav-download.failure.test.mjs","rawMode":"100644","gitBlob":"12e94352884f38fc265e617266ac5228b523d5e2"},{"path":"products/rea-studio/apps/sync/webdav-download.http.test.mjs","rawMode":"100644","gitBlob":"85acef7934798d3472b0185d57b4b0eda6d4ab2c"},{"path":"products/rea-studio/apps/sync/webdav-download.test.mjs","rawMode":"100644","gitBlob":"a29f2d82a787ee679f9fd963ba1466b527172d91"},{"path":"products/rea-studio/apps/sync/webdav-download.ui.test.mjs","rawMode":"100644","gitBlob":"ca62564f586ba7428d8527c438a9bcfdb63efb53"},{"path":"products/rea-studio/apps/sync/webdav-source-references.json","rawMode":"100644","gitBlob":"ab8f242328ef2c2a25c028ba731078adb830dfee"},{"path":"products/rea-studio/apps/sync/webdav.actions.test.mjs","rawMode":"100644","gitBlob":"6e8183d9a6fff966327073ab24e47395abded811"},{"path":"products/rea-studio/apps/sync/webdav.client.test.mjs","rawMode":"100644","gitBlob":"f0e26eb3f1cbfc9ff9841a7cadd49b409abf72c0"},{"path":"products/rea-studio/apps/sync/webdav.integration.test.mjs","rawMode":"100644","gitBlob":"f2770350df107afe1d8bcdf03a65af2be8734478"},{"path":"products/rea-studio/apps/sync/webdav.mjs","rawMode":"100644","gitBlob":"aa0e1d09709c99077b8d61676968506fa2493084"},{"path":"products/rea-studio/apps/sync/webdav.test.mjs","rawMode":"100644","gitBlob":"1b74d4f5480e23bb7309cfad65e258a7955f71f3"},{"path":"products/rea-studio/apps/sync/webdav.windows-path.test.mjs","rawMode":"100644","gitBlob":"0004f5c632a264f0f1fb90065b3da5c9d1a8ecf4"},{"path":"products/rea-studio/apps/vault/app.integration.test.mjs","rawMode":"100644","gitBlob":"98ffd0ee276a6bfc8366330a588179caced4cf62"},{"path":"products/rea-studio/apps/vault/app.test.mjs","rawMode":"100644","gitBlob":"fe7bf0774c691ba52a955f8225f7f056808a4d44"},{"path":"products/rea-studio/apps/vault/client.mjs","rawMode":"100644","gitBlob":"849559cb3f617374244273a71c9eceaffbbb7b2c"},{"path":"products/rea-studio/apps/vault/compatibility-evidence.json","rawMode":"100644","gitBlob":"632bc9c7e25a84d8b3703f2fdad3c050c960c76d"},{"path":"products/rea-studio/apps/vault/disposal-adjacent.test.mjs","rawMode":"100644","gitBlob":"e203c19b72b56ec8598e96c7102f183a10498ade"},{"path":"products/rea-studio/apps/vault/draft-adjacent.test.mjs","rawMode":"100644","gitBlob":"f942a43961db6b1ca80acd95254be721c31158f0"},{"path":"products/rea-studio/apps/vault/group-active-controls.test.mjs","rawMode":"100644","gitBlob":"c70fe8f3b10775e1a0be39e8b89ff892855016f8"},{"path":"products/rea-studio/apps/vault/group-active-root-replay.test.mjs","rawMode":"100644","gitBlob":"f74fc7170accad3d51a1e389e02378932153259c"},{"path":"products/rea-studio/apps/vault/group-coherence-boundaries.test.mjs","rawMode":"100644","gitBlob":"098df9f8428c703a9e235ea2e529469587fb51fd"},{"path":"products/rea-studio/apps/vault/group-coherence-replay.test.mjs","rawMode":"100644","gitBlob":"b65c22791ff6ec4f6950a42bc13df9fee6f8e9c1"},{"path":"products/rea-studio/apps/vault/group-edit-adjacent-replay.test.mjs","rawMode":"100644","gitBlob":"d93c71bf8ef1066fd656e70c2c327b43ded1831f"},{"path":"products/rea-studio/apps/vault/group-edit-correction-controls.test.mjs","rawMode":"100644","gitBlob":"2f276f81ed7a2aa46cff216cab6376409d20d89e"},{"path":"products/rea-studio/apps/vault/group-edit-final-list-replay.test.mjs","rawMode":"100644","gitBlob":"b5723de0ad2176711d3357a6c70c4bd20f0180eb"},{"path":"products/rea-studio/apps/vault/group-edit-independent-persistence.test.mjs","rawMode":"100644","gitBlob":"fbe520caabf3188e9c6b5985f1299f2e6da29168"},{"path":"products/rea-studio/apps/vault/group-edit-oracle.ps1","rawMode":"100644","gitBlob":"335e8c1c73d49047a56a40003a7919c19f9b868a"},{"path":"products/rea-studio/apps/vault/group-edit-original.test.mjs","rawMode":"100644","gitBlob":"1986af348d22433390cf5718cdbba9fe251b3cbb"},{"path":"products/rea-studio/apps/vault/group-edit-review-fixture.mjs","rawMode":"100644","gitBlob":"02064f452c7307da82def457ef03194240fbec45"},{"path":"products/rea-studio/apps/vault/group-edit-server.test.mjs","rawMode":"100644","gitBlob":"5b4d0bddf88b2bf1df3ad3547e6a2f3f0d5db4e4"},{"path":"products/rea-studio/apps/vault/group-edit-ui.test.mjs","rawMode":"100644","gitBlob":"0c7c474b32fdb621f4ad2c9bfe952351fbb93278"},{"path":"products/rea-studio/apps/vault/group-edit.test.mjs","rawMode":"100644","gitBlob":"07e2f17219c49fe7eeddd935da02b339fdb366fc"},{"path":"products/rea-studio/apps/vault/group-fixture.mjs","rawMode":"100644","gitBlob":"9a2ba0eeab409b2b4b24701d9defb32062625e78"},{"path":"products/rea-studio/apps/vault/group-oracle.ps1","rawMode":"100644","gitBlob":"fbc80ceb8c0fd4e7f456de0d71cea26a11020780"},{"path":"products/rea-studio/apps/vault/group-original.test.mjs","rawMode":"100644","gitBlob":"9107e20d3ca1a0b8e77dbc3f6784f079837ed246"},{"path":"products/rea-studio/apps/vault/group-recycle.test.mjs","rawMode":"100644","gitBlob":"fd0daa0a112746bc147ab4321f730fa612f989bf"},{"path":"products/rea-studio/apps/vault/group-server.test.mjs","rawMode":"100644","gitBlob":"b2e8349b42e7c0f3f2a07074710c976234b557ab"},{"path":"products/rea-studio/apps/vault/group-ui.test.mjs","rawMode":"100644","gitBlob":"4e293923527d03077528ecf375df64794dcb2e9b"},{"path":"products/rea-studio/apps/vault/harness.mjs","rawMode":"100644","gitBlob":"445490112fdda41bfba69edf34da8502dd20143f"},{"path":"products/rea-studio/apps/vault/history-oracle.ps1","rawMode":"100644","gitBlob":"01a64eb471c824f9cdb0b911de6526fc079f3571"},{"path":"products/rea-studio/apps/vault/history.mjs","rawMode":"100644","gitBlob":"85490878686f8a5a653acadb8cd79499c0e52850"},{"path":"products/rea-studio/apps/vault/history.test.mjs","rawMode":"100644","gitBlob":"b463f27d1df5689dc8b90fc551635c4039965cd0"},{"path":"products/rea-studio/apps/vault/host-lifecycle.mjs","rawMode":"100644","gitBlob":"3a01b8d523fa2d3ae2f375bd13e3b5968653367b"},{"path":"products/rea-studio/apps/vault/http-runner.mjs","rawMode":"100644","gitBlob":"21a92cab08ef01f043df389af1c20c1fc2ce3920"},{"path":"products/rea-studio/apps/vault/http.test.mjs","rawMode":"100644","gitBlob":"822ef93f0c8025da8356062fe323ad2971edce69"},{"path":"products/rea-studio/apps/vault/idle-view.test.mjs","rawMode":"100644","gitBlob":"7f53344de7ab984505d80a3f45a811d4317fddc7"},{"path":"products/rea-studio/apps/vault/kdbx.interop.test.mjs","rawMode":"100644","gitBlob":"642c9a44194444a1e589eadb8328ca171eef1ddb"},{"path":"products/rea-studio/apps/vault/kdbx.mjs","rawMode":"100644","gitBlob":"3639bbcd8074782d2b3a7ed5caa32a118af5f941"},{"path":"products/rea-studio/apps/vault/kdbx.test.mjs","rawMode":"100644","gitBlob":"9eeb5e41d023d680dc339dc03bbe4e083555278c"},{"path":"products/rea-studio/apps/vault/keepass-oracle.ps1","rawMode":"100644","gitBlob":"e34d96e80f8a49c32dd4e4d1c098f50828a559f2"},{"path":"products/rea-studio/apps/vault/lifecycle-ui-fixture.mjs","rawMode":"100644","gitBlob":"70f6edf7f374a9f930783f61b3da17ed49da2362"},{"path":"products/rea-studio/apps/vault/preexisting-draft.test.mjs","rawMode":"100644","gitBlob":"bcbe86972c30b4063ae6532903a1709dac763436"},{"path":"products/rea-studio/apps/vault/recycle-boundaries.test.mjs","rawMode":"100644","gitBlob":"a4862f777092dbac967517e0a95a80cf00bad2e8"},{"path":"products/rea-studio/apps/vault/recycle-boundary-fixture.mjs","rawMode":"100644","gitBlob":"948d6ecc3750453bbca913cc8183c4f26ba20b0d"},{"path":"products/rea-studio/apps/vault/recycle-confirmation.test.mjs","rawMode":"100644","gitBlob":"96d78a5dc1047a3f23afe226153d6eb744d9ec14"},{"path":"products/rea-studio/apps/vault/recycle-controls.test.mjs","rawMode":"100644","gitBlob":"06698d53691638339680470da89381f370b3dcf0"},{"path":"products/rea-studio/apps/vault/recycle-harness.mjs","rawMode":"100644","gitBlob":"30a0e18235a09790b754c7e5f0944f76d15fc28e"},{"path":"products/rea-studio/apps/vault/recycle-http.test.mjs","rawMode":"100644","gitBlob":"59b0b65636f5843b17467c826e776c25af90315d"},{"path":"products/rea-studio/apps/vault/recycle-oracle.ps1","rawMode":"100644","gitBlob":"9c51422996b52c02381a92f72f12e9405b5a7007"},{"path":"products/rea-studio/apps/vault/recycle-original.test.mjs","rawMode":"100644","gitBlob":"b3e84e1d9e23742fa0b1498fc9b7d624895d10fb"},{"path":"products/rea-studio/apps/vault/recycle-server.test.mjs","rawMode":"100644","gitBlob":"a9dd6352e61a88fbb5ea56b4bc60aa08af51de4a"},{"path":"products/rea-studio/apps/vault/recycle-ui.test.mjs","rawMode":"100644","gitBlob":"15aaa374122c106bd90be36a23dbba9eb755d285"},{"path":"products/rea-studio/apps/vault/recycle.mjs","rawMode":"100644","gitBlob":"973ac5616f80a55c961b6b6300232986af7c3752"},{"path":"products/rea-studio/apps/vault/recycle.test.mjs","rawMode":"100644","gitBlob":"46f9b961e4cf51512887df324d9ff8f3a5f5b1c2"},{"path":"products/rea-studio/apps/vault/same-editor-draft.test.mjs","rawMode":"100644","gitBlob":"7018682e3d2cf46125e1be5f848025639b0eee48"},{"path":"products/rea-studio/apps/vault/selection-adjacent.test.mjs","rawMode":"100644","gitBlob":"f35e556f54d4fc25da90a89a1cf313bd33b98fa9"},{"path":"products/rea-studio/apps/vault/selection-boundaries.test.mjs","rawMode":"100644","gitBlob":"249e9ea6ba194801c46b49ce026a157828a6130f"},{"path":"products/rea-studio/apps/vault/selection-independent.test.mjs","rawMode":"100644","gitBlob":"796b834d88b5a54ddbc10b9fd995162a9949910c"},{"path":"products/rea-studio/apps/vault/server.mjs","rawMode":"100644","gitBlob":"33cec2227f6b62fce63d72c79d8ce61c41eacea1"},{"path":"products/rea-studio/apps/vault/ui-fixture.mjs","rawMode":"100644","gitBlob":"955f8176ad7f7c75bf46209479e6cd6e031b7f7d"},{"path":"products/rea-studio/apps/vault/ui.test.mjs","rawMode":"100644","gitBlob":"f1b8ac9689a6efbbc3a541e0dbbdb1b06ecbe953"},{"path":"products/rea-studio/apps/vault/unknown-time.test.mjs","rawMode":"100644","gitBlob":"175040e126a520732a368e9e9dbeb7e0af51a679"},{"path":"products/rea-studio/apps/vault/xml.mjs","rawMode":"100644","gitBlob":"288810c9f04dae778b396def7b65f4918368c1e4"},{"path":"products/rea-studio/browser-tests/archive-aes-roster.json","rawMode":"100644","gitBlob":"adb7c033b25e2ec8a71168dd462795290020022e"},{"path":"products/rea-studio/browser-tests/archive-aes.spec.mjs","rawMode":"100644","gitBlob":"5844f0b3ec941e2517bddf1ea21c71461924c64b"},{"path":"products/rea-studio/browser-tests/archive-zip-aes-roster.json","rawMode":"100644","gitBlob":"3401f146883c6cbe5b3e3bba6d6357240970902d"},{"path":"products/rea-studio/browser-tests/archive-zip-aes.spec.mjs","rawMode":"100644","gitBlob":"464b529404ce80df22dfa9cedf512e3fe7e2c231"},{"path":"products/rea-studio/browser-tests/backup-native-keys-roster.json","rawMode":"100644","gitBlob":"10dfb2e495093c3fe6d24bb4e9b1e3020801cd71"},{"path":"products/rea-studio/browser-tests/backup-native-keys.spec.mjs","rawMode":"100644","gitBlob":"a8847c7eb5f14e854722b40149caf3f53a0acd15"},{"path":"products/rea-studio/browser-tests/browser-metadata.json","rawMode":"100644","gitBlob":"6352eed69ace538834662cfc68e353bf8d874e0f"},{"path":"products/rea-studio/browser-tests/flow-vault.spec.mjs","rawMode":"100644","gitBlob":"6dff38d045686f1cb7157469de57d30e01cfe5d0"},{"path":"products/rea-studio/browser-tests/notes-draft-recovery-installed-legacy-r2-roster.json","rawMode":"100644","gitBlob":"e7163d15b8508f79484bc11dc996e8b53cf7114c"},{"path":"products/rea-studio/browser-tests/notes-draft-recovery-installed-legacy-r2.spec.mjs","rawMode":"100644","gitBlob":"2de7e20c16fa4d638044b61a84fdd869055d7c7a"},{"path":"products/rea-studio/browser-tests/notes-draft-recovery-installed-legacy-roster.json","rawMode":"100644","gitBlob":"e7163d15b8508f79484bc11dc996e8b53cf7114c"},{"path":"products/rea-studio/browser-tests/notes-draft-recovery-installed-legacy.spec.mjs","rawMode":"100644","gitBlob":"d5932c875b304db4b688c1f0eea0f4cce35131dc"},{"path":"products/rea-studio/browser-tests/notes-draft-recovery.spec.mjs","rawMode":"100644","gitBlob":"c4322fb62cd81dec8b78cd02bc5018432ca68b41"},{"path":"products/rea-studio/browser-tests/notes-draft-recovery.storage.spec.mjs","rawMode":"100644","gitBlob":"95ebd41c17845b788e377705e5591c2cd16552d8"},{"path":"products/rea-studio/browser-tests/notes-new-todo-roster.json","rawMode":"100644","gitBlob":"e7163d15b8508f79484bc11dc996e8b53cf7114c"},{"path":"products/rea-studio/browser-tests/notes-new-todo.spec.mjs","rawMode":"100644","gitBlob":"531acf222c772876ccc80e55e0336f1b15fe598b"},{"path":"products/rea-studio/browser-tests/notes-open-todos-first.fixture.mjs","rawMode":"100644","gitBlob":"7d958529efc1facf5bbf13e63e93aafd789dac55"},{"path":"products/rea-studio/browser-tests/notes-open-todos-first.source-bindings.json","rawMode":"100644","gitBlob":"53564a511ced45d9618790a89f7fb139666ce049"},{"path":"products/rea-studio/browser-tests/notes-open-todos-first.spec.mjs","rawMode":"100644","gitBlob":"f734637211ca1dfa7dfcabe706ead7161b7b05fa"},{"path":"products/rea-studio/browser-tests/notes-owned-fixture-cleanup.mjs","rawMode":"100644","gitBlob":"6ba20c4151c0414d8744a05a85b0fc92264cc79d"},{"path":"products/rea-studio/browser-tests/notes-structured-search-legacy-eight.spec.mjs","rawMode":"100644","gitBlob":"5716461db7a970aec32c7e06647f3b7cb77afa2c"},{"path":"products/rea-studio/browser-tests/notes-structured-search-roster.json","rawMode":"100644","gitBlob":"938264e4fb15d5f06bc6191f9358686c28ffee7f"},{"path":"products/rea-studio/browser-tests/notes-structured-search-source-bindings.json","rawMode":"100644","gitBlob":"a258bcda3469bc43875c613dddbe6fc499ed5d03"},{"path":"products/rea-studio/browser-tests/notes-structured-search.any-fixture.mjs","rawMode":"100644","gitBlob":"1e1c5c50b801837f866d036fae5a141089c75af7"},{"path":"products/rea-studio/browser-tests/notes-structured-search.any-roster.json","rawMode":"100644","gitBlob":"3aa9916ffe2d08143924ef5ac816b56f71c63167"},{"path":"products/rea-studio/browser-tests/notes-structured-search.any.spec.mjs","rawMode":"100644","gitBlob":"b8e3b2ca5552f4bf6d9ea689f65ed652a79a7e88"},{"path":"products/rea-studio/browser-tests/notes-structured-search.spec.mjs","rawMode":"100644","gitBlob":"1f84b2637accb9a0e07afb291776c13fcd98a0a2"},{"path":"products/rea-studio/browser-tests/notes-todo-roster.json","rawMode":"100644","gitBlob":"dc2e0bcd7e07c2d066731ab8fd82b30f0a19fc65"},{"path":"products/rea-studio/browser-tests/notes-todo.spec.mjs","rawMode":"100644","gitBlob":"a01bc7f145885f8e583fc953c65dc0118f9c28b5"},{"path":"products/rea-studio/browser-tests/package-lock.json","rawMode":"100644","gitBlob":"c8daf8d6e15834e8be66ee8f8044de9f5aef0bbb"},{"path":"products/rea-studio/browser-tests/package.json","rawMode":"100644","gitBlob":"3503007469a1b1865f71d739c1c245412ca2710d"},{"path":"products/rea-studio/browser-tests/playwright.archive-aes.config.mjs","rawMode":"100644","gitBlob":"80c8e4188f29bf6049e7112bec846be343619ee9"},{"path":"products/rea-studio/browser-tests/playwright.archive-zip-aes.config.mjs","rawMode":"100644","gitBlob":"25f248b063d4b953aaeef8220dcab246dcb6c70f"},{"path":"products/rea-studio/browser-tests/playwright.backup-native-keys.config.mjs","rawMode":"100644","gitBlob":"1803172d90d62167c50d70ae78c9be37f158b5fa"},{"path":"products/rea-studio/browser-tests/playwright.config.mjs","rawMode":"100644","gitBlob":"31d813a7761154cdd8f4d38357ae590dcb16919b"},{"path":"products/rea-studio/browser-tests/playwright.notes-draft-recovery-installed-legacy-r2.config.mjs","rawMode":"100644","gitBlob":"997c650b48155faabe7a342671acfbd91a89e5c7"},{"path":"products/rea-studio/browser-tests/playwright.notes-draft-recovery-installed-legacy.config.mjs","rawMode":"100644","gitBlob":"d1c8524ae2661983d1db723f39444bb16f83711b"},{"path":"products/rea-studio/browser-tests/playwright.notes-draft-recovery.config.mjs","rawMode":"100644","gitBlob":"6e47a32e164a08babd2c7abefe92e70344324718"},{"path":"products/rea-studio/browser-tests/playwright.notes-new-todo.config.mjs","rawMode":"100644","gitBlob":"acc801b9d9a31baa7d82ff5946cc63ff8c026915"},{"path":"products/rea-studio/browser-tests/playwright.notes-open-todos-first.config.mjs","rawMode":"100644","gitBlob":"9b3cd43122a035e13368a5da29f5cf6fa9a48781"},{"path":"products/rea-studio/browser-tests/playwright.notes-structured-search.any.config.mjs","rawMode":"100644","gitBlob":"d8061d932cd902270f92314250db31bc44e1fce1"},{"path":"products/rea-studio/browser-tests/playwright.notes-structured-search.config.mjs","rawMode":"100644","gitBlob":"a47c4ea29d63d6939aa1a653188ffb5762701620"},{"path":"products/rea-studio/browser-tests/playwright.notes-todo.config.mjs","rawMode":"100644","gitBlob":"c81a48a649630da85c152d0e0c3d601a57081464"},{"path":"products/rea-studio/browser-tests/playwright.sync-webdav-download.config.mjs","rawMode":"100644","gitBlob":"b6d2237554eba01e84b3f469870ca5fae8a39552"},{"path":"products/rea-studio/browser-tests/scenario-roster.json","rawMode":"100644","gitBlob":"a017cfe5ee3ddf7a35d1f4ea86462046f8f79e92"},{"path":"products/rea-studio/browser-tests/sync-webdav-download-roster.json","rawMode":"100644","gitBlob":"93eb5aca48f004e0a6e8874a829af65e9bc86f44"},{"path":"products/rea-studio/browser-tests/sync-webdav-download.spec.mjs","rawMode":"100644","gitBlob":"6659ffad460bb96370fcf58bcb12167cd6623d13"},{"path":"products/rea-studio/browser-tests/tooling-pins.json","rawMode":"100644","gitBlob":"56ca85de798cbf1eb5e0d7c576d11c865b1f025c"},{"path":"products/rea-studio/catalog.mjs","rawMode":"100644","gitBlob":"6bec42c7804a475ae3f137223490c3350d79263a"},{"path":"products/rea-studio/experiments/archive-safe-evidence/policy.json","rawMode":"100644","gitBlob":"6c870a6ebd60d47896059e3c26a620bf19069057"},{"path":"products/rea-studio/experiments/archive-zip-aes/finite-roster.json","rawMode":"100644","gitBlob":"ed8dd085dda76a6c5f0f9da05705bbbe31b834cb"},{"path":"products/rea-studio/experiments/archive-zip-aes/original-roster.json","rawMode":"100644","gitBlob":"51c5f83aaadd079139c909589d2ec3dca019bf46"},{"path":"products/rea-studio/experiments/archive-zip-aes/source-admission.json","rawMode":"100644","gitBlob":"5fc8c5c776fb7410380d0fca58a0007684a3181f"},{"path":"products/rea-studio/experiments/archive-zip-aes/ui-source-transition.json","rawMode":"100644","gitBlob":"ab095c31f2c801dc5270f9064734dba86775c749"},{"path":"products/rea-studio/experiments/notes-open-todos-first-20261021/original/Note.ts","rawMode":"100644","gitBlob":"e43c406389601ed61d07bd60fd0d2d8ab6a7a364"},{"path":"products/rea-studio/experiments/notes-open-todos-first-20261021/safe-evidence-policy.json","rawMode":"100644","gitBlob":"f96ffa1cb1f7a2db3d816e5d636528a1a70bdc03"},{"path":"products/rea-studio/experiments/notes-search-grammar/original/packages/lib/services/search/filterParser.ts","rawMode":"100644","gitBlob":"97bb6ffc6f5300767cad1123e03e725b585d22ae"},{"path":"products/rea-studio/experiments/notes-search-grammar/original/packages/lib/services/search/queryBuilder.ts","rawMode":"100644","gitBlob":"bad8f89695186a40248db6e1baf75cdf16ce4754"},{"path":"products/rea-studio/experiments/notes46-installed-search-20261019/tests/search-http.test.mjs","rawMode":"100644","gitBlob":"ff35bd6c4dda65904d66bfb96b5d87b0e4125566"},{"path":"products/rea-studio/experiments/notes46-installed-search-browser-20261019/tests/search-original-observations.test.mjs","rawMode":"100644","gitBlob":"67e8746d8b5f618a0b16ac456cb6d1a20ca597fd"},{"path":"products/rea-studio/lib/storage.mjs","rawMode":"100644","gitBlob":"4221c8966e2538bbcd88c3bf1363123619226a27"},{"path":"products/rea-studio/package.json","rawMode":"100644","gitBlob":"1882a8e3cd98cc6c84cef6d8fa86df6efab1143f"},{"path":"products/rea-studio/public/index.html","rawMode":"100644","gitBlob":"2873012d9e744d74602a75ca7da201648c36f9dd"},{"path":"products/rea-studio/public/studio.mjs","rawMode":"100644","gitBlob":"6a9f2c58b74f231e07ec2a06f7e505849ff9b088"},{"path":"products/rea-studio/public/style.css","rawMode":"100644","gitBlob":"5d25ecd0db5566adedfac6f51d13b77e309bba84"},{"path":"products/rea-studio/requirements/archive-zip-winzip-aes256-subset.json","rawMode":"100644","gitBlob":"6977ac3bb3659a11422b9badee16be91418bc471"},{"path":"products/rea-studio/scripts/acquire-archive-zip-aes-original.mjs","rawMode":"100644","gitBlob":"72f3371f6c2c4f149bad64d5e43223c2bfb45f08"},{"path":"products/rea-studio/scripts/acquire-sync-webdav-download-original.mjs","rawMode":"100644","gitBlob":"676b39a36c7a25c502f86e1907999e3259d74cb7"},{"path":"products/rea-studio/scripts/archive-zip-aes-source-admission.ps1","rawMode":"100644","gitBlob":"b6651b1d55398a645ec17f60436ee9ca1017dea7"},{"path":"products/rea-studio/scripts/backup-native-keys-source-admission.ps1","rawMode":"100644","gitBlob":"8d2aaa509dd6625cedb256402c5c65a52ed9a36c"},{"path":"products/rea-studio/scripts/benchmark-worker.mjs","rawMode":"100644","gitBlob":"d05a5059ab16935921b34206822dc8b3001d5124"},{"path":"products/rea-studio/scripts/benchmark.mjs","rawMode":"100644","gitBlob":"cc0eec5924cc04f3422ba2bde36a002368f72a7a"},{"path":"products/rea-studio/scripts/bootstrap-cloud-bsdtar.mjs","rawMode":"100644","gitBlob":"cb519153534e88782934ab7be3c9a79d40f0ae5c"},{"path":"products/rea-studio/scripts/bootstrap-cloud-development.mjs","rawMode":"100644","gitBlob":"17ff1de499eef0ce298520366b7ceadef19af691"},{"path":"products/rea-studio/scripts/bootstrap-cloud-flow-vault.mjs","rawMode":"100644","gitBlob":"2f74eba4351bcb0bfa34fe09586a861e51fa53dd"},{"path":"products/rea-studio/scripts/bootstrap-node-red-oracle.mjs","rawMode":"100644","gitBlob":"2f873e10cc4c3ab93c5bf0faf5f535face583b23"},{"path":"products/rea-studio/scripts/bootstrap-notes-open-todos-cloud.mjs","rawMode":"100644","gitBlob":"4adf5c30c8b085d4d18be674ec114cee64a46417"},{"path":"products/rea-studio/scripts/capture-notes-order-cloud-console.mjs","rawMode":"100644","gitBlob":"c444c288137ebe119af4e1c5b4057430ae85d542"},{"path":"products/rea-studio/scripts/capture-safe-cloud-console.mjs","rawMode":"100644","gitBlob":"c3ecabe72eaeebce299f5448bb01ded9083cfb3f"},{"path":"products/rea-studio/scripts/compose-archive-aes-cloud.mjs","rawMode":"100644","gitBlob":"22436d75667902b2670236d19c0f6230de425fe8"},{"path":"products/rea-studio/scripts/compose-bsdtar-oracle-cloud.mjs","rawMode":"100644","gitBlob":"69190b1f1be4d2eb0e1571f423f0f9eb9b687897"},{"path":"products/rea-studio/scripts/compose-notes-new-todo-cloud.mjs","rawMode":"100644","gitBlob":"24b236b396c6fa65eed054a47ae210c2b8d35652"},{"path":"products/rea-studio/scripts/compose-notes-todo-cloud.mjs","rawMode":"100644","gitBlob":"8fc0d7b2f98e86fb65fc014f1962670cce089c37"},{"path":"products/rea-studio/scripts/compose-vault-empty-bin-cloud.mjs","rawMode":"100644","gitBlob":"14278fdd189b891169b3c3b832a06f558d783e66"},{"path":"products/rea-studio/scripts/compose-windows-path-cloud.mjs","rawMode":"100644","gitBlob":"e41f282842c6b7737ace66e979a07c822a16dad3"},{"path":"products/rea-studio/scripts/evidence-filter-validation-control.ps1","rawMode":"100644","gitBlob":"df1b303ca50e52f9eb2c23354f2334e577ac3942"},{"path":"products/rea-studio/scripts/evidence-filter-validation-source-admission.ps1","rawMode":"100644","gitBlob":"3034866b2dbb6dfead9b5a99d584447bc076ca95"},{"path":"products/rea-studio/scripts/export-archive-zip-aes-public.ps1","rawMode":"100644","gitBlob":"aadc155686f706535bf54b7bdb6fb77895854bdf"},{"path":"products/rea-studio/scripts/export-safe-notes-full-progress.mjs","rawMode":"100644","gitBlob":"27d170a28a1dd59065fc5df1d523d6cdbb03f420"},{"path":"products/rea-studio/scripts/notes-draft-recovery-regression-floor.json","rawMode":"100644","gitBlob":"30b8895b1d4adad029379b223c008e4fa1c347d9"},{"path":"products/rea-studio/scripts/notes-full-diagnostic-containment-child.mjs","rawMode":"100644","gitBlob":"2c05b6465fd6a1e0abea49f8b312bdeddaa1008b"},{"path":"products/rea-studio/scripts/notes-full-diagnostic-exporter.cloud-check.mjs","rawMode":"100644","gitBlob":"fe9d84db969b77925defe93f5e24cb599ac90cfe"},{"path":"products/rea-studio/scripts/notes-full-progress-contract.mjs","rawMode":"100644","gitBlob":"0de10257e85422241a7c30aee0117a4bd908b561"},{"path":"products/rea-studio/scripts/notes-full-progress-reporter.mjs","rawMode":"100644","gitBlob":"615cf2189c434d077c0139342352fe097e886ded"},{"path":"products/rea-studio/scripts/notes-full-progress.cloud-check.mjs","rawMode":"100644","gitBlob":"dd14228257c5d645c9d4dba51a4272355a9d7c3a"},{"path":"products/rea-studio/scripts/notes46-installed-tap-roster.mjs","rawMode":"100644","gitBlob":"ddcebe626b267212d80da0da14fbf037b262fc38"},{"path":"products/rea-studio/scripts/prepare-safe-cloud-evidence.mjs","rawMode":"100644","gitBlob":"ec9561e5ff05d06a9a1edd24986b4a97a53f2f98"},{"path":"products/rea-studio/scripts/prepare-safe-notes-order-evidence.mjs","rawMode":"100644","gitBlob":"44c146c6406145257d5acdddab171fc67e354841"},{"path":"products/rea-studio/scripts/project-notes-archive-original-metadata.mjs","rawMode":"100644","gitBlob":"c851b0fd9a637e93467f7ac8ee71efe6fb607893"},{"path":"products/rea-studio/scripts/qualify-notes-open-todos-cloud.mjs","rawMode":"100644","gitBlob":"cb2dc90bf1cd42d2c2f0628cfbdfca8bcb11fb4d"},{"path":"products/rea-studio/scripts/read-rabin-tap.mjs","rawMode":"100644","gitBlob":"2403c3fcbeb3388c7e51ee79289bfb77cfafd6a8"},{"path":"products/rea-studio/scripts/run-archive-zip-aes-tests.mjs","rawMode":"100644","gitBlob":"c37912c8a6fb59a3affd1c31da4441c10104903f"},{"path":"products/rea-studio/scripts/run-backup-native-keys-tests.mjs","rawMode":"100644","gitBlob":"0c2c1d77fd5557c270ab54bbeb71ebb9c23d372e"},{"path":"products/rea-studio/scripts/run-sync-webdav-download-tests.mjs","rawMode":"100644","gitBlob":"b07fe9a9b6dc5c13357cd4bdb89c4ee59caa3332"},{"path":"products/rea-studio/scripts/sequence-benchmark-worker.mjs","rawMode":"100644","gitBlob":"d2a48f0e96d1f567f102436ad0e62465fb4449a9"},{"path":"products/rea-studio/scripts/sequence-benchmark.mjs","rawMode":"100644","gitBlob":"8dd9450655373de2aa5b4e8427ff9d783eb19afd"},{"path":"products/rea-studio/scripts/sketch-collector-process.mjs","rawMode":"100644","gitBlob":"130b73a2f672c8e011d4a18b89428f2761f5517a"},{"path":"products/rea-studio/scripts/sync-webdav-download-source-admission.ps1","rawMode":"100644","gitBlob":"ad28048f586f66341159161d544fe23a7f06bb2c"},{"path":"products/rea-studio/scripts/test-all.mjs","rawMode":"100644","gitBlob":"5a13e3dc66c6a8a9c9429136395e2d1eb34aaf10"},{"path":"products/rea-studio/scripts/validate-safe-cloud-evidence.mjs","rawMode":"100644","gitBlob":"c33429d3078236e71b8877be16bc652cf06ac8eb"},{"path":"products/rea-studio/scripts/validate-safe-notes-order-evidence.mjs","rawMode":"100644","gitBlob":"27fcb622e29ba97aacc09d94de6a327ec359470e"},{"path":"products/rea-studio/scripts/verify-archive-installed-cloud.mjs","rawMode":"100644","gitBlob":"b9cac4dee162fbf1006f6c762605fcda2c2db4bc"},{"path":"products/rea-studio/scripts/verify-archive-zip-aes-cloud.mjs","rawMode":"100644","gitBlob":"470cfdab31887f96b5acb7dd21e83780bc409df7"},{"path":"products/rea-studio/scripts/verify-automation-routing.mjs","rawMode":"100644","gitBlob":"46b2b8af7e8d18951710e6e6968b7b240f4b1f91"},{"path":"products/rea-studio/scripts/verify-backup-native-keys-cloud.mjs","rawMode":"100644","gitBlob":"c5cdbbe73395248d5c0cdbf065f1f829eac21054"},{"path":"products/rea-studio/scripts/verify-backup-rabin.mjs","rawMode":"100644","gitBlob":"280a69d15b998851718ec20e5fb3916de3d6a019"},{"path":"products/rea-studio/scripts/verify-cloud-browser.mjs","rawMode":"100644","gitBlob":"1a2af7396c2388856b6d5e4f5dee1c5b47a0a009"},{"path":"products/rea-studio/scripts/verify-cloud-bsdtar.mjs","rawMode":"100644","gitBlob":"2d5c19346345e91123bb7d1ccc25090b39587ddb"},{"path":"products/rea-studio/scripts/verify-cloud-controls.mjs","rawMode":"100644","gitBlob":"8739891390c27ef0a129140be97311a51a3448a8"},{"path":"products/rea-studio/scripts/verify-cloud-current-installed.mjs","rawMode":"100644","gitBlob":"1e6468c4e37241503d1942d11dd73275559ccb5e"},{"path":"products/rea-studio/scripts/verify-cloud.mjs","rawMode":"100644","gitBlob":"50b34887089d72ff8d62c177a952b14a43b8a62d"},{"path":"products/rea-studio/scripts/verify-development.mjs","rawMode":"100644","gitBlob":"f30af1b013d2b03a061c37bee1c27bf37b45bf7d"},{"path":"products/rea-studio/scripts/verify-notes-draft-recovery-cloud.mjs","rawMode":"100644","gitBlob":"b4a2e76b0fd85dd6d047512301f0adf1dd20b402"},{"path":"products/rea-studio/scripts/verify-notes-draft-recovery-installed-full-r2.mjs","rawMode":"100644","gitBlob":"5af0ac0db5724da9ec3bd6a57fd4d7763eb8f600"},{"path":"products/rea-studio/scripts/verify-notes-draft-recovery-installed-full.mjs","rawMode":"100644","gitBlob":"8c139baaf53fb0b72c442a03695c60612f009424"},{"path":"products/rea-studio/scripts/verify-notes-installed-cloud.mjs","rawMode":"100644","gitBlob":"0f79739406738e47dadfcae74a679c7dd3b26267"},{"path":"products/rea-studio/scripts/verify-notes-new-todo-cloud.mjs","rawMode":"100644","gitBlob":"f2e78af4a6d49b9fd44ba6c43262d352bffb22e6"},{"path":"products/rea-studio/scripts/verify-notes-open-todos-cloud.mjs","rawMode":"100644","gitBlob":"a13eac2fdfeadf4314c0d8f557138a91848cc7db"},{"path":"products/rea-studio/scripts/verify-notes-todo-browser-cloud.mjs","rawMode":"100644","gitBlob":"6cd28ed571d40a92f0db8efe8932c16a883aab40"},{"path":"products/rea-studio/scripts/verify-notes36-cloud.mjs","rawMode":"100644","gitBlob":"afe37daceffe400f321c30613a6e3ecb2ee4c0b0"},{"path":"products/rea-studio/scripts/verify-notes36-installed-cloud.mjs","rawMode":"100644","gitBlob":"3ecdd7e749be2c56392d244d401bdcca22293d15"},{"path":"products/rea-studio/scripts/verify-notes41-installed-cloud-r2.mjs","rawMode":"100644","gitBlob":"5fa57ecb1d30e3d66bec17e21758c5417492ab4a"},{"path":"products/rea-studio/scripts/verify-notes41-installed-cloud.mjs","rawMode":"100644","gitBlob":"aefdc04a5ae0d7c9e3f4dfe00638aa3e43fbf287"},{"path":"products/rea-studio/scripts/verify-notes41-legacy-browser-results-r2.mjs","rawMode":"100644","gitBlob":"30427fa652462cbd2cd03ccfc730c3cf117987fe"},{"path":"products/rea-studio/scripts/verify-notes41-legacy-browser-results.mjs","rawMode":"100644","gitBlob":"46019c92cc965c3cb7c74f02c1fe326a51d516af"},{"path":"products/rea-studio/scripts/verify-notes46-installed-cloud.mjs","rawMode":"100644","gitBlob":"f6cf276a3902b1e029ed2e9057f43c7646483adf"},{"path":"products/rea-studio/scripts/verify-notes46-installed-roster.mjs","rawMode":"100644","gitBlob":"329de63f1a13157fb27d9ba641394abaad15a6a3"},{"path":"products/rea-studio/scripts/verify-preserved-cloud-flow-vault.mjs","rawMode":"100644","gitBlob":"2c5ed22adb5bf24709286500080265f3900d3ba0"},{"path":"products/rea-studio/scripts/verify-rabin-recorder.mjs","rawMode":"100644","gitBlob":"e0ca0e3c2fe647e2b7ce8af83bb12bfaa15d7fbe"},{"path":"products/rea-studio/scripts/verify-sketch-geometry.mjs","rawMode":"100644","gitBlob":"47352d6da47392e673c17a0e14effb062f122b98"},{"path":"products/rea-studio/scripts/verify-sync-webdav-download-cloud.mjs","rawMode":"100644","gitBlob":"cd618b50b4ba69ecaf600e6a2fc7e984d5964967"},{"path":"products/rea-studio/server.mjs","rawMode":"100644","gitBlob":"460143df98622864f86178f53f56b0edf4c16139"},{"path":"products/rea-studio/tests/fixtures/sketch-collector/descendant.mjs","rawMode":"100644","gitBlob":"601b833bafef678e4a725d13f2c7d40da15d79b3"},{"path":"products/rea-studio/tests/fixtures/sketch-collector/runner.mjs","rawMode":"100644","gitBlob":"1017082e84f176104d5417842e1e844243b82a54"},{"path":"products/rea-studio/tests/host.test.mjs","rawMode":"100644","gitBlob":"9f42cdb2157c9f0c6200eb3232351afa616fedd9"},{"path":"products/rea-studio/tests/rabin-recorder.test.mjs","rawMode":"100644","gitBlob":"e74ddd56bfe0507d4ef8a0f3f36b2ab2260d1339"},{"path":"products/rea-studio/tests/sketch-collector.test.mjs","rawMode":"100644","gitBlob":"7538e88bc6546b81826dff9da2e45b40b1895471"},{"path":"products/rea-studio/tests/sketch-layout-static-route.test.mjs","rawMode":"100644","gitBlob":"630d8f98fc48b32f36475dcd0a1d2d88425e2003"},{"path":"projects/01-vscode-monaco/acquisition.json","rawMode":"100644","gitBlob":"035e125c3257b8d04afb15fa558977902eb10a32"},{"path":"projects/01-vscode-monaco/claims.json","rawMode":"100644","gitBlob":"5f003538390dcaa81497dd6bfea4600112216827"},{"path":"projects/01-vscode-monaco/package.json","rawMode":"100644","gitBlob":"660c0fb2a067df66380e721a83f1a298fa58154e"},{"path":"projects/01-vscode-monaco/reconstruction.mjs","rawMode":"100644","gitBlob":"285c466acf6bec120864ab2dcf0441ab583a0510"},{"path":"projects/01-vscode-monaco/reproduction-audit.json","rawMode":"100644","gitBlob":"e11dc3fdd1270175f23ae33b5aee0d5d53f40af4"},{"path":"projects/01-vscode-monaco/scope.json","rawMode":"100644","gitBlob":"0222e7f1fa9d035d9af645ef509b60090cbd04f2"},{"path":"projects/01-vscode-monaco/study.json","rawMode":"100644","gitBlob":"febdf84738dafa38932d32866f7d19c62b91a380"},{"path":"projects/02-grafana/acquisition.json","rawMode":"100644","gitBlob":"49dde96fcc23572aac91cf3451c971da6f8d4e53"},{"path":"projects/02-grafana/claims.json","rawMode":"100644","gitBlob":"c147e4ad3d352be440f4ada5da2bdf8dda661c80"},{"path":"projects/02-grafana/dependency.json","rawMode":"100644","gitBlob":"ebeed51e787e5082c9e20cd5dbeef8a5aee78762"},{"path":"projects/02-grafana/package.json","rawMode":"100644","gitBlob":"710eaf2da66271c3df52a0df9b937bbe1047dcc9"},{"path":"projects/02-grafana/reconstruction.mjs","rawMode":"100644","gitBlob":"2fd0d306ce78f29b7429b039e35ccbc6b69e81b7"},{"path":"projects/02-grafana/reproduction-audit.json","rawMode":"100644","gitBlob":"35243a3bde68cfd3074ac5741794cf65c3020116"},{"path":"projects/02-grafana/scope.json","rawMode":"100644","gitBlob":"04787613d5246688d681a5afb9b2d1c37754f33d"},{"path":"projects/02-grafana/study.json","rawMode":"100644","gitBlob":"192cf7a1a095d1e2be1e00a785f8757ff2c01131"},{"path":"projects/03-n8n/acquisition.json","rawMode":"100644","gitBlob":"a40fc813d1a7a27bbd4228528b45b975c64cbdd3"},{"path":"projects/03-n8n/claims.json","rawMode":"100644","gitBlob":"afb675e33b50fd6b0a552b0b86b6010e5adaa40f"},{"path":"projects/03-n8n/package.json","rawMode":"100644","gitBlob":"2ba4c4f4c7e28797c5461b5b02e7bf501931a335"},{"path":"projects/03-n8n/reconstruction.mjs","rawMode":"100644","gitBlob":"889ea1084fe1d3a13bc33292384b1661020290d3"},{"path":"projects/03-n8n/reproduction-audit.json","rawMode":"100644","gitBlob":"05deaa02905bea1ab92c2469c7537c0086d6c437"},{"path":"projects/03-n8n/scope.json","rawMode":"100644","gitBlob":"7295dd32e182b275f2914e14e134f75341a79ceb"},{"path":"projects/03-n8n/study.json","rawMode":"100644","gitBlob":"72d3d915753f4412b7ff03cd2d508888c67fa90a"},{"path":"projects/04-excalidraw/acquire.mjs","rawMode":"100644","gitBlob":"7a331a5054b3fb8dce9f23ba62edddbbc65a75ed"},{"path":"projects/04-excalidraw/analyze.mjs","rawMode":"100644","gitBlob":"3d2c56ee6042b0a5f6853e02120f08f11950de49"},{"path":"projects/04-excalidraw/claim-ledger.json","rawMode":"100644","gitBlob":"b6b7e89809e76dcc74652ed4ff754bbb26efc029"},{"path":"projects/04-excalidraw/demo.mjs","rawMode":"100644","gitBlob":"1a5c7168e2cf6db760019b7224263be009d7fa3b"},{"path":"projects/04-excalidraw/license-provenance.json","rawMode":"100644","gitBlob":"ab8e7bf0c08cd29a8fb7470651b2794543c332c4"},{"path":"projects/04-excalidraw/prepare-analysis.mjs","rawMode":"100644","gitBlob":"8f7447ddd61ce6b53b17ed98fc7dac1fb6765878"},{"path":"projects/04-excalidraw/provenance.json","rawMode":"100644","gitBlob":"cf0ff5fc9acac6a9db586de367d99b9573ef484e"},{"path":"projects/04-excalidraw/rea-evidence-summary.json","rawMode":"100644","gitBlob":"6894496e765ed91c608d2f057bea55c6b6368770"},{"path":"projects/04-excalidraw/reconstruction.mjs","rawMode":"100644","gitBlob":"8d9b029817a0ad7232ff5694190a8a9f36e478fd"},{"path":"projects/04-excalidraw/reproduce.mjs","rawMode":"100644","gitBlob":"e8922e27d66c8f7290ea2214636dcd7d3a187a3c"},{"path":"projects/04-excalidraw/run-history.json","rawMode":"100644","gitBlob":"3e851dc84262434320cbd6fa873b2e07cf42354c"},{"path":"projects/04-excalidraw/slice-manifest.json","rawMode":"100644","gitBlob":"0a639ac85313ca1097ce03db0dc6be2c2bb752f3"},{"path":"projects/04-excalidraw/study.json","rawMode":"100644","gitBlob":"24c175cd1f50a2a45ce1a463a91e8b462bce0496"},{"path":"projects/04-excalidraw/test-results.json","rawMode":"100644","gitBlob":"dae13923fa387f54fc461206d19a35179a89dd17"},{"path":"projects/04-excalidraw/test.mjs","rawMode":"100644","gitBlob":"018034d1173e3c9ebe264d590ca96619061c68ed"},{"path":"projects/05-joplin/acquire.mjs","rawMode":"100644","gitBlob":"d1a961a58eb3683227cb9bbb42a3840d8553d15d"},{"path":"projects/05-joplin/analyze.mjs","rawMode":"100644","gitBlob":"accaccd07f315e84c91ae02ebf3199002fc9090a"},{"path":"projects/05-joplin/claim-ledger.json","rawMode":"100644","gitBlob":"2ba0c1bac9926a234f514152c0935b52fd0b38bf"},{"path":"projects/05-joplin/demo.mjs","rawMode":"100644","gitBlob":"f16f37a0a2edfdf4d4e98077481264082f77e09a"},{"path":"projects/05-joplin/license-provenance.json","rawMode":"100644","gitBlob":"3c67a64de1ba19d37d541b23009d748e2bc4d4f6"},{"path":"projects/05-joplin/provenance.json","rawMode":"100644","gitBlob":"61549bfbcf5a98089439404013ba4fd9b266d9a9"},{"path":"projects/05-joplin/rea-evidence-summary.json","rawMode":"100644","gitBlob":"5dd81452e0e276eab790ad9defa77e5288062f2f"},{"path":"projects/05-joplin/reconstruction.mjs","rawMode":"100644","gitBlob":"acefa53ad922c764f1c49d11f3f271f505c77ad8"},{"path":"projects/05-joplin/reproduce.mjs","rawMode":"100644","gitBlob":"49a7144f977427f58498bb33bd017e8d54512f71"},{"path":"projects/05-joplin/run-history.json","rawMode":"100644","gitBlob":"cb1e028c63a6c95057e5aa6a615ddb6b4420c5cd"},{"path":"projects/05-joplin/study.json","rawMode":"100644","gitBlob":"7f966512c0bf7bf80a543e1ed105678235274dec"},{"path":"projects/05-joplin/test-results.json","rawMode":"100644","gitBlob":"4e8e8b0545b3ef1af6f50c0e5f726c601938577b"},{"path":"projects/05-joplin/test.mjs","rawMode":"100644","gitBlob":"276344ed84e0828b83e4b617ed67b2feeff83387"},{"path":"projects/06-node-red/acquire.mjs","rawMode":"100644","gitBlob":"e7fec95283131bf86a6dcf7a9326db9cd1d5cd01"},{"path":"projects/06-node-red/analyze.mjs","rawMode":"100644","gitBlob":"c3011731429a32d9a961b3accf59f80f3bff0d9d"},{"path":"projects/06-node-red/claim-ledger.json","rawMode":"100644","gitBlob":"08ca0ee22e100f30582e529befeb713424eee43d"},{"path":"projects/06-node-red/demo.mjs","rawMode":"100644","gitBlob":"d07bc7ddbb1a3e9b39ec41abb02945b33cc0d46f"},{"path":"projects/06-node-red/provenance.json","rawMode":"100644","gitBlob":"660df255ce07a3f756d2863dc214a9953dd8add5"},{"path":"projects/06-node-red/rea-evidence-summary.json","rawMode":"100644","gitBlob":"845d87772080ad5198ab64f6a51f680abab49d91"},{"path":"projects/06-node-red/reconstruction.mjs","rawMode":"100644","gitBlob":"72fd498105dd027d272d1824d94f9e84bbdc10d8"},{"path":"projects/06-node-red/reproduce.mjs","rawMode":"100644","gitBlob":"4722409a873805d008295532785ded5f45456aa7"},{"path":"projects/06-node-red/run-history.json","rawMode":"100644","gitBlob":"152c284a06b184f3655f20ad95e5cf6f923bd8bd"},{"path":"projects/06-node-red/study.json","rawMode":"100644","gitBlob":"6a53984f4322de706b10bac9262513793ad6e823"},{"path":"projects/06-node-red/test-results.json","rawMode":"100644","gitBlob":"d9c13fc98f18f36185e61e1fe0dbedf3d570f142"},{"path":"projects/06-node-red/test.mjs","rawMode":"100644","gitBlob":"9a4b9d02db668a4833f85551385e95380c2070a1"},{"path":"projects/07-keepass/acquisition.json","rawMode":"100644","gitBlob":"f51a2975bad0206ddef57e67097ae126d716c811"},{"path":"projects/07-keepass/artifact-manifest.json","rawMode":"100644","gitBlob":"2a8af4b912d055c0b5c382a5865917f7f40d335a"},{"path":"projects/07-keepass/claims.json","rawMode":"100644","gitBlob":"06fd41aa0a6b7f179bb56de42d4ae97f40045d22"},{"path":"projects/07-keepass/study.json","rawMode":"100644","gitBlob":"3e6431b74f6a1b76efca4d6a5271f47b86bcec0d"},{"path":"projects/08-7zip/acquisition.json","rawMode":"100644","gitBlob":"1da7a2d46e4afe0219556d3e7f1ef35ec6a766bf"},{"path":"projects/08-7zip/artifact-manifest.json","rawMode":"100644","gitBlob":"714e610d68c1098151bff8b3523b05aad1686289"},{"path":"projects/08-7zip/claims.json","rawMode":"100644","gitBlob":"f13a49ea8f4a7320af1c1e54f67081535a070e7a"},{"path":"projects/08-7zip/study.json","rawMode":"100644","gitBlob":"e906884f2209332adaf9656a79c8b7d857617a0a"},{"path":"projects/09-restic/acquire.mjs","rawMode":"100644","gitBlob":"f8f9683ab4051e5ff2afbeab14f7cd8524b2bf3f"},{"path":"projects/09-restic/analyze.mjs","rawMode":"100644","gitBlob":"bf5f21952b3c0e7b984ff4eebe2973936cf7aacb"},{"path":"projects/09-restic/artifact-manifest.json","rawMode":"100644","gitBlob":"fcc2a0ea28836ac791380e49a58c2cdeeaaba850"},{"path":"projects/09-restic/harness-correction.json","rawMode":"100644","gitBlob":"e6200b064fcb5a0b9a6d01c7abb25343ecd9d746"},{"path":"projects/09-restic/rea-evidence-summary.json","rawMode":"100644","gitBlob":"7b66aa3ba8fdc44e6d08143191973ba8e99d5ac9"},{"path":"projects/09-restic/reconstruction.mjs","rawMode":"100644","gitBlob":"6ef9e7ed6f51602e555728fcc8a17feaa79d59f7"},{"path":"projects/09-restic/reference-manifest.json","rawMode":"100644","gitBlob":"bc6a54f8526bafab9e11088ef006a524e15c71c9"},{"path":"projects/09-restic/reproduce.mjs","rawMode":"100644","gitBlob":"89236e930106b9e223d0173e8e17a653b470a926"},{"path":"projects/09-restic/results.json","rawMode":"100644","gitBlob":"28b7f89e93efed2f8bcb9e05c58bdf1ed4ce23a2"},{"path":"projects/09-restic/study.json","rawMode":"100644","gitBlob":"2763fb93b2870da859e024751b4298c2e312109e"},{"path":"projects/10-rclone/acquire.mjs","rawMode":"100644","gitBlob":"f8f9683ab4051e5ff2afbeab14f7cd8524b2bf3f"},{"path":"projects/10-rclone/analyze.mjs","rawMode":"100644","gitBlob":"bf5f21952b3c0e7b984ff4eebe2973936cf7aacb"},{"path":"projects/10-rclone/artifact-manifest.json","rawMode":"100644","gitBlob":"fffc4e17155acfe7bceff36706ed6957664bcdec"},{"path":"projects/10-rclone/harness-correction.json","rawMode":"100644","gitBlob":"38bbd2413324544590c4e85bfe5dbe2004c6324a"},{"path":"projects/10-rclone/initial-counterexample.json","rawMode":"100644","gitBlob":"bd9fe7a940a5206f55257e10124a0efac51fe1ed"},{"path":"projects/10-rclone/rea-evidence-summary.json","rawMode":"100644","gitBlob":"1fd3446aeabe47041cea1c8ba41ecfe2774939c7"},{"path":"projects/10-rclone/reconstruction.mjs","rawMode":"100644","gitBlob":"7944c13dc1bb589b2bb267ac59da4a10f6db52df"},{"path":"projects/10-rclone/reference-manifest.json","rawMode":"100644","gitBlob":"fd1570874da18804ce5a77987e1d11dd52f568d6"},{"path":"projects/10-rclone/reproduce.mjs","rawMode":"100644","gitBlob":"9734e626490a8c5667a2a1eeeb7a74a6d4831ce5"},{"path":"projects/10-rclone/results.json","rawMode":"100644","gitBlob":"b8669b6932e3785558251da7f22b9ec45bd896b3"},{"path":"projects/10-rclone/study.json","rawMode":"100644","gitBlob":"9a019ee0df293502c60ef9b444c8db58a49c12d5"},{"path":"scripts/acquire-windows-release.mjs","rawMode":"100644","gitBlob":"a2f314ab35a3bf5cbb1306e09b4a812dd9fe9d6a"},{"path":"scripts/analyze-go-release.mjs","rawMode":"100644","gitBlob":"de6c1c387c55df2dfd4e6fee9253c9583e430f42"},{"path":"scripts/archive-native-metadata-diagnostic.mjs","rawMode":"100644","gitBlob":"51223920a74692c9592ee6fcbba20276539ce804"},{"path":"scripts/archive-native-metadata-trace.mjs","rawMode":"100644","gitBlob":"d8002cefd300822d848893550afc06f5673a6e91"},{"path":"scripts/audit-notes46-installed-delivery.mjs","rawMode":"100644","gitBlob":"dea2de021fdd8c0ed94d941fabaf942386ffbfeb"},{"path":"scripts/audit-proof-delivery.mjs","rawMode":"100644","gitBlob":"5225ce5f8a2d3a7486c1cef4af7e28dad274c6dd"},{"path":"scripts/editor-vault-proof-migration.mjs","rawMode":"100644","gitBlob":"6dfcbefa0a41a10cf77459de2a2762d0ec88dc58"},{"path":"scripts/historical-carrier-policy.mjs","rawMode":"100644","gitBlob":"db8c913879cfbe178608bf0738f24b67595c32f4"},{"path":"scripts/notes41-publication-source-view.mjs","rawMode":"100644","gitBlob":"86cb9155eff57b681f854759ec01fb825610789a"},{"path":"scripts/notes46-current-proof-dispatch.mjs","rawMode":"100644","gitBlob":"08e3a2da44f84eac9a922c5fa2c2f090875f76b4"},{"path":"scripts/notes46-current-validation-wire.mjs","rawMode":"100644","gitBlob":"e125bc5b0961a22e054996e4c2c8a77b1d900f37"},{"path":"scripts/notes46-current-validation-wire.test.mjs","rawMode":"100644","gitBlob":"c9c117092e1f942754cd6acedd54385acc84ba79"},{"path":"scripts/notes46-historical-input-root.mjs","rawMode":"100644","gitBlob":"f0719c8f5f90f323c1f6d890558238e227b82a22"},{"path":"scripts/notes46-historical-record-predicates.mjs","rawMode":"100644","gitBlob":"0cd912608dd1b4f6ed15de4e2a008440e36bc0fa"},{"path":"scripts/notes46-installed-source-controls.mjs","rawMode":"100644","gitBlob":"6d8cec4a8a161604d7dc4dd5da99be4eafdd0674"},{"path":"scripts/notes46-installed-source-view.mjs","rawMode":"100644","gitBlob":"293a98a10f551966b4404b533c7339eb5c60c7e1"},{"path":"scripts/notes46-publication-repeat-controls.mjs","rawMode":"100644","gitBlob":"a519d7cd391812bea514690ee6a6f8e7f8653592"},{"path":"scripts/publication-integrity-controls.mjs","rawMode":"100644","gitBlob":"ea0bcc631bdff3594e450d25658e094ab2785c7b"},{"path":"scripts/verify-archive-integration-records.mjs","rawMode":"100644","gitBlob":"84be476953b3efa569492848710bd8f19a4e3fd4"},{"path":"scripts/verify-cloud-publication.mjs","rawMode":"100644","gitBlob":"fab95c8bff5e76dd0aa2e992a8ad38bfcaffc0d6"},{"path":"scripts/verify-cloud-recovery-records.mjs","rawMode":"100644","gitBlob":"1aa79f3719afa444d2ef809bdcab89416cee44df"},{"path":"scripts/verify-editor-save-followup.mjs","rawMode":"100644","gitBlob":"6b09584d9a621e075b2ad5ab60d84724cc1b20da"},{"path":"scripts/verify-editor-value-api-followups.mjs","rawMode":"100644","gitBlob":"e12c8fc302af1e6100c0a3063a31949056aad57f"},{"path":"scripts/verify-followup-records.mjs","rawMode":"100644","gitBlob":"d757b2dbc0ffcf8cf5f9b916c38867fd3bb7a22d"},{"path":"scripts/verify-notes-inline-followups.mjs","rawMode":"100644","gitBlob":"480d66173ccab16e9caa82298f4b3c303008a76d"},{"path":"scripts/verify-notes-layout-value-api-checkpoint.mjs","rawMode":"100644","gitBlob":"cfe990f665ae9f49d29ebeb9c3dcf259a6b83d69"},{"path":"scripts/verify-notes-vault-followups.mjs","rawMode":"100644","gitBlob":"f87e4d4b2d80c58e316f93731010c823a48c8140"},{"path":"scripts/verify-notes46-publication.mjs","rawMode":"100644","gitBlob":"1144cbda82ab37db0683e995a48c7223778840f4"},{"path":"scripts/verify-records.mjs","rawMode":"100644","gitBlob":"6613cab2a19b4f43cbf4d0d5e7a77747569768de"},{"path":"scripts/verify-sketch-layout-followups.mjs","rawMode":"100644","gitBlob":"2c92303a892f0d5ec4796ce829037d68b59592a2"}];
const CTL_OPAQUE=[{"path":"products/rea-studio/apps/archive/fixtures/zstd/native-zip93.zip","bytes":427,"sha256":"e9282f76dbd3c080d0e12ef95489458523ebbc65c2951f4b8f3cb880a16c5d8b","rawMode":"100644","gitBlob":"b081db8c1ed2b9b2e2d6cd41ee5d9689e78ebd79"},{"path":"products/rea-studio/apps/archive/fixtures/zstd/native.tar.zst","bytes":631,"sha256":"7e5b29933b77431c8481499f01176058991db7036ad18e711e043218d37458a0","rawMode":"100644","gitBlob":"39cfe10042602f0d5baf327c27bb5e7f2ac5203d"},{"path":"products/rea-studio/apps/archive/fixtures/zstd/native.zst","bytes":311,"sha256":"9c4b8c03e5eb7932d349586ecf1e0f379bc021a543792dfb95fb6b5381b3f5ab","rawMode":"100644","gitBlob":"47dfa426c1ab464412e408d042b0462d88763846"},{"path":"products/rea-studio/apps/archive/fixtures/zstd/payload.bin","bytes":16416,"sha256":"b5b8d051cbbf49c16c0cf7e65fe35796601d64449d70938921b9bb368510721e","rawMode":"100644","gitBlob":"c6c10e5f020f323519aeb27e186fcc90ebf55db7"},{"path":"products/rea-studio/apps/notes/fixtures/pinned-joplin.jex","bytes":9728,"sha256":"044885c906ba7d8cb97a95fbdd6bc2323ba31a3c301e7ed1d6e592acec8944af","rawMode":"100644","gitBlob":"0c0b2c59c4e561ac62d4f84e8cebaa991dabae83"}];
const CTL_ROSTER=["products/rea-studio/apps/archive/app.integration.test.mjs","products/rea-studio/apps/archive/app.test.mjs","products/rea-studio/apps/archive/encoder.test.mjs","products/rea-studio/apps/archive/flat-extract-original.test.mjs","products/rea-studio/apps/archive/flat-extract-ui.test.mjs","products/rea-studio/apps/archive/flat-extract.test.mjs","products/rea-studio/apps/archive/formats.test.mjs","products/rea-studio/apps/archive/lzma.integration.test.mjs","products/rea-studio/apps/archive/lzma.test.mjs","products/rea-studio/apps/archive/sevenzip-aes-bounds.test.mjs","products/rea-studio/apps/archive/sevenzip-aes-container.test.mjs","products/rea-studio/apps/archive/sevenzip-aes-http.test.mjs","products/rea-studio/apps/archive/sevenzip-aes-original.test.mjs","products/rea-studio/apps/archive/sevenzip-aes-ui.test.mjs","products/rea-studio/apps/archive/sevenzip-aes.test.mjs","products/rea-studio/apps/archive/sevenzip.test.mjs","products/rea-studio/apps/archive/source-metadata.test.mjs","products/rea-studio/apps/archive/zip-aes-http.test.mjs","products/rea-studio/apps/archive/zip-aes-original.test.mjs","products/rea-studio/apps/archive/zip-aes-ui.test.mjs","products/rea-studio/apps/archive/zip-aes.test.mjs","products/rea-studio/apps/archive/zip.test.mjs","products/rea-studio/apps/archive/zstd.test.mjs","products/rea-studio/apps/automation/app.test.mjs","products/rea-studio/apps/automation/execution.test.mjs","products/rea-studio/apps/automation/http-boundary.test.mjs","products/rea-studio/apps/automation/native-client.test.mjs","products/rea-studio/apps/automation/native-http.test.mjs","products/rea-studio/apps/automation/native-server.test.mjs","products/rea-studio/apps/automation/native.test.mjs","products/rea-studio/apps/automation/routing-original.test.mjs","products/rea-studio/apps/automation/routing-recovery.test.mjs","products/rea-studio/apps/automation/routing.test.mjs","products/rea-studio/apps/backup/app.integration.test.mjs","products/rea-studio/apps/backup/app.test.mjs","products/rea-studio/apps/backup/capture-rabin-file.test.mjs","products/rea-studio/apps/backup/native-host-pack.test.mjs","products/rea-studio/apps/backup/native-key-failure.test.mjs","products/rea-studio/apps/backup/native-key-original.test.mjs","products/rea-studio/apps/backup/native-key.http.test.mjs","products/rea-studio/apps/backup/native-key.test.mjs","products/rea-studio/apps/backup/native-key.ui.test.mjs","products/rea-studio/apps/backup/native-small-mutation.test.mjs","products/rea-studio/apps/backup/native.test.mjs","products/rea-studio/apps/backup/rabin-original.test.mjs","products/rea-studio/apps/backup/rabin.test.mjs","products/rea-studio/apps/backup/restic-compression-review.test.mjs","products/rea-studio/apps/backup/restic-compression.test.mjs","products/rea-studio/apps/backup/restic-data-pack-ownership.test.mjs","products/rea-studio/apps/backup/restic-data-pack.test.mjs","products/rea-studio/apps/backup/restic-kdf-policy.test.mjs","products/rea-studio/apps/backup/restic-kdf.interop.test.mjs","products/rea-studio/apps/backup/restic-rabin-deadline.test.mjs","products/rea-studio/apps/backup/restic-rabin-lifecycle.test.mjs","products/rea-studio/apps/backup/restic-rabin-snapshot.test.mjs","products/rea-studio/apps/editor/app.integration.test.mjs","products/rea-studio/apps/editor/app.test.mjs","products/rea-studio/apps/editor/git.test.mjs","products/rea-studio/apps/editor/position-range-selection.test.mjs","products/rea-studio/apps/editor/save-publication.ui.test.mjs","products/rea-studio/apps/editor/save-review-adjacent.test.mjs","products/rea-studio/apps/editor/save-review-held.test.mjs","products/rea-studio/apps/editor/save-review-revision.test.mjs","products/rea-studio/apps/editor/search-pattern.integration.test.mjs","products/rea-studio/apps/editor/search-pattern.test.mjs","products/rea-studio/apps/editor/search-pattern.ui.test.mjs","products/rea-studio/apps/editor/sequence-diff.test.mjs","products/rea-studio/apps/editor/textarea-navigation.ui.test.mjs","products/rea-studio/apps/editor/workspace-search-path.test.mjs","products/rea-studio/apps/editor/workspace-search-review-held.test.mjs","products/rea-studio/apps/editor/workspace-search-review-path.test.mjs","products/rea-studio/apps/editor/workspace-search-review-ui.test.mjs","products/rea-studio/apps/editor/workspace-search.integration.test.mjs","products/rea-studio/apps/editor/workspace-search.test.mjs","products/rea-studio/apps/editor/workspace-search.ui.test.mjs","products/rea-studio/apps/flow/app.test.mjs","products/rea-studio/apps/flow/link-http.test.mjs","products/rea-studio/apps/flow/link-original.test.mjs","products/rea-studio/apps/flow/link-ui.test.mjs","products/rea-studio/apps/flow/native-link.test.mjs","products/rea-studio/apps/flow/native-original.test.mjs","products/rea-studio/apps/flow/native.test.mjs","products/rea-studio/apps/flow/normalization-boundaries.test.mjs","products/rea-studio/apps/flow/normalization-ui.test.mjs","products/rea-studio/apps/metrics/app.integration.test.mjs","products/rea-studio/apps/metrics/app.test.mjs","products/rea-studio/apps/metrics/grafana.integration.test.mjs","products/rea-studio/apps/metrics/grafana.test.mjs","products/rea-studio/apps/metrics/native-calculations.integration.test.mjs","products/rea-studio/apps/metrics/native-calculations.test.mjs","products/rea-studio/apps/notes/app.integration.test.mjs","products/rea-studio/apps/notes/app.test.mjs","products/rea-studio/apps/notes/draft-recovery.http.test.mjs","products/rea-studio/apps/notes/draft-recovery.test.mjs","products/rea-studio/apps/notes/draft-recovery.ui.test.mjs","products/rea-studio/apps/notes/jex.test.mjs","products/rea-studio/apps/notes/new-todo-original.test.mjs","products/rea-studio/apps/notes/new-todo.integration.test.mjs","products/rea-studio/apps/notes/new-todo.test.mjs","products/rea-studio/apps/notes/new-todo.ui.test.mjs","products/rea-studio/apps/notes/notebook-confirmation-cancel-open-note.ui.test.mjs","products/rea-studio/apps/notes/notebook-confirmation.ui.test.mjs","products/rea-studio/apps/notes/notebook-trash-fresh-boundaries.test.mjs","products/rea-studio/apps/notes/notebook-trash-publication-boundaries.test.mjs","products/rea-studio/apps/notes/notebook-trash-review.test.mjs","products/rea-studio/apps/notes/notebook-trash.integration.test.mjs","products/rea-studio/apps/notes/notebook-trash.test.mjs","products/rea-studio/apps/notes/notebook-trash.ui.test.mjs","products/rea-studio/apps/notes/notebooks.integration.test.mjs","products/rea-studio/apps/notes/notebooks.test.mjs","products/rea-studio/apps/notes/search-query-original.test.mjs","products/rea-studio/apps/notes/search-query.integration.test.mjs","products/rea-studio/apps/notes/search-query.test.mjs","products/rea-studio/apps/notes/search-query.ui.test.mjs","products/rea-studio/apps/notes/todo-original.test.mjs","products/rea-studio/apps/notes/todo.integration.test.mjs","products/rea-studio/apps/notes/todo.test.mjs","products/rea-studio/apps/notes/todo.ui.test.mjs","products/rea-studio/apps/sketch/app.test.mjs","products/rea-studio/apps/sketch/client.test.mjs","products/rea-studio/apps/sketch/geometry-client.test.mjs","products/rea-studio/apps/sketch/geometry.test.mjs","products/rea-studio/apps/sketch/layout-ui.test.mjs","products/rea-studio/apps/sketch/layout.test.mjs","products/rea-studio/apps/sketch/precision.test.mjs","products/rea-studio/apps/sketch/vendor-oracle.test.mjs","products/rea-studio/apps/sync/app.integration.test.mjs","products/rea-studio/apps/sync/app.test.mjs","products/rea-studio/apps/sync/native.integration.test.mjs","products/rea-studio/apps/sync/native.test.mjs","products/rea-studio/apps/sync/webdav-download-original.test.mjs","products/rea-studio/apps/sync/webdav-download.failure.test.mjs","products/rea-studio/apps/sync/webdav-download.http.test.mjs","products/rea-studio/apps/sync/webdav-download.test.mjs","products/rea-studio/apps/sync/webdav-download.ui.test.mjs","products/rea-studio/apps/sync/webdav.actions.test.mjs","products/rea-studio/apps/sync/webdav.client.test.mjs","products/rea-studio/apps/sync/webdav.integration.test.mjs","products/rea-studio/apps/sync/webdav.test.mjs","products/rea-studio/apps/sync/webdav.windows-path.test.mjs","products/rea-studio/apps/vault/app.integration.test.mjs","products/rea-studio/apps/vault/app.test.mjs","products/rea-studio/apps/vault/disposal-adjacent.test.mjs","products/rea-studio/apps/vault/draft-adjacent.test.mjs","products/rea-studio/apps/vault/group-active-controls.test.mjs","products/rea-studio/apps/vault/group-active-root-replay.test.mjs","products/rea-studio/apps/vault/group-coherence-boundaries.test.mjs","products/rea-studio/apps/vault/group-coherence-replay.test.mjs","products/rea-studio/apps/vault/group-edit-adjacent-replay.test.mjs","products/rea-studio/apps/vault/group-edit-correction-controls.test.mjs","products/rea-studio/apps/vault/group-edit-final-list-replay.test.mjs","products/rea-studio/apps/vault/group-edit-independent-persistence.test.mjs","products/rea-studio/apps/vault/group-edit-original.test.mjs","products/rea-studio/apps/vault/group-edit-server.test.mjs","products/rea-studio/apps/vault/group-edit-ui.test.mjs","products/rea-studio/apps/vault/group-edit.test.mjs","products/rea-studio/apps/vault/group-original.test.mjs","products/rea-studio/apps/vault/group-recycle.test.mjs","products/rea-studio/apps/vault/group-server.test.mjs","products/rea-studio/apps/vault/group-ui.test.mjs","products/rea-studio/apps/vault/history.test.mjs","products/rea-studio/apps/vault/http.test.mjs","products/rea-studio/apps/vault/idle-view.test.mjs","products/rea-studio/apps/vault/kdbx.interop.test.mjs","products/rea-studio/apps/vault/kdbx.test.mjs","products/rea-studio/apps/vault/preexisting-draft.test.mjs","products/rea-studio/apps/vault/recycle-boundaries.test.mjs","products/rea-studio/apps/vault/recycle-confirmation.test.mjs","products/rea-studio/apps/vault/recycle-controls.test.mjs","products/rea-studio/apps/vault/recycle-http.test.mjs","products/rea-studio/apps/vault/recycle-original.test.mjs","products/rea-studio/apps/vault/recycle-server.test.mjs","products/rea-studio/apps/vault/recycle-ui.test.mjs","products/rea-studio/apps/vault/recycle.test.mjs","products/rea-studio/apps/vault/same-editor-draft.test.mjs","products/rea-studio/apps/vault/selection-adjacent.test.mjs","products/rea-studio/apps/vault/selection-boundaries.test.mjs","products/rea-studio/apps/vault/selection-independent.test.mjs","products/rea-studio/apps/vault/ui.test.mjs","products/rea-studio/apps/vault/unknown-time.test.mjs","products/rea-studio/tests/host.test.mjs","products/rea-studio/tests/rabin-recorder.test.mjs","products/rea-studio/tests/sketch-collector.test.mjs","products/rea-studio/tests/sketch-layout-static-route.test.mjs"];

function ctlSha(bytes){return ctlCreateHash('sha256').update(bytes).digest('hex');}
function ctlBlob(bytes){return ctlCreateHash('sha1').update(Buffer.from('blob '+bytes.length+'\0','utf8')).update(bytes).digest('hex');}
function ctlCanonical(value){if(Array.isArray(value))return value.map(ctlCanonical);if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(key=>[key,ctlCanonical(value[key])]));return value;}
function ctlWire(value){return Buffer.from(JSON.stringify(ctlCanonical(value))+'\n','utf8');}
function ctlKeys(value,keys){ctlAssert(value&&typeof value==='object'&&!Array.isArray(value));ctlAssert.deepEqual(Object.keys(value).sort(),[...keys].sort());}
function ctlEnv(name,allowEmpty=false){const matches=Object.entries(process.env).filter(([key])=>key.toUpperCase()===name.toUpperCase());ctlAssert.equal(matches.length,1);const value=matches[0][1];ctlAssert.equal(typeof value,'string');ctlAssert(value.length<=32767&&(allowEmpty||value.length>0)&&!value.includes('\0'));return value;}
function ctlRelative(relative){ctlAssert.equal(typeof relative,'string');ctlAssert(relative.length>0&&relative.length<=1024&&!relative.includes('\\')&&!relative.includes(':')&&!relative.startsWith('/'));ctlAssert(relative.split('/').every(part=>part&&part!=='.'&&part!=='..'));return relative;}
function ctlWithin(root,relative){ctlRelative(relative);const file=ctlPath.resolve(root,...relative.split('/'));ctlAssert(file.startsWith(ctlPath.resolve(root)+ctlPath.sep));return file;}
function ctlDirectory(directory){ctlAssert(/^[A-Za-z]:\\/.test(directory));ctlAssert.equal(ctlPath.win32.normalize(directory),directory);let current=ctlPath.parse(directory).root;for(const part of directory.slice(current.length).split(ctlPath.sep).filter(Boolean)){current=ctlPath.join(current,part);ctlSubcheck('DIR_LSTAT');const st=ctlFs.lstatSync(current);ctlAssert(st.isDirectory()&&!st.isSymbolicLink());}ctlSubcheck('DIR_REALPATH');ctlAssert.equal(ctlFs.realpathSync(directory).toLowerCase(),directory.toLowerCase());return directory;}
function ctlAncestors(root,file){ctlSubcheck('ANCESTORS');ctlAssert(ctlPath.resolve(file).startsWith(ctlPath.resolve(root)+ctlPath.sep));let current=ctlPath.dirname(file);while(true){ctlDirectory(current);if(current===root)break;const next=ctlPath.dirname(current);ctlAssert.notEqual(next,current);current=next;}}
function ctlOrdinary(file,cap){ctlSubcheck('FILE_LSTAT');const before=ctlFs.lstatSync(file,{bigint:true});ctlSubcheck('FILE_TYPE_CAP');ctlAssert(before.isFile()&&!before.isSymbolicLink()&&before.size>=0n&&before.size<=BigInt(cap));ctlSubcheck('FILE_OPEN');const fd=ctlFs.openSync(file,'r');try{ctlSubcheck('FILE_FSTAT_OPEN');const opened=ctlFs.fstatSync(fd,{bigint:true});for(const key of ['dev','ino','mode','size','mtimeNs','birthtimeNs']){ctlSubcheck('FILE_CROSS_VIEW',key);ctlAssert.equal(typeof before[key],'bigint');ctlAssert.equal(opened[key],before[key]);}const bytes=Buffer.alloc(Number(before.size)+1);let used=0;ctlSubcheck('FILE_READ');while(used<bytes.length){const n=ctlFs.readSync(fd,bytes,used,bytes.length-used,null);if(!n)break;used+=n;}ctlSubcheck('FILE_READ_SIZE');ctlAssert.equal(used,Number(before.size));ctlSubcheck('FILE_FSTAT_AFTER');const finalFD=ctlFs.fstatSync(fd,{bigint:true});ctlSubcheck('FILE_LSTAT_AFTER');const after=ctlFs.lstatSync(file,{bigint:true});for(const key of ['dev','ino','mode','size','mtimeNs','ctimeNs','birthtimeNs']){ctlSubcheck('FILE_FD_STABILITY',key);ctlAssert.equal(finalFD[key],opened[key]);ctlSubcheck('FILE_PATH_STABILITY',key);ctlAssert.equal(after[key],before[key]);}return bytes.subarray(0,used);}finally{ctlFs.closeSync(fd);}}
function ctlExists(file){try{ctlFs.lstatSync(file);return true;}catch(error){if(error.code==='ENOENT')return false;throw error;}}
function ctlWriteNew(root,relative,bytes){const file=ctlWithin(root,relative);ctlAncestors(root,file);ctlFs.writeFileSync(file,bytes,{flag:'wx',mode:0o600});const actual=ctlOrdinary(file,Math.max(bytes.length,1));ctlAssert(actual.equals(bytes));return {bytes:bytes.length,sha256:ctlSha(actual)};}
function ctlJson(bytes,cap){ctlAssert(Buffer.isBuffer(bytes)&&bytes.length<=cap);const value=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));return value;}
function ctlError(error){return String(error&&error.stack||error).slice(0,8192);}

// BEGIN BOUNDED SHALLOW TREE METADATA V1. Builtin-only source fragment, not an entrypoint.
const CTL_META_LIMITS=Object.freeze({uniqueQueries:4096,prefixes:32768,entries:100000,depth:64,listingBytes:67108864,pathBytes:67108864,elapsedMs:60000});

const CTL_META_ERRORS=new Set(['META_INPUT','META_UTF8','META_NUL','META_ROW','META_NAME','META_DUPLICATE','META_ORDER','META_OID','META_CACHE','META_CYCLE','META_DEPTH','META_QUERIES','META_PREFIXES','META_ENTRIES','META_LISTING_BYTES','META_PATH_BYTES','META_TIME','META_CLOCK','META_COVERAGE']);

function ctlMetaRequire(value,code){
if(!value){
const error=new Error(code);
error.code=code;
throw error;
}}
function ctlMetaBasename(name){
ctlMetaRequire(typeof name==='string'&&name.length>0&&name.length<=1024&&name!=='.'&&name!=='..'&&!name.includes('/')&&!name.includes('\\')&&!name.includes(':')&&!name.includes('\0'),'META_NAME');
return name;
}
function ctlMetaParseTree(bytes,oid,tick=()=>{
}){

  ctlMetaRequire(Buffer.isBuffer(bytes)&&bytes.length<=4194304&&/^[0-9a-f]{40}$/.test(oid),'META_INPUT');

  let text;
try{text=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(bytes);
}
catch{ctlMetaRequire(false,'META_UTF8');
}
  ctlMetaRequire(text===''||text.endsWith('\0'),'META_NUL');

  const lines=text===''?[]:text.slice(0,-1).split('\0'),rows=[],names=new Set(),parts=[];
let previous=null;

  for(const line of lines){
tick();
ctlMetaRequire(line!=='','META_NUL');
const match=/^(040000 tree|100644 blob|100755 blob|120000 blob|160000 commit) ([0-9a-f]{40})\t([^]+)$/.exec(line);
ctlMetaRequire(match,'META_ROW');
const pair=match[1].split(' '),name=ctlMetaBasename(match[3]),nameBytes=Buffer.from(name,'utf8');
ctlMetaRequire(!names.has(name),'META_DUPLICATE');
names.add(name);
const sortName=pair[1]==='tree'?Buffer.concat([nameBytes,Buffer.from('/')]):nameBytes;
ctlMetaRequire(previous===null||Buffer.compare(previous,sortName)<0,'META_ORDER');
previous=sortName;
const rawMode=pair[0]==='040000'?'40000':pair[0];
parts.push(Buffer.from(rawMode+' ','ascii'),nameBytes,Buffer.from([0]),Buffer.from(match[2],'hex'));
rows.push(Object.freeze({name,rawMode:pair[0],type:pair[1],gitBlob:match[2]}));
}
  tick();
const payload=Buffer.concat(parts),actual=ctlCreateHash('sha1').update(Buffer.from('tree '+payload.length+'\0','ascii')).update(payload).digest('hex');
ctlMetaRequire(actual===oid,'META_OID');
return Object.freeze(rows);

}
function ctlMetaCached(cache,oid){
const record=cache.get(oid);
ctlMetaRequire(record&&record.oid===oid&&Object.isFrozen(record)&&Array.isArray(record.rows)&&Object.isFrozen(record.rows)&&record.rows.every(Object.isFrozen),'META_CACHE');
return record.rows;
}
function ctlMetaContext(limits=CTL_META_LIMITS,clock=()=>performance.now(),step=()=>{
}){

  for(const key of Object.keys(CTL_META_LIMITS))ctlMetaRequire(Number.isSafeInteger(limits[key])&&limits[key]>=0&&limits[key]<=CTL_META_LIMITS[key],'META_INPUT');

  const start=clock();
ctlMetaRequire(Number.isFinite(start),'META_CLOCK');
const stats={treeQueriesAttempted:0,returnedBufferResponses:0,nonBufferFetchResults:0,authenticatedUniqueTrees:0,cachedUniqueTrees:0,cacheHitDirectoryExpansions:0,expandedDirectoryPrefixes:0,expandedImmediateRows:0,flattenedLeaves:0,fetchedListingBytes:0,cachedImmediateRows:0,expandedPathUTF8Bytes:0,elapsedAtLastBudgetCheckMs:0,completed:false,failureCode:null};

  const context={limits,clock,step,start,lastNow:start,stats,leaves:new Map(),prefixes:new Set()};

  context.tick=()=>{
const now=clock();
ctlMetaRequire(Number.isFinite(now)&&now>=context.lastNow,'META_CLOCK');
context.lastNow=now;
stats.elapsedAtLastBudgetCheckMs=Math.ceil(now-start);
ctlMetaRequire(now-start<=limits.elapsedMs,'META_TIME');
};
return context;

}
function ctlMetaExpand(context,rootOID,prefix,resolve){

  const {stats,limits}=context;
ctlMetaRequire(typeof prefix==='string'&&prefix.length>0&&prefix.length<=1024&&!prefix.includes('\\')&&!prefix.includes(':')&&!prefix.startsWith('/')&&prefix.split('/').every(part=>part&&part!=='.'&&part!=='..'),'META_NAME');
stats.expandedPathUTF8Bytes=Buffer.byteLength(prefix,'utf8');
ctlMetaRequire(stats.expandedPathUTF8Bytes<=limits.pathBytes,'META_PATH_BYTES');

  function visit(oid,path,depth,active){
context.tick();
ctlMetaRequire(/^[0-9a-f]{40}$/.test(oid),'META_INPUT');
ctlMetaRequire(depth<=limits.depth,'META_DEPTH');
ctlMetaRequire(!active.has(oid),'META_CYCLE');
ctlMetaRequire(!context.prefixes.has(path),'META_DUPLICATE');
ctlMetaRequire(stats.expandedDirectoryPrefixes<limits.prefixes,'META_PREFIXES');
context.prefixes.add(path);
stats.expandedDirectoryPrefixes++;
const nextActive=new Set(active);
nextActive.add(oid);
const rows=resolve(oid);
context.tick();
for(const row of rows){
context.tick();
ctlMetaRequire(stats.expandedImmediateRows<limits.entries,'META_ENTRIES');
const ordinal=stats.expandedImmediateRows++;
context.step('EXPAND',ordinal);
const name=ctlMetaBasename(row.name),full=path+'/'+name;
ctlMetaRequire(full.length<=1024,'META_NAME');
stats.expandedPathUTF8Bytes+=Buffer.byteLength(full,'utf8');
ctlMetaRequire(stats.expandedPathUTF8Bytes<=limits.pathBytes,'META_PATH_BYTES');
if(row.type==='tree'){
ctlMetaRequire(row.rawMode==='040000','META_ROW');
visit(row.gitBlob,full,depth+1,nextActive);
}
else{ctlMetaRequire((row.type==='blob'&&['100644','100755','120000'].includes(row.rawMode))||(row.type==='commit'&&row.rawMode==='160000'),'META_ROW');
ctlMetaRequire(/^[0-9a-f]{40}$/.test(row.gitBlob)&&!context.leaves.has(full),'META_DUPLICATE');
context.leaves.set(full,{rawMode:row.rawMode,type:row.type,gitBlob:row.gitBlob});
stats.flattenedLeaves++;
}}context.tick();
}
  visit(rootOID,prefix,0,new Set());
context.tick();
return context.leaves;

}
function ctlMetaCollect(rootOID,load,limits=CTL_META_LIMITS,clock=()=>performance.now(),step=()=>{
},finish=()=>{
}){

  const context=ctlMetaContext(limits,clock,step),cache=new Map();
let completed=false;

  try{const resolve=oid=>{
context.tick();
if(cache.has(oid)){
context.stats.cacheHitDirectoryExpansions++;
return ctlMetaCached(cache,oid);
}ctlMetaRequire(context.stats.treeQueriesAttempted<limits.uniqueQueries,'META_QUERIES');
ctlMetaRequire(limits.elapsedMs-context.stats.elapsedAtLastBudgetCheckMs>=5000,'META_TIME');
const queryOrdinal=context.stats.treeQueriesAttempted++;
step('FETCH',queryOrdinal);
const bytes=load(oid);
if(Buffer.isBuffer(bytes)){
context.stats.returnedBufferResponses++;
context.stats.fetchedListingBytes+=bytes.length;
}
else context.stats.nonBufferFetchResults++;
context.tick();
ctlMetaRequire(Buffer.isBuffer(bytes),'META_INPUT');
ctlMetaRequire(context.stats.fetchedListingBytes<=limits.listingBytes,'META_LISTING_BYTES');
step('PARSE',queryOrdinal);
const rows=ctlMetaParseTree(bytes,oid,context.tick);
context.stats.authenticatedUniqueTrees++;
context.tick();
cache.set(oid,Object.freeze({oid,rows}));
context.stats.cachedUniqueTrees++;
context.stats.cachedImmediateRows+=rows.length;
return rows;
};
const leaves=ctlMetaExpand(context,rootOID,'products/rea-studio',resolve);
context.tick();
completed=true;
return leaves;
}
catch(error){
context.stats.failureCode=error&&CTL_META_ERRORS.has(error.code)?error.code:'META_FETCH_OR_UNEXPECTED';
throw error;
}
finally{context.stats.completed=completed;
finish(Object.freeze({schema:'rea-vault-bounded-shallow-tree-pass/v1',...context.stats}));
}
}
function ctlMetaTraceNew(){
return {totalCalls:0,nativeResultSuccessfulCalls:0,nativeResultFailedCalls:0,stdoutKnownBufferBytes:0,stderrKnownBufferBytes:0,stdoutNonBufferCalls:0,stderrNonBufferCalls:0,first:[],last:[]};
}
function ctlMetaTraceAdd(trace,record,passed){
ctlMetaRequire(typeof passed==='boolean'&&Number.isSafeInteger(trace.totalCalls)&&trace.totalCalls>=0,'META_INPUT');
const row=Object.freeze({...record,callOrdinal:trace.totalCalls,nativeResultPassed:passed});
trace.totalCalls++;
for(const stream of ['stdout','stderr']){
if(record[stream+'Buffer']===true&&Number.isSafeInteger(record[stream+'Bytes'])&&record[stream+'Bytes']>=0)trace[stream+'KnownBufferBytes']+=record[stream+'Bytes'];
else trace[stream+'NonBufferCalls']++;
ctlMetaRequire(Number.isSafeInteger(trace[stream+'KnownBufferBytes']),'META_INPUT');
}if(passed)trace.nativeResultSuccessfulCalls++;
else trace.nativeResultFailedCalls++;
if(row.callOrdinal<16)trace.first.push(row);
else{trace.last.push(row);
if(trace.last.length>48)trace.last.shift();
}
return row.callOrdinal;
}
function ctlMetaTraceView(trace){
const retained=Object.freeze([...trace.first,...trace.last]),successful=retained.filter(row=>row.nativeResultPassed).length,failed=retained.length-successful,omittedSuccess=trace.nativeResultSuccessfulCalls-successful,omittedFailure=trace.nativeResultFailedCalls-failed;
return Object.freeze({schema:'rea-vault-bounded-git-trace/v1',retention:'first16-plus-last48',totalCalls:trace.totalCalls,retainedCalls:retained.length,nativeResultSuccessfulCalls:trace.nativeResultSuccessfulCalls,nativeResultFailedCalls:trace.nativeResultFailedCalls,omittedNativeResultSuccessfulCalls:omittedSuccess,omittedNativeResultFailedCalls:omittedFailure,completeTrace:omittedSuccess+omittedFailure===0,lastGlobalCallOrdinal:trace.totalCalls?trace.totalCalls-1:null,stdoutKnownBufferBytes:trace.stdoutKnownBufferBytes,stderrKnownBufferBytes:trace.stderrKnownBufferBytes,stdoutNonBufferCalls:trace.stdoutNonBufferCalls,stderrNonBufferCalls:trace.stderrNonBufferCalls,byteTotalScope:'sum of known Buffer lengths across ALL calls; nonbuffer lengths unknown and separately counted',records:retained});
}
function ctlMetaCoverage(rows,expected){
const seen=new Set();
for(const row of rows){
ctlMetaRequire(expected.has(row)&&!seen.has(row),'META_COVERAGE');
seen.add(row);
}ctlMetaRequire(seen.size===expected.size&&[...expected].every(name=>seen.has(name)),'META_COVERAGE');
return true;
}
function ctlRunMetadataControls(){

  const cases=[],empty='4b825dc642cb6eb9a060e54bf8d69288fbee4904',leaf='c3e9a1be62045cc8f6333d0314b8b8b636137dfa',mixed='14584e4767d32dd7536713b07899f8e14e47c5aa',dag='8730f0eae3d33b51634a21a7d957136085b6b6b6';

  const leafBytes=Buffer.from('100644 blob '+'1'.repeat(40)+'\ta.mjs\0','utf8'),mixedBytes=Buffer.from('100644 blob '+'2'.repeat(40)+'\ta.c\0'+'040000 tree '+empty+'\ta\0','utf8'),dagBytes=Buffer.from('040000 tree '+leaf+'\tleft\0'+'040000 tree '+leaf+'\tright\0','utf8');

  const fixture=new Map([[empty,Buffer.alloc(0)],[leaf,leafBytes],[mixed,mixedBytes],[dag,dagBytes]]),limits=changes=>({...CTL_META_LIMITS,...changes}),reject=(fn,code)=>{
try{fn();
return false;
}
catch(error){
return error&&error.code===code;
}},run=(id,expectedClass,fn)=>{
let passed=false;
try{passed=fn()===true;
}
catch{}cases.push(Object.freeze({id,expectedClass,passed}));
},collect=(oid,change={},clock=()=>0,load=key=>fixture.get(key),finish=()=>{
})=>ctlMetaCollect(oid,load,limits(change),clock,()=>{
},finish);

  run('EMPTY_TREE_AUTHENTICATED','PASS',()=>ctlMetaParseTree(Buffer.alloc(0),empty).length===0);

  run('MIXED_GIT_ORDER_AND_HASH','PASS',()=>ctlMetaParseTree(mixedBytes,mixed).length===2);

  run('INVALID_UTF8','META_UTF8',()=>reject(()=>ctlMetaParseTree(Buffer.from([0xff]),leaf),'META_UTF8'));

  run('BOM_NOT_NORMALIZED','META_ROW',()=>reject(()=>ctlMetaParseTree(Buffer.concat([Buffer.from([0xef,0xbb,0xbf]),leafBytes]),leaf),'META_ROW'));

  run('FINAL_NUL_REQUIRED','META_NUL',()=>reject(()=>ctlMetaParseTree(leafBytes.subarray(0,-1),leaf),'META_NUL'));

  run('INTERIOR_EMPTY_ROW','META_NUL',()=>reject(()=>ctlMetaParseTree(Buffer.concat([leafBytes,Buffer.from([0])]),leaf),'META_NUL'));

  run('MODE_TYPE_PAIR_REJECTED','META_ROW',()=>reject(()=>ctlMetaParseTree(Buffer.from(leafBytes.toString('utf8').replace('100644 blob','040000 blob'),'utf8'),leaf),'META_ROW'));

  run('MALFORMED_OID','META_INPUT',()=>reject(()=>ctlMetaParseTree(leafBytes,'x'.repeat(40)),'META_INPUT'));

  run('BASENAME_PATH_REJECTED','META_NAME',()=>reject(()=>ctlMetaParseTree(Buffer.from(leafBytes.toString('utf8').replace('a.mjs','a/b.mjs'),'utf8'),leaf),'META_NAME'));

  run('DUPLICATE_NAME','META_DUPLICATE',()=>reject(()=>ctlMetaParseTree(Buffer.concat([leafBytes,leafBytes]),leaf),'META_DUPLICATE'));

  run('NONCANONICAL_GIT_ORDER','META_ORDER',()=>reject(()=>ctlMetaParseTree(Buffer.from('040000 tree '+empty+'\ta\0'+'100644 blob '+'2'.repeat(40)+'\ta.c\0','utf8'),mixed),'META_ORDER'));

  run('WRONG_TREE_OID','META_OID',()=>reject(()=>ctlMetaParseTree(leafBytes,empty),'META_OID'));

  run('COMPLETE_ROW_TRUNCATION','META_OID',()=>reject(()=>ctlMetaParseTree(Buffer.from('100644 blob '+'2'.repeat(40)+'\ta.c\0','utf8'),mixed),'META_OID'));

  run('WRONG_CACHED_OID','META_CACHE',()=>reject(()=>ctlMetaCached(new Map([[leaf,Object.freeze({oid:empty,rows:Object.freeze([])})]]),leaf),'META_CACHE'));

  run('SHARED_TREE_ALL_PREFIXES_ONE_FETCH','PASS',()=>{
let fetches=0,snapshot;
const map=collect(dag,{},()=>0,key=>{
fetches++;
return fixture.get(key);
},value=>{
snapshot=value;
});
return fetches===2&&snapshot.authenticatedUniqueTrees===2&&snapshot.cacheHitDirectoryExpansions===1&&snapshot.expandedDirectoryPrefixes===3&&snapshot.expandedImmediateRows===4&&map.size===2&&map.has('products/rea-studio/left/a.mjs')&&map.has('products/rea-studio/right/a.mjs');
});

  run('EMPTY_TREE_NO_LEAF_OR_FS_EXPECTATION','PASS',()=>collect(empty).size===0);

  run('DECODED_GRAPH_ACTIVE_CYCLE','META_CYCLE',()=>reject(()=>{
const context=ctlMetaContext(limits({}),()=>0);
ctlMetaExpand(context,leaf,'products/rea-studio',()=>[Object.freeze({name:'loop',rawMode:'040000',type:'tree',gitBlob:leaf})]);
},'META_CYCLE'));

  run('DEPTH_BUDGET','META_DEPTH',()=>reject(()=>collect(dag,{depth:0}),'META_DEPTH'));

  run('UNIQUE_QUERY_BUDGET','META_QUERIES',()=>reject(()=>collect(dag,{uniqueQueries:1}),'META_QUERIES'));

  run('PREFIX_EXPANSION_BUDGET','META_PREFIXES',()=>reject(()=>collect(dag,{prefixes:2}),'META_PREFIXES'));

  run('ALL_CHILD_ROWS_BUDGET','META_ENTRIES',()=>reject(()=>collect(dag,{entries:3}),'META_ENTRIES'));

  run('AGGREGATE_LISTING_BYTES','META_LISTING_BYTES',()=>reject(()=>collect(leaf,{listingBytes:leafBytes.length-1}),'META_LISTING_BYTES'));

  run('EXPANDED_PATH_BYTES','META_PATH_BYTES',()=>reject(()=>collect(leaf,{pathBytes:1}),'META_PATH_BYTES'));

  run('FETCH_POST_ELAPSED_BUDGET','META_TIME',()=>{
let clock=0,snapshot;
const rejected=reject(()=>collect(leaf,{},()=>clock,key=>{
clock=60001;
return fixture.get(key);
},value=>{
snapshot=value;
}),'META_TIME');
return rejected&&snapshot.treeQueriesAttempted===1&&snapshot.returnedBufferResponses===1&&snapshot.fetchedListingBytes===leafBytes.length&&snapshot.authenticatedUniqueTrees===0&&snapshot.cachedUniqueTrees===0&&!snapshot.completed;
});

  run('QUERY_REQUIRES_FIVE_SECONDS','META_TIME',()=>reject(()=>collect(leaf,{elapsedMs:4999}),'META_TIME'));

  run('CLOCK_REGRESSION','META_CLOCK',()=>{
let clock=1;
return reject(()=>collect(leaf,{},()=>clock,key=>{
clock=0;
return fixture.get(key);
}),'META_CLOCK');
});

  run('ONE_LISTING_CAP','META_INPUT',()=>reject(()=>ctlMetaParseTree(Buffer.alloc(4194305),leaf),'META_INPUT'));

  const outside=CTL_PRODUCT_ROWS.filter(row=>!row.path.startsWith('products/rea-studio/')).map(row=>row.path),expected=new Set(outside);

  run('EXACT_121_COVERAGE','PASS',()=>outside.length===121&&ctlMetaCoverage(outside,expected));

  run('MISSING_OUTSIDE_PATH','META_COVERAGE',()=>reject(()=>ctlMetaCoverage(outside.slice(1),expected),'META_COVERAGE'));

  run('EXTRA_OUTSIDE_PATH','META_COVERAGE',()=>reject(()=>ctlMetaCoverage([...outside,'unlisted.mjs'],expected),'META_COVERAGE'));

  run('DUPLICATE_OUTSIDE_PATH','META_COVERAGE',()=>reject(()=>ctlMetaCoverage([...outside,outside[0]],expected),'META_COVERAGE'));

  run('CROSS_SCOPE_OUTSIDE_PATH','META_COVERAGE',()=>reject(()=>ctlMetaCoverage([...outside.slice(1),'products/rea-studio/unlisted.mjs'],expected),'META_COVERAGE'));

  run('TRACE_65_GLOBAL_ORDINAL','PASS',()=>{
const trace=ctlMetaTraceNew();
for(let index=0;
index<65;
index++)ctlMetaTraceAdd(trace,{test:true},index!==64);
const view=ctlMetaTraceView(trace);
return view.totalCalls===65&&view.retainedCalls===64&&!view.completeTrace&&view.records[15].callOrdinal===15&&view.records[16].callOrdinal===17&&view.lastGlobalCallOrdinal===64&&view.omittedNativeResultSuccessfulCalls===1&&view.omittedNativeResultFailedCalls===0&&view.nativeResultFailedCalls===1;
});

  run('TRACE_200_OMITTED_FAILURE_COUNTS','PASS',()=>{
const trace=ctlMetaTraceNew();
for(let index=0;
index<200;
index++)ctlMetaTraceAdd(trace,{test:true},index!==20&&index!==199);
const view=ctlMetaTraceView(trace);
return view.totalCalls===200&&view.retainedCalls===64&&view.records[16].callOrdinal===152&&view.records.at(-1).callOrdinal===199&&view.lastGlobalCallOrdinal===199&&view.omittedNativeResultSuccessfulCalls===135&&view.omittedNativeResultFailedCalls===1&&view.nativeResultFailedCalls===2;
});

  run('CLOCK_REGRESSION_ABOVE_START','META_CLOCK',()=>{
let sample=0;
const context=ctlMetaContext(limits({}),()=>sample);
sample=100;
context.tick();
sample=50;
return reject(()=>context.tick(),'META_CLOCK');
});

  run('TRACE_AGGREGATE_STDIO_ACCOUNTING','PASS',()=>{
const trace=ctlMetaTraceNew();
for(let index=0;
index<200;
index++)ctlMetaTraceAdd(trace,{stdoutBuffer:true,stdoutBytes:3,stderrBuffer:index%2===0,stderrBytes:index%2===0?2:null},true);
const view=ctlMetaTraceView(trace);
return view.retainedCalls===64&&view.stdoutKnownBufferBytes===600&&view.stderrKnownBufferBytes===200&&view.stdoutNonBufferCalls===0&&view.stderrNonBufferCalls===100;
});

  return Object.freeze({schema:'rea-vault-pure-metadata-controls/v1',controls:cases.length,failedChecks:cases.filter(row=>!row.passed).length,cases:Object.freeze(cases),actualGitCalls:0,actualTraversalCacheShared:false,productOrNativeExecution:false,cycleControlScope:'lower-level injected decoded graph; not an authenticated Git hash cycle',fixtureOIDProvenance:'fixed independently framed ordinary metadata identities'});

}
// END BOUNDED SHALLOW TREE METADATA V1.

const ctlSourceGateIDs=new Set(['HEAD_SHA','SOLE_PARENT','PARENT_HEADER','PARENT_PARENT','PARENT_TREE','STUDIO_TREE','HEAD_TREE','EXACT_TWO_ADDITIONS','PARENT_PATH_ABSENT','WORKFLOW_METADATA','WORKFLOW_COUNTS','WORKFLOW_DISK_NAMES','WORKFLOW_BODY','METADATA_CONTROLS','PRODUCT_SHALLOW_TRAVERSAL','OUTSIDE_BATCH_METADATA','OUTSIDE_BATCH_PARSE','SELECTED_IDENTITIES','SELECTED_CANONICAL','ROSTER_CANONICAL','SELECTED_COUNTS','PRODUCT_INVENTORY','SELECTED_BODIES','SELECTED_BODY_COUNT','SUPPLEMENT_IDENTITY','SUPPLEMENT_BODY','INDEX_BODY','CONFIG_BODY','REF_SNAPSHOT','SOURCE_COMPLETE']);
const ctlSourceSubIDs=new Set(['GIT_ALLOWED_COMMAND','GIT_SPAWN','GIT_RESULT','GIT_UTF8','ANCESTORS','DIR_LSTAT','DIR_REALPATH','FILE_LSTAT','FILE_TYPE_CAP','FILE_OPEN','FILE_FSTAT_OPEN','FILE_CROSS_VIEW','FILE_READ','FILE_READ_SIZE','FILE_FSTAT_AFTER','FILE_LSTAT_AFTER','FILE_FD_STABILITY','FILE_PATH_STABILITY','BODY_GITBLOB','CONTROLLER_SHA256','INVENTORY_DIR','INVENTORY_ENTRY','SUPPLEMENT_LENGTH','SUPPLEMENT_BLOB','SUPPLEMENT_SHA256','META_FETCH','META_PARSE','META_EXPAND',...CTL_META_ERRORS]);
const ctlSourceProperties=new Set(['dev','ino','mode','size','mtimeNs','ctimeNs','birthtimeNs']);
const ctlSourceGitTrace=ctlMetaTraceNew();
const ctlSourceDiagnostics={schema:'rea-vault-closed-source-checkpoints/v2',ordinalBase:0,phase:null,checkpoint:null,rowOrdinal:null,subcheck:null,property:null,checkpointEntries:0,gitCalls:[],gitTrace:null,failures:[],rawPathsPublished:false,rawOutputOrErrorsPublished:false};
let ctlSourceGuardRunning=false;
function ctlSourceActive(){return ctlSourceGuardRunning&&(ctlStage==='SOURCE_BEFORE'||ctlStage==='SOURCE_AFTER');}
function ctlCheckpoint(id){ctlAssert(ctlSourceGateIDs.has(id));if(!ctlSourceActive())return;ctlSourceDiagnostics.phase=ctlStage;ctlSourceDiagnostics.checkpoint=id;ctlSourceDiagnostics.rowOrdinal=null;ctlSourceDiagnostics.subcheck=null;ctlSourceDiagnostics.property=null;ctlSourceDiagnostics.checkpointEntries++;ctlAssert(ctlSourceDiagnostics.checkpointEntries<=128);}
function ctlRow(ordinal){if(!ctlSourceActive())return;ctlAssert(Number.isSafeInteger(ordinal)&&ordinal>=0&&ordinal<=100000);ctlSourceDiagnostics.rowOrdinal=ordinal;ctlSourceDiagnostics.subcheck=null;ctlSourceDiagnostics.property=null;}
function ctlSubcheck(id,property=null){if(!ctlSourceActive())return;ctlAssert(ctlSourceSubIDs.has(id));ctlAssert(property===null||ctlSourceProperties.has(property));ctlSourceDiagnostics.subcheck=id;ctlSourceDiagnostics.property=property;}
function ctlGitErrorClass(error){if(!error)return 'NONE';const code=error.code;return code==='ENOBUFS'?'BUFFER_LIMIT':code==='ETIMEDOUT'?'TIMEOUT':code==='ENOENT'?'NOT_FOUND':code==='EACCES'||code==='EPERM'?'ACCESS_DENIED':'OTHER';}
function ctlGitDiagnostic(args,result,error=null){const stdout=result&&Buffer.isBuffer(result.stdout)?result.stdout:null,stderr=result&&Buffer.isBuffer(result.stderr)?result.stderr:null;const passed=Boolean(result&&!result.error&&result.status===0&&result.signal===null&&stdout!==null&&stderr!==null&&stderr.length===0);ctlMetaTraceAdd(ctlSourceGitTrace,{phase:ctlSourceActive()?ctlStage:null,checkpoint:ctlSourceDiagnostics.checkpoint,rowOrdinal:ctlSourceDiagnostics.rowOrdinal,command:['rev-parse','rev-list','cat-file','diff','ls-tree','show-ref'].includes(args[0])?args[0]:'OTHER',spawnErrorClass:ctlGitErrorClass(error||(result&&result.error)),status:result&&Number.isInteger(result.status)?result.status:null,signalPresent:Boolean(result&&result.signal!==null),stdoutBuffer:stdout!==null,stderrBuffer:stderr!==null,stdoutBytes:stdout?stdout.length:null,stderrBytes:stderr?stderr.length:null,timeoutMs:5000,maxBufferBytes:4194304},passed);}
function ctlCaptureSourceFailure(stage){if(stage!=='SOURCE_BEFORE'&&stage!=='SOURCE_AFTER')return;ctlAssert(ctlSourceDiagnostics.failures.length<2);const view=ctlMetaTraceView(ctlSourceGitTrace),last=view.records.at(-1);ctlSourceDiagnostics.failures.push({phase:stage,checkpoint:ctlSourceDiagnostics.checkpoint,rowOrdinal:ctlSourceDiagnostics.rowOrdinal,subcheck:ctlSourceDiagnostics.subcheck,property:ctlSourceDiagnostics.property,lastGitCallOrdinal:view.lastGlobalCallOrdinal,lastGitNativeResultPassed:last?last.nativeResultPassed:null});}

let ctlStage='PLATFORM',ctlSubject=null,ctlRepository=null,ctlOwned=null,ctlEnvironment=null,ctlGitState=null,ctlVendor=null,ctlVendorAcquisitionAttempted=false,ctlVendorAcquisitionCleanupComplete=null;
const ctlDetails={stage:'PLATFORM',errors:[],execution:null,observation:null,cleanup:null};
const ctlReport={schema:'rea-vault-focused-http-native-report/v5',status:'not-started',subject:null,platform:null,sourceBefore:null,sourceAfter:null,sourceGateDiagnostics:ctlSourceDiagnostics,sourceMetadataControls:null,sourceMetadataTraversal:{before:null,after:null},sourceMetadataPolicy:{schema:'rea-vault-consumed-source-metadata-policy/v1',scope:'complete-pinned-studio-subtree-plus-selected-outside-paths',pinnedStudioTree:CTL_STUDIO_TREE,selectedOutsidePaths:121,outsideBatchPathCap:32,outsideBatchCount:4,perQueryMaxBufferBytes:4194304,perQueryTimeoutMs:5000,oversizedQueryFailsClosed:true,traversalMethod:'authenticated-bounded-shallow-tree-cache',traversalLimits:CTL_META_LIMITS,elapsedBudgetIsNotHardInterrupt:true,subtreeQuerySizeFitAssumed:false,irrelevantOutsideMetadataEnumerated:false},reportRoot:null,privateProtocolDiagnostics:null,environment:null,vendor:null,module:null,TAP:null,observation:null,cleanup:null,privateExport:null,stages:[],runtimeAssertionsPassed:false,privatePortableRecoveryQualified:false,scopedApplicationHTTPNativeAcceptance:false,productAcceptance:false,semanticAcceptance:false,fullParity:false,superiority:false,allTenComplete:false,R3CauseProven:false,full184SuiteExecuted:false,full40MinuteLimitChanged:false,rawErrorsPublished:false,rawTAPPublished:false,rawNativeOutputPublished:false,rawEnvironmentValuesPublished:false,privateKeyAccessed:false};
function ctlNote(stage,passed){ctlReport.stages.push({stage,passed});}
function ctlPlatform(){ctlAssert.equal(process.platform,'win32');ctlAssert.equal(process.arch,'x64');ctlAssert.equal(process.version,'v24.16.0');ctlAssert.equal(process.release.name,'node');ctlAssert.equal(typeof ctlCrypto.argon2,'function');for(const [name,value] of Object.entries({CI:'true',GITHUB_ACTIONS:'true',RUNNER_ENVIRONMENT:'github-hosted',RUNNER_OS:'Windows',RUNNER_ARCH:'X64',ImageOS:'win22',GITHUB_REPOSITORY:CTL_REPOSITORY,GITHUB_EVENT_NAME:'push',GITHUB_REF:CTL_BRANCH,GITHUB_JOB:CTL_JOB,REA_VAULT_FOCUSED_RUN_SCOPE:'original-two-http-and-history-oracle-only'}))ctlAssert.equal(ctlEnv(name),value);ctlAssert.equal(ctlEnv('NODE_OPTIONS',true),'');ctlAssert.equal(ctlEnv('NODE_PATH',true),'');ctlAssert.equal(ctlEnv('GITHUB_WORKFLOW_REF'),CTL_REPOSITORY+'/'+CTL_WORKFLOW+'@'+CTL_BRANCH);const source=ctlEnv('GITHUB_SHA'),run=ctlEnv('GITHUB_RUN_ID'),attempt=ctlEnv('GITHUB_RUN_ATTEMPT');ctlAssert(/^[0-9a-f]{40}$/.test(source));ctlAssert(/^[1-9][0-9]*$/.test(run)&&/^[1-9][0-9]*$/.test(attempt));const repo=ctlDirectory(ctlPath.resolve(ctlEnv('GITHUB_WORKSPACE'))),runnerTemp=ctlDirectory(ctlPath.resolve(ctlEnv('RUNNER_TEMP'))),toolcache=ctlDirectory(ctlPath.resolve(ctlEnv('RUNNER_TOOL_CACHE')));ctlAssert.equal(ctlPath.resolve(ctlFileURLToPath(import.meta.url)).toLowerCase(),ctlWithin(repo,CTL_SCRIPT).toLowerCase());const node=ctlPath.join(toolcache,'node','24.16.0','x64','node.exe');ctlAssert.equal(process.execPath.toLowerCase(),node.toLowerCase());ctlAncestors(toolcache,node);const nst=ctlFs.lstatSync(node);ctlAssert(nst.isFile()&&!nst.isSymbolicLink());ctlAssert.equal(ctlFs.realpathSync(node).toLowerCase(),node.toLowerCase());ctlAssert(ctlOs.release().startsWith('10.0.20348'));return {repo,runnerTemp,node,source,run,attempt,public:{os:'Windows',arch:'X64',imageOS:'win22',hosted:true,node:'24.16.0',exactNodeLocationVerified:true,expectedServer2022KernelFamily:true}};}
function ctlGit(args,raw=false){ctlSubcheck('GIT_ALLOWED_COMMAND');ctlAssert(['rev-parse','rev-list','cat-file','diff','ls-tree','show-ref'].includes(args[0]));let result;ctlSubcheck('GIT_SPAWN');try{result=ctlSpawnSync('C:/Program Files/Git/cmd/git.exe',['--no-replace-objects','-c','core.fsmonitor=false','-c','core.hooksPath=NUL','-c','protocol.allow=never',...args],{cwd:ctlRepository,env:ctlEnvironment.git,shell:false,windowsHide:true,encoding:'buffer',timeout:5000,maxBuffer:4194304});}catch(error){ctlGitDiagnostic(args,null,error);throw error;}ctlGitDiagnostic(args,result);ctlSubcheck('GIT_RESULT');ctlAssert(!result.error&&result.status===0&&result.signal===null&&Buffer.isBuffer(result.stdout)&&Buffer.isBuffer(result.stderr)&&result.stderr.length===0);ctlSubcheck('GIT_UTF8');if(raw===true)return Buffer.from(result.stdout);return new TextDecoder('utf-8',{fatal:true}).decode(result.stdout);}
function ctlTreeRows(text){ctlAssert(text.endsWith('\0')||text==='');return text.split('\0').filter(Boolean).map(line=>{const match=/^(100644) blob ([0-9a-f]{40})\t([^]+)$/.exec(line);ctlAssert(match);ctlRelative(match[3]);return {path:match[3],rawMode:match[1],gitBlob:match[2]};}).sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);}
function ctlProductInventory(committedMap){
  const prefix='products/rea-studio/',selectedFiles=new Set(CTL_PRODUCT_ROWS.filter(row=>row.path.startsWith(prefix)).map(row=>row.path));
  const committedRows=[...committedMap.entries()].filter(([name])=>name.startsWith(prefix)).map(([name,row])=>({path:name,rawMode:row.rawMode,gitBlob:row.gitBlob,type:row.type})).sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
  ctlAssert.equal(selectedFiles.size,531);ctlAssert(committedRows.length>=532);
  const expectedFiles=new Set(committedRows.map(row=>row.path)),expectedDirectories=new Set(['products/rea-studio']);
  ctlAssert.equal(expectedFiles.size,committedRows.length);
  for(const row of committedRows){ctlRelative(row.path);ctlAssert(row.type==='blob'&&(row.rawMode==='100644'||row.rawMode==='100755'));let directory=ctlPath.posix.dirname(row.path);while(directory.startsWith('products/rea-studio')){expectedDirectories.add(directory);if(directory==='products/rea-studio')break;directory=ctlPath.posix.dirname(directory);}}
  ctlAssert([...selectedFiles].every(name=>expectedFiles.has(name)));ctlAssert(expectedFiles.has(CTL_SUPPLEMENTAL_CAMPAIGN.path));
  const found=[];let inventoryOrdinal=0;
  function walk(relative){const full=ctlWithin(ctlRepository,relative);ctlDirectory(full);for(const entry of ctlFs.readdirSync(full,{withFileTypes:true})){ctlRow(inventoryOrdinal++);ctlSubcheck('INVENTORY_ENTRY');const name=entry.name;ctlAssert(name!=='.'&&name!=='..'&&!name.includes('/')&&!name.includes('\\'));const next=relative+'/'+name;if(expectedDirectories.has(next)){ctlAssert(entry.isDirectory()&&!entry.isSymbolicLink());walk(next);}else{ctlAssert(expectedFiles.has(next)&&entry.isFile()&&!entry.isSymbolicLink());found.push(next);}}}
  walk('products/rea-studio');ctlAssert.deepEqual(found.sort(),[...expectedFiles].sort());
  const inventoryOnly=committedRows.filter(row=>!selectedFiles.has(row.path)&&row.path!==CTL_SUPPLEMENTAL_CAMPAIGN.path).map(({path,rawMode,gitBlob})=>({path,rawMode,gitBlob}));
  return {selectedPrefixRows:531,actualCommittedPrefixFiles:committedRows.length,supplementalControlFiles:1,inventoryOnlyFiles:inventoryOnly.length,inventoryOnlyIdentitySHA256:ctlSha(ctlWire(inventoryOnly)),inventoryOnlyBodiesAuthenticated:false,directoryEntryTypesInspected:true,expectedDirectoriesOrdinaryAndNonlinked:true,untrackedProductSubtreeNamesRejected:true,substitutedLeafDirectoriesAndLinksRejected:true,explicitInventoryOnlyLeafStatCalls:0,inventoryOnlyBodyReadHashOpenActions:0,explicitOpaqueLeafStatCalls:0,opaqueBodyReadHashOpenActions:0,underlyingReaddirMetadataOperationsNotIndependentlyInstrumented:true};
}
function ctlSourceGuard(){ctlSourceGuardRunning=true;let traversalSnapshot=null;try{ctlCheckpoint('HEAD_SHA');const source=ctlSubject.source;ctlAssert.equal(ctlGit(['rev-parse','HEAD']).trim(),source);ctlCheckpoint('SOLE_PARENT');ctlAssert.equal(ctlGit(['rev-list','--parents','-n','1','HEAD']).trim(),source+' '+CTL_PARENT);ctlCheckpoint('PARENT_HEADER');const header=ctlGit(['cat-file','-p',CTL_PARENT]).split('\n\n',1)[0].split('\n');ctlCheckpoint('PARENT_PARENT');ctlAssert.deepEqual(header.filter(line=>line.startsWith('parent ')),['parent '+CTL_PARENT_PARENT]);ctlCheckpoint('PARENT_TREE');ctlAssert.deepEqual(header.filter(line=>line.startsWith('tree ')),['tree '+CTL_PARENT_TREE]);ctlCheckpoint('STUDIO_TREE');ctlAssert.equal(ctlGit(['ls-tree','HEAD','--','products/rea-studio']).trim(),'040000 tree '+CTL_STUDIO_TREE+'\tproducts/rea-studio');ctlCheckpoint('HEAD_TREE');const tree=ctlGit(['rev-parse','HEAD^{tree}']).trim();ctlAssert(/^[0-9a-f]{40}$/.test(tree));if(ctlSubject.tree===null)ctlSubject.tree=tree;else ctlAssert.equal(tree,ctlSubject.tree);ctlCheckpoint('EXACT_TWO_ADDITIONS');const expectedPaths=[CTL_WORKFLOW,CTL_SCRIPT].sort();ctlAssert.equal(ctlGit(['diff','--no-ext-diff','--no-textconv','--no-renames','--name-status',CTL_PARENT,'HEAD']).trim(),expectedPaths.map(name=>'A\t'+name).join('\n'));let absentOrdinal=0;ctlCheckpoint('PARENT_PATH_ABSENT');for(const name of expectedPaths){ctlRow(absentOrdinal++);ctlAssert.equal(ctlGit(['ls-tree',CTL_PARENT,'--',name]),'');}ctlCheckpoint('WORKFLOW_METADATA');const sourceRows=ctlTreeRows(ctlGit(['ls-tree','-rz','HEAD','--','.github/workflows'])),oldRows=ctlTreeRows(ctlGit(['ls-tree','-rz',CTL_PARENT,'--','.github/workflows']));ctlCheckpoint('WORKFLOW_COUNTS');ctlAssert.equal(oldRows.length,28);ctlAssert.equal(sourceRows.length,30);ctlAssert.equal(oldRows.filter(row=>/\.(?:yml|yaml)$/.test(row.path)).length,28);ctlAssert.equal(sourceRows.filter(row=>/\.(?:yml|yaml)$/.test(row.path)).length,29);ctlAssert.deepEqual(sourceRows.filter(row=>!expectedPaths.includes(row.path)),oldRows);ctlCheckpoint('WORKFLOW_DISK_NAMES');const actualNames=ctlFs.readdirSync(ctlWithin(ctlRepository,'.github/workflows')).sort();ctlAssert.deepEqual(actualNames,sourceRows.map(row=>ctlPath.posix.basename(row.path)).sort());let workflowBytes=0,workflowOrdinal=0;ctlCheckpoint('WORKFLOW_BODY');for(const row of sourceRows){ctlRow(workflowOrdinal++);const file=ctlWithin(ctlRepository,row.path);ctlAncestors(ctlRepository,file);const bytes=ctlOrdinary(file,4194304);workflowBytes+=bytes.length;ctlSubcheck('BODY_GITBLOB');ctlAssert.equal(ctlBlob(bytes),row.gitBlob);if(row.path===CTL_SCRIPT){ctlSubcheck('CONTROLLER_SHA256');ctlAssert.equal(ctlSha(bytes),ctlEnv('REA_VAULT_CONTROLLER_SHA256'));}}const completeMap=new Map();let parseOrdinal=0;function admitScopedTree(text,prefix,expectedPaths){ctlAssert(text.endsWith('\0'));const lines=text.slice(0,-1).split('\0'),seen=new Set();ctlAssert(lines.every(Boolean));for(const line of lines){ctlRow(parseOrdinal++);const match=/^([0-7]{6}) (blob|commit) ([0-9a-f]{40})\t([^]+)$/.exec(line);ctlAssert(match);ctlRelative(match[4]);const name=prefix+match[4];ctlRelative(name);ctlAssert(!seen.has(name)&&!completeMap.has(name));if(expectedPaths!==null)ctlAssert(expectedPaths.has(name));seen.add(name);completeMap.set(name,{rawMode:match[1],type:match[2],gitBlob:match[3]});}if(expectedPaths!==null){ctlMetaCoverage([...seen],expectedPaths);ctlAssert.deepEqual([...seen].sort(),[...expectedPaths].sort());}return seen.size;}ctlCheckpoint('METADATA_CONTROLS');if(ctlReport.sourceMetadataControls===null){ctlReport.sourceMetadataControls=ctlRunMetadataControls();}ctlAssert.equal(ctlReport.sourceMetadataControls.controls,36);ctlAssert.equal(ctlReport.sourceMetadataControls.failedChecks,0);ctlCheckpoint('PRODUCT_SHALLOW_TRAVERSAL');let productMap;try{productMap=ctlMetaCollect(CTL_STUDIO_TREE,oid=>ctlGit(['ls-tree','-z',oid],true),CTL_META_LIMITS,()=>performance.now(),(operation,ordinal)=>{ctlRow(ordinal);ctlSubcheck(operation==='FETCH'?'META_FETCH':operation==='PARSE'?'META_PARSE':'META_EXPAND');},snapshot=>{traversalSnapshot=snapshot;});}catch(error){if(error&&CTL_META_ERRORS.has(error.code))ctlSubcheck(error.code);throw error;}for(const [name,row] of productMap){ctlAssert(!completeMap.has(name));completeMap.set(name,row);}const productMetadataRows=productMap.size;const outsideRows=CTL_PRODUCT_ROWS.filter(row=>!row.path.startsWith('products/rea-studio/'));ctlAssert.equal(outsideRows.length,121);ctlAssert(outsideRows.every((row,index)=>/^[A-Za-z0-9._/-]+$/.test(row.path)&&!row.path.startsWith('-')&&(index===0||outsideRows[index-1].path<row.path)));ctlAssert(outsideRows.every((row,index)=>!outsideRows.some((other,otherIndex)=>index!==otherIndex&&other.path.startsWith(row.path+'/'))));let outsideMetadataRows=0,outsideBatchCount=0;for(let start=0;start<outsideRows.length;start+=32){const batch=outsideRows.slice(start,start+32).map(row=>row.path);ctlAssert(batch.length>0&&batch.length<=32&&batch.reduce((sum,name)=>sum+name.length,0)<=2048);ctlCheckpoint('OUTSIDE_BATCH_METADATA');ctlRow(outsideBatchCount);const outsideTreeMetadata=ctlGit(['ls-tree','-rz','HEAD','--',...batch]);ctlCheckpoint('OUTSIDE_BATCH_PARSE');outsideMetadataRows+=admitScopedTree(outsideTreeMetadata,'',new Set(batch));outsideBatchCount++;}ctlAssert.equal(outsideMetadataRows,121);ctlAssert.equal(outsideBatchCount,4);let identityOrdinal=0;ctlCheckpoint('SELECTED_IDENTITIES');const productRows=CTL_PRODUCT_ROWS.map(expected=>{ctlRow(identityOrdinal++);const actual=completeMap.get(expected.path);ctlAssert(actual&&actual.rawMode==='100644'&&actual.type==='blob'&&actual.gitBlob===expected.gitBlob);return {path:expected.path,rawMode:actual.rawMode,gitBlob:actual.gitBlob};});ctlAssert.deepEqual(productRows,CTL_PRODUCT_ROWS);ctlCheckpoint('SELECTED_CANONICAL');ctlAssert.equal(ctlSha(Buffer.from(JSON.stringify(CTL_PRODUCT_ROWS),'utf8')),'35192455315f97d54c4d1aebee81d8db5327d03593acb46b753082335cab6446');ctlCheckpoint('ROSTER_CANONICAL');ctlAssert.equal(ctlSha(Buffer.from(JSON.stringify(CTL_ROSTER),'utf8')),'5a4fa6fd23867a5a0c2b5f92086b3e66200a468d655331f4e8547e69e38d19a9');ctlCheckpoint('SELECTED_COUNTS');ctlAssert.equal(CTL_PRODUCT_ROWS.filter(row=>row.path.startsWith('products/rea-studio/')).length,531);ctlAssert.equal(CTL_PRODUCT_ROWS.filter(row=>!row.path.startsWith('products/rea-studio/')).length,121);ctlCheckpoint('PRODUCT_INVENTORY');const inventory=ctlProductInventory(completeMap);const opaque=new Set(CTL_OPAQUE.map(row=>row.path)),verified=[];ctlAssert.equal(opaque.size,5);let total=0,bodyOrdinal=0;ctlCheckpoint('SELECTED_BODIES');for(const row of productRows){ctlRow(bodyOrdinal++);if(opaque.has(row.path))continue;const file=ctlWithin(ctlRepository,row.path);ctlAncestors(ctlRepository,file);const bytes=ctlOrdinary(file,4194304);total+=bytes.length;ctlAssert(total<=67108864);ctlSubcheck('BODY_GITBLOB');ctlAssert.equal(ctlBlob(bytes),row.gitBlob);verified.push({path:row.path,bytes:bytes.length,sha256:ctlSha(bytes)});}ctlCheckpoint('SELECTED_BODY_COUNT');ctlAssert.equal(verified.length,647);ctlCheckpoint('SUPPLEMENT_IDENTITY');const supplemental=completeMap.get(CTL_SUPPLEMENTAL_CAMPAIGN.path);ctlAssert(supplemental&&supplemental.type==='blob'&&supplemental.rawMode===CTL_SUPPLEMENTAL_CAMPAIGN.rawMode&&supplemental.gitBlob===CTL_SUPPLEMENTAL_CAMPAIGN.gitBlob);ctlCheckpoint('SUPPLEMENT_BODY');const supplementalFile=ctlWithin(ctlRepository,CTL_SUPPLEMENTAL_CAMPAIGN.path);ctlAncestors(ctlRepository,supplementalFile);const supplementalBytes=ctlOrdinary(supplementalFile,4194304);ctlSubcheck('SUPPLEMENT_LENGTH');ctlAssert.equal(supplementalBytes.length,CTL_SUPPLEMENTAL_CAMPAIGN.bytes);ctlSubcheck('SUPPLEMENT_BLOB');ctlAssert.equal(ctlBlob(supplementalBytes),CTL_SUPPLEMENTAL_CAMPAIGN.gitBlob);ctlSubcheck('SUPPLEMENT_SHA256');ctlAssert.equal(ctlSha(supplementalBytes),CTL_SUPPLEMENTAL_CAMPAIGN.sha256);ctlAssert(total+supplementalBytes.length<=67108864);ctlCheckpoint('INDEX_BODY');const index=ctlOrdinary(ctlPath.join(ctlRepository,'.git','index'),16777216);ctlCheckpoint('CONFIG_BODY');const config=ctlOrdinary(ctlPath.join(ctlRepository,'.git','config'),1048576);ctlCheckpoint('REF_SNAPSHOT');const gitState={indexBytes:index.length,indexSHA256:ctlSha(index),configBytes:config.length,configSHA256:ctlSha(config),refsSHA256:ctlSha(Buffer.from(ctlGit(['show-ref','--head']),'utf8'))};if(ctlGitState===null)ctlGitState=gitState;else ctlAssert.deepEqual(gitState,ctlGitState);ctlCheckpoint('SOURCE_COMPLETE');return {source,parent:CTL_PARENT,tree,soleParentVerified:true,exactTwoAddedPaths:true,oldWorkflows:28,totalWorkflowDirectoryFiles:30,YAMLWorkflows:29,inheritedWorkflowIdentitiesUnchanged:true,selectedManifestIdentityRows:652,selectedProductPrefixRows:531,otherSelectedDeclaredRows:121,selectedOrdinaryBodyRows:647,supplementalControlBodyRows:1,totalAdmittedOrdinaryBodyRows:648,opaqueMetadataOnlyRows:5,explicitOpaqueLeafStatCalls:0,opaqueBodyReadHashOpenActions:0,underlyingReaddirMetadataOperationsNotIndependentlyInstrumented:true,selectedOrdinaryBytes:total,supplementalControlBytes:supplementalBytes.length,supplementalControlBodyVerified:true,totalAdmittedOrdinaryBytes:total+supplementalBytes.length,selectedOrdinarySetSHA256:ctlSha(ctlWire(verified)),productInventory:inventory,workflowBytes,sourceMetadataScope:{schema:'rea-vault-consumed-source-metadata-scope/v1',scope:'complete-pinned-studio-subtree-plus-selected-outside-paths',pinnedStudioTree:CTL_STUDIO_TREE,productMetadataRows,outsideMetadataRows,outsideBatchCount,metadataQueries:traversalSnapshot.treeQueriesAttempted+4,perQueryMaxBufferBytes:4194304,perQueryTimeoutMs:5000,irrelevantOutsideMetadataEnumerated:false,queryTruncationAccepted:false},indexConfigRefsUnchanged:true,original184RosterUnchanged:true};}finally{ctlSourceGuardRunning=false;if(traversalSnapshot!==null)ctlReport.sourceMetadataTraversal[ctlStage==='SOURCE_BEFORE'?'before':'after']=traversalSnapshot;const view=ctlMetaTraceView(ctlSourceGitTrace);ctlSourceDiagnostics.gitCalls=view.records;const {records,...summary}=view;ctlSourceDiagnostics.gitTrace=Object.freeze(summary);}}

function ctlTrustedFile(file){const directory=ctlPath.dirname(file);ctlDirectory(directory);const stat=ctlFs.lstatSync(file);ctlAssert(stat.isFile()&&!stat.isSymbolicLink());ctlAssert.equal(ctlFs.realpathSync(file).toLowerCase(),file.toLowerCase());return file;}
function ctlClosedEnvironment(platform){const systemRoot=ctlEnv('SystemRoot'),windows=ctlEnv('windir');ctlAssert.equal(systemRoot.toLowerCase(),'c:\\windows');ctlAssert.equal(windows.toLowerCase(),systemRoot.toLowerCase());ctlDirectory(systemRoot);const programFiles=ctlEnv('ProgramFiles'),programFilesX86=ctlEnv('ProgramFiles(x86)'),programW6432=ctlEnv('ProgramW6432');ctlAssert.equal(programFiles.toLowerCase(),'c:\\program files');ctlAssert.equal(programFilesX86.toLowerCase(),'c:\\program files (x86)');ctlAssert.equal(programW6432.toLowerCase(),programFiles.toLowerCase());for(const directory of [programFiles,programFilesX86])ctlDirectory(directory);const profile=ctlDirectory(ctlPath.resolve(ctlEnv('USERPROFILE')));ctlAssert(/^C:\\Users\\[A-Za-z0-9._-]+$/i.test(profile));const appData=ctlDirectory(ctlEnv('APPDATA')),localAppData=ctlDirectory(ctlEnv('LOCALAPPDATA'));ctlAssert.equal(appData.toLowerCase(),ctlPath.join(profile,'AppData','Roaming').toLowerCase());ctlAssert.equal(localAppData.toLowerCase(),ctlPath.join(profile,'AppData','Local').toLowerCase());const system32=ctlDirectory(ctlPath.join(systemRoot,'System32')),winPS=ctlDirectory(ctlPath.join(system32,'WindowsPowerShell','v1.0')),wbem=ctlDirectory(ctlPath.join(system32,'Wbem'));const powershell=ctlTrustedFile(ctlPath.join(winPS,'powershell.exe')),taskkill=ctlTrustedFile(ctlPath.join(system32,'taskkill.exe')),cmd=ctlTrustedFile(ctlPath.join(system32,'cmd.exe')),git=ctlTrustedFile(ctlPath.join(programFiles,'Git','cmd','git.exe'));ctlAssert.equal(git.toLowerCase(),'c:\\program files\\git\\cmd\\git.exe');const winPSModules=ctlDirectory(ctlPath.join(winPS,'Modules')),allUsersModules=ctlPath.join(programFiles,'WindowsPowerShell','Modules'),userModules=ctlPath.join(profile,'Documents','WindowsPowerShell','Modules');ctlDirectory(allUsersModules);const userModulesExists=ctlExists(userModules);if(userModulesExists)ctlDirectory(userModules);const base={SystemRoot:systemRoot,windir:systemRoot,SystemDrive:'C:',ComSpec:cmd,PATHEXT:'.COM;.EXE;.BAT;.CMD',PATH:[ctlPath.dirname(platform.node),winPS,system32,systemRoot,wbem].join(';'),ProgramFiles:programFiles,'ProgramFiles(x86)':programFilesX86,ProgramW6432:programW6432,USERPROFILE:profile,HOMEDRIVE:'C:',HOMEPATH:profile.slice(2),APPDATA:appData,LOCALAPPDATA:localAppData,OS:'Windows_NT',PROCESSOR_ARCHITECTURE:'AMD64',CI:'true',GITHUB_ACTIONS:'true',RUNNER_ENVIRONMENT:'github-hosted',RUNNER_OS:'Windows',RUNNER_ARCH:'X64',ImageOS:'win22'};ctlAssert(!Object.keys(base).some(name=>/^(?:PSModulePath|WinPSModulePath|NODE_OPTIONS|NODE_PATH|NODE_TEST_CONTEXT|REA_STUDIO_DATA)$/i.test(name)));const gitEnv={...base,PATH:[ctlPath.dirname(git),system32,systemRoot].join(';'),GIT_NO_LAZY_FETCH:'1',GIT_NO_REPLACE_OBJECTS:'1',GIT_OPTIONAL_LOCKS:'0',GIT_TERMINAL_PROMPT:'0',GCM_INTERACTIVE:'Never',GIT_CONFIG_COUNT:'0'};return {base,git:gitEnv,powershell,taskkill,public:{profile:'unset-modulepath-default-WinPS-initialization/v1',inheritedPSModulePathForwarded:false,inheritedWinPSModulePathForwarded:false,workingProfilePreviouslyProven:false,R7BPathRosterReconstructed:false,failedR8CProfileReused:false,documentInformedNewExperiment:true,OSAndProfileRootsCanonicalOrdinary:true,knownDefaultModuleRootsCanonicalOrdinary:true,userDefaultModuleRootExists:userModulesExists,fixedExecutableSearchPath:true,childNames:[...Object.keys(base),'TEMP','TMP','REA_KEEPASS_EXE'].sort(),noTokensCredentialsOrNodePreloadVariablesForwarded:true,completeOSModuleBodyAuthenticationClaimed:false}};}
function ctlTestEnvironment(temp,exe){ctlDirectory(temp);ctlTrustedFile(exe);const env={...ctlEnvironment.base,TEMP:temp,TMP:temp,REA_KEEPASS_EXE:exe};const names=Object.keys(env).sort();ctlAssert.deepEqual(names,ctlEnvironment.public.childNames);ctlAssert(!names.some(name=>/^(?:PSModulePath|WinPSModulePath|NODE_OPTIONS|NODE_PATH|NODE_TEST_CONTEXT|REA_STUDIO_DATA)$/i.test(name)));return env;}
function ctlEmergencyTreeKill(child,record){if(record.closeObserved||record.exitObserved||child.exitCode!==null||child.signalCode!==null||!Number.isSafeInteger(child.pid)||child.pid<=0)return;record.treeKillAttempted=true;const result=ctlSpawnSync(ctlEnvironment.taskkill,['/PID',String(child.pid),'/T','/F'],{cwd:ctlRepository,env:ctlEnvironment.base,shell:false,windowsHide:true,encoding:'buffer',timeout:5000,maxBuffer:262144});record.treeKillReturned=true;record.treeKillStatus=Number.isInteger(result.status)?result.status:null;record.treeKillTimedOut=Boolean(result.error&&result.error.code==='ETIMEDOUT');record.treeKillSignal=result.signal===null?null:'non-null';ctlDetails.executionEmergency={error:result.error?ctlError(result.error):null,stdout:Buffer.isBuffer(result.stdout)?result.stdout.toString('utf8').slice(0,4096):null,stderr:Buffer.isBuffer(result.stderr)?result.stderr.toString('utf8').slice(0,4096):null};}
async function ctlRunOriginalTests(node,environment){const started=performance.now(),chunks={stdout:[],stderr:[]},seen={stdout:0,stderr:0},retained={stdout:0,stderr:0};const record={moduleDeadlineMs:CTL_MODULE_MS,streamCapBytes:CTL_STREAM_CAP,concurrency:1,requiredTests:2,spawnAttempted:false,spawned:false,launcherPID:null,exitObserved:false,exitEventCode:null,exitEventSignal:null,closeObserved:false,exitCode:null,signal:null,spawnError:false,deadlineObserved:false,overflow:false,stdoutSeenBytes:0,stderrSeenBytes:0,stdoutRetainedBytes:0,stderrRetainedBytes:0,stdoutDroppedBytes:0,stderrDroppedBytes:0,treeKillAttempted:false,treeKillReturned:false,treeKillStatus:null,treeKillTimedOut:false,treeKillSignal:null,closeWaitExpired:false,elapsedMs:null};let child,deadline,closeWait,finished=false;const result=await new Promise(resolve=>{function finish(){if(finished)return;finished=true;clearTimeout(deadline);clearTimeout(closeWait);record.elapsedMs=Math.round(performance.now()-started);for(const name of ['stdout','stderr']){record[name+'SeenBytes']=seen[name];record[name+'RetainedBytes']=retained[name];record[name+'DroppedBytes']=seen[name]-retained[name];}if(child&&!record.closeObserved){child.stdout?.destroy();child.stderr?.destroy();child.unref();}resolve({record,stdout:Buffer.concat(chunks.stdout),stderr:Buffer.concat(chunks.stderr)});}function stop(reason){if(reason==='deadline')record.deadlineObserved=true;else record.overflow=true;if(!record.treeKillAttempted)ctlEmergencyTreeKill(child,record);if(!closeWait)closeWait=setTimeout(()=>{record.closeWaitExpired=true;finish();},7000);}record.spawnAttempted=true;try{child=ctlSpawn(node,['--test','--test-concurrency=1','--test-reporter=tap','--test-timeout='+CTL_MODULE_MS,CTL_HTTP],{cwd:ctlRepository,env:environment,shell:false,windowsHide:true,stdio:['ignore','pipe','pipe']});record.launcherPID=Number.isSafeInteger(child.pid)?child.pid:null;child.once('spawn',()=>{record.spawned=true;});for(const name of ['stdout','stderr'])child[name].on('data',chunk=>{if(finished)return;seen[name]+=chunk.length;const available=Math.max(0,CTL_STREAM_CAP-retained[name]);if(available){const kept=chunk.subarray(0,Math.min(available,chunk.length));chunks[name].push(Buffer.from(kept));retained[name]+=kept.length;}if(seen[name]>CTL_STREAM_CAP)stop('overflow');});child.once('error',error=>{record.spawnError=true;ctlDetails.executionError=ctlError(error);});child.once('exit',(code,signal)=>{record.exitObserved=true;record.exitEventCode=Number.isInteger(code)?code:null;record.exitEventSignal=signal===null?null:(['SIGTERM','SIGKILL','SIGINT'].includes(signal)?signal:'other');});child.once('close',(code,signal)=>{record.closeObserved=true;record.exitCode=Number.isInteger(code)?code:null;record.signal=signal===null?null:(['SIGTERM','SIGKILL','SIGINT'].includes(signal)?signal:'other');finish();});deadline=setTimeout(()=>stop('deadline'),CTL_MODULE_MS);}catch(error){record.spawnError=true;ctlDetails.executionError=ctlError(error);finish();}});ctlDetails.execution={...record};return result;}
function ctlInspectTAP(bytes){const result={versionCount:0,planCount:0,rootResults:0,exactTwoOriginalNames:false,terminalSummaryComplete:false,afterhookMarkers:0,unexpectedNestedResult:false,bailout:false,counts:{tests:null,suites:null,pass:null,fail:null,cancelled:null,skipped:null,todo:null},durationMs:null,completeSuccess:false};let text;try{text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);}catch{return {...result,UTF8Valid:false};}const lines=text.split(/\r?\n/),versions=lines.map((line,i)=>line==='TAP version 13'?i:-1).filter(i=>i>=0),plans=lines.map((line,i)=>/^\d+\.\.\d+(?:\s|$)/.test(line)?i:-1).filter(i=>i>=0),results=lines.map((line,i)=>{const match=/^(ok|not ok) ([1-9][0-9]*) - (.*)$/.exec(line);return match?{index:i,outcome:match[1],number:Number(match[2]),name:match[3]}:null;}).filter(Boolean);result.versionCount=versions.length;result.planCount=plans.length;result.rootResults=results.length;result.afterhookMarkers=lines.filter(line=>line.startsWith('# REA_KEEPASS_HISTORY_HTTP ')).length;result.unexpectedNestedResult=lines.some(line=>/^\s+(?:ok|not ok)\s/.test(line));result.bailout=lines.some(line=>/^\s*Bail out!/.test(line));result.exactTwoOriginalNames=results.length===2&&results.every((row,i)=>row.number===i+1&&row.name===CTL_TEST_NAMES[i]);let unique=true;for(const name of Object.keys(result.counts)){const matches=lines.map((line,i)=>{const match=new RegExp('^# '+name+' ([0-9]+)$').exec(line);return match?{index:i,value:Number(match[1])}:null;}).filter(Boolean);if(matches.length===1&&Number.isSafeInteger(matches[0].value))result.counts[name]=matches[0].value;else unique=false;}const duration=lines.map((line,i)=>{const match=/^# duration_ms ([0-9]+(?:\.[0-9]+)?)$/.exec(line);return match?{index:i,value:Number(match[1])}:null;}).filter(Boolean);const nonempty=lines.map((line,i)=>line!==''?i:-1).filter(i=>i>=0);if(duration.length===1&&Number.isFinite(duration[0].value))result.durationMs=duration[0].value;const finalSummary=plans.length===1&&lines[plans[0]]==='1..2'&&results.length===2&&plans[0]>results[1].index&&duration.length===1&&duration[0].index===nonempty.at(-1)&&Object.keys(result.counts).every(name=>lines.findIndex(line=>line==='# '+name+' '+result.counts[name])>plans[0]);result.terminalSummaryComplete=Boolean(unique&&finalSummary&&text.endsWith('\n'));const subtests=lines.filter(line=>line.startsWith('# Subtest: '));const expectedSubtests=CTL_TEST_NAMES.map(name=>'# Subtest: '+name);const diagnostics=lines.filter(line=>line==='  ---').length===2&&lines.filter(line=>line==='  ...').length===2&&lines.filter(line=>/^  duration_ms: [0-9]+(?:\.[0-9]+)?$/.test(line)).length===2&&lines.filter(line=>/^  type: (?:'test'|test)$/.test(line)).length===2;const onlySuccessGrammar=lines.every(line=>line===''||line==='TAP version 13'||line==='1..2'||/^ok [12] - /.test(line)||expectedSubtests.includes(line)||line==='  ---'||line==='  ...'||/^  duration_ms: [0-9]+(?:\.[0-9]+)?$/.test(line)||/^  type: (?:'test'|test)$/.test(line)||/^# (?:tests|suites|pass|fail|cancelled|skipped|todo) [0-9]+$/.test(line)||/^# duration_ms [0-9]+(?:\.[0-9]+)?$/.test(line)||line.startsWith('# REA_KEEPASS_HISTORY_HTTP '));result.completeSuccess=Boolean(versions.length===1&&versions[0]===0&&result.exactTwoOriginalNames&&results.every(row=>row.outcome==='ok')&&result.terminalSummaryComplete&&result.afterhookMarkers===1&&!result.unexpectedNestedResult&&!result.bailout&&JSON.stringify(result.counts)===JSON.stringify({tests:2,suites:0,pass:2,fail:0,cancelled:0,skipped:0,todo:0})&&JSON.stringify(subtests)===JSON.stringify(expectedSubtests)&&diagnostics&&onlySuccessGrammar&&!text.includes('\0'));return {...result,UTF8Valid:true};}

const CTL_APIS=Object.freeze([['create',200],['save',200],['save',200],['historyList',200],['historyRestore',400],['historyRestore',400],['historyRestore',400],['status',200],['historyList',400],['unlock',400],['status',200],['unlock',200],['historyList',200],['historyRead',200],['historyRestore',200],['read',200],['historyList',200],['exportKdbx',200],['unlock',200],['read',200],['historyList',200],['create',200],['save',200],['save',200],['historyList',200],['changePassword',400],['changePassword',200],['historyRestore',400],['historyList',200],['historyRead',200],['unlock',400],['unlock',200],['read',200],['historyList',200],['historyRestore',200],['read',200]]);
function ctlObservation(stdout,launcherPID,temp,exe){const text=new TextDecoder('utf-8',{fatal:true}).decode(stdout),matches=text.split(/\r?\n/).filter(line=>line.startsWith('# REA_KEEPASS_HISTORY_HTTP '));ctlAssert.equal(matches.length,1);const marker=JSON.parse(matches[0].slice('# REA_KEEPASS_HISTORY_HTTP '.length));ctlKeys(marker,['hostProcesses','originalProcessExecutions','detail']);ctlAssert(Number.isSafeInteger(marker.hostProcesses)&&marker.hostProcesses>=0&&marker.hostProcesses<=64);ctlAssert(Number.isSafeInteger(marker.originalProcessExecutions)&&marker.originalProcessExecutions>=0&&marker.originalProcessExecutions<=2);ctlAssert.equal(typeof marker.detail,'string');const fixture=ctlPath.join(ctlRepository,'.local','vault-history-fixtures'),relative=ctlPath.relative(fixture,ctlPath.resolve(marker.detail));const parts=relative.split(ctlPath.sep);ctlAssert(parts.length===3&&/^[1-9][0-9]*$/.test(parts[0])&&parts[1]==='observations'&&parts[2]==='history-http.json');const workerPID=Number(parts[0]);ctlAssert(Number.isSafeInteger(workerPID)&&workerPID>0&&workerPID!==launcherPID);const file=ctlPath.join(fixture,...parts);ctlAssert.equal(file.toLowerCase(),ctlPath.resolve(marker.detail).toLowerCase());ctlAncestors(ctlRepository,file);const raw=ctlOrdinary(file,CTL_OBSERVATION_CAP);ctlDetails.observation={workerPID,marker,rawBytes:raw.length};let publicObservation={uniqueAfterhookMarker:true,workerPIDDistinctFromLauncher:true,ordinaryOwnedObservation:true,observationBytes:raw.length,hostCompletions:null,closeCompletions:null,matchingStatusAPICompletions:null,recordedNativeCompletions:null,native:null,successPathCountsMatched:false,partialCountersAreAttempts:false,hostSignalRecorded:false};let validated=false,error=null;try{const value=ctlJson(raw,CTL_OBSERVATION_CAP);ctlKeys(value,['httpObservations','originalProcessExecutions','observations']);ctlAssert(Array.isArray(value.httpObservations)&&value.httpObservations.length<=256&&Array.isArray(value.observations)&&value.observations.length<=2);ctlAssert(Number.isSafeInteger(value.originalProcessExecutions)&&value.originalProcessExecutions===value.observations.length&&marker.originalProcessExecutions===value.observations.length);const hosts=[],closes=[],apis=[],active=new Map();for(const row of value.httpObservations){ctlAssert(row&&typeof row==='object'&&!Array.isArray(row));if(row.event==='host'){ctlKeys(row,['event','pid','url']);ctlAssert(Number.isSafeInteger(row.pid)&&row.pid>0&&!active.has(row.pid));const url=new URL(row.url);ctlAssert(url.protocol==='http:'&&url.hostname==='127.0.0.1'&&/^[1-9][0-9]*$/.test(url.port)&&Number(url.port)<=65535&&url.pathname==='/'&&!url.username&&!url.password&&!url.search&&!url.hash);active.set(row.pid,true);hosts.push(row);}else if(row.event==='closed'){ctlKeys(row,['event','pid','code','logs']);ctlAssert(Number.isSafeInteger(row.pid)&&row.pid>0&&(Number.isInteger(row.code)||row.code===null)&&typeof row.logs==='string'&&Buffer.byteLength(row.logs)<=1048576);ctlAssert(active.has(row.pid));active.delete(row.pid);closes.push(row);}else if(row.event==='api'){ctlKeys(row,['event','action','status']);ctlAssert(typeof row.action==='string'&&CTL_APIS.some(([action,status])=>row.action===action&&row.status===status));apis.push(row);}else throw new Error('Unexpected observation event');}ctlAssert.equal(marker.hostProcesses,hosts.length);publicObservation.hostCompletions=hosts.length;publicObservation.closeCompletions=closes.length;publicObservation.matchingStatusAPICompletions=apis.length;publicObservation.recordedNativeCompletions=value.observations.length;if(value.observations.length===1){const native=value.observations[0];ctlKeys(native,['config','result','value']);ctlKeys(native.config,['mode','database']);ctlAssert.equal(native.config.mode,'read');const database=ctlPath.resolve(native.config.database);ctlAssert(database.startsWith(temp+ctlPath.sep)&&ctlPath.basename(database)==='native-http.kdbx');const result=native.result;ctlKeys(result,['code','signal','stdout','stderr','sizes']);ctlKeys(result.sizes,['stdout','stderr']);ctlAssert(typeof result.stdout==='string'&&typeof result.stderr==='string');for(const name of ['stdout','stderr'])ctlAssert(Number.isSafeInteger(result.sizes[name])&&result.sizes[name]>=0&&result.sizes[name]<=1048576&&result.sizes[name]===Buffer.byteLength(result[name],'utf8'));ctlAssert.equal(result.code,0);ctlAssert.equal(result.signal,null);ctlKeys(native.value,['assemblySha256','mode','directMethods','guiExecuted','entry','history','maxItems','maxSize']);ctlAssert.equal(String(native.value.assemblySha256).toLowerCase(),'04d29636c393f0c1fc99ff739295494be3adefded93271e44591e8e300225a5a');ctlAssert.equal(native.value.mode,'read');ctlAssert.equal(native.value.guiExecuted,false);ctlAssert.deepEqual(native.value.directMethods,['CreateBackup','MaintainBackups','RestoreFromBackup','GetSize','KdbxFile.Save/Open']);ctlAssert(Array.isArray(native.value.history)&&native.value.history.length===2);ctlAssert.deepEqual(ctlJson(Buffer.from(result.stdout.trim(),'utf8'),1048576),native.value);publicObservation.native={parsedOriginalCompletions:1,modeRead:true,exitCode:0,signal:null,assemblySHA256Matched:true,guiExecuted:false,stdoutBytes:result.sizes.stdout,stderrBytes:result.sizes.stderr,historyRevisions:2,sourceOriginalComparisonsUnchanged:true,postTeardownDatabaseExistenceClaimed:false};}ctlAssert.equal(hosts.length,5);ctlAssert.equal(closes.length,5);ctlAssert(closes.every(row=>row.code===0));ctlAssert.equal(active.size,0);ctlAssert.deepEqual(apis.map(row=>[row.action,row.status]),CTL_APIS);ctlAssert.equal(value.observations.length,1);publicObservation.successPathCountsMatched=true;validated=true;}catch(problem){error=ctlError(problem);ctlDetails.observationValidationError=error;}return {raw,fixture,workerPID,public:publicObservation,validated,error};}
function ctlObservationInventory(observation){const root=observation.fixture;ctlDirectory(root);ctlAssert.deepEqual(ctlFs.readdirSync(root),[String(observation.workerPID)]);const pidDir=ctlPath.join(root,String(observation.workerPID));ctlDirectory(pidDir);ctlAssert.deepEqual(ctlFs.readdirSync(pidDir),['observations']);const directory=ctlPath.join(pidDir,'observations');ctlDirectory(directory);ctlAssert.deepEqual(ctlFs.readdirSync(directory),['history-http.json']);ctlAssert(ctlOrdinary(ctlPath.join(directory,'history-http.json'),CTL_OBSERVATION_CAP).equals(observation.raw));return true;}
function ctlSafeRemove(root,expectedParent,{maxFiles=2048,maxBytes=134217728,maxDepth=24}={}){ctlAssert.equal(ctlPath.dirname(root),expectedParent);ctlAssert(root.startsWith(expectedParent+ctlPath.sep));if(!ctlExists(root))return {removed:true,files:0,bytes:0};let count=0,total=0;function inspect(directory,depth){ctlAssert(depth<=maxDepth);ctlDirectory(directory);for(const name of ctlFs.readdirSync(directory)){ctlAssert(name&&name!=='.'&&name!=='..'&&!name.includes('/')&&!name.includes('\\'));const item=ctlPath.join(directory,name),stat=ctlFs.lstatSync(item);ctlAssert(!stat.isSymbolicLink());ctlAssert.equal(ctlFs.realpathSync(item).toLowerCase(),item.toLowerCase());if(stat.isDirectory())inspect(item,depth+1);else{ctlAssert(stat.isFile()&&stat.size<=16777216);count++;total+=stat.size;ctlAssert(count<=maxFiles&&total<=maxBytes);}}}inspect(root,0);ctlFs.rmSync(root,{recursive:true,force:false,maxRetries:0});ctlAssert(!ctlExists(root));return {removed:true,files:count,bytes:total};}
function ctlRecordFailure(stage,error){ctlCaptureSourceFailure(stage);ctlNote(stage,false);if(ctlDetails.errors.length<8)ctlDetails.errors.push({stage,error:ctlError(error).slice(0,4096)});}
function ctlClosedFailure(stage){return {stage,passed:false,rawErrorPublished:false};}

// BEGIN EXACT VENDOR ACQUISITION BODY. This source is authored without local execution.
export async function acquireVendor(vendorOptions) {
  try {
    return await vendorAcquireChecked(vendorOptions);
  } catch (vendorOuterError) {
    const vendorCode = vendorOuterError && /^VENDOR_[A-Z0-9_]+$/.test(vendorOuterError.code || '') ? vendorOuterError.code : 'VENDOR_ADMISSION_FAILED';
    const vendorSafeError = Object.assign(new Error(vendorCode), { code: vendorCode });
    vendorSafeError.stack = vendorCode;
    if (vendorOuterError && typeof vendorOuterError.vendorCleanupComplete === 'boolean') vendorSafeError.vendorCleanupComplete = vendorOuterError.vendorCleanupComplete;
    throw vendorSafeError;
  }
  async function vendorAcquireChecked({ ownedRoot, subject }) {
  const vendorSourceURL = 'https://github.com/JiriSko/KeePass/releases/download/v2.61.1/KeePass-2.61.1.zip';
  const vendorArchiveBytes = 2898806;
  const vendorArchiveSHA = '3952354db9b117e906f7cd4f9f5591065b95186472370da47f46f3e246fea864';
  const vendorEXEBytes = 3265880;
  const vendorEXESHA = '04d29636c393f0c1fc99ff739295494be3adefded93271e44591e8e300225a5a';
  const vendorCORE = '3f77897f8782093b6e828987ac9105b6b782e705';
  const vendorBranch = 'refs/heads/validation/vault-http-native-integration-20261023-r4';
  const vendorMaxEntries = 1024, vendorMaxNodes = 4096;
  const vendorMaxFileBytes = 16 * 1024 * 1024, vendorMaxExpandedBytes = 64 * 1024 * 1024;
  const vendorMaxNameBytes = 240, vendorMaxExtraBytes = 4096, vendorDownloadMs = 90000;
  const vendorTrustedHosts = new Set(['github.com', 'release-assets.githubusercontent.com', 'objects.githubusercontent.com']);
  const vendorHash = value => vendorCreateHash('sha256').update(value).digest('hex');
  const vendorFail = code => { throw Object.assign(new Error('VENDOR_' + code), { code: 'VENDOR_' + code }); };
  const vendorAssert = (value, code) => { if (!value) vendorFail(code); };
  const vendorSamePath = (a, b) => vendorPath.resolve(a).toLowerCase() === vendorPath.resolve(b).toLowerCase();
  const vendorInside = (root, target) => { const value = vendorPath.relative(root, target); return value !== '' && !vendorPath.isAbsolute(value) && value !== '..' && !value.startsWith('..' + vendorPath.sep); };
  const vendorIdentity = stat => ({ dev: stat.dev, ino: stat.ino });
  const vendorSameIdentity = (stat, identity) => stat.dev === identity.dev && stat.ino === identity.ino;
  let vendorBase = null, vendorBaseIdentity = null, vendorDisposed = false;
  const vendorCreatedDirectories = new Map(), vendorCreatedFiles = new Map();
  let vendorOwnedIdentity = null, vendorOwnedPath = null;

  vendorAssert(subject && Object.getPrototypeOf(subject) === Object.prototype, 'SUBJECT_SHAPE');
  const vendorSubjectKeys = ['attempt', 'branch', 'job', 'parent', 'repository', 'run', 'source', 'tree'];
  vendorAssert(Reflect.ownKeys(subject).every(key => typeof key === 'string') && JSON.stringify(Reflect.ownKeys(subject).sort()) === JSON.stringify(vendorSubjectKeys), 'SUBJECT_KEYS');
  const vendorSubjectDescriptors = Object.getOwnPropertyDescriptors(subject);
  for (const vendorKey of vendorSubjectKeys) vendorAssert(Object.hasOwn(vendorSubjectDescriptors[vendorKey], 'value') && typeof vendorSubjectDescriptors[vendorKey].value === 'string', 'SUBJECT_DATA');
  subject = Object.freeze(Object.fromEntries(vendorSubjectKeys.map(key => [key, vendorSubjectDescriptors[key].value])));
  vendorAssert(subject.repository === 'Ginderlax/rea-research-lab' && subject.parent === vendorCORE && subject.branch === vendorBranch, 'SUBJECT_SCOPE');
  vendorAssert(/^[0-9a-f]{40}$/.test(subject.source) && /^[0-9a-f]{40}$/.test(subject.tree), 'SUBJECT_GIT');
  vendorAssert(/^[1-9][0-9]{0,19}$/.test(subject.run) && /^[1-9][0-9]{0,5}$/.test(subject.attempt) && subject.job === 'vault-http-native-integration', 'SUBJECT_RUN');
  vendorAssert(process.platform === 'win32' && process.arch === 'x64' && process.versions.node === '24.16.0', 'PLATFORM');
  vendorAssert(process.env.CI === 'true' && process.env.GITHUB_ACTIONS === 'true' && process.env.RUNNER_ENVIRONMENT === 'github-hosted', 'HOSTED');
  vendorAssert(process.env.RUNNER_OS === 'Windows' && process.env.RUNNER_ARCH === 'X64' && process.env.ImageOS === 'win22', 'WINDOWS2022');
  for (const [vendorKey, vendorValue] of [['GITHUB_REPOSITORY', subject.repository], ['GITHUB_SHA', subject.source], ['GITHUB_REF', subject.branch], ['GITHUB_RUN_ID', subject.run], ['GITHUB_RUN_ATTEMPT', subject.attempt], ['GITHUB_JOB', subject.job], ['GITHUB_EVENT_NAME', 'push']]) vendorAssert(process.env[vendorKey] === vendorValue, 'HOST_IDENTITY');
  vendorAssert(typeof ownedRoot === 'string' && ownedRoot.length <= 200 && /^[A-Za-z]:[\\/]/.test(ownedRoot) && !ownedRoot.includes('\0'), 'OWNED_ROOT');
  vendorAssert(typeof process.env.RUNNER_TEMP === 'string' && /^[A-Za-z]:[\\/]/.test(process.env.RUNNER_TEMP), 'RUNNER_TEMP');
  vendorOwnedPath = vendorPath.resolve(ownedRoot);
  const vendorRunnerTemp = vendorPath.resolve(process.env.RUNNER_TEMP);
  vendorAssert(vendorInside(vendorRunnerTemp, vendorOwnedPath), 'OWNED_ROOT_SCOPE');

  async function vendorCheckDirectory(vendorDirectory, vendorExpectedIdentity = null) {
    const vendorStat = await vendorFs.lstat(vendorDirectory, { bigint: true });
    vendorAssert(vendorStat.isDirectory() && !vendorStat.isSymbolicLink(), 'DIRECTORY_TYPE');
    vendorAssert(vendorSamePath(await vendorFs.realpath(vendorDirectory), vendorDirectory), 'DIRECTORY_REALPATH');
    if (vendorExpectedIdentity) vendorAssert(vendorSameIdentity(vendorStat, vendorExpectedIdentity), 'DIRECTORY_IDENTITY');
    return vendorStat;
  }
  async function vendorCheckAncestors(vendorDirectory) {
    const vendorResolved = vendorPath.resolve(vendorDirectory), vendorRoot = vendorPath.parse(vendorResolved).root;
    const vendorParts = vendorResolved.slice(vendorRoot.length).split(vendorPath.sep).filter(Boolean);
    vendorAssert(vendorParts.length <= 64, 'ANCESTOR_LIMIT');
    let vendorCursor = vendorRoot;
    await vendorCheckDirectory(vendorCursor);
    for (const vendorPart of vendorParts) { vendorCursor = vendorPath.join(vendorCursor, vendorPart); await vendorCheckDirectory(vendorCursor); }
  }
  async function vendorCheckOwnership() {
    await vendorCheckAncestors(vendorOwnedPath);
    await vendorCheckDirectory(vendorOwnedPath, vendorOwnedIdentity);
    if (vendorBase !== null) {
      vendorAssert(vendorBaseIdentity !== null, 'BASE_IDENTITY_MISSING');
      vendorAssert(vendorInside(vendorOwnedPath, vendorBase) && /^vendor-[0-9a-f-]{36}$/.test(vendorPath.basename(vendorBase)), 'BASE_SCOPE');
      await vendorCheckDirectory(vendorBase, vendorBaseIdentity);
    }
  }
  await vendorCheckAncestors(vendorRunnerTemp);
  await vendorCheckAncestors(vendorOwnedPath);
  vendorOwnedIdentity = vendorIdentity(await vendorCheckDirectory(vendorOwnedPath));

  function vendorCheckedURL(vendorValue) {
    const vendorURL = new URL(vendorValue);
    vendorAssert(vendorURL.protocol === 'https:' && vendorURL.username === '' && vendorURL.password === '' && (vendorURL.port === '' || vendorURL.port === '443') && vendorURL.hash === '', 'HTTPS_URL');
    vendorAssert(vendorTrustedHosts.has(vendorURL.hostname), 'HTTPS_HOST');
    return vendorURL;
  }
  async function vendorDownload() {
    const vendorAbort = new AbortController();
    let vendorTimedOut = false, vendorReader = null, vendorRedirects = 0;
    const vendorTimer = setTimeout(() => { vendorTimedOut = true; vendorAbort.abort(); }, vendorDownloadMs);
    let vendorURL = vendorCheckedURL(vendorSourceURL);
    try {
      while (true) {
        const vendorResponse = await fetch(vendorURL, { method: 'GET', redirect: 'manual', credentials: 'omit', signal: vendorAbort.signal, headers: { accept: 'application/octet-stream,application/zip', 'accept-encoding': 'identity' } });
        if ([301, 302, 303, 307, 308].includes(vendorResponse.status)) {
          const vendorLocation = vendorResponse.headers.get('location');
          if (vendorResponse.body) void vendorResponse.body.cancel().catch(() => {});
          vendorAssert(typeof vendorLocation === 'string' && vendorLocation.length <= 16384 && vendorRedirects < 5, 'REDIRECT_LIMIT');
          vendorURL = vendorCheckedURL(new URL(vendorLocation, vendorURL).href);
          vendorRedirects++;
          continue;
        }
        vendorAssert(vendorResponse.status === 200 && vendorResponse.body !== null, 'DOWNLOAD_STATUS');
        vendorAssert(!/html|xhtml/i.test(vendorResponse.headers.get('content-type') || ''), 'HTML_RESPONSE');
        vendorAssert(['', 'identity'].includes((vendorResponse.headers.get('content-encoding') || '').toLowerCase()), 'CONTENT_ENCODING');
        const vendorLength = vendorResponse.headers.get('content-length');
        vendorAssert(vendorLength === null || (/^[0-9]{1,12}$/.test(vendorLength) && Number(vendorLength) === vendorArchiveBytes), 'CONTENT_LENGTH');
        vendorReader = vendorResponse.body.getReader();
        const vendorChunks = []; let vendorSize = 0;
        while (true) {
          const vendorChunk = await vendorReader.read();
          if (vendorChunk.done) break;
          vendorAssert(vendorChunk.value instanceof Uint8Array && vendorChunk.value.byteLength > 0, 'DOWNLOAD_CHUNK');
          vendorSize += vendorChunk.value.byteLength;
          vendorAssert(vendorSize <= vendorArchiveBytes, 'DOWNLOAD_CAP');
          vendorChunks.push(Buffer.from(vendorChunk.value));
        }
        vendorAssert(vendorSize === vendorArchiveBytes, 'ARCHIVE_LENGTH');
        const vendorBytes = Buffer.concat(vendorChunks, vendorSize);
        vendorAssert(vendorBytes.readUInt32LE(0) === 0x04034b50 && vendorHash(vendorBytes) === vendorArchiveSHA, 'ARCHIVE_IDENTITY');
        return { bytes: vendorBytes, redirects: vendorRedirects, finalHost: vendorURL.hostname };
      }
    } catch (vendorError) {
      if (vendorTimedOut) vendorFail('DOWNLOAD_TIMEOUT');
      if (vendorError && /^VENDOR_[A-Z0-9_]+$/.test(vendorError.code || '')) throw vendorError;
      vendorFail('DOWNLOAD_FAILED');
    } finally {
      clearTimeout(vendorTimer); vendorAbort.abort();
      if (vendorReader) { try { vendorReader.releaseLock(); } catch {} }
    }
  }
  function vendorBounds(vendorBuffer, vendorAt, vendorLength, vendorCode) {
    vendorAssert(Number.isSafeInteger(vendorAt) && Number.isSafeInteger(vendorLength) && vendorAt >= 0 && vendorLength >= 0 && vendorAt + vendorLength <= vendorBuffer.length, vendorCode);
  }
  function vendorExtra(vendorBytes) {
    vendorAssert(vendorBytes.length <= vendorMaxExtraBytes, 'EXTRA_CAP');
    let vendorAt = 0, vendorFields = 0;
    while (vendorAt < vendorBytes.length) {
      vendorBounds(vendorBytes, vendorAt, 4, 'EXTRA_STRUCTURE');
      const vendorTag = vendorBytes.readUInt16LE(vendorAt), vendorSize = vendorBytes.readUInt16LE(vendorAt + 2);
      vendorAssert(vendorTag !== 0x0001 && vendorTag !== 0x9901 && ++vendorFields <= 128, 'EXTRA_UNSUPPORTED');
      vendorBounds(vendorBytes, vendorAt + 4, vendorSize, 'EXTRA_STRUCTURE'); vendorAt += 4 + vendorSize;
    }
    // Extra metadata is structurally checked and never applied to paths, permissions or links.
  }
  function vendorName(vendorBytes, vendorIsDirectory) {
    vendorAssert(vendorBytes.length > 0 && vendorBytes.length <= vendorMaxNameBytes, 'NAME_CAP');
    for (const vendorByte of vendorBytes) vendorAssert(vendorByte >= 0x20 && vendorByte <= 0x7e, 'NAME_ENCODING');
    const vendorNameText = vendorBytes.toString('ascii');
    vendorAssert(!vendorNameText.includes('\\') && !vendorNameText.includes(':') && !vendorNameText.startsWith('/'), 'NAME_ABSOLUTE');
    const vendorRelative = vendorIsDirectory ? vendorNameText.slice(0, -1) : vendorNameText;
    const vendorSegments = vendorRelative.split('/');
    vendorAssert(vendorRelative.length > 0 && vendorSegments.length <= 16, 'NAME_DEPTH');
    for (const vendorSegment of vendorSegments) {
      vendorAssert(/^[A-Za-z0-9_][A-Za-z0-9_. -]*$/.test(vendorSegment) && !/[. ]$/.test(vendorSegment), 'NAME_SEGMENT');
      vendorAssert(!/^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(vendorSegment), 'NAME_RESERVED');
    }
    return vendorRelative;
  }
  let vendorCRCTable = null;
  function vendorCRC32(vendorBuffer) {
    if (vendorCRCTable === null) {
      vendorCRCTable = new Uint32Array(256);
      for (let vendorIndex = 0; vendorIndex < 256; vendorIndex++) {
        let vendorValue = vendorIndex;
        for (let vendorBit = 0; vendorBit < 8; vendorBit++) vendorValue = (vendorValue >>> 1) ^ ((vendorValue & 1) ? 0xedb88320 : 0);
        vendorCRCTable[vendorIndex] = vendorValue >>> 0;
      }
    }
    let vendorCRC = 0xffffffff;
    for (const vendorByte of vendorBuffer) vendorCRC = (vendorCRC >>> 8) ^ vendorCRCTable[(vendorCRC ^ vendorByte) & 0xff];
    return (vendorCRC ^ 0xffffffff) >>> 0;
  }
  function vendorDecodeZIP(vendorBytes) {
    let vendorEOCD = -1;
    for (let vendorAt = vendorBytes.length - 22; vendorAt >= Math.max(0, vendorBytes.length - 65557); vendorAt--) {
      if (vendorBytes.readUInt32LE(vendorAt) === 0x06054b50 && vendorAt + 22 + vendorBytes.readUInt16LE(vendorAt + 20) === vendorBytes.length) {
        vendorAssert(vendorEOCD === -1, 'EOCD_AMBIGUOUS'); vendorEOCD = vendorAt;
      }
    }
    vendorAssert(vendorEOCD >= 0, 'EOCD_MISSING');
    vendorAssert(vendorBytes.readUInt16LE(vendorEOCD + 4) === 0 && vendorBytes.readUInt16LE(vendorEOCD + 6) === 0, 'MULTIDISK');
    const vendorCount = vendorBytes.readUInt16LE(vendorEOCD + 10), vendorCentralSize = vendorBytes.readUInt32LE(vendorEOCD + 12), vendorCentralAt = vendorBytes.readUInt32LE(vendorEOCD + 16);
    vendorAssert(vendorCount > 0 && vendorCount <= vendorMaxEntries && vendorCount !== 0xffff && vendorBytes.readUInt16LE(vendorEOCD + 8) === vendorCount, 'ENTRY_COUNT');
    vendorAssert(vendorCentralAt !== 0xffffffff && vendorCentralSize !== 0xffffffff && vendorCentralAt + vendorCentralSize === vendorEOCD, 'CENTRAL_BOUNDS');
    vendorBounds(vendorBytes, vendorCentralAt, vendorCentralSize, 'CENTRAL_BOUNDS');
    const vendorEntries = [], vendorCentralNames = new Set(), vendorNodes = new Map();
    let vendorAt = vendorCentralAt, vendorExpanded = 0;
    function vendorNode(vendorRelative, vendorType, vendorEntry = null, vendorExplicit = false) {
      const vendorFolded = vendorRelative.toLowerCase(), vendorOld = vendorNodes.get(vendorFolded);
      if (vendorOld) {
        vendorAssert(vendorOld.path === vendorRelative && vendorOld.type === vendorType && !(vendorExplicit && vendorOld.explicit), 'NAME_COLLISION');
        if (vendorExplicit) { vendorOld.explicit = true; vendorOld.entry = vendorEntry; }
      } else {
        vendorAssert(vendorNodes.size < vendorMaxNodes, 'NODE_CAP');
        vendorNodes.set(vendorFolded, { path: vendorRelative, type: vendorType, entry: vendorEntry, explicit: vendorExplicit });
      }
    }
    for (let vendorIndex = 0; vendorIndex < vendorCount; vendorIndex++) {
      vendorBounds(vendorBytes, vendorAt, 46, 'CENTRAL_HEADER');
      vendorAssert(vendorBytes.readUInt32LE(vendorAt) === 0x02014b50, 'CENTRAL_HEADER');
      const vendorCreator = vendorBytes.readUInt16LE(vendorAt + 4) >>> 8, vendorNeeded = vendorBytes.readUInt16LE(vendorAt + 6);
      const vendorFlags = vendorBytes.readUInt16LE(vendorAt + 8), vendorMethod = vendorBytes.readUInt16LE(vendorAt + 10);
      const vendorTime = vendorBytes.readUInt16LE(vendorAt + 12), vendorDate = vendorBytes.readUInt16LE(vendorAt + 14), vendorCRC = vendorBytes.readUInt32LE(vendorAt + 16);
      const vendorCompressed = vendorBytes.readUInt32LE(vendorAt + 20), vendorSize = vendorBytes.readUInt32LE(vendorAt + 24);
      const vendorNameLength = vendorBytes.readUInt16LE(vendorAt + 28), vendorExtraLength = vendorBytes.readUInt16LE(vendorAt + 30), vendorCommentLength = vendorBytes.readUInt16LE(vendorAt + 32);
      const vendorAttributes = vendorBytes.readUInt32LE(vendorAt + 38), vendorLocalAt = vendorBytes.readUInt32LE(vendorAt + 42);
      vendorAssert([0, 3, 10].includes(vendorCreator) && vendorNeeded >= 10 && vendorNeeded <= 20, 'ZIP_VERSION');
      vendorAssert((vendorFlags & ~0x080e) === 0 && [0, 8].includes(vendorMethod) && (vendorMethod === 8 || (vendorFlags & 6) === 0), 'ZIP_FEATURES');
      vendorAssert(vendorBytes.readUInt16LE(vendorAt + 34) === 0 && vendorCompressed !== 0xffffffff && vendorSize !== 0xffffffff && vendorLocalAt !== 0xffffffff, 'ZIP64_MULTIDISK');
      vendorAssert(vendorSize <= vendorMaxFileBytes && vendorCompressed <= vendorArchiveBytes && vendorCommentLength <= 4096, 'ENTRY_CAP');
      vendorBounds(vendorBytes, vendorAt + 46, vendorNameLength + vendorExtraLength + vendorCommentLength, 'CENTRAL_FIELDS');
      const vendorRawName = vendorBytes.subarray(vendorAt + 46, vendorAt + 46 + vendorNameLength), vendorIsDirectory = vendorRawName.at(-1) === 0x2f;
      const vendorRelative = vendorName(vendorRawName, vendorIsDirectory), vendorFolded = vendorRelative.toLowerCase();
      vendorAssert(!vendorCentralNames.has(vendorFolded), 'CENTRAL_DUPLICATE'); vendorCentralNames.add(vendorFolded);
      vendorExtra(vendorBytes.subarray(vendorAt + 46 + vendorNameLength, vendorAt + 46 + vendorNameLength + vendorExtraLength));
      const vendorUnixMode = vendorAttributes >>> 16, vendorUnixType = vendorUnixMode & 0xf000;
      vendorAssert((vendorAttributes & 0x0408) === 0 && (vendorUnixMode & 0x0e00) === 0, 'SPECIAL_ATTRIBUTES');
      vendorAssert(vendorUnixType === 0 || vendorUnixType === (vendorIsDirectory ? 0x4000 : 0x8000), 'LINK_OR_SPECIAL');
      vendorAssert((vendorAttributes & 0x10) === 0 || vendorIsDirectory, 'DIRECTORY_ATTRIBUTE');
      if (vendorIsDirectory) vendorAssert(vendorSize === 0 && vendorCompressed === 0 && vendorCRC === 0 && vendorMethod === 0 && (vendorFlags & 8) === 0, 'DIRECTORY_CONTENT');
      vendorExpanded += vendorSize; vendorAssert(vendorExpanded <= vendorMaxExpandedBytes, 'EXPANDED_CAP');
      const vendorEntry = { path: vendorRelative, directory: vendorIsDirectory, rawName: Buffer.from(vendorRawName), needed: vendorNeeded, flags: vendorFlags, method: vendorMethod, time: vendorTime, date: vendorDate, crc32: vendorCRC, compressed: vendorCompressed, bytes: vendorSize, localAt: vendorLocalAt, data: null, sha256: null };
      const vendorParts = vendorRelative.split('/');
      for (let vendorPart = 1; vendorPart < vendorParts.length; vendorPart++) vendorNode(vendorParts.slice(0, vendorPart).join('/'), 'directory');
      vendorNode(vendorRelative, vendorIsDirectory ? 'directory' : 'file', vendorEntry, true);
      vendorEntries.push(vendorEntry); vendorAt += 46 + vendorNameLength + vendorExtraLength + vendorCommentLength;
    }
    vendorAssert(vendorAt === vendorCentralAt + vendorCentralSize, 'CENTRAL_LENGTH');
    const vendorLocalOrder = [...vendorEntries].sort((a, b) => a.localAt - b.localAt);
    vendorAssert(vendorLocalOrder[0].localAt === 0, 'LOCAL_PREAMBLE');
    for (let vendorIndex = 0; vendorIndex < vendorLocalOrder.length; vendorIndex++) {
      const vendorEntry = vendorLocalOrder[vendorIndex], vendorLocalAt = vendorEntry.localAt;
      const vendorBoundary = vendorIndex + 1 < vendorLocalOrder.length ? vendorLocalOrder[vendorIndex + 1].localAt : vendorCentralAt;
      vendorBounds(vendorBytes, vendorLocalAt, 30, 'LOCAL_HEADER');
      vendorAssert(vendorLocalAt < vendorBoundary && vendorBytes.readUInt32LE(vendorLocalAt) === 0x04034b50, 'LOCAL_HEADER');
      vendorAssert(vendorBytes.readUInt16LE(vendorLocalAt + 4) === vendorEntry.needed && vendorBytes.readUInt16LE(vendorLocalAt + 6) === vendorEntry.flags && vendorBytes.readUInt16LE(vendorLocalAt + 8) === vendorEntry.method && vendorBytes.readUInt16LE(vendorLocalAt + 10) === vendorEntry.time && vendorBytes.readUInt16LE(vendorLocalAt + 12) === vendorEntry.date, 'LOCAL_AGREEMENT');
      const vendorLocalCRC = vendorBytes.readUInt32LE(vendorLocalAt + 14), vendorLocalCompressed = vendorBytes.readUInt32LE(vendorLocalAt + 18), vendorLocalSize = vendorBytes.readUInt32LE(vendorLocalAt + 22);
      const vendorNameLength = vendorBytes.readUInt16LE(vendorLocalAt + 26), vendorExtraLength = vendorBytes.readUInt16LE(vendorLocalAt + 28);
      vendorBounds(vendorBytes, vendorLocalAt + 30, vendorNameLength + vendorExtraLength, 'LOCAL_FIELDS');
      vendorAssert(vendorBytes.subarray(vendorLocalAt + 30, vendorLocalAt + 30 + vendorNameLength).equals(vendorEntry.rawName), 'LOCAL_NAME');
      vendorExtra(vendorBytes.subarray(vendorLocalAt + 30 + vendorNameLength, vendorLocalAt + 30 + vendorNameLength + vendorExtraLength));
      const vendorDataAt = vendorLocalAt + 30 + vendorNameLength + vendorExtraLength, vendorDataEnd = vendorDataAt + vendorEntry.compressed;
      vendorAssert(vendorDataEnd <= vendorBoundary, 'LOCAL_OVERLAP');
      if (vendorEntry.flags & 8) {
        vendorAssert([0, vendorEntry.crc32].includes(vendorLocalCRC) && [0, vendorEntry.compressed].includes(vendorLocalCompressed) && [0, vendorEntry.bytes].includes(vendorLocalSize), 'LOCAL_DESCRIPTOR_FIELDS');
        const vendorDescriptorLength = vendorBoundary - vendorDataEnd;
        vendorAssert(vendorDescriptorLength === 12 || vendorDescriptorLength === 16, 'DESCRIPTOR_LENGTH');
        let vendorDescriptorAt = vendorDataEnd;
        if (vendorDescriptorLength === 16) { vendorAssert(vendorBytes.readUInt32LE(vendorDescriptorAt) === 0x08074b50, 'DESCRIPTOR_SIGNATURE'); vendorDescriptorAt += 4; }
        vendorAssert(vendorBytes.readUInt32LE(vendorDescriptorAt) === vendorEntry.crc32 && vendorBytes.readUInt32LE(vendorDescriptorAt + 4) === vendorEntry.compressed && vendorBytes.readUInt32LE(vendorDescriptorAt + 8) === vendorEntry.bytes, 'DESCRIPTOR_AGREEMENT');
      } else vendorAssert(vendorLocalCRC === vendorEntry.crc32 && vendorLocalCompressed === vendorEntry.compressed && vendorLocalSize === vendorEntry.bytes && vendorDataEnd === vendorBoundary, 'LOCAL_LENGTH_CRC');
      if (!vendorEntry.directory) {
        const vendorCompressedData = vendorBytes.subarray(vendorDataAt, vendorDataEnd);
        vendorEntry.data = vendorEntry.method === 0 ? Buffer.from(vendorCompressedData) : vendorInflateRawSync(vendorCompressedData, { maxOutputLength: Math.max(1, vendorEntry.bytes) });
        vendorAssert(Buffer.isBuffer(vendorEntry.data) && vendorEntry.data.length === vendorEntry.bytes && vendorCRC32(vendorEntry.data) === vendorEntry.crc32, 'ENTRY_LENGTH_CRC');
        vendorEntry.sha256 = vendorHash(vendorEntry.data);
      }
    }
    const vendorEXE = vendorEntries.find(entry => entry.path === 'KeePass.exe' && !entry.directory);
    vendorAssert(vendorEXE && vendorEXE.bytes === vendorEXEBytes && vendorEXE.sha256 === vendorEXESHA, 'EXE_IDENTITY');
    return { entries: vendorEntries, nodes: vendorNodes, expandedBytes: vendorExpanded };
  }
  function vendorFullPath(vendorRelative) {
    const vendorTarget = vendorPath.resolve(vendorBase, ...vendorRelative.split('/'));
    vendorAssert(vendorInside(vendorBase, vendorTarget) && vendorTarget.length <= 240, 'OUTPUT_PATH'); return vendorTarget;
  }
  async function vendorCheckFile(vendorRelative, vendorExpected) {
    const vendorTarget = vendorFullPath(vendorRelative), vendorInitial = await vendorFs.lstat(vendorTarget, { bigint: true });
    vendorAssert(vendorInitial.isFile() && !vendorInitial.isSymbolicLink() && vendorInitial.nlink === 1n && vendorSameIdentity(vendorInitial, vendorExpected.identity), 'FILE_IDENTITY');
    vendorAssert(vendorInitial.size === BigInt(vendorExpected.bytes) && vendorSamePath(await vendorFs.realpath(vendorTarget), vendorTarget), 'FILE_SIZE_REALPATH');
    const vendorHandle = await vendorFs.open(vendorTarget, 'r');
    try {
      const vendorOpened = await vendorHandle.stat({ bigint: true });
      vendorAssert(vendorOpened.isFile() && vendorOpened.nlink === 1n && vendorSameIdentity(vendorOpened, vendorExpected.identity) && vendorOpened.size === BigInt(vendorExpected.bytes), 'OPEN_FILE_IDENTITY');
      vendorAssert(vendorSameIdentity(await vendorFs.lstat(vendorTarget, { bigint: true }), vendorExpected.identity), 'OPEN_PATH_IDENTITY');
      const vendorData = Buffer.alloc(vendorExpected.bytes); let vendorRead = 0;
      while (vendorRead < vendorData.length) {
        const vendorStep = await vendorHandle.read(vendorData, vendorRead, Math.min(65536, vendorData.length - vendorRead), vendorRead);
        vendorAssert(vendorStep.bytesRead > 0, 'FILE_TRUNCATED'); vendorRead += vendorStep.bytesRead;
      }
      const vendorExtraByte = Buffer.alloc(1), vendorExtraRead = await vendorHandle.read(vendorExtraByte, 0, 1, vendorExpected.bytes);
      vendorAssert(vendorExtraRead.bytesRead === 0 && vendorHash(vendorData) === vendorExpected.sha256, 'FILE_HASH');
      const vendorAfter = await vendorHandle.stat({ bigint: true }), vendorPathAfter = await vendorFs.lstat(vendorTarget, { bigint: true });
      vendorAssert(vendorAfter.size === BigInt(vendorExpected.bytes) && vendorAfter.nlink === 1n && vendorSameIdentity(vendorAfter, vendorExpected.identity) && vendorPathAfter.isFile() && !vendorPathAfter.isSymbolicLink() && vendorPathAfter.nlink === 1n && vendorSameIdentity(vendorPathAfter, vendorExpected.identity), 'FILE_AFTER_READ');
    } finally { await vendorHandle.close(); }
  }
  async function vendorInventory(vendorRequireComplete) {
    await vendorCheckOwnership();
    const vendorQueue = [{ path: '', fullPath: vendorBase }], vendorSeenFiles = new Set(), vendorSeenDirectories = new Set(); let vendorVisited = 0;
    while (vendorQueue.length) {
      const vendorDirectory = vendorQueue.shift();
      const vendorNames = await vendorFs.readdir(vendorDirectory.fullPath);
      vendorAssert(vendorNames.length <= vendorMaxNodes, 'INVENTORY_CAP');
      for (const vendorNameText of vendorNames) {
        vendorAssert(++vendorVisited <= vendorMaxNodes, 'INVENTORY_CAP');
        const vendorRelative = vendorDirectory.path ? vendorDirectory.path + '/' + vendorNameText : vendorNameText;
        const vendorTarget = vendorFullPath(vendorRelative), vendorStat = await vendorFs.lstat(vendorTarget, { bigint: true });
        vendorAssert(!vendorStat.isSymbolicLink(), 'INVENTORY_LINK');
        if (vendorStat.isDirectory()) {
          const vendorExpected = vendorCreatedDirectories.get(vendorRelative); vendorAssert(!!vendorExpected, 'UNEXPECTED_DIRECTORY');
          await vendorCheckDirectory(vendorTarget, vendorExpected); vendorSeenDirectories.add(vendorRelative); vendorQueue.push({ path: vendorRelative, fullPath: vendorTarget });
        } else {
          const vendorExpected = vendorCreatedFiles.get(vendorRelative); vendorAssert(!!vendorExpected && vendorStat.isFile() && vendorStat.nlink === 1n && vendorSameIdentity(vendorStat, vendorExpected.identity), 'UNEXPECTED_FILE'); vendorSeenFiles.add(vendorRelative);
        }
      }
    }
    if (vendorRequireComplete) vendorAssert(vendorSeenFiles.size === vendorCreatedFiles.size && vendorSeenDirectories.size === vendorCreatedDirectories.size, 'INVENTORY_MISSING');
    return { files: vendorSeenFiles.size, directories: vendorSeenDirectories.size };
  }
  async function vendorRemoveOwned() {
    if (vendorBase === null || vendorDisposed) return;
    await vendorInventory(false); await vendorCheckOwnership();
    // The resolved absolute target is checked inside the exact owned root immediately before recursive removal.
    vendorAssert(vendorInside(vendorOwnedPath, vendorBase) && vendorPath.dirname(vendorBase) === vendorOwnedPath, 'REMOVE_SCOPE');
    await vendorFs.rm(vendorBase, { recursive: true, force: false, maxRetries: 0 });
    try { await vendorFs.lstat(vendorBase); vendorFail('REMOVE_NOT_ABSENT'); } catch (vendorError) { if (vendorError.code !== 'ENOENT') throw vendorError; }
    vendorDisposed = true;
  }
  try {
    const vendorDownloaded = await vendorDownload(), vendorDecoded = vendorDecodeZIP(vendorDownloaded.bytes);
    await vendorCheckOwnership();
    const vendorProposedBase = vendorPath.join(vendorOwnedPath, 'vendor-' + vendorRandomUUID());
    vendorAssert(vendorInside(vendorOwnedPath, vendorProposedBase), 'BASE_SCOPE');
    await vendorFs.mkdir(vendorProposedBase, { recursive: false, mode: 0o700 });
    vendorBase = vendorProposedBase;
    vendorBaseIdentity = vendorIdentity(await vendorCheckDirectory(vendorBase));
    const vendorDirectories = [...vendorDecoded.nodes.values()].filter(node => node.type === 'directory').sort((a, b) => a.path.split('/').length - b.path.split('/').length || (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
    for (const vendorDirectory of vendorDirectories) {
      await vendorCheckOwnership(); const vendorTarget = vendorFullPath(vendorDirectory.path);
      const vendorParentRelative = vendorDirectory.path.includes('/') ? vendorDirectory.path.slice(0, vendorDirectory.path.lastIndexOf('/')) : '';
      await vendorCheckDirectory(vendorPath.dirname(vendorTarget), vendorParentRelative ? vendorCreatedDirectories.get(vendorParentRelative) : vendorBaseIdentity);
      await vendorFs.mkdir(vendorTarget, { recursive: false, mode: 0o700 });
      vendorCreatedDirectories.set(vendorDirectory.path, vendorIdentity(await vendorCheckDirectory(vendorTarget)));
    }
    for (const vendorEntry of vendorDecoded.entries.filter(entry => !entry.directory)) {
      await vendorCheckOwnership(); const vendorTarget = vendorFullPath(vendorEntry.path);
      const vendorParentRelative = vendorEntry.path.includes('/') ? vendorEntry.path.slice(0, vendorEntry.path.lastIndexOf('/')) : '';
      await vendorCheckDirectory(vendorPath.dirname(vendorTarget), vendorParentRelative ? vendorCreatedDirectories.get(vendorParentRelative) : vendorBaseIdentity);
      const vendorHandle = await vendorFs.open(vendorTarget, 'wx', 0o600);
      try {
        const vendorStat = await vendorHandle.stat({ bigint: true }); vendorAssert(vendorStat.isFile() && vendorStat.nlink === 1n, 'CREATE_FILE_TYPE');
        vendorCreatedFiles.set(vendorEntry.path, { bytes: vendorEntry.bytes, sha256: vendorEntry.sha256, identity: vendorIdentity(vendorStat) });
        await vendorHandle.writeFile(vendorEntry.data); await vendorHandle.sync();
      } finally { await vendorHandle.close(); }
      await vendorCheckFile(vendorEntry.path, vendorCreatedFiles.get(vendorEntry.path));
      vendorEntry.data = null;
    }
    const vendorFiles = [...vendorCreatedFiles].map(([path, value]) => Object.freeze({ path, bytes: value.bytes, sha256: value.sha256 })).sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
    const vendorMetadata = Object.freeze({ schema: 'rea-vault-fresh-owned-vendor-acquisition/v1', version: '2.61.1', sourceURL: vendorSourceURL, sourceCommit: subject.source, parent: subject.parent, tree: subject.tree, branch: subject.branch, run: subject.run, attempt: subject.attempt, job: subject.job, archive: Object.freeze({ bytes: vendorArchiveBytes, sha256: vendorArchiveSHA, authenticated: true, redirects: vendorDownloaded.redirects, finalHost: vendorDownloaded.finalHost }), executable: Object.freeze({ path: 'KeePass.exe', bytes: vendorEXEBytes, sha256: vendorEXESHA, independentlyPinnedInSource: true }), companionIdentity: 'Every extracted file SHA256 and byte count is derived from the fully authenticated pinned ZIP bytes; companion hashes are not independently pinned publisher hashes.', files: Object.freeze(vendorFiles), directories: Object.freeze([...vendorCreatedDirectories.keys()].sort()), fileCount: vendorFiles.length, expandedBytes: vendorDecoded.expandedBytes, classicZIP: true, CRC32AndCentralLocalAgreementVerified: true, exactOwnedInventoryVerified: true, OpenPGPVerified: false, signatureOrReproducibleBuildVerified: false, localOrHistoricalVendorBodiesUsed: false, caps: Object.freeze({ entries: vendorMaxEntries, nodes: vendorMaxNodes, fileBytes: vendorMaxFileBytes, expandedBytes: vendorMaxExpandedBytes, relativeNameBytes: vendorMaxNameBytes, absolutePathChars: 240, nameDepth: 16, redirects: 5, downloadMs: vendorDownloadMs }) });
    vendorAssert(Buffer.byteLength(JSON.stringify(vendorMetadata)) <= 1024 * 1024, 'METADATA_CAP');
    async function verifyVendorUnchanged() {
      try {
        vendorAssert(!vendorDisposed, 'ALREADY_REMOVED');
        const vendorCounts = await vendorInventory(true);
        for (const [vendorRelative, vendorExpected] of vendorCreatedFiles) await vendorCheckFile(vendorRelative, vendorExpected);
        await vendorCheckOwnership();
        vendorAssert(vendorCounts.files === vendorFiles.length && vendorCreatedFiles.get('KeePass.exe').sha256 === vendorEXESHA, 'POST_INVENTORY');
        return Object.freeze({ verified: true, files: vendorCounts.files, directories: vendorCounts.directories, expandedBytes: vendorDecoded.expandedBytes, executablePinnedIdentityVerified: true });
      } catch (vendorError) {
        if (vendorError && /^VENDOR_[A-Z0-9_]+$/.test(vendorError.code || '')) throw vendorError;
        vendorFail('VERIFY_FAILED');
      }
    }
    async function cleanup() {
      if (vendorDisposed) return Object.freeze({ removed: true, alreadyRemoved: true });
      await verifyVendorUnchanged();
      try { await vendorRemoveOwned(); } catch (vendorError) {
        if (vendorError && /^VENDOR_[A-Z0-9_]+$/.test(vendorError.code || '')) throw vendorError;
        vendorFail('CLEANUP_FAILED');
      }
      return Object.freeze({ removed: true, alreadyRemoved: false });
    }
    await verifyVendorUnchanged();
    return Object.freeze({ exePath: vendorFullPath('KeePass.exe'), metadata: vendorMetadata, verifyVendorUnchanged, cleanup });
  } catch (vendorError) {
    let vendorCleanupComplete = vendorBase === null;
    if (vendorBase !== null) { try { await vendorRemoveOwned(); vendorCleanupComplete = true; } catch {} }
    const vendorSafeError = vendorError && /^VENDOR_[A-Z0-9_]+$/.test(vendorError.code || '') ? vendorError : Object.assign(new Error('VENDOR_ACQUISITION_FAILED'), { code: 'VENDOR_ACQUISITION_FAILED' });
    vendorSafeError.vendorCleanupComplete = vendorCleanupComplete;
    throw vendorSafeError;
  }
  }
}
// END EXACT VENDOR ACQUISITION BODY.


// SOURCE ONLY. No entrypoint. No file, key, process or network access occurs on import.
// BEGIN PRIVATE EVIDENCE PUBLIC PRODUCER V2
export const privateEvidenceProtocol = Object.freeze({
  schema: 'rea-vault-private-evidence-envelope/v2',
  suite: 'X25519/HKDF-SHA256/AES-256-GCM',
  logMagic: 'REA_VAULT_PRIVATE_EXPORT_V2',
  recipientSPKISHA256: 'c80fd7586b226eea163449b2875c850104eb016bc01d0d5d4ce8bfe4cafc3062',
  publicRecipientDERBase64: 'MCowBQYDK2VuAyEAlaOZkZYIx5OyL72VeMu4AQt/gF8pBCXOVNZxK71fnmo=',
  caps: Object.freeze({ stdout:1048576, stderr:1048576, history:2097152,
    rawFiles:4194304, metadata:65536, plaintext:6291456, envelope:9437184,
    log:20971520, logLines:100000, chunkCharacters:8192, chunks:1536 })
});
const privateSlots = Object.freeze(['module-stdout.bin','module-stderr.bin','history-http.json']);
const privateSlotCaps = Object.freeze([1048576,1048576,2097152]);
const privateSubjectKeys = Object.freeze(['repository','source','parent','tree','branch','run','attempt','job']);
function privateFail(code) { const error=new Error(code); error.name='PrivateEvidenceError'; error.code=code; throw error; }
function privateRequire(ok,code) { if(!ok) privateFail(code); }
function privateSHA(bytes) { return privateCrypto.createHash('sha256').update(bytes).digest('hex'); }
function privateExactKeys(value,keys,code) {
  privateRequire(value!==null && typeof value==='object' && !Array.isArray(value) &&
    (Object.getPrototypeOf(value)===Object.prototype || Object.getPrototypeOf(value)===null),code);
  const actual=Reflect.ownKeys(value);
  privateRequire(actual.every(key=>typeof key==='string') && actual.length===keys.length &&
    keys.every(key=>Object.hasOwn(value,key)),code);
  for(const key of actual) privateRequire(Object.getOwnPropertyDescriptor(value,key)?.get===undefined &&
    Object.getOwnPropertyDescriptor(value,key)?.set===undefined,code);
}
function privateJSON(value) {
  let nodes=0;
  const visit=(item,depth)=>{
    privateRequire(++nodes<=20000 && depth<=12,'JSON_COMPLEXITY');
    if(item===null || typeof item==='boolean') return item;
    if(typeof item==='number') { privateRequire(Number.isFinite(item) && Math.abs(item)<=Number.MAX_SAFE_INTEGER && !Object.is(item,-0),'JSON_NUMBER'); return item; }
    if(typeof item==='string') { privateRequire(Buffer.byteLength(item,'utf8')<=12582912,'JSON_STRING'); return item; }
    if(Array.isArray(item)) {
      privateRequire(item.length<=20000 && Object.getPrototypeOf(item)===Array.prototype && Reflect.ownKeys(item).length===item.length+1,'JSON_ARRAY');
      return Array.from({length:item.length},(_,index)=>{ const descriptor=Object.getOwnPropertyDescriptor(item,String(index)); privateRequire(descriptor && Object.hasOwn(descriptor,'value'),'JSON_ARRAY_ACCESSOR'); return visit(descriptor.value,depth+1); });
    }
    privateRequire(item!==null && typeof item==='object' &&
      (Object.getPrototypeOf(item)===Object.prototype || Object.getPrototypeOf(item)===null),'JSON_OBJECT');
    const result=Object.create(null),keys=Reflect.ownKeys(item);
    privateRequire(keys.length<=20000 && keys.every(key=>typeof key==='string' && Buffer.byteLength(key,'utf8')<=256),'JSON_KEYS');
    for(const key of keys.sort()) {
      const descriptor=Object.getOwnPropertyDescriptor(item,key);
      privateRequire(descriptor && Object.hasOwn(descriptor,'value'),'JSON_ACCESSOR');
      result[key]=visit(descriptor.value,depth+1);
    }
    return result;
  };
  return JSON.stringify(visit(value,0));
}
function privateCanonicalBytes(value) { return Buffer.from(privateJSON(value)+'\n','utf8'); }
function privateParseCanonical(bytes,cap,code) {
  privateRequire(Buffer.isBuffer(bytes) && bytes.length>0 && bytes.length<=cap,code+'_BOUNDS');
  let text,value; try { text=new TextDecoder('utf-8',{fatal:true}).decode(bytes); value=JSON.parse(text); }
  catch { privateFail(code+'_JSON'); }
  privateRequire(privateCanonicalBytes(value).equals(bytes),code+'_CANONICAL');
  return value;
}
function privateBase64(text,maximum,code,exactLength=null) {
  privateRequire(typeof text==='string' && text.length<=4*Math.ceil(maximum/3) &&
    text.length%4===0 && /^[A-Za-z0-9+/]*={0,2}$/.test(text),code+'_FORM');
  const bytes=Buffer.from(text,'base64');
  privateRequire(bytes.length<=maximum && (exactLength===null || bytes.length===exactLength) && bytes.toString('base64')===text,code+'_CANONICAL');
  return bytes;
}
function privateSubject(subject) {
  privateExactKeys(subject,privateSubjectKeys,'SUBJECT_KEYS');
  privateRequire(subject.repository==='Ginderlax/rea-research-lab' &&
    typeof subject.source==='string' && /^[0-9a-f]{40}$/.test(subject.source) && typeof subject.tree==='string' && /^[0-9a-f]{40}$/.test(subject.tree) &&
    subject.parent==='3f77897f8782093b6e828987ac9105b6b782e705' &&
    subject.branch==='refs/heads/validation/vault-http-native-integration-20261023-r4' &&
    typeof subject.run==='string' && /^[1-9][0-9]{0,19}$/.test(subject.run) &&
    typeof subject.attempt==='string' && /^[1-9][0-9]{0,5}$/.test(subject.attempt) &&
    subject.job==='vault-http-native-integration','SUBJECT_VALUE');
  return JSON.parse(privateJSON(subject));
}
function privateRecipient(der,expectedHash) {
  privateRequire(Buffer.isBuffer(der) && der.length===44 && privateSHA(der)===expectedHash,'RECIPIENT_PIN');
  let key; try { key=privateCrypto.createPublicKey({key:der,format:'der',type:'spki'}); }
  catch { privateFail('RECIPIENT_KEY'); }
  privateRequire(key.asymmetricKeyType==='x25519' && key.export({format:'der',type:'spki'}).equals(der),'RECIPIENT_TYPE');
  return key;
}
function privateMetadata(metadata) {
  privateExactKeys(metadata,['schema','details'],'PRIVATE_METADATA_KEYS');
  privateRequire(metadata.schema==='rea-vault-focused-private-details/v2' && metadata.details!==null &&
    typeof metadata.details==='object' && !Array.isArray(metadata.details),'PRIVATE_METADATA_SCHEMA');
  const bytes=privateCanonicalBytes(metadata);
  privateRequire(bytes.length<=privateEvidenceProtocol.caps.metadata,'PRIVATE_METADATA_CAP');
  return JSON.parse(bytes.toString('utf8'));
}
function privateFileRows(files) {
  privateRequire(files!==null && typeof files==='object' && !Array.isArray(files) &&
    Object.getPrototypeOf(files)===Object.prototype,'PRIVATE_FILES_OBJECT');
  const keys=Reflect.ownKeys(files);
  privateRequire(keys.every(key=>typeof key==='string' && privateSlots.includes(key)) && keys.length<=3,'PRIVATE_FILES_KEYS');
  let total=0;
  return privateSlots.filter(name=>Object.hasOwn(files,name)).map(name=>{
    const descriptor=Object.getOwnPropertyDescriptor(files,name);
    privateRequire(descriptor && Object.hasOwn(descriptor,'value') && Buffer.isBuffer(descriptor.value),'PRIVATE_FILE_BUFFER');
    const bytes=descriptor.value;
    privateRequire(bytes.length<=privateSlotCaps[privateSlots.indexOf(name)],'PRIVATE_FILE_CAP');
    total+=bytes.length; privateRequire(total<=privateEvidenceProtocol.caps.rawFiles,'PRIVATE_FILES_TOTAL');
    return {name,bytes:bytes.length,sha256:privateSHA(bytes),base64:bytes.toString('base64')};
  });
}
function privateAAD(envelope) {
  return privateCanonicalBytes({schema:'rea-vault-private-evidence-aad/v2',suite:envelope.suite,
    exportID:envelope.exportID,subject:envelope.subject,recipientSPKISHA256:envelope.recipientSPKISHA256,
    ephemeralSPKISHA256:privateSHA(privateBase64(envelope.ephemeralSPKIDER,44,'EPHEMERAL_SPKI',44)),
    salt:envelope.salt,nonce:envelope.nonce});
}
function privateKDF(shared,salt,aad) {
  const length=Buffer.alloc(4); length.writeUInt32BE(aad.length);
  const info=Buffer.concat([Buffer.from('REA_VAULT_PRIVATE_EVIDENCE_V2\0','ascii'),length,aad]);
  return Buffer.from(privateCrypto.hkdfSync('sha256',shared,salt,info,32));
}
function privateExpectedPin(pin) {
  privateExactKeys(pin,['bytes','sha256'],'EXPECTED_ENVELOPE_KEYS');
  privateRequire(Number.isSafeInteger(pin.bytes) && pin.bytes>0 && pin.bytes<=privateEvidenceProtocol.caps.envelope &&
    typeof pin.sha256==='string' && /^[0-9a-f]{64}$/.test(pin.sha256),'EXPECTED_ENVELOPE_VALUE');
}
function privateEnvelopePin(bytes,pin) {
  privateExpectedPin(pin);
  privateRequire(Buffer.isBuffer(bytes) && bytes.length===pin.bytes && privateSHA(bytes)===pin.sha256,'EXPECTED_ENVELOPE_PIN');
}
function privatePublicMetadata(envelopeBytes,envelope) {
  const encodedCharacters=4*Math.ceil(envelopeBytes.length/3);
  return {schema:'rea-vault-private-evidence-log-header/v2',exportID:envelope.exportID,
    subject:envelope.subject,recipientSPKISHA256:envelope.recipientSPKISHA256,
    envelopeBytes:envelopeBytes.length,envelopeSHA256:privateSHA(envelopeBytes),
    base64Characters:encodedCharacters,chunkCharacters:8192,chunkCount:Math.ceil(encodedCharacters/8192)};
}
function privateLogRecords(envelopeBytes,envelope) {
  const header=privatePublicMetadata(envelopeBytes,envelope),encoded=envelopeBytes.toString('base64');
  privateRequire(header.chunkCount>=1 && header.chunkCount<=1536,'LOG_CHUNK_COUNT');
  const records=[privateEvidenceProtocol.logMagic+' HEADER '+privateJSON(header)];
  for(let index=1;index<=header.chunkCount;index++) records.push(privateEvidenceProtocol.logMagic+' CHUNK '+
    privateJSON({exportID:header.exportID,index,count:header.chunkCount,data:encoded.slice((index-1)*8192,index*8192)}));
  records.push(privateEvidenceProtocol.logMagic+' FOOTER '+privateJSON({schema:'rea-vault-private-evidence-log-footer/v2',
    exportID:header.exportID,chunkCount:header.chunkCount,envelopeBytes:header.envelopeBytes,envelopeSHA256:header.envelopeSHA256}));
  privateRequire(Buffer.byteLength(records.join('\n')+'\n','utf8')<=privateEvidenceProtocol.caps.log,'LOG_TOTAL_CAP');
  return {publicMetadata:header,logRecords:records};
}
function privateSealCore({subject,files,privateMetadata:metadata},recipientDER,recipientHash) {
  const boundSubject=privateSubject(subject),recipient=privateRecipient(recipientDER,recipientHash);
  const payload={schema:'rea-vault-private-evidence-payload/v2',subject:boundSubject,
    files:privateFileRows(files),privateMetadata:privateMetadata(metadata)};
  const plaintext=privateCanonicalBytes(payload);
  privateRequire(plaintext.length<=privateEvidenceProtocol.caps.plaintext,'PLAINTEXT_CAP');
  const pair=privateCrypto.generateKeyPairSync('x25519'),salt=privateCrypto.randomBytes(32),nonce=privateCrypto.randomBytes(12);
  const envelope={schema:privateEvidenceProtocol.schema,suite:privateEvidenceProtocol.suite,
    exportID:privateCrypto.randomBytes(16).toString('hex'),subject:boundSubject,recipientSPKISHA256:recipientHash,
    ephemeralSPKIDER:pair.publicKey.export({format:'der',type:'spki'}).toString('base64'),
    salt:salt.toString('base64'),nonce:nonce.toString('base64'),aadSHA256:null,ciphertextBytes:plaintext.length,ciphertext:null,tag:null};
  const aad=privateAAD(envelope); envelope.aadSHA256=privateSHA(aad);
  let shared,key;
  try {
    shared=privateCrypto.diffieHellman({privateKey:pair.privateKey,publicKey:recipient});
    privateRequire(shared.length===32 && shared.some(value=>value!==0),'SHARED_SECRET');
    key=privateKDF(shared,salt,aad);
    const cipher=privateCrypto.createCipheriv('aes-256-gcm',key,nonce,{authTagLength:16});
    cipher.setAAD(aad,{plaintextLength:plaintext.length});
    const ciphertext=Buffer.concat([cipher.update(plaintext),cipher.final()]);
    envelope.ciphertext=ciphertext.toString('base64'); envelope.tag=cipher.getAuthTag().toString('base64');
    const envelopeBytes=privateCanonicalBytes(envelope);
    privateRequire(envelopeBytes.length<=privateEvidenceProtocol.caps.envelope,'ENVELOPE_CAP');
    return {envelopeBytes,...privateLogRecords(envelopeBytes,envelope)};
  } catch(error) { if(error?.name==='PrivateEvidenceError') throw error; privateFail('ENCRYPTION_FAILED'); }
  finally { plaintext.fill(0); shared?.fill(0); key?.fill(0); }
}
export function sealPrivateEvidence({subject,files,privateMetadata}) {
  return privateSealCore({subject,files,privateMetadata},Buffer.from(privateEvidenceProtocol.publicRecipientDERBase64,'base64'),privateEvidenceProtocol.recipientSPKISHA256);
}
// END PRIVATE EVIDENCE PUBLIC PRODUCER V2

// BEGIN ROOT-ONLY PRIVATE EVIDENCE RECEIVER V2
const privateEnvelopeKeys=['schema','suite','exportID','subject','recipientSPKISHA256','ephemeralSPKIDER','salt','nonce','aadSHA256','ciphertextBytes','ciphertext','tag'];
function privateCheckEnvelope(bytes,expectedSubject,expectedEnvelope,recipientHash) {
  privateEnvelopePin(bytes,expectedEnvelope);
  const envelope=privateParseCanonical(bytes,privateEvidenceProtocol.caps.envelope,'ENVELOPE');
  privateExactKeys(envelope,privateEnvelopeKeys,'ENVELOPE_KEYS');
  privateRequire(envelope.schema===privateEvidenceProtocol.schema && envelope.suite===privateEvidenceProtocol.suite &&
    typeof envelope.exportID==='string' && /^[0-9a-f]{32}$/.test(envelope.exportID) &&
    envelope.recipientSPKISHA256===recipientHash,'ENVELOPE_SCHEMA');
  privateRequire(privateJSON(privateSubject(envelope.subject))===privateJSON(privateSubject(expectedSubject)),'ENVELOPE_SUBJECT');
  privateRecipient(privateBase64(envelope.ephemeralSPKIDER,44,'EPHEMERAL_SPKI',44),privateSHA(privateBase64(envelope.ephemeralSPKIDER,44,'EPHEMERAL_SPKI',44)));
  privateBase64(envelope.salt,32,'SALT',32); privateBase64(envelope.nonce,12,'NONCE',12); privateBase64(envelope.tag,16,'TAG',16);
  privateRequire(Number.isSafeInteger(envelope.ciphertextBytes) && envelope.ciphertextBytes>0 && envelope.ciphertextBytes<=privateEvidenceProtocol.caps.plaintext,'CIPHERTEXT_LENGTH');
  privateBase64(envelope.ciphertext,privateEvidenceProtocol.caps.plaintext,'CIPHERTEXT',envelope.ciphertextBytes);
  privateRequire(envelope.aadSHA256===privateSHA(privateAAD(envelope)),'AAD_DIGEST');
  return envelope;
}
function privateParseLogCore(logBytes,expectedSubject,expectedEnvelope,recipientHash) {
  privateExpectedPin(expectedEnvelope); privateSubject(expectedSubject);
  privateRequire(Buffer.isBuffer(logBytes) && logBytes.length>0 && logBytes.length<=privateEvidenceProtocol.caps.log,'LOG_BOUNDS');
  let text; try { text=new TextDecoder('utf-8',{fatal:true}).decode(logBytes); } catch { privateFail('LOG_UTF8'); }
  privateRequire(!text.includes('\u0000') && !text.startsWith('\uFEFF'),'LOG_ENCODING');
  const lines=text.split('\n'); privateRequire(lines.length<=privateEvidenceProtocol.caps.logLines,'LOG_LINE_CAP');
  let header=null,footer=null,next=1,encodedCharacters=0; const chunks=[];
  for(let lineIndex=0;lineIndex<lines.length;lineIndex++) {
    let line=lines[lineIndex];
    if(line.endsWith('\r')) line=line.slice(0,-1);
    privateRequire(!line.includes('\r'),'LOG_LINE_FORM');
    line=line.replace(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z /,'');
    privateRequire(!(line.length>=8 && line.length<privateEvidenceProtocol.logMagic.length && privateEvidenceProtocol.logMagic.startsWith(line)),'LOG_INTERRUPTED_MAGIC');
    if(!line.includes(privateEvidenceProtocol.logMagic)) continue;
    privateRequire(lineIndex<lines.length-1,'LOG_UNTERMINATED_RECORD');
    const prefix=privateEvidenceProtocol.logMagic+' ';
    privateRequire(line.startsWith(prefix) && Buffer.byteLength(line,'utf8')<=10000,'LOG_RECORD_PREFIX');
    const rest=line.slice(prefix.length),space=rest.indexOf(' ');
    privateRequire(space>0,'LOG_RECORD_KIND');
    const kind=rest.slice(0,space),body=rest.slice(space+1);
    let value; try { value=JSON.parse(body); } catch { privateFail('LOG_RECORD_JSON'); }
    privateRequire(privateJSON(value)===body,'LOG_RECORD_CANONICAL');
    if(kind==='HEADER') {
      privateRequire(header===null && footer===null && next===1,'LOG_HEADER_ORDER');
      privateExactKeys(value,['schema','exportID','subject','recipientSPKISHA256','envelopeBytes','envelopeSHA256','base64Characters','chunkCharacters','chunkCount'],'LOG_HEADER_KEYS');
      privateRequire(value.schema==='rea-vault-private-evidence-log-header/v2' && /^[0-9a-f]{32}$/.test(value.exportID) &&
        value.recipientSPKISHA256===recipientHash && privateJSON(privateSubject(value.subject))===privateJSON(privateSubject(expectedSubject)) &&
        value.envelopeBytes===expectedEnvelope.bytes && value.envelopeSHA256===expectedEnvelope.sha256 &&
        value.chunkCharacters===8192 && value.base64Characters===4*Math.ceil(value.envelopeBytes/3) &&
        Number.isSafeInteger(value.chunkCount) && value.chunkCount>=1 && value.chunkCount<=1536 &&
        value.chunkCount===Math.ceil(value.base64Characters/8192),'LOG_HEADER_VALUE');
      header=value;
    } else if(kind==='CHUNK') {
      privateRequire(header!==null && footer===null,'LOG_CHUNK_ORDER');
      privateExactKeys(value,['exportID','index','count','data'],'LOG_CHUNK_KEYS');
      privateRequire(value.exportID===header.exportID && value.index===next && value.count===header.chunkCount && next<=header.chunkCount &&
        typeof value.data==='string' && value.data.length===(next===header.chunkCount ? header.base64Characters-(next-1)*8192 : 8192),'LOG_CHUNK_VALUE');
      privateBase64(value.data,6144,'LOG_CHUNK_DATA'); chunks.push(value.data); encodedCharacters+=value.data.length; next++;
    } else if(kind==='FOOTER') {
      privateRequire(header!==null && footer===null && next===header.chunkCount+1,'LOG_FOOTER_ORDER');
      privateExactKeys(value,['schema','exportID','chunkCount','envelopeBytes','envelopeSHA256'],'LOG_FOOTER_KEYS');
      privateRequire(value.schema==='rea-vault-private-evidence-log-footer/v2' && value.exportID===header.exportID &&
        value.chunkCount===header.chunkCount && value.envelopeBytes===header.envelopeBytes && value.envelopeSHA256===header.envelopeSHA256,'LOG_FOOTER_VALUE');
      footer=value;
    } else privateFail('LOG_UNKNOWN_RECORD');
  }
  privateRequire(header!==null && footer!==null && encodedCharacters===header.base64Characters,'LOG_INCOMPLETE');
  const envelopeBytes=privateBase64(chunks.join(''),privateEvidenceProtocol.caps.envelope,'LOG_ENVELOPE',header.envelopeBytes);
  const envelope=privateCheckEnvelope(envelopeBytes,expectedSubject,expectedEnvelope,recipientHash);
  privateRequire(envelope.exportID===header.exportID && privateJSON(privatePublicMetadata(envelopeBytes,envelope))===privateJSON(header),'LOG_ENVELOPE_JOIN');
  return {envelopeBytes,publicMetadata:header};
}
export function parsePrivateEvidenceLog({logBytes,expectedSubject,expectedEnvelope}) {
  privateSubject(expectedSubject); privateExpectedPin(expectedEnvelope);
  return privateParseLogCore(logBytes,expectedSubject,expectedEnvelope,privateEvidenceProtocol.recipientSPKISHA256);
}
function privateDecodePayload(plaintext,expectedSubject) {
  const payload=privateParseCanonical(plaintext,privateEvidenceProtocol.caps.plaintext,'PAYLOAD');
  privateExactKeys(payload,['schema','subject','files','privateMetadata'],'PAYLOAD_KEYS');
  privateRequire(payload.schema==='rea-vault-private-evidence-payload/v2' &&
    privateJSON(privateSubject(payload.subject))===privateJSON(privateSubject(expectedSubject)) && Array.isArray(payload.files) && payload.files.length<=3,'PAYLOAD_SCHEMA');
  privateMetadata(payload.privateMetadata);
  let previous=-1,total=0; const files=Object.create(null);
  for(const row of payload.files) {
    privateExactKeys(row,['name','bytes','sha256','base64'],'PAYLOAD_FILE_KEYS');
    const position=privateSlots.indexOf(row.name);
    privateRequire(position>previous && Number.isSafeInteger(row.bytes) && row.bytes>=0 && row.bytes<=privateSlotCaps[position] &&
      typeof row.sha256==='string' && /^[0-9a-f]{64}$/.test(row.sha256),'PAYLOAD_FILE_VALUE');
    const bytes=privateBase64(row.base64,privateSlotCaps[position],'PAYLOAD_FILE',row.bytes);
    privateRequire(privateSHA(bytes)===row.sha256,'PAYLOAD_FILE_DIGEST');
    total+=bytes.length; privateRequire(total<=privateEvidenceProtocol.caps.rawFiles,'PAYLOAD_FILES_TOTAL');
    files[row.name]=bytes; previous=position;
  }
  return {payload,files};
}
function privateDecryptCore(envelopeBytes,expectedSubject,expectedEnvelope,privateKey,recipientHash) {
  const envelope=privateCheckEnvelope(envelopeBytes,expectedSubject,expectedEnvelope,recipientHash);
  privateRequire(privateKey?.asymmetricKeyType==='x25519','PRIVATE_KEY_TYPE');
  const publicDER=privateCrypto.createPublicKey(privateKey).export({format:'der',type:'spki'});
  privateRequire(publicDER.length===44 && privateSHA(publicDER)===recipientHash,'PRIVATE_KEY_RECIPIENT');
  let shared,key,plaintext;
  try {
    const ephemeral=privateCrypto.createPublicKey({key:privateBase64(envelope.ephemeralSPKIDER,44,'EPHEMERAL_SPKI',44),format:'der',type:'spki'});
    shared=privateCrypto.diffieHellman({privateKey,publicKey:ephemeral});
    privateRequire(shared.length===32 && shared.some(value=>value!==0),'SHARED_SECRET');
    key=privateKDF(shared,privateBase64(envelope.salt,32,'SALT',32),privateAAD(envelope));
    const decipher=privateCrypto.createDecipheriv('aes-256-gcm',key,privateBase64(envelope.nonce,12,'NONCE',12),{authTagLength:16});
    decipher.setAAD(privateAAD(envelope),{plaintextLength:envelope.ciphertextBytes});
    decipher.setAuthTag(privateBase64(envelope.tag,16,'TAG',16));
    plaintext=Buffer.concat([decipher.update(privateBase64(envelope.ciphertext,privateEvidenceProtocol.caps.plaintext,'CIPHERTEXT',envelope.ciphertextBytes)),decipher.final()]);
    privateRequire(plaintext.length===envelope.ciphertextBytes,'DECRYPTED_LENGTH');
    return {plaintext,...privateDecodePayload(plaintext,expectedSubject)};
  } catch(error) { plaintext?.fill(0); if(error?.name==='PrivateEvidenceError') throw error; privateFail('AUTHENTICATION_OR_DECRYPTION_FAILED'); }
  finally { shared?.fill(0); key?.fill(0); }
}
function privatePathEqual(first,second) { return process.platform==='win32' ? first.toLowerCase()===second.toLowerCase() : first===second; }
function privateStable(first,second) {
  return first.dev===second.dev && first.ino===second.ino && first.size===second.size && first.mtimeNs===second.mtimeNs && first.ctimeNs===second.ctimeNs;
}
async function privateOrdinaryAncestors(path,includeLeafDirectory) {
  privateRequire(typeof path==='string' && privatePath.isAbsolute(path) && privatePath.resolve(path)===path,'BACKUP_ABSOLUTE_PATH');
  const target=includeLeafDirectory ? path : privatePath.dirname(path),parsed=privatePath.parse(target),parts=target.slice(parsed.root.length).split(privatePath.sep).filter(Boolean);
  let current=parsed.root;
  for(const part of parts) {
    current=privatePath.join(current,part); const stat=await privateFs.lstat(current,{bigint:true});
    privateRequire(stat.isDirectory() && !stat.isSymbolicLink(),'BACKUP_DIRECTORY_TYPE');
    privateRequire(privatePathEqual(await privateFs.realpath(current),current),'BACKUP_DIRECTORY_REALPATH');
  }
}
async function privateReadOrdinary(path,cap) {
  await privateOrdinaryAncestors(path,false);
  const before=await privateFs.lstat(path,{bigint:true});
  privateRequire(before.isFile() && !before.isSymbolicLink() && before.nlink===1n && before.size>=0n && before.size<=BigInt(cap),'BACKUP_FILE_TYPE_OR_CAP');
  privateRequire(privatePathEqual(await privateFs.realpath(path),path),'BACKUP_FILE_REALPATH');
  const handle=await privateFs.open(path,'r');
  try {
    const opened=await handle.stat({bigint:true});
    privateRequire(opened.isFile() && opened.dev===before.dev && opened.ino===before.ino && opened.size===before.size && opened.mtimeNs===before.mtimeNs &&
      ((opened.birthtimeNs===undefined && before.birthtimeNs===undefined) || opened.birthtimeNs===before.birthtimeNs),'BACKUP_FILE_CROSS_VIEW');
    const storage=Buffer.alloc(cap+1); let offset=0;
    while(offset<storage.length) { const read=await handle.read(storage,offset,storage.length-offset,offset); if(read.bytesRead===0) break; offset+=read.bytesRead; }
    const bytes=Buffer.from(storage.subarray(0,offset)); storage.fill(0);
    privateRequire(bytes.length<=cap && BigInt(bytes.length)===opened.size && privateStable(opened,await handle.stat({bigint:true})),'BACKUP_FILE_STABILITY');
    privateRequire(privateStable(before,await privateFs.lstat(path,{bigint:true})),'BACKUP_PATH_STABILITY');
    return bytes;
  } finally { await handle.close(); }
}
async function privateCreateNewReadback(path,bytes) {
  const handle=await privateFs.open(path,'wx',0o600);
  try { await handle.writeFile(bytes); await handle.sync(); } finally { await handle.close(); }
  const readback=await privateReadOrdinary(path,Math.max(bytes.length,1));
  privateRequire(readback.equals(bytes),'BACKUP_READBACK_MISMATCH');
}
export async function receivePrivateEvidence({logBytes,envelopeBytes,expectedSubject,expectedEnvelope,privateKeyFile,privateBackupRoot,outputDirectory,rootOnlyBackup,ownerOnlyParentACLVerified}) {
  privateRequire(rootOnlyBackup===true && ownerOnlyParentACLVerified===true && process.env.GITHUB_ACTIONS!=='true','ROOT_ONLY_BACKUP_REQUIRED');
  privateSubject(expectedSubject);
  privateRequire((Buffer.isBuffer(logBytes) && envelopeBytes===undefined) || (Buffer.isBuffer(envelopeBytes) && logBytes===undefined),'EXACTLY_ONE_TRANSPORT');
  const transport=logBytes!==undefined ? privateParseLogCore(logBytes,expectedSubject,expectedEnvelope,privateEvidenceProtocol.recipientSPKISHA256) :
    {envelopeBytes,publicMetadata:privatePublicMetadata(envelopeBytes,privateCheckEnvelope(envelopeBytes,expectedSubject,expectedEnvelope,privateEvidenceProtocol.recipientSPKISHA256))};
  // All ciphertext/context/pins are validated before any private-key path is read.
  privateRequire(typeof privateKeyFile==='string' && typeof privateBackupRoot==='string' && typeof outputDirectory==='string' &&
    privatePath.isAbsolute(privateBackupRoot) && privatePath.isAbsolute(outputDirectory) &&
    privatePath.dirname(outputDirectory)===privateBackupRoot && /^[a-z0-9][a-z0-9-]{7,95}$/.test(privatePath.basename(outputDirectory)),'BACKUP_DESTINATION');
  await privateOrdinaryAncestors(privateBackupRoot,true);
  let keyBytes,decrypted;
  try {
    keyBytes=await privateReadOrdinary(privateKeyFile,8192);
    let key; try { key=privateCrypto.createPrivateKey({key:keyBytes,format:'pem',type:'pkcs8'}); } catch { privateFail('PRIVATE_KEY_PARSE'); }
    decrypted=privateDecryptCore(transport.envelopeBytes,expectedSubject,expectedEnvelope,key,privateEvidenceProtocol.recipientSPKISHA256);
    await privateFs.mkdir(outputDirectory,{mode:0o700}); // EEXIST is a terminal failure; never overwrite/reuse a directory.
    await privateOrdinaryAncestors(outputDirectory,true);
    await privateCreateNewReadback(privatePath.join(outputDirectory,'envelope.json'),transport.envelopeBytes);
    await privateCreateNewReadback(privatePath.join(outputDirectory,'private-payload.json'),decrypted.plaintext);
    for(const name of privateSlots) if(Object.hasOwn(decrypted.files,name)) await privateCreateNewReadback(privatePath.join(outputDirectory,name),decrypted.files[name]);
    const receipt={schema:'rea-vault-private-portable-backup-readback/v2',subject:privateSubject(expectedSubject),
      envelope:{bytes:transport.envelopeBytes.length,sha256:privateSHA(transport.envelopeBytes)},exportID:transport.publicMetadata.exportID,
      transport:{kind:logBytes!==undefined?'complete-supported-job-log':'bound-ordinary-envelope',bytes:(logBytes??envelopeBytes).length,sha256:privateSHA(logBytes??envelopeBytes)},
      recipientSPKISHA256:privateEvidenceProtocol.recipientSPKISHA256,
      privatePayloadBytes:decrypted.plaintext.length,fileCount:decrypted.payload.files.length,
      rootOnlyBackup:true,ownerOnlyParentACLVerifiedByCaller:true,createNewOnly:true,allContentReadbacksEqual:true,
      backupComplete:true,productAcceptance:false,runtimeAcceptance:false,R3CauseProven:false};
    await privateCreateNewReadback(privatePath.join(outputDirectory,'PRIVATE-BACKUP-READBACK.json'),privateCanonicalBytes(receipt));
    return receipt;
  } catch(error) { if(error?.name==='PrivateEvidenceError') throw error; privateFail('PRIVATE_BACKUP_INCOMPLETE'); }
  finally { keyBytes?.fill(0); decrypted?.plaintext.fill(0); if(decrypted) for(const bytes of Object.values(decrypted.files)) bytes.fill(0); }
}
// END ROOT-ONLY PRIVATE EVIDENCE RECEIVER V2

// Optional synthetic diagnostics: source only, future independently admitted CLOUD invocation only.
// No owner key, file, child, product import, socket, acquisition or network is used.
export function runCloudOnlyPrivateEvidenceDiagnostics() {
  privateRequire(process.env.GITHUB_ACTIONS==='true' && process.platform==='win32','CLOUD_DIAGNOSTICS_ONLY');
  const pair=privateCrypto.generateKeyPairSync('x25519'),der=pair.publicKey.export({format:'der',type:'spki'}),hash=privateSHA(der);
  const subject={repository:'Ginderlax/rea-research-lab',source:'1'.repeat(40),parent:'3f77897f8782093b6e828987ac9105b6b782e705',tree:'2'.repeat(40),
    branch:'refs/heads/validation/vault-http-native-integration-20261023-r4',run:'1',attempt:'1',job:'vault-http-native-integration'};
  const sealed=privateSealCore({subject,files:{'module-stdout.bin':Buffer.alloc(7000,0x53),'module-stderr.bin':Buffer.from('synthetic stderr\n'),'history-http.json':Buffer.from('{"synthetic":true}\n')},
    privateMetadata:{schema:'rea-vault-focused-private-details/v2',details:{syntheticOnly:true}}},der,hash);
  const pin={bytes:sealed.envelopeBytes.length,sha256:privateSHA(sealed.envelopeBytes)},log=Buffer.from(sealed.logRecords.join('\n')+'\n');
  const checks=[];
  const positive=(name,operation)=>{ operation(); checks.push({name,passed:true}); };
  const negative=(name,expectedCode,operation)=>{
    let actualCode=null; try { operation(); } catch(error) { if(error?.name==='PrivateEvidenceError') actualCode=error.code; }
    privateRequire(actualCode===expectedCode,'DIAGNOSTIC_REJECTION_CODE'); checks.push({name,passed:true});
  };
  const logOf=records=>Buffer.from(records.join('\n')+'\n');
  positive('canonical ordered complete log',()=>privateParseLogCore(log,subject,pin,hash));
  positive('timestamp-prefixed supported log',()=>privateParseLogCore(logOf(sealed.logRecords.map(row=>'2026-10-23T00:00:00.0000000Z '+row)),subject,pin,hash));
  positive('authenticated payload and three synthetic files',()=>{ const result=privateDecryptCore(sealed.envelopeBytes,subject,pin,pair.privateKey,hash); privateRequire(result.payload.files.length===3,'DIAGNOSTIC_PAYLOAD'); result.plaintext.fill(0); for(const bytes of Object.values(result.files)) bytes.fill(0); });
  negative('duplicate header','LOG_HEADER_ORDER',()=>privateParseLogCore(logOf([sealed.logRecords[0],...sealed.logRecords]),subject,pin,hash));
  negative('missing first chunk','LOG_CHUNK_VALUE',()=>privateParseLogCore(logOf(sealed.logRecords.filter((_,index)=>index!==1)),subject,pin,hash));
  negative('reordered chunks','LOG_CHUNK_VALUE',()=>privateParseLogCore(logOf([sealed.logRecords[0],sealed.logRecords[2],sealed.logRecords[1],...sealed.logRecords.slice(3)]),subject,pin,hash));
  negative('duplicate chunk','LOG_CHUNK_VALUE',()=>privateParseLogCore(logOf([sealed.logRecords[0],sealed.logRecords[1],...sealed.logRecords.slice(1)]),subject,pin,hash));
  negative('footer before chunk','LOG_FOOTER_ORDER',()=>privateParseLogCore(logOf([sealed.logRecords[0],sealed.logRecords.at(-1),...sealed.logRecords.slice(1,-1)]),subject,pin,hash));
  negative('duplicate footer','LOG_FOOTER_ORDER',()=>privateParseLogCore(logOf([...sealed.logRecords,sealed.logRecords.at(-1)]),subject,pin,hash));
  negative('missing footer','LOG_INCOMPLETE',()=>privateParseLogCore(logOf(sealed.logRecords.slice(0,-1)),subject,pin,hash));
  negative('truncated record','LOG_RECORD_JSON',()=>privateParseLogCore(logOf([...sealed.logRecords.slice(0,-1),sealed.logRecords.at(-1).slice(0,-1)]),subject,pin,hash));
  negative('interrupted second magic','LOG_INTERRUPTED_MAGIC',()=>privateParseLogCore(logOf([...sealed.logRecords,'REA_VAULT_PRIV']),subject,pin,hash));
  negative('wrong expected digest','LOG_HEADER_VALUE',()=>privateParseLogCore(log,subject,{bytes:pin.bytes,sha256:'0'.repeat(64)},hash));
  negative('wrong run binding','LOG_HEADER_VALUE',()=>privateParseLogCore(log,{...subject,run:'2'},pin,hash));
  negative('noncanonical envelope newline','ENVELOPE_CANONICAL',()=>privateCheckEnvelope(Buffer.concat([sealed.envelopeBytes,Buffer.from('\n')]),subject,{bytes:pin.bytes+1,sha256:privateSHA(Buffer.concat([sealed.envelopeBytes,Buffer.from('\n')]))},hash));
  const altered=JSON.parse(sealed.envelopeBytes.toString('utf8')),tag=Buffer.from(altered.tag,'base64'); tag[0]^=1; altered.tag=tag.toString('base64'); const alteredBytes=privateCanonicalBytes(altered);
  negative('wrong GCM tag despite fresh outer pin','AUTHENTICATION_OR_DECRYPTION_FAILED',()=>privateDecryptCore(alteredBytes,subject,{bytes:alteredBytes.length,sha256:privateSHA(alteredBytes)},pair.privateKey,hash));
  negative('wrong recipient private key','PRIVATE_KEY_RECIPIENT',()=>privateDecryptCore(sealed.envelopeBytes,subject,pin,privateCrypto.generateKeyPairSync('x25519').privateKey,hash));
  negative('unsupported suite','ENVELOPE_SCHEMA',()=>{ const value={...altered,suite:'unsupported'}; const bytes=privateCanonicalBytes(value); privateCheckEnvelope(bytes,subject,{bytes:bytes.length,sha256:privateSHA(bytes)},hash); });
  negative('unknown private metadata key','PRIVATE_METADATA_KEYS',()=>privateMetadata({schema:'rea-vault-focused-private-details/v2',details:{},extra:true}));
  negative('noncanonical Base64','DIAGNOSTIC_BASE64_CANONICAL',()=>privateBase64('AB==',1,'DIAGNOSTIC_BASE64',1));
  negative('stdout cap','PRIVATE_FILE_CAP',()=>privateFileRows({'module-stdout.bin':Buffer.alloc(1048577)}));
  negative('envelope expected cap','EXPECTED_ENVELOPE_VALUE',()=>privateParseLogCore(log,subject,{bytes:9437185,sha256:'0'.repeat(64)},hash));
  return {schema:'rea-vault-private-evidence-cloud-synthetic-diagnostics/v2',checks,failedChecks:0,
    ownerPrivateKeyAccess:false,productExecution:false,portableBackupEstablished:false,productAcceptance:false,runtimeAcceptance:false,R3CauseProven:false};
}


async function ctlTry(stage,operation){ctlStage=stage;ctlDetails.stage=stage;try{const value=await operation();ctlNote(stage,true);return {ok:true,value};}catch(error){ctlRecordFailure(stage,error);return {ok:false,value:null};}}
async function ctlRequired(stage,operation){const result=await ctlTry(stage,operation);if(!result.ok)throw new Error('CTL_RECORDED_PHASE_FAILURE');return result.value;}
async function ctlLogLine(line){ctlAssert.equal(typeof line,'string');ctlAssert(!line.includes('\n')&&!line.includes('\r')&&Buffer.byteLength(line)<=1048576);await new Promise((resolve,reject)=>process.stdout.write(line+'\n',error=>error?reject(error):resolve()));}
function ctlOwnedIdentityCheck(){if(ctlReport.reportRoot)ctlReport.reportRoot.lastIdentityRecheckPassed=false;ctlAssert(ctlOwned&&ctlOwned.identity);ctlDirectory(ctlOwned.root);const st=ctlFs.lstatSync(ctlOwned.root,{bigint:true});ctlAssert.equal(st.dev,ctlOwned.identity.dev);ctlAssert.equal(st.ino,ctlOwned.identity.ino);if(ctlReport.reportRoot)ctlReport.reportRoot.lastIdentityRecheckPassed=true;}
async function ctlMain(){
  const controllerStarted=performance.now();
  let platform=null,temp=null,runtime=null,observation=null,fixtureWasAbsent=false,sourceBefore=null,sourceAfter=null,privateResult=null;
  const files={};
  try{
    platform=await ctlRequired('PLATFORM',async()=>{
      const value=ctlPlatform();ctlRepository=value.repo;ctlEnvironment=ctlClosedEnvironment(value);
      ctlDirectory(ctlPath.join(ctlRepository,'.git'));
      ctlSubject={repository:CTL_REPOSITORY,source:value.source,parent:CTL_PARENT,tree:null,branch:CTL_BRANCH,run:value.run,attempt:value.attempt,job:CTL_JOB};
      ctlReport.platform=value.public;
      ctlReport.environment={...ctlEnvironment.public,actualEffectiveWinPSModuleRosterKnown:false,actualEffectiveWinPSModuleBodiesAuthenticated:false,defaultInitializationMayUseTrustedOSAndUserConfiguration:true};
      return value;
    });
    await ctlRequired('EARLY_REPORT_ROOT',async()=>{
      const root=ctlPath.join(platform.runnerTemp,'rea-vault-http-native-integration-'+platform.run+'-'+platform.attempt);
      ctlAssert(!ctlExists(root));ctlFs.mkdirSync(root,{recursive:false,mode:0o700});ctlDirectory(root);
      const stat=ctlFs.lstatSync(root,{bigint:true});ctlOwned={root,identity:{dev:stat.dev,ino:stat.ino},reportOnly:true,workCreated:false};
      ctlReport.reportRoot={earlyReportOnlyRootCreated:true,identityCaptured:true,lastIdentityRecheckPassed:false};ctlOwnedIdentityCheck();return true;
    });
    sourceBefore=await ctlRequired('SOURCE_BEFORE',async()=>{
      const value=ctlSourceGuard();ctlReport.sourceBefore=value;ctlReport.subject={...ctlSubject};return value;
    });
    await ctlRequired('PRIVATE_PROTOCOL_SYNTHETICS',async()=>{
      const value=runCloudOnlyPrivateEvidenceDiagnostics();
      ctlReport.privateProtocolDiagnostics=value;
      ctlAssert.equal(value.checks.length,22);ctlAssert.equal(value.failedChecks,0);
      ctlAssert(value.checks.every(row=>row.passed===true));
      ctlAssert.equal(value.ownerPrivateKeyAccess,false);ctlAssert.equal(value.portableBackupEstablished,false);
      return true;
    });
    await ctlRequired('OWNED_OUTPUTS',async()=>{
      ctlOwnedIdentityCheck();const root=ctlOwned.root;ctlAssert(ctlOwned.reportOnly===true&&ctlOwned.workCreated===false);
      const nextTemp=ctlPath.join(root,'work');ctlFs.mkdirSync(nextTemp,{recursive:false,mode:0o700});ctlDirectory(nextTemp);const workStat=ctlFs.lstatSync(nextTemp,{bigint:true});ctlOwned.workIdentity={dev:workStat.dev,ino:workStat.ino};temp=nextTemp;ctlOwned.workCreated=true;ctlOwned.reportOnly=false;
      const fixture=ctlPath.join(ctlRepository,'.local','vault-history-fixtures');
      ctlAssert(!ctlExists(fixture));fixtureWasAbsent=true;
      if(ctlExists(ctlPath.join(ctlRepository,'.local')))ctlDirectory(ctlPath.join(ctlRepository,'.local'));
      return true;
    });
    await ctlRequired('FRESH_VENDOR',async()=>{
      ctlOwnedIdentityCheck();ctlVendorAcquisitionAttempted=true;
      try{ctlVendor=await acquireVendor({ownedRoot:ctlOwned.root,subject:ctlSubject});}catch(error){ctlVendorAcquisitionCleanupComplete=typeof error.vendorCleanupComplete==='boolean'?error.vendorCleanupComplete:false;throw error;}
      ctlReport.vendor={acquisition:ctlVendor.metadata,before:null,after:null,cleanup:null};
      ctlReport.vendor.before=await ctlVendor.verifyVendorUnchanged();return true;
    });
    runtime=await ctlRequired('ORIGINAL_TWO_TEST_CAPTURE',async()=>{
      const value=await ctlRunOriginalTests(platform.node,ctlTestEnvironment(temp,ctlVendor.exePath));
      ctlReport.module=value.record;files['module-stdout.bin']=value.stdout;files['module-stderr.bin']=value.stderr;return value;
    });
    await ctlTry('MODULE_OUTCOME',async()=>{
      const row=runtime.record;
      ctlAssert(row.spawnAttempted&&row.spawned&&row.exitObserved&&row.exitEventCode===0&&row.exitEventSignal===null&&row.closeObserved&&row.exitCode===0&&row.signal===null&&!row.spawnError&&!row.deadlineObserved&&!row.overflow&&!row.closeWaitExpired&&!row.treeKillAttempted&&row.stdoutDroppedBytes===0&&row.stderrDroppedBytes===0);return true;
    });
    await ctlTry('COMPLETE_ORIGINAL_TAP',async()=>{
      ctlReport.TAP=ctlInspectTAP(runtime.stdout);ctlAssert(ctlReport.TAP.completeSuccess);return true;
    });
    await ctlTry('PRIVATE_AFTERHOOK_AND_NATIVE',async()=>{
      observation=ctlObservation(runtime.stdout,runtime.record.launcherPID,temp,ctlVendor.exePath);
      files['history-http.json']=observation.raw;ctlReport.observation=observation.public;
      ctlAssert(observation.validated);ctlAssert(ctlObservationInventory(observation));return true;
    });
  }catch(error){if(error.message!=='CTL_RECORDED_PHASE_FAILURE')ctlRecordFailure('CONTROLLER_BODY',error);}
  // Retain all postchecks after a target failure. A success TAP cannot bypass cleanup/source checks.
  if(ctlVendor)await ctlTry('VENDOR_AFTER',async()=>{ctlReport.vendor.after=await ctlVendor.verifyVendorUnchanged();return true;});
  if(sourceBefore)await ctlTry('SOURCE_AFTER',async()=>{sourceAfter=ctlSourceGuard();ctlAssert.deepEqual(sourceAfter,sourceBefore);ctlReport.sourceAfter=sourceAfter;return true;});
  const childTerminationObserved=runtime===null||runtime.record.closeObserved;
  const cleanup={childTerminationObserved,vendorAcquisitionAttempted:ctlVendorAcquisitionAttempted,vendorAcquisitionFailureCleanupComplete:ctlVendorAcquisitionCleanupComplete,vendorRemoved:ctlVendor===null&&(!ctlVendorAcquisitionAttempted||ctlVendorAcquisitionCleanupComplete===true),workRemoved:temp===null,observationRemoved:!fixtureWasAbsent,allCompleted:false,unsafePathsFollowed:false};
  if(ctlVendor)await ctlTry('VENDOR_CLEANUP',async()=>{ctlAssert(childTerminationObserved);const result=await ctlVendor.cleanup();ctlAssert(result.removed);cleanup.vendorRemoved=true;if(ctlReport.vendor)ctlReport.vendor.cleanup=result;return true;});
  if(temp&&ctlOwned)await ctlTry('WORK_CLEANUP',async()=>{ctlAssert(childTerminationObserved);ctlOwnedIdentityCheck();const workStat=ctlFs.lstatSync(temp,{bigint:true});ctlAssert.equal(workStat.dev,ctlOwned.workIdentity.dev);ctlAssert.equal(workStat.ino,ctlOwned.workIdentity.ino);cleanup.work=ctlSafeRemove(temp,ctlOwned.root);cleanup.workRemoved=true;return true;});
  if(fixtureWasAbsent)await ctlTry('OBSERVATION_CLEANUP',async()=>{
    ctlAssert(childTerminationObserved);
    const fixture=ctlPath.join(ctlRepository,'.local','vault-history-fixtures');
    if(ctlExists(fixture)){ctlAssert(observation!==null);ctlObservationInventory(observation);cleanup.observation=ctlSafeRemove(fixture,ctlPath.join(ctlRepository,'.local'),{maxFiles:1,maxBytes:CTL_OBSERVATION_CAP,maxDepth:3});}
    cleanup.observationRemoved=true;return true;
  });
  cleanup.allCompleted=cleanup.vendorRemoved&&cleanup.workRemoved&&cleanup.observationRemoved;
  ctlReport.cleanup=cleanup;ctlDetails.cleanup=cleanup;
  ctlReport.runtimeAssertionsPassed=Boolean(sourceBefore&&sourceAfter&&runtime&&ctlReport.privateProtocolDiagnostics?.failedChecks===0&&ctlReport.TAP?.completeSuccess&&ctlReport.observation?.successPathCountsMatched&&ctlReport.module.closeObserved&&ctlReport.module.exitCode===0&&ctlReport.module.signal===null&&!ctlReport.module.deadlineObserved&&!ctlReport.module.overflow&&cleanup.allCompleted&&ctlDetails.errors.length===0);
  ctlDetails.stage=ctlStage;
  if(sourceBefore&&ctlReport.privateProtocolDiagnostics?.failedChecks===0&&ctlOwned?.workCreated===true&&ctlSubject&&/^[0-9a-f]{40}$/.test(ctlSubject.tree||'')&&ctlOwned)await ctlTry('PRIVATE_ENVELOPE_AND_READBACK',async()=>{
    ctlOwnedIdentityCheck();
    privateResult=sealPrivateEvidence({subject:ctlSubject,files,privateMetadata:{schema:CTL_PRIVATE_SCHEMA,details:ctlDetails}});
    ctlAssert(Buffer.isBuffer(privateResult.envelopeBytes));
    const readback=ctlWriteNew(ctlOwned.root,'encrypted-private-evidence.json',privateResult.envelopeBytes);
    ctlReport.privateExport={...privateResult.publicMetadata,localCiphertextWriteReadbackVerified:true,localCiphertextSHA256:readback.sha256,completeSupportedLogRetrievalObserved:false,independentReceiverRecoveryObserved:false,privateBackupAcceptance:false};return true;
  });
  ctlReport.elapsedControllerBeforeLogMs=Math.round(performance.now()-controllerStarted);
  ctlReport.status=ctlDetails.errors.length===0&&ctlReport.runtimeAssertionsPassed&&privateResult?'focused-two-http-native-complete-private-recovery-pending':'focused-negative-or-guard-failure';
  ctlReport.failureStages=ctlReport.stages.filter(row=>!row.passed).map(row=>row.stage);
  ctlReport.privatePortableRecoveryQualified=false;ctlReport.scopedApplicationHTTPNativeAcceptance=false;
  if(ctlOwned){try{ctlOwnedIdentityCheck();const bytes=ctlWire(ctlReport);ctlAssert(bytes.length<=1048576);ctlWriteNew(ctlOwned.root,'public-report.json',bytes);}catch(error){ctlRecordFailure('PUBLIC_REPORT_WRITE_READBACK',error);ctlReport.status='focused-negative-or-guard-failure';ctlReport.failureStages=ctlReport.stages.filter(row=>!row.passed).map(row=>row.stage);}}
  try{
    if(privateResult)for(const line of privateResult.logRecords)await ctlLogLine(line);
    const finalBytes=ctlWire(ctlReport);ctlAssert(finalBytes.length<=1048576);
    await ctlLogLine(CTL_PUBLIC_PREFIX+finalBytes.toString('utf8').trimEnd());
  }catch(error){ctlRecordFailure('CLOSED_LOG_PUBLICATION',error);try{await ctlLogLine(CTL_PUBLIC_PREFIX+JSON.stringify({schema:'rea-vault-focused-http-native-publication-failure/v3',status:'closed-log-publication-failure',source:ctlSubject?.source??null,productAcceptance:false,semanticAcceptance:false,fullParity:false,R3CauseProven:false,rawErrorPublished:false}));}catch{}}
  if(ctlDetails.errors.length>0||!ctlReport.runtimeAssertionsPassed||privateResult===null)process.exitCode=1;
}
ctlMain().catch(async()=>{process.exitCode=1;try{await ctlLogLine(CTL_PUBLIC_PREFIX+JSON.stringify({schema:'rea-vault-focused-http-native-controller-failure/v3',status:'controller-terminal-failure',stage:ctlStage,rawErrorPublished:false,productAcceptance:false,semanticAcceptance:false,fullParity:false,R3CauseProven:false}));}catch{}});
