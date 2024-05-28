# Java UI

I already made Java UI for bugrock a million times before.

Now I have a system where I can use c like directives. I made this because I want to support all bugrock versions in a single repository/branch.

I also use a custom format .jsonui. It's similar to json but I don't use comments to use the directives.

## Directives

```
#define <name>
#define <name> <expression>
#define <name>([<params>]) <expression>

#define <name> <expression> \
  <expression>

#define <name>([<params>]) <expression> \
  <expression> \
  <expression>

```

```
#undef <name>
```

```
#ifdef <name>
```

```
#if <expression>
```

```
#elif <expression>
```

```
#else
```

```
#endif
```

```
#exclude
```

```
#endexclude
```

```
#for <start> to <end> step <step>
```

```
#endfor
```

```
#info <message>
#warn <message>
#error <message>
```

## Examples

### .jsonui

```c
#define COLOR_RGBA(red, green, blue, alpha) [##red / 255##, ##green / 255##, ##blue / 255##, ##alpha / 255##]
#define COLOR_RGB(red, green, blue) [##red / 255##, ##green / 255##, ##blue /255##]

// COLOR_HEX(0x10FFFF) -> [0.06274509803921569, 1, 1]
#define COLOR_HEX(color) [##((color >> 16) & 0xFF) / 255##, ##((color >> 8) & 0xFF) / 255##, ##color|(color & 0xFF) / 255##]
#define COLOR_AHEX(color) [##((color >> 16) & 0xFF) / 255##, ##((color >> 8) & 0xFF) / 255##, ##(color & 0xFF) / 255##, ##((color >> 24) & 0xFF) / 255##]

#if MCPE_CURRENT < MCPE_0_13
  #define LAYER_PROP(value) z_order = ##value##
#else
  #define LAYER_PROP(value) layer = ##value##
#endif

#define AGE 19
{
  #ifdef DEBUG

  debug_text = {
    type = "label"
  }

  #elif AGE > 18

  button = {
    type = "button"
  }

  #endif
}
```