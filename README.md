<p align="center">
  <a href="https://www.metalsmith.io">
    <img alt="Metalsmith" src="https://www.glinka.co/assets/images/metalsmith-logo-bug.png" width="60" />
  </a>
</p>
<h1 align="center">
  Metalsmith MDN
</h1>

MDN is a Metalsmith plugin that lets you use Nunjucks in your markdown content. It enables the re-use of **section components**, the same components that you use in your page section templates can now be used in long text pages. Simply add the component props to the frontmatter of your markdown file and use the `mdn` tag to include the component in your markdown content.

If you are new to the concept of **section components**, you can read more about it on the [Metalsmith Components Website](https://metalsmith-components.netlify.app/) and in this [blog post](https://www.glinka.co/blog/building-flexible-page-layouts/).

[![metalsmith:plugin][metalsmith-badge]][metalsmith-url]
[![npm: version][npm-badge]][npm-url]
[![license: MIT][license-badge]][license-url]


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

Pass `metalsmith-mdn` to `metalsmith.use` :

```js
import Metalsmith from 'metalsmith';
import markdown from '@metalsmith/markdown';
import MDN from 'metalsmith-mdn'

Metalsmith( __dirname )
...
  .use( MDN( {
        templatesDir: "layouts",
        customFilters: "nunjucks-filters.js",
      } ) )

      .use( markdown() )
}))
```
Note: **must be run immediately before the markdown plugin.**

### Options

#### `templatesDir`
`templatesDir` allows you to specify the directory where your Nunjucks templates are stored. The directory should be relative to the Metalsmith root. If not specified, the default directory is `layouts`.

#### `customFilters`
`customFilters` allows you to specify the filename of a custom Nunjucks filter file. This file should be located in the Metalsmith root directory. If not specified, the default filename is `nunjucks-filters.js`.

### Example

To add a section component to your markdown content, use the `mdn` tag and pass unique tag name and props as arguments.

Here is an example of a markdown file with a section component. This example uses the setup that is shown in the Usage section above.

#### `index.md`

```markdown
---
layout: simple.njk
bodyClass: "home"

seo:
  title: My Awesome Metalsmith Website
  description: "Fusce Aenean Ridiculus Tristique"
  
mySectionComponent:
  layout: sections/intro.njk
  text:
    title: Important Information
    header: "h2"
    subTitle: ""
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

`index.md` below shows the transformed end result of the  file. The `intro` section component, populated with the props from the frontmatter is included in the markdown content.

```html
<h1>Home page title</h1>
<p>Donec id elit non mi porta gravida at eget metus. Donec sed odio dui. Morbi leo risus, porta ac consectetur ac, vestibulum at eros.</p>

<section class="section-intro  ">
  <div class="content">
    <h2>Important Information</h2>
    <div>
      <p>Morbi leo risus, porta ac consectetur ac, vestibulum at eros.</p>
    </div>
  </div>    
</section>

<p>Curabitur blandit tempus porttitor. Nullam id dolor id nibh ultricies vehicula ut id elit. Vestibulum id ligula porta felis euismod semper.</p>

```


### Debug

To enable debug logs, set the `DEBUG` environment variable to `metalsmith-mdn*`:

```js
metalsmith.env('DEBUG', 'metalsmith-mdn*')
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

## License

[MIT](LICENSE)

[npm-badge]: https://img.shields.io/npm/v/metalsmith-mdn.svg
[npm-url]: https://www.npmjs.com/package/metalsmith-mdn
[metalsmith-badge]: https://img.shields.io/badge/metalsmith-plugin-green.svg?longCache=true
[metalsmith-url]: https://metalsmith.io
[license-badge]: https://img.shields.io/github/license/wernerglinka/metalsmith-mdn
[license-url]: LICENSE
