# Contributing

If you would like to contribute to this project please create a PR so that it can be evaluated before it is released. 

New features should aim to include tests where applicable. A branch will not be considered if it features failing tests.

## Branching Strategy

This project uses branch 'development' for its main development trunk and 'production' for releases. Any work should be branched off of 'development' and target that branch for a merge.

## Release Strategy
When it is time for a new release create a PR from ChartIQ/dts-generator#development against ChartIQ/dts-generator#production, updating both the package.json for the new release. Squash merges are preferred. Once you merge be sure to push up a tag for the new release.

Release checklist:
- [] Update package.json
- [] All tests passing
- [] Create tag
- [] Push tags to remote