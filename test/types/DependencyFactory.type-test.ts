import { Container } from '../../src';
import type {
  ContainerOptions,
  Dependency,
  DependencyFactory,
  DependencyKey
} from '../../src';

const options: ContainerOptions = {
  circularDependencyDetect: true
};
const container = new Container(options);
const stringKey: DependencyKey = 'string-key';
const symbolKey: DependencyKey = Symbol('symbol-key');
const objectKey: DependencyKey = {};

class ClassKey {}

const numberFactory: DependencyFactory<number> = () => 1;
const objectFactory: DependencyFactory<{ value: string }> = () => {
  return {
    value: 'value'
  };
};
const undefinedFactory: DependencyFactory<undefined> = () => undefined;
const neverFactory: DependencyFactory<never> = () => {
  throw new Error('never returns');
};
const dependency: Dependency<number> = {
  factory: numberFactory,
  singleton: true
};

container.bind(stringKey, numberFactory);
container.bind(symbolKey, objectFactory);
container.bind(objectKey, undefinedFactory);
container.bind(ClassKey, neverFactory);

const resolvedNumber = container.resolve<number>(stringKey);
resolvedNumber.toFixed();
dependency.factory(container).toFixed();

// @ts-expect-error Number keys are not supported.
container.bind(1, () => 'invalid');

// @ts-expect-error Inferred Promise-returning factories are unsupported.
container.bind('async-inferred', async () => 1);

const promiseFactory = (): Promise<number> => Promise.resolve(1);

// @ts-expect-error Promise-returning factories are unsupported.
container.bind('promise', promiseFactory);

const promiseLikeFactory = (): PromiseLike<number> => Promise.resolve(1);

// @ts-expect-error PromiseLike-returning factories are unsupported.
container.bind('promise-like', promiseLikeFactory);

const unionFactory = (): number | PromiseLike<number> => 1;

// @ts-expect-error A factory result cannot include a PromiseLike variant.
container.bind('promise-like-union', unionFactory);

// Explicit unknown and any remain intentional escape hatches.
const unknownFactory: DependencyFactory<unknown> = async () => 1;
const anyFactory: DependencyFactory<any> = async () => 1;

container.bind<unknown>('unknown-escape', unknownFactory);
container.bind<any>('any-escape', anyFactory);

class ExtendedContainer extends Container {
  public inspectProtectedState(): number {
    const bindingCount = this.dependencies.size;
    const instanceCount = this.initializedInstances.size;
    const stackSize = this.circularDependencyStack.length;

    return bindingCount + instanceCount + stackSize + Number(this.circularDependencyDetect);
  }
}

const extendedContainer = new ExtendedContainer();
const chainedContainer = extendedContainer.bind('extended', () => 'value');

chainedContainer.inspectProtectedState();
