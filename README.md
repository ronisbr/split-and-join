# Split and Join for VS Code

This extension provides a way to split and join arguments similar to the plugin
[mini.splijoin](https://github.com/nvim-mini/mini.splitjoin).

## Features

The user can configure a set of delimiters and separators. The plugin provides a single
function, `SplitAndJoin.toggle`, that toggles the arguments between the split and joined
states.

Differently from other plugins, this one only considers the section between the current
delimiter. It was built for Julia language but should work well in other scenarios. Hence,
if you call `SplitAndJoin.toggle` in this scenario:

```julia
function test(a::Union{Nothing, Number}, b::Float64, c::AbstractString)
```

you will obtain:

```julia
function test(
    a::Union{Nothing, Number},
    b::Float64,
    c::AbstractString
)
```

and vice-versa.

## Extension Settings

This extension has the following settings:

- `SplitAndJoin.separators`: List of characters to detect as separators (e.g., comma,
  semicolon).
- `SplitAndJoin.delimiters`: List of delimiter pairs. First character is opening, last is
    closing (e.g. '()' or '<>').