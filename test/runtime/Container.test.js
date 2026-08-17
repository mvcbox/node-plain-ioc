const { expect } = require('chai');
const {
  Container,
  PlainIocCircularDependencyError,
  PlainIocFactoryAlreadyBoundError,
  PlainIocFactoryNotBoundError
} = require('../../dist');

describe('Container', () => {
  it('creates a new transient instance for every resolve', () => {
    const container = new Container();
    let factoryCallCount = 0;

    container.bind('service', receivedContainer => {
      factoryCallCount++;
      expect(receivedContainer).to.equal(container);

      return {
        factoryCallCount
      };
    });

    const firstInstance = container.resolve('service');
    const secondInstance = container.resolve('service');

    expect(firstInstance).to.deep.equal({ factoryCallCount: 1 });
    expect(secondInstance).to.deep.equal({ factoryCallCount: 2 });
    expect(firstInstance).not.to.equal(secondInstance);
  });

  it('resolves nested dependencies through the factory container', () => {
    const container = new Container();

    container.bind('baseUrl', () => 'https://example.test');
    container.bind('client', currentContainer => {
      return {
        baseUrl: currentContainer.resolve('baseUrl')
      };
    });

    expect(container.resolve('client')).to.deep.equal({
      baseUrl: 'https://example.test'
    });
  });

  it('caches a singleton instance', () => {
    const container = new Container();
    let factoryCallCount = 0;

    container.bindSingleton('service', () => {
      factoryCallCount++;

      return {};
    });

    const firstInstance = container.resolve('service');
    const secondInstance = container.resolve('service');

    expect(firstInstance).to.equal(secondInstance);
    expect(factoryCallCount).to.equal(1);
  });

  it('caches every falsy singleton value', () => {
    const container = new Container();
    const values = [undefined, null, false, 0, ''];

    values.forEach((value, index) => {
      const key = Symbol(`value-${index}`);
      let factoryCallCount = 0;

      container.bindSingleton(key, () => {
        factoryCallCount++;

        return value;
      });

      expect(container.resolve(key)).to.equal(value);
      expect(container.resolve(key)).to.equal(value);
      expect(factoryCallCount).to.equal(1);
    });
  });

  it('supports string, symbol, object, and class keys by identity', () => {
    const container = new Container();
    const symbolKey = Symbol('symbol-key');
    const objectKey = {};
    const otherObjectKey = {};

    class ClassKey {}

    const entries = [
      ['string-key', 'string-value'],
      [symbolKey, 'symbol-value'],
      [objectKey, 'object-value'],
      [ClassKey, 'class-value']
    ];

    entries.forEach(([key, value]) => {
      container.bind(key, () => value);
      expect(container.resolve(key)).to.equal(value);
    });

    expect(() => container.resolve(otherObjectKey)).to.throw(PlainIocFactoryNotBoundError);
  });

  it('keeps bindings and singleton caches isolated between containers', () => {
    const firstContainer = new Container();
    const secondContainer = new Container();
    const firstInstance = {};
    const secondInstance = {};

    firstContainer.bindSingleton('service', () => firstInstance);
    secondContainer.bindSingleton('service', () => secondInstance);

    expect(firstContainer.resolve('service')).to.equal(firstInstance);
    expect(secondContainer.resolve('service')).to.equal(secondInstance);
  });

  it('reports bound state and returns the same container from fluent methods', () => {
    const container = new Container();

    expect(container.isBound('service')).to.equal(false);
    expect(container.bind('service', () => 'value')).to.equal(container);
    expect(container.isBound('service')).to.equal(true);
    expect(container.unbind('service')).to.equal(container);
    expect(container.isBound('service')).to.equal(false);
    expect(container.bindSingleton('service', () => 'value')).to.equal(container);
  });

  it('rejects duplicate transient and singleton bindings', () => {
    const transientContainer = new Container();
    const singletonContainer = new Container();

    transientContainer.bind('service', () => 'transient');
    singletonContainer.bindSingleton('service', () => 'singleton');

    expect(() => transientContainer.bindSingleton('service', () => 'replacement'))
      .to.throw(PlainIocFactoryAlreadyBoundError)
      .with.property('message', 'Factory for [string] "service" already bound');
    expect(() => singletonContainer.bind('service', () => 'replacement'))
      .to.throw(PlainIocFactoryAlreadyBoundError)
      .with.property('message', 'Factory for [string] "service" already bound');
  });

  it('throws stable errors for missing resolve and unbind operations', () => {
    const container = new Container();

    expect(() => container.resolve('missing'))
      .to.throw(PlainIocFactoryNotBoundError)
      .with.property('message', 'Factory not bound with [string] "missing"');
    expect(() => container.unbind('missing'))
      .to.throw(PlainIocFactoryNotBoundError)
      .with.property('message', 'Factory not bound with [string] "missing"');
    expect(container.isBound('missing')).to.equal(false);
  });

  it('clears a singleton cache when its key is unbound', () => {
    const container = new Container();
    const firstInstance = {};
    const secondInstance = {};

    container.bindSingleton('service', () => firstInstance);
    expect(container.resolve('service')).to.equal(firstInstance);

    container.unbind('service');
    container.bindSingleton('service', () => secondInstance);

    expect(container.resolve('service')).to.equal(secondInstance);
  });

  it('retries a singleton factory after an exception without caching the failure', () => {
    const container = new Container({ circularDependencyDetect: true });
    const failure = new Error('factory failed');
    let factoryCallCount = 0;

    container.bindSingleton('service', () => {
      factoryCallCount++;

      if (factoryCallCount === 1) {
        throw failure;
      }

      return 'recovered';
    });

    expect(() => container.resolve('service')).to.throw(failure);
    expect(container.resolve('service')).to.equal('recovered');
    expect(container.resolve('service')).to.equal('recovered');
    expect(factoryCallCount).to.equal(2);
  });

  it('does not cache a singleton result after its factory unbinds itself', () => {
    const container = new Container();

    container.bindSingleton('service', currentContainer => {
      currentContainer.unbind('service');

      return 'detached';
    });

    expect(container.resolve('service')).to.equal('detached');
    expect(container.isBound('service')).to.equal(false);
    expect(() => container.resolve('service')).to.throw(PlainIocFactoryNotBoundError);
  });

  it('does not cache a stale result after rebinding with a different factory', () => {
    const container = new Container();
    let replacementCallCount = 0;

    container.bindSingleton('service', currentContainer => {
      currentContainer.unbind('service');
      currentContainer.bindSingleton('service', () => {
        replacementCallCount++;

        return 'replacement';
      });

      return 'stale';
    });

    expect(container.resolve('service')).to.equal('stale');
    expect(container.resolve('service')).to.equal('replacement');
    expect(container.resolve('service')).to.equal('replacement');
    expect(replacementCallCount).to.equal(1);
  });

  it('does not cache a stale result after rebinding with the same factory', () => {
    const container = new Container();
    let factoryCallCount = 0;

    const factory = currentContainer => {
      factoryCallCount++;

      if (factoryCallCount === 1) {
        currentContainer.unbind('service');
        currentContainer.bindSingleton('service', factory);

        return 'stale';
      }

      return 'replacement';
    };

    container.bindSingleton('service', factory);

    expect(container.resolve('service')).to.equal('stale');
    expect(container.resolve('service')).to.equal('replacement');
    expect(container.resolve('service')).to.equal('replacement');
    expect(factoryCallCount).to.equal(2);
  });

  it('does not overwrite a nested replacement singleton with a stale result', () => {
    const container = new Container();
    let replacementCallCount = 0;

    container.bindSingleton('service', currentContainer => {
      currentContainer.unbind('service');
      currentContainer.bindSingleton('service', () => {
        replacementCallCount++;

        return 'replacement';
      });

      expect(currentContainer.resolve('service')).to.equal('replacement');

      return 'stale';
    });

    expect(container.resolve('service')).to.equal('stale');
    expect(container.resolve('service')).to.equal('replacement');
    expect(replacementCallCount).to.equal(1);
  });

  it('keeps singleton caches independent when keys share a factory', () => {
    const container = new Container();
    let factoryCallCount = 0;
    const factory = () => {
      factoryCallCount++;

      return {};
    };

    container.bindSingleton('first', factory);
    container.bindSingleton('second', factory);

    const secondInstance = container.resolve('second');
    container.unbind('first');

    expect(container.resolve('second')).to.equal(secondInstance);
    expect(factoryCallCount).to.equal(1);
  });

  it('detects a direct circular dependency with an exact dependency stack', () => {
    const container = new Container({ circularDependencyDetect: true });

    container.bind('service', currentContainer => currentContainer.resolve('service'));

    expect(() => container.resolve('service'))
      .to.throw(PlainIocCircularDependencyError)
      .with.property(
        'message',
        'Circular dependency detected\n\n' +
        '>>>>>>> Circular Dependency Stack <<<<<<<\n' +
        '>>> [0]: [string] "service"\n' +
        '>>> [1]: [string] "service"\n'
      );
  });

  it('detects an indirect circular dependency in resolution order', () => {
    const container = new Container({ circularDependencyDetect: true });

    container.bind('first', currentContainer => currentContainer.resolve('second'));
    container.bind('second', currentContainer => currentContainer.resolve('first'));

    expect(() => container.resolve('first'))
      .to.throw(PlainIocCircularDependencyError)
      .with.property(
        'message',
        'Circular dependency detected\n\n' +
        '>>>>>>> Circular Dependency Stack <<<<<<<\n' +
        '>>> [0]: [string] "first"\n' +
        '>>> [1]: [string] "second"\n' +
        '>>> [2]: [string] "first"\n'
      );
  });

  it('cleans the circular dependency stack after an error', () => {
    const container = new Container({ circularDependencyDetect: true });

    container.bind('cyclic', currentContainer => currentContainer.resolve('cyclic'));
    expect(() => container.resolve('cyclic')).to.throw(PlainIocCircularDependencyError);

    container.unbind('cyclic');
    container.bind('cyclic', () => 'stable');
    expect(container.resolve('cyclic')).to.equal('stable');
  });

  it('uses a safe fallback when a dependency key cannot be formatted', () => {
    const container = new Container();
    const key = new Proxy({}, {
      get(target, property, receiver) {
        if (property === Symbol.toStringTag) {
          throw new Error('formatting failed');
        }

        return Reflect.get(target, property, receiver);
      }
    });

    container.bind(key, () => 'value');

    expect(() => container.bind(key, () => 'replacement'))
      .to.throw(PlainIocFactoryAlreadyBoundError)
      .with.property('message', 'Factory for [object] "<unprintable>" already bound');
  });
});
