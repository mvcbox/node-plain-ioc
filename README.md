[![npm version](https://badge.fury.io/js/plain-ioc.svg)](https://badge.fury.io/js/plain-ioc)

# plain-ioc

A small, dependency-free **Inversion of Control (IoC) / Dependency Injection** container for Node.js and TypeScript.

**Highlights**

- **Synchronous factories only** (factories cannot return a `Promise`)
- **Transient** and **singleton** bindings
- Optional **circular dependency detection** (useful in development)
- Tiny API surface

---

## Installation

```bash
npm install plain-ioc
```

---

## Core concepts

### Dependency keys

A *dependency key* is used to register and later resolve a dependency.

In TypeScript, the key type is:

```ts
type DependencyKey = string | symbol | object;
```

Recommended key styles:

- **`symbol`** keys for interfaces or abstract concepts (prevents accidental collisions)
- **class constructors** as keys for concrete classes
- **`string`** keys for quick scripts or small apps

> Tip: Using `Symbol('Name')` makes debugging easier.

### Factories

A *factory* creates the dependency instance.

```ts
interface DependencyFactory<T> {
  (container: Container): T; // must not return a Promise
}
```

Factories receive the `Container`, so they can resolve other dependencies.

---

## Usage

### Create a container

```ts
import { Container } from "plain-ioc";

const container = new Container();
```

### Bind and resolve (transient)

`bind()` registers a factory that runs **every time** you resolve the key.

```ts
import { Container } from "plain-ioc";

const c = new Container();

c.bind("now", () => Date.now());

const a = c.resolve<number>("now");
const b = c.resolve<number>("now");
// a !== b (very likely)
```

### Bind and resolve (singleton)

`bindSingleton()` registers a factory that runs **once**. The created instance is cached and returned for subsequent resolves.

```ts
import { Container } from "plain-ioc";

class Logger {
  log(message: string) {
    console.log(message);
  }
}

const c = new Container();

c.bindSingleton(Logger, () => new Logger());

const l1 = c.resolve<Logger>(Logger);
const l2 = c.resolve<Logger>(Logger);
// l1 === l2
```

### Using symbols (recommended for interfaces)

```ts
import { Container } from "plain-ioc";

interface Config {
  baseUrl: string;
}

const TOKENS = {
  Config: Symbol("Config"),
} as const;

const c = new Container();

c.bindSingleton<Config>(TOKENS.Config, () => ({ baseUrl: "https://api.example.com" }));

const cfg = c.resolve<Config>(TOKENS.Config);
```

### Wiring dependencies together

```ts
import { Container } from "plain-ioc";

const TOKENS = {
  BaseUrl: Symbol("BaseUrl"),
} as const;

class ApiClient {
  constructor(public readonly baseUrl: string) {}
}

const c = new Container();

c.bindSingleton<string>(TOKENS.BaseUrl, () => "https://api.example.com");
c.bindSingleton(ApiClient, (c) => new ApiClient(c.resolve(TOKENS.BaseUrl)));

const api = c.resolve<ApiClient>(ApiClient);
console.log(api.baseUrl);
```

### Check if a key is bound

```ts
import { Container } from "plain-ioc";

const c = new Container();

c.isBound("service"); // false
c.bind("service", () => ({ ok: true }));
c.isBound("service"); // true
```

### Unbind

`unbind()` removes the factory. If the binding was a singleton, its cached instance is removed as well.

```ts
import { Container } from "plain-ioc";

const c = new Container();

c.bindSingleton("app", () => ({ name: "demo" }));

c.unbind("app");
// c.resolve("app") will now throw
```

---

## Circular dependency detection

By default, circular dependency detection is **off**.

Enable it when creating the container:

```ts
import { Container } from "plain-ioc";

const c = new Container({ circularDependencyDetect: true });
```

When enabled, `resolve()` tracks a stack of keys being resolved. If the same key appears twice in the stack, a `PlainIocCircularDependencyError` is thrown with a message that includes the dependency stack.

> Recommendation: Keep this enabled in development/test, and turn it off in production for minimal overhead.

---

## API reference

### `new Container(options?)`

Creates a container.

- `options.circularDependencyDetect?: boolean` — default `false`

### `container.bind<T>(key, factory)`

Registers a **transient** factory.

- Throws `PlainIocFactoryAlreadyBoundError` if the key is already registered.

### `container.bindSingleton<T>(key, factory)`

Registers a **singleton** factory.

- Throws `PlainIocFactoryAlreadyBoundError` if the key is already registered.

### `container.resolve<T>(key): T`

Resolves an instance.

- Throws `PlainIocFactoryNotBoundError` if the key is not registered.
- Throws `PlainIocCircularDependencyError` when circular dependency detection is enabled and a cycle is detected.

### `container.unbind(key)`

Removes a registered factory and clears any cached singleton instance.

- Throws `PlainIocFactoryNotBoundError` if the key is not registered.

### `container.isBound(key): boolean`

Returns `true` if a factory is registered for `key`.

---

## Errors

All library errors extend the base class `PlainIocError`:

- `PlainIocError`
- `PlainIocFactoryNotBoundError`
- `PlainIocFactoryAlreadyBoundError`
- `PlainIocCircularDependencyError`

You can catch these specifically:

```ts
import { Container, PlainIocFactoryNotBoundError } from "plain-ioc";

const c = new Container();

try {
  c.resolve("missing");
} catch (e) {
  if (e instanceof PlainIocFactoryNotBoundError) {
    console.error("Not registered");
  }
}
```

---

## Notes & limitations

- Factories are **synchronous** (the type system rejects `Promise`-returning factories). If you need async initialization, create the instance elsewhere and bind it as a singleton value via a factory like `() => alreadyInitialized`.
- There is a single container scope (no built-in child containers / scopes).

---

## License

MIT
