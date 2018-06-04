# This repository has been deprecated and all code has been moved to [GoodData React Components](https://github.com/gooddata/gooddata-react-components)

# Indigo Visualizations in React
> Visualization library for GoodData visualizations built using React.js and HighCharts

## Development

This repository uses [Storybook for React](https://github.com/storybooks/storybook/tree/master/app/react)

* Run `yarn storybook` and see the examples

## Testing

### Unit tests

* Run `yarn test`

### Storybook visual regression tests

Visual regression testing for Storybook is provided by [@gooddata/test-storybook](https://github.com/gooddata/gdc-client-utils/tree/master/test-storybook) package.

## Release

  1. Switch to master branch `git checkout master`
  2. Synchronize from upstream `git tag -l | xargs git tag -d; git fetch upstream; git reset --hard upstream/master`
  3. Create new version `npm version [major|minor|patch] -m "Release v%s"`
  4. Release `npm publish --access=public`
  5. Push to upstream `git push --tags upstream master`

## Contributing
Report bugs and features on our [issues page](https://github.com/gooddata/gooddata-indigo-visualizations/issues).

## License
(C) 2007-2018 GoodData Corporation

For more information, please see [LICENSE](https://github.com/gooddata/gooddata-indigo-visualizations/blob/master/LICENSE)
