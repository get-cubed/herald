# Changelog

## [1.6.0](https://github.com/al3xjohnson/herald/compare/v1.5.0...v1.6.0) (2025-12-24)


### Features

* pause media during TTS playback ([#21](https://github.com/al3xjohnson/herald/issues/21)) ([9783007](https://github.com/al3xjohnson/herald/commit/97830071ccf1aed138d1766cc3c3f9afd6e5446e))

## [1.5.0](https://github.com/al3xjohnson/herald/compare/v1.4.1...v1.5.0) (2025-12-24)


### Features

* add PreToolUse hook for Write/Edit/MultiEdit alerts ([#19](https://github.com/al3xjohnson/herald/issues/19)) ([1054927](https://github.com/al3xjohnson/herald/commit/10549271f4d548a351b902881d3cf244f2333513))
* smart editor activation and cleanup ([#18](https://github.com/al3xjohnson/herald/issues/18)) ([db9030a](https://github.com/al3xjohnson/herald/commit/db9030a6c85fb74ac95f1bb2e6d450163e147a54))

## [1.4.1](https://github.com/al3xjohnson/herald/compare/v1.4.0...v1.4.1) (2025-12-23)


### Bug Fixes

* instruct TTS summarizer to skip URLs ([#16](https://github.com/al3xjohnson/herald/issues/16)) ([b0e07a5](https://github.com/al3xjohnson/herald/commit/b0e07a54dd0fa62059731a8e28b3e4f3cb0224fc))
* use atomic file locking to prevent duplicate TTS plays ([#13](https://github.com/al3xjohnson/herald/issues/13)) ([1d571bf](https://github.com/al3xjohnson/herald/commit/1d571bff7b9858967ae75dbed77c214599dbe249))

## [1.4.0](https://github.com/al3xjohnson/herald/compare/v1.3.0...v1.4.0) (2025-12-23)


### Features

* improve cross-platform support and ElevenLabs model update ([#11](https://github.com/al3xjohnson/herald/issues/11)) ([8302fd5](https://github.com/al3xjohnson/herald/commit/8302fd569f6f1e523d010bbdb8d1fed02c868d4f))

## [1.3.0](https://github.com/al3xjohnson/herald/compare/v1.2.0...v1.3.0) (2025-12-23)


### Features

* improve cross-platform support and plugin metadata ([#9](https://github.com/al3xjohnson/herald/issues/9)) ([a7cc82f](https://github.com/al3xjohnson/herald/commit/a7cc82f13c4236a5073834081286f9e98e0be5fa))

## [1.2.0](https://github.com/al3xjohnson/herald/compare/v1.1.0...v1.2.0) (2025-12-23)


### Documentation

* remove silent mode references from documentation ([#6](https://github.com/al3xjohnson/herald/issues/6)) ([c1461c1](https://github.com/al3xjohnson/herald/commit/c1461c1))

## [1.1.0](https://github.com/al3xjohnson/herald/compare/v1.0.0...v1.1.0) (2025-12-23)


### Features

* replace release-drafter with release-please for automated releases ([#3](https://github.com/al3xjohnson/herald/issues/3)) ([90a44e9](https://github.com/al3xjohnson/herald/commit/90a44e9c7c942b19867e432cf17267433ddb618d))


### Bug Fixes

* use PAT for release-please to create pull requests ([#4](https://github.com/al3xjohnson/herald/issues/4)) ([fd20758](https://github.com/al3xjohnson/herald/commit/fd20758912e9dc22118ee61d32243747aabdd982))

## 1.0.0 (2025-12-23)

Initial release with:
- Text-to-speech notifications using macOS, Windows, or ElevenLabs
- Alert sound notifications
- Configurable preferences (max words, custom prompts, editor activation)
