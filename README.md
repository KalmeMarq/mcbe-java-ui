# Java UI

I already made Java UI for bugrock a million times before.

Now I have a system where I can use c like directives. I made this because I want to support all bugrock versions in a single repository/branch/resource pack.

I also use a custom format .jsonui. It's similar to json but I don't use comments so use the directives.

## Directives

```
#define <name>
#define <name> <expression>
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

### .json

```jsonc
  //#if defined(DEBUG)
  },
  {
    "a": {
      "type": "label",
      "text": "Hey Bruv",
      "anchor_from": "top_left",
      "anchor_to": "top_left",
      "offset": [10, 20],
      "color": "black"
    }
  },
  {
    "b@kmjava:button.button": {
      "$button_text": "bruv"
    }
  //#endif
```

### .jsonui

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