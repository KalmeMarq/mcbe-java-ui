# Java UI

I already made Java UI for bugrock a million times before.

Now I have a system where I can use c like directives. I made this because I want to support all bugrock versions in a single repository/branch/resource pack.

I also use a custom format .jsonui. It's similar to json but I don't use comments so use the directives.

### Directives

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
#elseif <expression>
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
#info <message>
#warn <message>
#error <message>
```