# Change Log

## v0.2.0

- ![Enhancement][badge-enhancement] Bracket detection is now single-pass and
  language-agnostic (skips only string literals), improving reliability across all
  languages.
- ![Enhancement][badge-enhancement] Cursor on opening delimiter now counts as inside the
  pair, making toggling more intuitive.
- ![Enhancement][badge-enhancement] More robust handling of escaped quotes inside strings
  (supports sequences like `\\\"`).
- ![Enhancement][badge-enhancement] Minor performance tweaks and reduced allocations while
  locating delimiters.
- ![Bugfix][badge-bugfix] Fixed activation event so the extension activates on
  `splitAndJoin.toggle` as documented.
- ![Bugfix][badge-bugfix] Prevent splitting when no separators exist; command is now a no-op
  in such cases.
- ![Bugfix][badge-bugfix] Joining removes a trailing separator and trims residual whitespace
  properly.
- ![Info][badge-info] The command now returns a promise so external callers and tests can
  await completion.
- ![Info][badge-info] Added a comprehensive unit test suite covering common and edge cases.

## v0.1.0

- Initial release

[badge-breaking]: https://img.shields.io/badge/BREAKING-red.svg
[badge-deprecation]: https://img.shields.io/badge/Deprecation-orange.svg
[badge-feature]: https://img.shields.io/badge/Feature-green.svg
[badge-enhancement]: https://img.shields.io/badge/Enhancement-blue.svg
[badge-bugfix]: https://img.shields.io/badge/Bugfix-purple.svg
[badge-info]: https://img.shields.io/badge/Info-gray.svg