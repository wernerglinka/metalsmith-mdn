<p align="center">
  <img alt="Metalsmith" src="https://www.glinka.co/assets/images/m+n.svg" width="60" />
</p>
<h1 align="center">
  Metalsmith MDN
</h1>

MDN is a Metalsmith plugin that lets you use Nunjucks in your markdown content. It enables the re-use of **section components**, the same components that you use in your page section templates can now be used in long text pages. Simply add the component props to the frontmatter of your markdown file and use the `mdn` tag to include the component in your markdown content.

If you are new to the concept of **section components**, you can read more about it on the [Metalsmith Components Website](https://metalsmith-components.netlify.app/) and in this [blog post](https://www.glinka.co/blog/building-flexible-page-layouts/).

[![metalsmith:plugin][metalsmith-badge]][metalsmith-url]
[![npm: version][npm-badge]][npm-url]
[![license: MIT][license-badge]][license-url]
[![test: coverage][coverage-badge]][coverage-url]
[![ESM/CommonJS][modules-badge]][npm-url]

## Installation

NPM:

```
npm install metalsmith-mdn
```

Yarn:

```
yarn add metalsmith-mdn
```

## Usage

**Note:** This plugin must be run immediately before the markdown plugin.

This plugin supports both ESM and CommonJS usage.

### ESM (recommended)

```js
import Metalsmith from 'metalsmith';
import markdown from '@metalsmith/markdown';
import MDN from 'metalsmith-mdn';

Metalsmith(__dirname)
  // ...
  .use(
    MDN({
      templatesDir: 'layouts',
      customFilters: 'nunjucks-filters.js'
    })
  )
  .use(markdown());
// ...
```

### CommonJS

```js
const Metalsmith = require('metalsmith');
const markdown = require('@metalsmith/markdown');
const MDN = require('metalsmith-mdn');

Metalsmith(__dirname)
  // ...
  .use(
    MDN({
      templatesDir: 'layouts',
      customFilters: 'nunjucks-filters.js'
    })
  )
  .use(markdown());
// ...
```

The plugin supports both ESM and CommonJS usage through dual package exporting. When published, it includes both formats:

- ESM (`lib/index.js`): Used by default when importing in an ESM context
- CommonJS (`lib/index.cjs`): Used when requiring in a CommonJS context

The package follows the standard Metalsmith plugin structure with source code in the `src` directory and the built files in the `lib` directory.

### Options

| Option          | Default               | Description                                                                             |
| --------------- | --------------------- | --------------------------------------------------------------------------------------- |
| `templatesDir`  | `layouts`             | The directory where your Nunjucks templates are stored, relative to the Metalsmith root |
| `customFilters` | `nunjucks-filters.js` | The filename of a custom Nunjucks filter file, located in the Metalsmith root directory |

### Example

To add a section component to your markdown content, use the `mdn` tag and pass unique tag name and props as arguments.

Here is an example of a markdown file with a section component. This example uses the setup that is shown in the Usage section above.

#### `index.md`

```markdown
---
layout: simple.njk
bodyClass: 'home'

seo:
  title: My Awesome Metalsmith Website
  description: 'Fusce Aenean Ridiculus Tristique'

mySectionComponent:
  layout: sections/intro.njk
  text:
    title: Important Information
    header: 'h2'
    subTitle: ''
    prose: |-
      Morbi leo risus, porta ac consectetur ac, vestibulum at eros.
---

# Home page title

Donec id elit non mi porta gravida at eget metus. Donec sed odio dui. Morbi leo risus, porta ac consectetur ac, vestibulum at eros.

{#mdn "mySectionComponent" #}

Curabitur blandit tempus porttitor. Nullam id dolor id nibh ultricies vehicula ut id elit. Vestibulum id ligula porta felis euismod semper.
```

In addition to page related props, the `mySectionComponent` tag is used to include the `intro` section component. The `intro` section component is located in the `layouts/sections` directory and is defined in the `intro.njk` file. Note that the `intro` section component imports the `text` macro.

#### `layouts/sections/intro.njk`

```nunjucks
{% from "../partials/text.njk" import text %}

<section class="section-intro>
  <div class="content">
    {% set info = params %}
    {{ text(info.text) }}
  </div>
</section>
```

#### `layouts/partials/text.njk`

```nunjucks
{% macro text(info) %}

  {% if info.title %}
    {% if info.header === "h1" %}
      <h1>{{ info.title }}</h1>
    {% elif info.header === "h2" %}
      <h2>{{ info.title }}</h2>
    {% else %}
      <h3>{{ info.title }}</h3>
    {% endif %}
  {% endif %}

  {% if info.subTitle %}
    <p class="sub-title">{{ info.subTitle }}</p>
  {% endif %}

  {% if info.prose %}
    <div>{{ info.prose | mdToHTML | safe }}</div>
  {% endif %}

{% endmacro %}
```

#### `index.html`

`index.html` below shows the transformed end result of the file. The `intro` section component, populated with the props from the frontmatter is included in the markdown content.

```html
<h1>Home page title</h1>
<p>
  Donec id elit non mi porta gravida at eget metus. Donec sed odio dui. Morbi leo risus, porta ac consectetur ac,
  vestibulum at eros.
</p>

<section class="section-intro  ">
  <div class="content">
    <h2>Important Information</h2>
    <div>
      <p>Morbi leo risus, porta ac consectetur ac, vestibulum at eros.</p>
    </div>
  </div>
</section>

<p>
  Curabitur blandit tempus porttitor. Nullam id dolor id nibh ultricies vehicula ut id elit. Vestibulum id ligula porta
  felis euismod semper.
</p>
```

### Debug

To enable debug logs, set the `DEBUG` environment variable to `metalsmith-mdn*`:

```js
metalsmith.env('DEBUG', 'metalsmith-mdn*');
```

Alternatively, you can use the DEBUG environment variable directly:

```bash
DEBUG=metalsmith-mdn* node build.js
```

### CLI usage

To use this plugin with the Metalsmith CLI, add `metalsmith-mdn` to the `plugins` key in your `metalsmith.json` file:

```json
{
  "plugins": [
    {
      "metalsmith-mdn": {}
    }
  ]
}
```

## Features

- Process Nunjucks templates within Markdown content
- Support for custom Nunjucks filters
- Full ESM and CommonJS compatibility
- **High Performance Parallel Processing:**
  - Processes multiple files simultaneously
  - Renders multiple MDN tags concurrently within each file
  - Non-blocking template rendering for optimal performance
- 100% test coverage with comprehensive test suite
- Detailed error messaging for easier debugging

## Test Coverage

This project maintains high statement and line coverage for the source code. Coverage is verified during the release process using the c8 coverage tool.

Coverage report (from latest test run):

| File      | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s |
| --------- | ------- | -------- | ------- | ------- | ----------------- |
| All files | 100     | 100      | 100     | 100     |
| index.js  | 100     | 100      | 100     | 100     |

## License

[MIT](LICENSE)

[npm-badge]: https://img.shields.io/npm/v/metalsmith-mdn.svg
[npm-url]: https://www.npmjs.com/package/metalsmith-mdn
[metalsmith-badge]: https://img.shields.io/badge/metalsmith-plugin-green.svg?longCache=true
[metalsmith-url]: https://metalsmith.io
[license-badge]: https://img.shields.io/github/license/wernerglinka/metalsmith-mdn
[license-url]: LICENSE
[coverage-badge]: https://img.shields.io/badge/test%20coverage-100%25-brightgreen
[coverage-url]: #test-coverage
[modules-badge]: https://img.shields.io/badge/modules-ESM%2FCJS-blue
