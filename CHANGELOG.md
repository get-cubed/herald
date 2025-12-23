# Changelog

## [1.1.0](https://github.com/get-cubed/herald/compare/herald-v1.0.0...herald-v1.1.0) (2025-12-23)


### Features

* add activate_editor option to TTS output preferences ([1ce0669](https://github.com/get-cubed/herald/commit/1ce06699a1424a8cebca9aafeb03e7540bd4253b))
* add CI and release workflows with release drafter configuration ([520b94a](https://github.com/get-cubed/herald/commit/520b94a17c7ceed3f56445a8619721f5b486e375))
* add CODEOWNERS file to define repository ownership ([e3338c1](https://github.com/get-cubed/herald/commit/e3338c12dea2351f2d96470ee5db5ae77946f517))
* add editor activation preference and update related functionality ([2decb6c](https://github.com/get-cubed/herald/commit/2decb6c36ecb6279334f8b36612d4977b88a0ba2))
* add herald plugin for configurable notifications with TTS and alerts ([89fcb63](https://github.com/get-cubed/herald/commit/89fcb63fdad2b3643c272a71ee2ce3f72556c9dc))
* add icon image to README for improved visual appeal ([132e7ac](https://github.com/get-cubed/herald/commit/132e7acc356bca53239fdf5bac57b81e679097aa))
* add README for Herald plugin with features, installation, and configuration details ([50320c9](https://github.com/get-cubed/herald/commit/50320c9dd441e44c5a2580fc44fd03aed39afb62))
* enhance audio functions to accept project names for better window management ([417fd37](https://github.com/get-cubed/herald/commit/417fd37e3de989339c511dd504a5fe3fa2390e00))
* implement TTS provider support with ElevenLabs, macOS, and Windows integration ([a37054d](https://github.com/get-cubed/herald/commit/a37054d5d441f0d90ebd0f0eb4e3ee52f78854fc))
* remove silent notification style and update related documentation ([2152f55](https://github.com/get-cubed/herald/commit/2152f55fb68252173770e9c9cb92c4398911746c))
* replace release-drafter with release-please for automated releases ([#3](https://github.com/get-cubed/herald/issues/3)) ([90a44e9](https://github.com/get-cubed/herald/commit/90a44e9c7c942b19867e432cf17267433ddb618d))


### Bug Fixes

* add logging to on-stop hook for better debugging and session management ([6120e26](https://github.com/get-cubed/herald/commit/6120e2666e4c5da68d77f2e76d6bfb4f6ae2f8ce))
* commit version bump back to main after release ([#2](https://github.com/get-cubed/herald/issues/2)) ([b721ceb](https://github.com/get-cubed/herald/commit/b721cebf316a5ea761934de72d83da7985a51e0e))
* implement global TTS lock to prevent duplicate plays across sessions ([931a205](https://github.com/get-cubed/herald/commit/931a2051151396bca10293b89e56425c303a25d6))
* implement session locking to prevent duplicate TTS plays ([d1434e6](https://github.com/get-cubed/herald/commit/d1434e65d5d5616d1ead9bf8045cc803151430da))
* pass prompt via stdin to avoid shell escaping issues ([d5c95c6](https://github.com/get-cubed/herald/commit/d5c95c69cbd25eb08c35245736d021703af7b173))
* remove /usr/bin/env prefix from hook commands for consistency ([14326f6](https://github.com/get-cubed/herald/commit/14326f69b5bc4f6d770d425eda33b7d2aeea5113))
* remove tools flag, use haiku for fast summarization ([70b7fb7](https://github.com/get-cubed/herald/commit/70b7fb7a6b47124effd25c5535600c17b0941783))
* remove unnecessary hooks entry from plugin configuration ([26ab662](https://github.com/get-cubed/herald/commit/26ab662686f01565c3721738ac3ce738c87bd2a5))
* resolve code scanning security alerts ([#1](https://github.com/get-cubed/herald/issues/1)) ([335c555](https://github.com/get-cubed/herald/commit/335c5556cace9cb65f2852db05440d26fb327925))
* stricter TTS prompt for better word limit compliance ([92dd52e](https://github.com/get-cubed/herald/commit/92dd52e2624839ec9249030a095e80fe3d003da3))
* update image path in README and add icon file ([34398e7](https://github.com/get-cubed/herald/commit/34398e7340cdeb190b9d623c2175c357ba0a556c))
* update permissions in release drafter workflow to allow write access ([f6b3b61](https://github.com/get-cubed/herald/commit/f6b3b6197b11fb1176f44c2dedaac56bf0b6af15))
* use /usr/bin/env for node path resolution and increase timeout ([c2443bb](https://github.com/get-cubed/herald/commit/c2443bb8b115a002d104e09b3e15ad0a9195cb17))
* use correct claude CLI flags for summarization ([59dfb88](https://github.com/get-cubed/herald/commit/59dfb88ef64289c189993cf20bc7f8f63de43e5c))
* use PAT for release-please to create pull requests ([#4](https://github.com/get-cubed/herald/issues/4)) ([fd20758](https://github.com/get-cubed/herald/commit/fd20758912e9dc22118ee61d32243747aabdd982))
