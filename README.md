# Java UI

I already made Java UI for bugrock a million times before.

Now I have a system where I can use c like directives. I made this because I want to support all bugrock versions in a single repository/branch/resource pack.

I also use a custom format .jsonui. It's similar to json but I don't use comments so use the directives.

## Directives

```
#define <name>
#define <name> <expression>
#definefunc <name>([<params>]) <expression>
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
#definefunc COLOR_RGBA(red, green, blue, alpha) [##red|it/255##, ##green|it/255##, ##blue|it/255##, ##alpha|it/255##]
#definefunc COLOR_RGB(red, green, blue) [##red|it/255##, ##green|it/255##, ##blue|it/255##]

// COLOR_HEX(0x10FFFF) -> [0.06274509803921569, 1, 1]
#definefunc COLOR_HEX(color) [##color|((it >> 16) & 0xFF) / 255##, ##color|((it >> 8) & 0xFF) / 255##, ##color|(it & 0xFF) / 255##]

#if MCPE_CURRENT < MCPE_0_13
  #definefunc LAYER_PROP(value) z_order = ##value##
#else
  #definefunc LAYER_PROP(value) layer = ##value##
#endif
```

```c
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