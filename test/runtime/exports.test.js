const { expect } = require('chai');
const library = require('../../dist');

describe('CommonJS exports', () => {
  it('exposes the complete runtime API', () => {
    expect(Object.keys(library).sort()).to.deep.equal([
      'Container',
      'PlainIocCircularDependencyError',
      'PlainIocError',
      'PlainIocFactoryAlreadyBoundError',
      'PlainIocFactoryNotBoundError'
    ].sort());
  });
});
