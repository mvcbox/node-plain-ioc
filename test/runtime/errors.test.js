const { expect } = require('chai');
const {
  PlainIocCircularDependencyError,
  PlainIocError,
  PlainIocFactoryAlreadyBoundError,
  PlainIocFactoryNotBoundError
} = require('../../dist');

describe('Plain IoC errors', () => {
  const errorClasses = [
    PlainIocCircularDependencyError,
    PlainIocFactoryAlreadyBoundError,
    PlainIocFactoryNotBoundError
  ];

  errorClasses.forEach(ErrorClass => {
    it(`${ErrorClass.name} preserves the error hierarchy and identity`, () => {
      const error = new ErrorClass('failure');

      expect(error).to.be.instanceOf(Error);
      expect(error).to.be.instanceOf(PlainIocError);
      expect(error.name).to.equal(ErrorClass.name);
      expect(error.message).to.equal('failure');
      expect(error.stack).to.be.a('string');
    });
  });

  it('PlainIocError preserves its own name and message', () => {
    const error = new PlainIocError('failure');

    expect(error).to.be.instanceOf(Error);
    expect(error.name).to.equal('PlainIocError');
    expect(error.message).to.equal('failure');
  });
});
