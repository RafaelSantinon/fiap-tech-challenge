import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { isValidDocument } from '../utils/document.util';

@ValidatorConstraint({ name: 'isDocument', async: false })
export class IsDocumentConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return typeof value === 'string' && isValidDocument(value);
  }

  defaultMessage(): string {
    return 'CPF/CNPJ inválido.';
  }
}

export function IsDocument(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string): void => {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsDocumentConstraint,
    });
  };
}
