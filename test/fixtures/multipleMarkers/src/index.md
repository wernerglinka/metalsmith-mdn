---
layout: default.njk
title: Multiple Components Test
testComponent1:
  layout: sections/intro.njk
  text:
    title: First Header
    header: "h1"
    subTitle: ""
    prose: |-
      Condimentum Sem Mattis Ridiculus Quam.
testComponent2:
  layout: sections/intro.njk
  text:
    title: Sub Header
    header: "h2"
    subTitle: ""
    prose: |-
      Cras mattis consectetur purus sit amet fermentum.   
---

# Multiple Components Test

{#mdn "testComponent1"#}

Some content between components.

{#mdn "testComponent2"#}